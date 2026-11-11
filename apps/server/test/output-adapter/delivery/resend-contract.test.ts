import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSubscriptionRegistry } from "../../../src/modules/output-adapter/subscription.js";
import { RESEND_CONTRACT, decideSend } from "../../../src/modules/output-adapter/resend.js";
import {
  DECIDED_AT,
  decisionService,
  moderator,
  type OpenDatabase,
  openDecisionDatabase,
  seedChannel,
} from "../../decision-service/fixtures.js";
import { AFTER_DEADLINE, addApprovedText, addDeliveryEvent, fakeConsumer, idsOf, pumpFor, statusOf } from "./helpers.js";

describe("send and resend rules (VW-SUB040-AC001, m6 N2)", () => {
  it("only a PENDING row that has not expired is sent", () => {
    const valid = { validUntil: "2026-11-10T10:05:00.000Z" };
    expect(decideSend({ status: "PENDING", ...valid }, DECIDED_AT)).toBe("SEND");
    expect(decideSend({ status: "PENDING", ...valid }, AFTER_DEADLINE)).toBe("SKIP_EXPIRED");
    expect(decideSend({ status: "SENT", ...valid }, DECIDED_AT)).toBe("SKIP_NOT_PENDING");
    expect(decideSend({ status: "EXPIRED", ...valid }, DECIDED_AT)).toBe("SKIP_NOT_PENDING");
    expect(decideSend({ status: "FAILED", ...valid }, DECIDED_AT)).toBe("SKIP_NOT_PENDING");
    expect(decideSend({ status: "CANCELLED", ...valid }, DECIDED_AT)).toBe("SKIP_NOT_PENDING");
  });

  it("the output never replays by itself: no expired row and no SENT row", () => {
    expect(RESEND_CONTRACT).toEqual({
      automaticReplayOfExpired: false,
      replayOfSentRows: false,
      explicitResendOwner: "decision-service",
    });
  });

  describe("against the real decision store", () => {
    let db: OpenDatabase;
    let registry: ReturnType<typeof createSubscriptionRegistry>;
    let clock: { now: Date };

    beforeEach(() => {
      db = openDecisionDatabase("resend-contract-");
      seedChannel(db.database, "channel-a");
      registry = createSubscriptionRegistry();
      clock = { now: new Date(DECIDED_AT) };
    });

    afterEach(() => db.close());

    it("a SENT row cannot be resent: the decision service refuses it with ALREADY_SENT", async () => {
      addDeliveryEvent(db, { eventId: "event-r1", subjectKey: "viewer-r1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-r1" });
      addApprovedText(db, "event-r1", "sent once");
      const consumer = fakeConsumer("grant-1");
      registry.attach(consumer.subscriber);
      await pumpFor(db, registry, clock).runPass();
      expect(statusOf(db, "d-r1")).toBe("SENT");

      const outcome = await decisionService(db.database, { now: AFTER_DEADLINE }).resend({
        deliveryId: "d-r1",
        operationId: "resend-1",
        actor: moderator("mod-1"),
      });

      expect(outcome).toEqual({ status: "refused", reason: "ALREADY_SENT" });
      expect(idsOf(consumer.frames)).toEqual(["d-r1"]);
    });

    it("an expired row is not sent by the output, and an explicit resend creates one new row that is sent once", async () => {
      addDeliveryEvent(db, { eventId: "event-r2", subjectKey: "viewer-r2", platformOrder: 2, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-r2" });
      addApprovedText(db, "event-r2", "resend text");
      const consumer = fakeConsumer("grant-1");
      registry.attach(consumer.subscriber);
      clock.now = new Date(AFTER_DEADLINE);
      const pump = pumpFor(db, registry, clock);

      expect(await pump.runPass()).toMatchObject({ expired: 1, sent: 0 });
      expect(statusOf(db, "d-r2")).toBe("EXPIRED");

      const resent = await decisionService(db.database, { now: AFTER_DEADLINE }).resend({
        deliveryId: "d-r2",
        operationId: "resend-2",
        actor: moderator("mod-1"),
      });
      expect(resent).toMatchObject({ status: "resent" });

      clock.now = new Date("2026-11-10T10:06:30.000Z");
      expect((await pump.runPass()).sent).toBe(1);
      expect(idsOf(consumer.frames)).toEqual(["resend:channel-a:resend-2"]);
      expect(statusOf(db, "resend:channel-a:resend-2")).toBe("SENT");
      expect(await pump.runPass()).toMatchObject({ sent: 0 });
    });
  });
});
