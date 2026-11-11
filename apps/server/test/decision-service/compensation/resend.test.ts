import { createVerdict } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SubjectStore } from "../../../src/db/repository.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import {
  countWhere,
  dataAdmin,
  decisionService,
  moderator,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// The verdict is decided at 10:00:10. Its delivery expires at 10:05:00. The message arrived at 10:00:00.
const BEFORE_EXPIRY = "2026-11-10T10:04:00.000Z";
const AFTER_EXPIRY = "2026-11-10T10:06:00.000Z";
const AFTER_WINDOW = "2026-11-10T10:11:00.000Z";

// VW-SUB027-AC001（补发必须明确且受有效期限制）
describe("expired deliveries are resent only by an explicit, time-limited action (VW-SUB027-AC001)", () => {
  let db: OpenDatabase;

  function firstDeliveryId(): string {
    return (db.database.sqlite.prepare("SELECT id FROM deliveries ORDER BY rowid LIMIT 1").get() as { id: string }).id;
  }

  async function settleBlock(): Promise<void> {
    await decisionService(db.database).commit("task-1", createVerdict("BLOCK"), { kind: "HUMAN", actor: moderator("mod-1") });
  }

  beforeEach(() => {
    db = openDecisionDatabase("decision-resend-");
    seedChannel(db.database, "channel-a");
    seedOpenTask(db.database, {
      channelId: "channel-a",
      subjectKey: "viewer-1",
      subjectId: "subject-1",
      eventId: "event-1",
      platformMessageRef: "msg-1",
      taskId: "task-1",
    });
  });

  afterEach(() => db.close());

  it("a delivery that has not expired cannot be resent", async () => {
    await settleBlock();

    const outcome = await decisionService(db.database, { now: BEFORE_EXPIRY }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "NOT_EXPIRED" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(1);
  });

  it("an expired delivery is resent once, with a new validity window of one minute", async () => {
    await settleBlock();

    const outcome = await decisionService(db.database, { now: AFTER_EXPIRY }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({
      status: "resent",
      intent: {
        contractVersion: "1",
        eventRef: { contractVersion: "1", channelId: "channel-a", platformMessageId: "msg-1", correlationId: "corr-event-1" },
        verdict: "BLOCK",
        platformOrder: 1,
        deliverySequence: 2,
        validUntil: "2026-11-10T10:07:00.000Z",
      },
    });
    const resent = db.database.sqlite
      .prepare("SELECT status, valid_until, delivery_sequence FROM deliveries WHERE id = ?")
      .get("resend:channel-a:resend-1") as { status: string; valid_until: string; delivery_sequence: number };
    expect(resent).toEqual({ status: "PENDING", valid_until: "2026-11-10T10:07:00.000Z", delivery_sequence: 2 });
  });

  it("a repeated resend with the same operation identifier is a duplicate and adds no delivery", async () => {
    await settleBlock();
    const service = decisionService(db.database, { now: AFTER_EXPIRY });
    await service.resend({ deliveryId: firstDeliveryId(), operationId: "resend-1", actor: moderator("mod-1") });

    const again = await service.resend({ deliveryId: firstDeliveryId(), operationId: "resend-1", actor: moderator("mod-1") });

    expect(again).toEqual({ status: "duplicate", deliveryId: "resend:channel-a:resend-1" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(2);
  });

  it("a delivery whose verdict was overturned is no longer current, so it cannot be resent", async () => {
    await settleBlock();
    await decisionService(db.database, { now: AFTER_EXPIRY }).overturn({
      eventId: "event-1",
      operationId: "op-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      actor: moderator("mod-1"),
    });

    const outcome = await decisionService(db.database, { now: AFTER_EXPIRY }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "NOT_CURRENT" });
  });

  it("a delivery is not resent once its message is older than the resend window", async () => {
    await settleBlock();

    const outcome = await decisionService(db.database, { now: AFTER_WINDOW }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "WINDOW_CLOSED" });
  });

  it("a resend after a deletion crossing is refused as a stale generation", async () => {
    await settleBlock();
    runShortTransaction(db.database, (tx) => SubjectStore.bumpGeneration(tx, "subject-1"));

    const outcome = await decisionService(db.database, { now: AFTER_EXPIRY }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "STALE_GENERATION" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(1);
  });

  it("a delivery the output already marked SENT is not resent, so the downstream does not get the message twice", async () => {
    await settleBlock();
    db.database.sqlite.prepare("UPDATE deliveries SET status = 'SENT' WHERE id = ?").run(firstDeliveryId());

    const outcome = await decisionService(db.database, { now: AFTER_EXPIRY }).resend({
      deliveryId: firstDeliveryId(),
      operationId: "resend-1",
      actor: moderator("mod-1"),
    });

    expect(outcome).toEqual({ status: "refused", reason: "ALREADY_SENT" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM deliveries")).toBe(1);
  });

  it("a data admin cannot resend, and an unknown delivery is refused", async () => {
    await settleBlock();
    const service = decisionService(db.database, { now: AFTER_EXPIRY });

    expect(await service.resend({ deliveryId: firstDeliveryId(), operationId: "resend-1", actor: dataAdmin("admin-1") })).toEqual({
      status: "denied",
      reason: "PERMISSION_DENIED",
    });
    expect(await service.resend({ deliveryId: "delivery-missing", operationId: "resend-2", actor: moderator("mod-1") })).toEqual({
      status: "refused",
      reason: "NOT_FOUND",
    });
  });
});
