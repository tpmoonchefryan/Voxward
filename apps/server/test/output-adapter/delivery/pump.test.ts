import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOutputDeliveryPort } from "../../../src/db/output-store.js";
import { createSubscriptionRegistry } from "../../../src/modules/output-adapter/subscription.js";
import { DECIDED_AT, type OpenDatabase, openDecisionDatabase, seedChannel } from "../../decision-service/fixtures.js";
import {
  addApprovedText,
  addDeliveryEvent,
  AFTER_DEADLINE,
  attemptsOf,
  fakeConsumer,
  idsOf,
  pumpFor,
  statusOf,
} from "./helpers.js";

describe("delivery pump (VW-SUB040-AC001, m6 N2)", () => {
  let db: OpenDatabase;
  let registry: ReturnType<typeof createSubscriptionRegistry>;
  let clock: { now: Date };

  beforeEach(() => {
    db = openDecisionDatabase("delivery-pump-");
    seedChannel(db.database, "channel-a");
    registry = createSubscriptionRegistry();
    clock = { now: new Date(DECIDED_AT) };
  });

  afterEach(() => db.close());

  it("sends a channel's approved rows in platform order, and marks each SENT once the consumer accepted it", async () => {
    addDeliveryEvent(db, { eventId: "event-a1", subjectKey: "viewer-a1", platformOrder: 2, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-a1" });
    addDeliveryEvent(db, { eventId: "event-a2", subjectKey: "viewer-a2", platformOrder: 1, verdict: createVerdict("ALLOW_NOISE"), deliveryId: "d-a2" });
    addApprovedText(db, "event-a1", "second in platform order");
    addApprovedText(db, "event-a2", "first in platform order");
    const consumer = fakeConsumer("grant-1");
    registry.attach(consumer.subscriber);

    const report = await pumpFor(db, registry, clock).runPass();

    expect(report).toMatchObject({ sent: 2, failed: 0 });
    expect(idsOf(consumer.frames)).toEqual(["d-a2", "d-a1"]);
    expect(consumer.frames[1]).toMatchObject({ type: "DELIVER", display: { text: "second in platform order" } });
    expect(statusOf(db, "d-a1")).toBe("SENT");
    expect(statusOf(db, "d-a2")).toBe("SENT");
  });

  it("a SENT row is not sent again on a later pass, and a consumer that connects later does not receive it", async () => {
    addDeliveryEvent(db, { eventId: "event-b1", subjectKey: "viewer-b1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-b1" });
    addApprovedText(db, "event-b1", "shown once");
    const first = fakeConsumer("grant-1");
    registry.attach(first.subscriber);
    const pump = pumpFor(db, registry, clock);
    await pump.runPass();

    const later = fakeConsumer("grant-2");
    registry.attach(later.subscriber);
    const report = await pump.runPass();

    expect(report.sent).toBe(0);
    expect(idsOf(first.frames)).toEqual(["d-b1"]);
    expect(later.frames).toEqual([]);
  });

  it("a BLOCK delivery goes out as WARD_BLOCKED, and its original text never reaches the wire", async () => {
    addDeliveryEvent(db, { eventId: "event-c1", subjectKey: "viewer-c1", platformOrder: 1, verdict: createVerdict("BLOCK"), deliveryId: "d-c1" });
    addApprovedText(db, "event-c1", "original blocked wording");
    const consumer = fakeConsumer("grant-1");
    registry.attach(consumer.subscriber);

    await pumpFor(db, registry, clock).runPass();

    expect(consumer.frames).toHaveLength(1);
    expect(consumer.frames[0]?.type).toBe("WARD_BLOCKED");
    expect(JSON.stringify(consumer.frames)).not.toContain("original blocked wording");
    expect(statusOf(db, "d-c1")).toBe("SENT");
  });

  it("rows wait while no consumer is connected, then go out when one connects", async () => {
    addDeliveryEvent(db, { eventId: "event-d1", subjectKey: "viewer-d1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-d1" });
    addApprovedText(db, "event-d1", "waiting text");
    const pump = pumpFor(db, registry, clock);

    expect((await pump.runPass()).sent).toBe(0);
    expect(statusOf(db, "d-d1")).toBe("PENDING");

    const consumer = fakeConsumer("grant-1");
    registry.attach(consumer.subscriber);
    expect((await pump.runPass()).sent).toBe(1);
    expect(idsOf(consumer.frames)).toEqual(["d-d1"]);
  });

  it("an expired row is marked EXPIRED and is never sent", async () => {
    addDeliveryEvent(db, { eventId: "event-e1", subjectKey: "viewer-e1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-e1" });
    addApprovedText(db, "event-e1", "too late");
    const consumer = fakeConsumer("grant-1");
    registry.attach(consumer.subscriber);
    clock.now = new Date(AFTER_DEADLINE);

    const report = await pumpFor(db, registry, clock).runPass();

    expect(report).toMatchObject({ expired: 1, sent: 0 });
    expect(consumer.frames).toEqual([]);
    expect(statusOf(db, "d-e1")).toBe("EXPIRED");
  });

  it("an ALLOW row without approved content is marked FAILED and is not shown", async () => {
    addDeliveryEvent(db, { eventId: "event-f1", subjectKey: "viewer-f1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-f1" });
    const consumer = fakeConsumer("grant-1");
    registry.attach(consumer.subscriber);

    const report = await pumpFor(db, registry, clock).runPass();

    expect(report.failed).toBe(1);
    expect(consumer.frames).toEqual([]);
    expect(statusOf(db, "d-f1")).toBe("FAILED");
  });

  it("a refused frame counts an attempt and holds the rows behind it, and the row fails for good at the limit", async () => {
    addDeliveryEvent(db, { eventId: "event-g1", subjectKey: "viewer-g1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-g1" });
    addDeliveryEvent(db, { eventId: "event-g2", subjectKey: "viewer-g2", platformOrder: 2, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-g2" });
    addApprovedText(db, "event-g1", "first");
    addApprovedText(db, "event-g2", "second");
    const consumer = fakeConsumer("grant-1");
    consumer.state.reject = true;
    registry.attach(consumer.subscriber);
    const pump = pumpFor(db, registry, clock, 3);

    const first = await pump.runPass();
    expect(first).toMatchObject({ retried: 1, failed: 0 });
    expect(attemptsOf(db, "d-g1")).toBe(1);
    expect(statusOf(db, "d-g1")).toBe("PENDING");
    expect(attemptsOf(db, "d-g2")).toBe(0);

    await pump.runPass();
    expect(attemptsOf(db, "d-g1")).toBe(2);

    const third = await pump.runPass();
    expect(third.failed).toBe(1);
    expect(statusOf(db, "d-g1")).toBe("FAILED");
    expect(attemptsOf(db, "d-g1")).toBe(3);
    expect(statusOf(db, "d-g2")).toBe("PENDING");
    expect(consumer.frames).toEqual([]);
  });

  it("a row that changed while its frame was in flight is not overwritten with SENT", async () => {
    addDeliveryEvent(db, { eventId: "event-h1", subjectKey: "viewer-h1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-h1" });
    addApprovedText(db, "event-h1", "changing");
    const consumer = fakeConsumer("grant-1", {
      onSend: () => db.database.sqlite.prepare("UPDATE deliveries SET status = 'CANCELLED' WHERE id = 'd-h1'").run(),
    });
    registry.attach(consumer.subscriber);

    const report = await pumpFor(db, registry, clock).runPass();

    expect(report.sent).toBe(0);
    expect(statusOf(db, "d-h1")).toBe("CANCELLED");
  });

  it("the delivery port refuses SENT for a row that expired after it was read", () => {
    addDeliveryEvent(db, { eventId: "event-i1", subjectKey: "viewer-i1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-i1" });
    const port = createOutputDeliveryPort(db.database);

    const rows = port.readSendable({ channelId: "channel-a", nowIso: DECIDED_AT, limit: 10 });
    expect(rows.map((row) => row.deliveryId)).toEqual(["d-i1"]);
    expect(port.markSent({ deliveryId: "d-i1", nowIso: AFTER_DEADLINE })).toBe(false);
    expect(statusOf(db, "d-i1")).toBe("PENDING");
  });

  it("a row stays PENDING when the last consumer leaves before it, and the rows behind it wait too", async () => {
    addDeliveryEvent(db, { eventId: "event-j1", subjectKey: "viewer-j1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-j1" });
    addDeliveryEvent(db, { eventId: "event-j2", subjectKey: "viewer-j2", platformOrder: 2, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-j2" });
    addApprovedText(db, "event-j1", "first");
    addApprovedText(db, "event-j2", "second");
    const leaving = fakeConsumer("grant-1", { onSend: () => registry.detach(leaving.subscriber) });
    registry.attach(leaving.subscriber);

    const report = await pumpFor(db, registry, clock).runPass();

    expect(report).toMatchObject({ sent: 1, failed: 0 });
    expect(idsOf(leaving.frames)).toEqual(["d-j1"]);
    expect(statusOf(db, "d-j1")).toBe("SENT");
    expect(statusOf(db, "d-j2")).toBe("PENDING");
    expect(attemptsOf(db, "d-j2")).toBe(0);
  });

  it("a consumer that joins during a send does not get a row that is marked SENT without it", async () => {
    addDeliveryEvent(db, { eventId: "event-k1", subjectKey: "viewer-k1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-k1" });
    addApprovedText(db, "event-k1", "joined");
    const late = fakeConsumer("grant-2");
    let joinedAlready = false;
    const early = fakeConsumer("grant-1", {
      onSend: () => {
        if (joinedAlready) return;
        joinedAlready = true;
        registry.attach(late.subscriber);
      },
    });
    registry.attach(early.subscriber);
    const pump = pumpFor(db, registry, clock);

    const first = await pump.runPass();
    expect(first.sent).toBe(0);
    expect(statusOf(db, "d-k1")).toBe("PENDING");
    expect(idsOf(late.frames)).toEqual([]);

    const second = await pump.runPass();
    expect(second.sent).toBe(1);
    expect(statusOf(db, "d-k1")).toBe("SENT");
    expect(idsOf(late.frames)).toEqual(["d-k1"]);
  });
});
