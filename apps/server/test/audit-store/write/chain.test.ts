import { EVIDENCE_KINDS, type TechnicalLogEntry } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import { AuditInputError } from "../../../src/modules/audit-store/index.js";
import { countWhere, createTask, openFixture, SUBJECT_A, SUBJECT_B, CHANNEL_ID, type Fixture } from "../helpers.js";

/*
 * VW-SUB029-AC001: the same message's rule, model, retry, manual, scoring and delivery steps are logged under one
 * correlation id; the original text never reaches the Change Log; a micro-batch keeps each message's results apart.
 */

let fixture: Fixture;

beforeEach(() => {
  fixture = openFixture("chain-");
});

afterEach(() => {
  fixture.close();
});

/** A Technical Log entry with neutral defaults. A test overrides only the fields it cares about. */
function step(overrides: Partial<TechnicalLogEntry> & Pick<TechnicalLogEntry, "correlationId" | "stage">): TechnicalLogEntry {
  return {
    contractVersion: "1",
    kind: "TECHNICAL",
    channelId: CHANNEL_ID,
    status: "OK",
    level: "INFO",
    subjectRef: SUBJECT_A,
    batchId: null,
    taskId: null,
    attempt: null,
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    data: null,
    evidence: [],
    ...overrides,
  };
}

describe("one message's chain", () => {
  it("keeps one correlation id and a contiguous sequence across every step", () => {
    const task = createTask(fixture, "m1", SUBJECT_A);
    const correlationId = "corr-m1";
    const { service, port } = fixture;

    service.recordTechnical(step({ correlationId, stage: "INGEST", taskId: task, batchId: "batch-1" }));
    service.recordTechnical(step({ correlationId, stage: "BASE_RULE", taskId: task, batchId: "batch-1", ruleTemplateVersion: "rule-v1" }));
    service.recordTechnical(
      step({
        correlationId,
        stage: "MODEL_CALL",
        status: "FAILED",
        level: "WARN",
        errorCode: "MODEL_TIMEOUT",
        attempt: 1,
        taskId: task,
        batchId: "batch-1",
        providerRef: "synthetic-provider",
        modelRef: "synthetic-model",
      }),
    );
    service.recordTechnical(
      step({ correlationId, stage: "MODEL_CALL", attempt: 2, taskId: task, batchId: "batch-1", modelRef: "synthetic-model" }),
    );
    service.recordTechnical(
      step({
        correlationId,
        stage: "JSON_VALIDATE",
        taskId: task,
        batchId: "batch-1",
        evidence: [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-1", classification: "BLOCK" }) }],
      }),
    );
    service.recordTechnical(step({ correlationId, stage: "COMMIT", taskId: task, batchId: "batch-1" }));
    service.recordTechnical(step({ correlationId, stage: "DELIVER", taskId: task, batchId: "batch-1" }));

    const chain = port.readChain(correlationId, [CHANNEL_ID]);
    expect(chain.map((item) => item.log.sequence)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chain.map((item) => item.log.stage)).toEqual([
      "INGEST",
      "BASE_RULE",
      "MODEL_CALL",
      "MODEL_CALL",
      "JSON_VALIDATE",
      "COMMIT",
      "DELIVER",
    ]);
    expect(new Set(chain.map((item) => item.log.correlationId))).toEqual(new Set([correlationId]));
    expect(chain.map((item) => item.log.attempt)).toEqual([null, null, 1, 2, null, null, null]);
    expect(chain.every((item) => item.log.taskId === task)).toBe(true);
  });

  it("writes the manual verdict and the score change to the Change Log under the same correlation id", () => {
    const correlationId = "corr-m1";
    const { service, port } = fixture;
    service.recordChange({
      contractVersion: "1",
      kind: "CHANGE",
      channelId: CHANNEL_ID,
      actor: { kind: "ACCOUNT", ref: "account-moderator" },
      changeKind: "MANUAL_VERDICT",
      outcome: "SUCCEEDED",
      summary: "manual verdict recorded for one message",
      correlationId,
    });
    service.recordChange({
      contractVersion: "1",
      kind: "CHANGE",
      channelId: CHANNEL_ID,
      actor: { kind: "SYSTEM", ref: "system" },
      changeKind: "SCORE_CHANGED",
      outcome: "SUCCEEDED",
      summary: "score change applied after commit",
      correlationId,
    });

    const changes = port.readChangeLogs(correlationId, [CHANNEL_ID]);
    expect(changes.map((row) => row.changeKind)).toEqual(["MANUAL_VERDICT", "SCORE_CHANGED"]);
    expect(new Set(changes.map((row) => row.correlationId))).toEqual(new Set([correlationId]));
  });
});

describe("micro-batch with two subjects", () => {
  it("keeps each message's evidence and results apart", () => {
    const taskA = createTask(fixture, "m2", SUBJECT_A);
    const taskB = createTask(fixture, "m3", SUBJECT_B);
    const { service, port } = fixture;

    service.recordTechnical(
      step({
        correlationId: "corr-m2",
        stage: "JSON_VALIDATE",
        subjectRef: SUBJECT_A,
        taskId: taskA,
        batchId: "batch-2",
        evidence: [
          { kind: "MESSAGE_TEXT", payload: "synthetic text for message two" },
          { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-2", classification: "ALLOW_MEANINGFUL" }) },
        ],
      }),
    );
    service.recordTechnical(
      step({
        correlationId: "corr-m3",
        stage: "JSON_VALIDATE",
        subjectRef: SUBJECT_B,
        taskId: taskB,
        batchId: "batch-2",
        evidence: [
          { kind: "MESSAGE_TEXT", payload: "synthetic text for message three" },
          { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-3", classification: "BLOCK" }) },
        ],
      }),
    );

    const two = port.readChain("corr-m2", [CHANNEL_ID]);
    const three = port.readChain("corr-m3", [CHANNEL_ID]);
    expect(two).toHaveLength(1);
    expect(three).toHaveLength(1);
    expect(two[0]?.log.batchId).toBe("batch-2");
    expect(three[0]?.log.batchId).toBe("batch-2");

    const twoText = JSON.stringify(two[0]?.evidence);
    const threeText = JSON.stringify(three[0]?.evidence);
    expect(twoText).toContain("item-2");
    expect(twoText).not.toContain("item-3");
    expect(threeText).toContain("item-3");
    expect(threeText).not.toContain("item-2");
  });
});

describe("suggestion and adoption", () => {
  it("keeps the model's suggestion in the Technical Log and writes the adoption only when it is applied", () => {
    const { service, port, database } = fixture;
    service.recordTechnical(
      step({
        correlationId: "corr-m4",
        stage: "JSON_VALIDATE",
        evidence: [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-4", classification: "BLOCK" }) }],
      }),
    );

    // The suggestion alone changes no score, so the Change Log has nothing for this chain yet.
    expect(port.readChangeLogs("corr-m4", [CHANNEL_ID])).toHaveLength(0);

    service.recordChange({
      contractVersion: "1",
      kind: "CHANGE",
      channelId: CHANNEL_ID,
      actor: { kind: "SYSTEM", ref: "system" },
      changeKind: "SCORE_CHANGED",
      outcome: "SUCCEEDED",
      summary: "score change applied",
      correlationId: "corr-m4",
    });

    expect(port.readChangeLogs("corr-m4", [CHANNEL_ID]).map((row) => row.changeKind)).toEqual(["SCORE_CHANGED"]);
    expect(port.readChain("corr-m4", [CHANNEL_ID])[0]?.evidence.map((item) => item.kind)).toEqual(["VALIDATED_JSON"]);
    // The adoption row holds a summary only. The suggestion JSON never reaches it.
    expect(countWhere(database, "change_logs", "summary like ?", ["%item-4%"])).toBe(0);
  });
});

describe("content boundaries", () => {
  it("does not copy the original message text into the Change Log", () => {
    const { service, database } = fixture;
    service.recordTechnical(
      step({
        correlationId: "corr-m5",
        stage: "INGEST",
        evidence: [{ kind: "MESSAGE_TEXT", payload: "synthetic-original-body-marker" }],
      }),
    );
    service.recordChange({
      contractVersion: "1",
      kind: "CHANGE",
      channelId: CHANNEL_ID,
      actor: { kind: "SYSTEM", ref: "system" },
      changeKind: "SCORE_CHANGED",
      outcome: "SUCCEEDED",
      summary: "score change applied",
      correlationId: "corr-m5",
    });

    expect(countWhere(database, "change_logs", "summary like ? or actor_ref like ?", ["%body-marker%", "%body-marker%"])).toBe(0);
    expect(countWhere(database, "technical_log_evidence", "payload like ?", ["%body-marker%"])).toBe(1);
  });

  it("stores only the four evidence kinds: no transcript, prompt or key kind exists", () => {
    const { database } = fixture;
    const kinds = database.sqlite.prepare("select distinct evidence_kind as kind from technical_log_evidence").all() as Array<{ kind: string }>;
    for (const row of kinds) expect(EVIDENCE_KINDS).toContain(row.kind);

    expect(() =>
      fixture.service.recordTechnical(
        step({
          correlationId: "corr-m6",
          stage: "MODEL_CALL",
          evidence: [{ kind: "SESSION_TRANSCRIPT" as unknown as "MESSAGE_TEXT", payload: "full session" }],
        }),
      ),
    ).toThrow(AuditInputError);
  });

  it("refuses an evidence item on an entry that names no subject", () => {
    expect(() =>
      fixture.service.recordTechnical(
        step({
          correlationId: "corr-m7",
          stage: "INGEST",
          subjectRef: null,
          evidence: [{ kind: "MESSAGE_TEXT", payload: "synthetic" }],
        }),
      ),
    ).toThrow(/subjectRef/);
  });

  it("refuses a subject from another channel and writes nothing", () => {
    const { service, database } = fixture;
    expect(() =>
      service.recordTechnical(
        step({ correlationId: "corr-m8", stage: "INGEST", channelId: "channel-other", subjectRef: SUBJECT_A }),
      ),
    ).toThrow();
    expect(countWhere(database, "technical_logs", "correlation_id = ?", ["corr-m8"])).toBe(0);
  });
});

describe("persistence through the database port", () => {
  it("reads a chain only from the channels it is given", () => {
    fixture.service.recordTechnical(step({ correlationId: "corr-m9", stage: "INGEST" }));
    expect(fixture.port.readChain("corr-m9", ["channel-elsewhere"])).toEqual([]);
    expect(fixture.port.readChain("corr-m9", [])).toEqual([]);
  });

  it("uses a fresh port over the same database to read what the module wrote", () => {
    fixture.service.recordTechnical(step({ correlationId: "corr-m10", stage: "INGEST" }));
    const rereadPort = createAuditLogPort(fixture.database);
    expect(rereadPort.readChain("corr-m10", [CHANNEL_ID]).map((item) => item.log.stage)).toEqual(["INGEST"]);
  });
});
