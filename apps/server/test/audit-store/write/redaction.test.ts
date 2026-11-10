import { describe, expect, it, afterEach, beforeEach } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { findSecretPatterns, REDACTED } from "../../../src/security/redaction.js";
import { CHANNEL_ID, SUBJECT_A, countWhere, createTask, openFixture, type Fixture } from "../helpers.js";

/*
 * Log writes go through the server's redactText (S003). Every secret shape below is synthetic. The test checks that
 * the stored text no longer contains the secret, in any log table, and that the secret kind is still detectable as
 * replaced.
 */

const SYNTHETIC_MODEL_KEY = "sk-syntheticKEY0123456789abcdefghij";
const SYNTHETIC_BEARER = "Bearer syntheticTOKEN0123456789";

let fixture: Fixture;

beforeEach(() => {
  fixture = openFixture("redaction-");
});

afterEach(() => {
  fixture.close();
});

function everyLogTextContains(database: VoxwardDatabase, needle: string): number {
  const tables: Array<[string, string]> = [
    ["change_logs", "summary || ' ' || actor_ref"],
    ["technical_logs", "coalesce(provider_ref,'') || ' ' || coalesce(model_ref,'') || ' ' || coalesce(rule_template_version,'') || ' ' || coalesce(data_json,'')"],
    ["technical_log_evidence", "payload"],
  ];
  return tables.reduce((total, [table, expression]) => total + countWhere(database, table, `instr(${expression}, ?) > 0`, [needle]), 0);
}

describe("secrets never reach the log tables", () => {
  it("redacts a secret inside message text before it is stored", () => {
    const task = createTask(fixture, "r1", SUBJECT_A);
    fixture.service.recordTechnical({
      contractVersion: "1",
      kind: "TECHNICAL",
      channelId: CHANNEL_ID,
      correlationId: "corr-r1",
      stage: "INGEST",
      status: "OK",
      level: "INFO",
      subjectRef: SUBJECT_A,
      batchId: null,
      taskId: task,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      evidence: [{ kind: "MESSAGE_TEXT", payload: `please check ${SYNTHETIC_MODEL_KEY} and ${SYNTHETIC_BEARER}` }],
    });

    const stored = fixture.database.sqlite
      .prepare("select payload from technical_log_evidence")
      .get() as { payload: string };
    expect(stored.payload).toContain(REDACTED);
    expect(findSecretPatterns(stored.payload)).toEqual([]);
    expect(everyLogTextContains(fixture.database, SYNTHETIC_MODEL_KEY)).toBe(0);
    expect(everyLogTextContains(fixture.database, "syntheticTOKEN0123456789")).toBe(0);
  });

  it("redacts a secret in the Change Log summary, the provider reference and the structured data", () => {
    fixture.service.recordTechnical({
      contractVersion: "1",
      kind: "TECHNICAL",
      channelId: CHANNEL_ID,
      correlationId: "corr-r2",
      stage: "MODEL_CALL",
      status: "FAILED",
      level: "ERROR",
      subjectRef: SUBJECT_A,
      batchId: null,
      taskId: null,
      attempt: 1,
      errorCode: "PROVIDER_REJECTED",
      providerRef: SYNTHETIC_BEARER,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: 12,
      data: { reason: `key was ${SYNTHETIC_MODEL_KEY}`, retry: true },
      evidence: [],
    });
    fixture.service.recordChange({
      contractVersion: "1",
      kind: "CHANGE",
      channelId: CHANNEL_ID,
      actor: { kind: "DEPLOYMENT_ADMIN", ref: "admin-ref" },
      changeKind: "CREDENTIAL_CHANGED",
      outcome: "SUCCEEDED",
      summary: `replaced credential ${SYNTHETIC_MODEL_KEY}`,
      correlationId: "corr-r2",
    });

    const change = fixture.database.sqlite.prepare("select summary from change_logs").get() as { summary: string };
    expect(change.summary).toContain(REDACTED);
    expect(everyLogTextContains(fixture.database, SYNTHETIC_MODEL_KEY)).toBe(0);
    expect(everyLogTextContains(fixture.database, "syntheticTOKEN0123456789")).toBe(0);
  });
});
