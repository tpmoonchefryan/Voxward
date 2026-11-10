import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CERTIFICATE_SUMMARY,
  createAuditStore,
  createInvalidationBus,
  type AuditService,
  type InvalidationBus,
  type InvalidationEvent,
} from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import { CHANNEL_ID, FULL_ACCESS, NOW, SUBJECT_A, SUBJECT_B, countWhere, createTask, openFixture, type Fixture } from "../helpers.js";

/*
 * VW-SUB030-AC001: the deletion index locates all controlled content of one subject, including inside a micro-batch
 * that also holds another subject, and deleting one subject leaves the other untouched.
 */

let fixture: Fixture;
let bus: InvalidationBus;
let events: InvalidationEvent[];
let service: AuditService;
let idCounter = 0;

beforeEach(() => {
  fixture = openFixture("deletion-");
  events = [];
  bus = createInvalidationBus((error) => {
    throw error;
  });
  bus.subscribe((event) => events.push(event));
  service = createAuditStore({
    port: fixture.port,
    sanitize: redactText,
    newId: () => `del-${++idCounter}`,
    access: FULL_ACCESS,
    clock: () => NOW,
    invalidation: bus,
  });
  seedMicroBatch();
});

afterEach(() => {
  fixture.close();
});

/**
 * Three messages in one batch: m1 and m3 belong to subject A, m2 to subject B. Each message has message text and AI
 * results. Subject A and subject B also have their own score changes and a manual verdict.
 */
function seedMicroBatch(): void {
  const taskM1 = createTask(fixture, "m1", SUBJECT_A);
  const taskM2 = createTask(fixture, "m2", SUBJECT_B);
  const taskM3 = createTask(fixture, "m3", SUBJECT_A);
  const base = { contractVersion: "1", kind: "TECHNICAL", channelId: CHANNEL_ID, status: "OK", level: "INFO" } as const;

  const write = (correlationId: string, subject: string, task: string, text: string, itemId: string) => {
    service.recordTechnical({
      ...base,
      correlationId,
      stage: "INGEST",
      subjectRef: subject,
      batchId: "batch-x",
      taskId: task,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      evidence: [{ kind: "MESSAGE_TEXT", payload: text }],
    });
    service.recordTechnical({
      ...base,
      correlationId,
      stage: "JSON_VALIDATE",
      subjectRef: subject,
      batchId: "batch-x",
      taskId: task,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      evidence: [
        { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId, classification: "BLOCK" }) },
        { kind: "ITEM_ID_MAP", payload: JSON.stringify({ [itemId]: correlationId }) },
      ],
    });
  };
  write("corr-m1", SUBJECT_A, taskM1, "synthetic text one", "item-1");
  write("corr-m2", SUBJECT_B, taskM2, "synthetic text two", "item-2");
  write("corr-m3", SUBJECT_A, taskM3, "synthetic text three", "item-3");

  service.recordChange({
    contractVersion: "1",
    kind: "CHANGE",
    channelId: CHANNEL_ID,
    actor: { kind: "SYSTEM", ref: "system" },
    changeKind: "SCORE_CHANGED",
    outcome: "SUCCEEDED",
    summary: "score changed by -5 after message one",
    correlationId: "corr-m1",
  });
  service.recordChange({
    contractVersion: "1",
    kind: "CHANGE",
    channelId: CHANNEL_ID,
    actor: { kind: "SYSTEM", ref: "system" },
    changeKind: "SCORE_CHANGED",
    outcome: "SUCCEEDED",
    summary: "score changed by -3 after message three",
    correlationId: "corr-m3",
  });
  service.recordChange({
    contractVersion: "1",
    kind: "CHANGE",
    channelId: CHANNEL_ID,
    actor: { kind: "ACCOUNT", ref: "account-moderator" },
    changeKind: "MANUAL_VERDICT",
    outcome: "SUCCEEDED",
    summary: "manual verdict for message two",
    correlationId: "corr-m2",
  });
}

describe("locating one subject's controlled content", () => {
  it("finds every log, evidence row and linked change row of that subject, and none of the other subject's", () => {
    const scope = service.locateSubject(SUBJECT_A);
    // Subject A has two chains (m1, m3), each with two log rows and three evidence rows (text, AI JSON, item map).
    expect(scope.logIds).toHaveLength(4);
    expect(scope.evidenceIds).toHaveLength(6);
    expect([...scope.correlationIds].sort()).toEqual(["corr-m1", "corr-m3"]);
    expect(scope.changeLogIds).toHaveLength(2);

    const other = service.locateSubject(SUBJECT_B);
    expect(other.correlationIds).toEqual(["corr-m2"]);
    expect(other.logIds).toHaveLength(2);
    expect(other.changeLogIds).toHaveLength(1);
  });

  it("returns an empty scope for a subject with no logs", () => {
    expect(service.locateSubject("subject-none")).toEqual({ logIds: [], correlationIds: [], evidenceIds: [], changeLogIds: [] });
  });

  it("rejects an empty subject id", () => {
    expect(() => service.locateSubject("   ")).toThrow(/subjectId/);
  });
});

describe("removing one subject from a micro-batch", () => {
  it("removes that subject's log rows and evidence, and leaves the other subject's rows intact", () => {
    const located = service.locateSubject(SUBJECT_A);
    const removed = service.removeSubject(SUBJECT_A);
    expect(removed).toEqual(located);

    expect(countWhere(fixture.database, "technical_logs", "subject_id = ?", [SUBJECT_A])).toBe(0);
    expect(countWhere(fixture.database, "technical_logs", "correlation_id in ('corr-m1', 'corr-m3')")).toBe(0);
    // Only subject B's three evidence rows remain.
    expect(countWhere(fixture.database, "technical_log_evidence", "1 = 1")).toBe(3);

    const survivor = fixture.port.readChain("corr-m2", [CHANNEL_ID]);
    expect(survivor).toHaveLength(2);
    expect(survivor.every((item) => item.log.batchId === "batch-x")).toBe(true);
    expect(JSON.stringify(survivor)).toContain("item-2");
    expect(JSON.stringify(survivor)).not.toContain("item-1");
  });

  it("replaces the summary of the removed chains' Change Log rows with the certificate and keeps the others", () => {
    service.removeSubject(SUBJECT_A);
    const rows = fixture.database.sqlite
      .prepare("select correlation_id as correlationId, summary from change_logs order by correlation_id")
      .all() as Array<{ correlationId: string; summary: string }>;
    const byChain = Object.fromEntries(rows.map((row) => [row.correlationId, row.summary]));

    expect(byChain["corr-m1"]).toBe(CERTIFICATE_SUMMARY);
    expect(byChain["corr-m3"]).toBe(CERTIFICATE_SUMMARY);
    expect(byChain["corr-m2"]).toBe("manual verdict for message two");
    // The certificate keeps no historical score.
    expect(JSON.stringify(rows)).not.toContain("-5");
    expect(JSON.stringify(rows)).not.toContain("-3");
  });

  it("publishes one DELETED event after the commit, with the removed identifiers", () => {
    let rowsAtPublish = -1;
    bus.subscribe(() => {
      rowsAtPublish = countWhere(fixture.database, "technical_logs", "subject_id = ?", [SUBJECT_A]);
    });

    const removed = service.removeSubject(SUBJECT_A);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      reason: "DELETED",
      logIds: removed.logIds,
      correlationIds: removed.correlationIds,
      changeLogIds: removed.changeLogIds,
    });
    // The listener saw the deletion already committed.
    expect(rowsAtPublish).toBe(0);
  });

  it("treats a repeat deletion as a no-op that publishes nothing", () => {
    service.removeSubject(SUBJECT_A);
    const again = service.removeSubject(SUBJECT_A);
    expect(again).toEqual({ logIds: [], correlationIds: [], evidenceIds: [], changeLogIds: [] });
    expect(events).toHaveLength(1);
  });

  it("commits the deletion even when a listener fails, and reports that failure", () => {
    const failures: unknown[] = [];
    const tolerant = createInvalidationBus((error) => failures.push(error));
    tolerant.subscribe(() => {
      throw new Error("listener failed");
    });
    const survivorEvents: InvalidationEvent[] = [];
    tolerant.subscribe((event) => survivorEvents.push(event));
    const local = createAuditStore({
      port: fixture.port,
      sanitize: redactText,
      newId: () => `tolerant-${++idCounter}`,
      access: FULL_ACCESS,
      clock: () => NOW,
      invalidation: tolerant,
    });

    local.removeSubject(SUBJECT_A);

    expect(countWhere(fixture.database, "technical_logs", "subject_id = ?", [SUBJECT_A])).toBe(0);
    expect(failures).toHaveLength(1);
    expect(survivorEvents).toHaveLength(1);
  });

  it("stops publishing to a listener that has unsubscribed", () => {
    const unsubscribe = bus.subscribe(() => {
      throw new Error("must not run after unsubscribe");
    });
    unsubscribe();
    expect(() => service.removeSubject(SUBJECT_A)).not.toThrow();
  });
});
