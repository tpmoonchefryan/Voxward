import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../src/db/client.js";
import {
  ChannelEventStore,
  ScoreExceptionStore,
  ScoreLedgerStore,
  SubjectStore,
  TaskStore,
  type CommitVerdictResult,
} from "../../src/db/repository.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import {
  countRows,
  migratedDatabase,
  removeDirectory,
  scratchDirectory,
  seedChannelAndSubject,
  T0,
  type Seed,
} from "./helpers.js";

const EVENT_TIME = "2026-11-10T10:01:00.000Z";

let directory: string;
let database: VoxwardDatabase;
let seed: Seed;

beforeEach(() => {
  directory = scratchDirectory("repo-");
  database = migratedDatabase(directory);
  seed = seedChannelAndSubject(database);
});

afterEach(() => {
  database.close();
  removeDirectory(directory);
});

function recordEvent(ref: string, channelId = seed.channelId, subjectId = seed.subjectId): string {
  const result = runShortTransaction(database, (tx) =>
    ChannelEventStore.recordIfNew(tx, {
      id: `event-${channelId}-${ref}`,
      channelId,
      subjectId,
      platformMessageRef: ref,
      platformOrder: 1,
      receivedAt: EVENT_TIME,
      correlationId: `corr-${channelId}-${ref}`,
      exceptionMarked: false,
      createdAt: EVENT_TIME,
    }),
  );
  return result.id;
}

function createTask(eventId: string, kind: "REALTIME_REVIEW" | "PAID_TEXT_REVIEW" = "REALTIME_REVIEW"): string {
  const result = runShortTransaction(database, (tx) =>
    TaskStore.create(tx, { id: `task-${eventId}-${kind}`, eventId, kind, deadlineAt: EVENT_TIME, createdAt: EVENT_TIME }),
  );
  if (result.status !== "created") throw new Error(`task not created: ${result.status}`);
  return result.id;
}

function commit(taskId: string, classification: "BLOCK" | "ALLOW_NOISE" | "ALLOW_MEANINGFUL"): CommitVerdictResult {
  return runShortTransaction(database, (tx) =>
    TaskStore.commitVerdict(tx, {
      verdictId: `verdict-${taskId}-${classification}`,
      taskId,
      classification,
      source: "MODEL",
      decidedAt: EVENT_TIME,
      decidedByRef: "system",
    }),
  );
}

function taskStatus(taskId: string): string | undefined {
  const row = database.sqlite.prepare("select status from tasks where id = ?").get(taskId) as { status: string } | undefined;
  return row?.status;
}

describe("ChannelEventStore.recordIfNew", () => {
  it("records a platform message once and reports the duplicate on a repeat", () => {
    const first = runShortTransaction(database, (tx) =>
      ChannelEventStore.recordIfNew(tx, {
        id: "event-a",
        channelId: seed.channelId,
        subjectId: seed.subjectId,
        platformMessageRef: "msg-1",
        platformOrder: 1,
        receivedAt: EVENT_TIME,
        correlationId: "corr-a",
        exceptionMarked: false,
        createdAt: EVENT_TIME,
      }),
    );
    const repeat = runShortTransaction(database, (tx) =>
      ChannelEventStore.recordIfNew(tx, {
        id: "event-b",
        channelId: seed.channelId,
        subjectId: seed.subjectId,
        platformMessageRef: "msg-1",
        platformOrder: 1,
        receivedAt: EVENT_TIME,
        correlationId: "corr-b",
        exceptionMarked: false,
        createdAt: EVENT_TIME,
      }),
    );
    expect(first).toEqual({ status: "created", id: "event-a" });
    expect(repeat).toEqual({ status: "duplicate", id: "event-a" });
    expect(countRows(database, "channel_events")).toBe(1);
  });

  it("scopes the deduplication key to the channel", () => {
    const other = seedChannelAndSubject(database, "2");
    recordEvent("msg-shared");
    recordEvent("msg-shared", other.channelId, other.subjectId);
    expect(countRows(database, "channel_events")).toBe(2);
  });
});

describe("TaskStore.create", () => {
  it("creates a QUEUED task bound to the subject's current generation", () => {
    const eventId = recordEvent("msg-task");
    const result = runShortTransaction(database, (tx) =>
      TaskStore.create(tx, { id: "task-1", eventId, kind: "REALTIME_REVIEW", deadlineAt: EVENT_TIME, createdAt: EVENT_TIME }),
    );
    expect(result).toEqual({ status: "created", id: "task-1", processingGeneration: 0 });
    expect(taskStatus("task-1")).toBe("QUEUED");
  });

  it("returns the existing task for the same kind and event version", () => {
    const eventId = recordEvent("msg-repeat");
    createTask(eventId);
    const again = runShortTransaction(database, (tx) =>
      TaskStore.create(tx, { id: "task-other", eventId, kind: "REALTIME_REVIEW", deadlineAt: EVENT_TIME, createdAt: EVENT_TIME }),
    );
    expect(again).toEqual({ status: "existing", id: `task-${eventId}-REALTIME_REVIEW` });
    expect(countRows(database, "tasks")).toBe(1);
  });

  it("reports an event that does not exist", () => {
    const result = runShortTransaction(database, (tx) =>
      TaskStore.create(tx, { id: "task-x", eventId: "no-such-event", kind: "REALTIME_REVIEW", deadlineAt: EVENT_TIME, createdAt: EVENT_TIME }),
    );
    expect(result).toEqual({ status: "event_not_found" });
  });
});

describe("TaskStore.commitVerdict", () => {
  it("commits once, maps the classification to its downstream verdict, and closes the task", () => {
    const blockedTask = createTask(recordEvent("msg-block"));
    const noiseTask = createTask(recordEvent("msg-noise"));

    expect(commit(blockedTask, "BLOCK")).toEqual({ status: "committed", seq: 1 });
    expect(commit(noiseTask, "ALLOW_NOISE")).toEqual({ status: "committed", seq: 1 });

    const rows = database.sqlite
      .prepare("select classification, downstream from verdicts order by classification")
      .all() as Array<{ classification: string; downstream: string }>;
    expect(rows).toEqual([
      { classification: "ALLOW_NOISE", downstream: "ALLOW" },
      { classification: "BLOCK", downstream: "BLOCK" },
    ]);
    expect(taskStatus(blockedTask)).toBe("DONE");
  });

  it("refuses a second current verdict for the same event", () => {
    const eventId = recordEvent("msg-final");
    const realtime = createTask(eventId, "REALTIME_REVIEW");
    const paid = createTask(eventId, "PAID_TEXT_REVIEW");
    expect(commit(realtime, "ALLOW_MEANINGFUL")).toEqual({ status: "committed", seq: 1 });
    expect(commit(paid, "BLOCK")).toEqual({ status: "rejected", reason: "ALREADY_FINAL" });
    expect(taskStatus(paid)).toBe("QUEUED");
    expect(countRows(database, "verdicts")).toBe(1);
  });

  it("refuses a task that is already closed", () => {
    const taskId = createTask(recordEvent("msg-closed"));
    expect(commit(taskId, "BLOCK")).toEqual({ status: "committed", seq: 1 });
    expect(commit(taskId, "BLOCK")).toEqual({ status: "rejected", reason: "TASK_NOT_OPEN" });
  });

  it("refuses a task created under an older processing generation after a generation bump", () => {
    const taskId = createTask(recordEvent("msg-stale"));
    const bumped = runShortTransaction(database, (tx) => SubjectStore.bumpGeneration(tx, seed.subjectId));
    expect(bumped).toBe(1);

    expect(commit(taskId, "BLOCK")).toEqual({ status: "rejected", reason: "STALE_GENERATION" });
    expect(taskStatus(taskId)).toBe("QUEUED");
    expect(countRows(database, "verdicts")).toBe(0);
  });

  it("refuses a task whose event version no longer matches", () => {
    const eventId = recordEvent("msg-version");
    const taskId = createTask(eventId);
    database.sqlite.prepare("update channel_events set event_version = 2 where id = ?").run(eventId);
    expect(commit(taskId, "BLOCK")).toEqual({ status: "rejected", reason: "STALE_EVENT_VERSION" });
  });

  it("reports a task that does not exist", () => {
    expect(commit("no-such-task", "BLOCK")).toEqual({ status: "rejected", reason: "TASK_NOT_FOUND" });
  });
});

describe("ScoreLedgerStore.appendIfNew", () => {
  it("keeps one ledger entry per idempotency key", () => {
    const entry = {
      subjectId: seed.subjectId,
      idempotencyKey: "verdict-1:score",
      reasonCode: "COMPLIANT_REWARD" as const,
      requestedDelta: 2,
      actualDelta: 2,
      ruleVersion: 1,
      verdictRef: "verdict-1",
      correlationId: "corr-1",
      createdAt: EVENT_TIME,
    };
    const first = runShortTransaction(database, (tx) => ScoreLedgerStore.appendIfNew(tx, { ...entry, id: "ledger-1" }));
    const repeat = runShortTransaction(database, (tx) => ScoreLedgerStore.appendIfNew(tx, { ...entry, id: "ledger-2" }));
    expect(first).toEqual({ status: "created", id: "ledger-1" });
    expect(repeat).toEqual({ status: "duplicate" });
    expect(countRows(database, "score_ledger")).toBe(1);
  });
});

describe("SubjectStore.compareAndSetScore", () => {
  const update = (expectedVersion: number, currentScore: number) =>
    runShortTransaction(database, (tx) =>
      SubjectStore.compareAndSetScore(tx, {
        subjectId: seed.subjectId,
        expectedVersion,
        identityBaseScore: 0,
        behaviorAdjustTotal: currentScore,
        currentScore,
        lastRewardAt: null,
        updatedAt: EVENT_TIME,
      }),
    );

  it("updates when the version matches and advances the version", () => {
    expect(update(0, 5)).toEqual({ status: "updated", version: 1 });
    const row = database.sqlite.prepare("select current_score, version from subject_scores where subject_id = ?").get(seed.subjectId);
    expect(row).toEqual({ current_score: 5, version: 1 });
  });

  it("reports a conflict and leaves the row unchanged when the version is stale", () => {
    update(0, 5);
    expect(update(0, 9)).toEqual({ status: "conflict", currentVersion: 1 });
    const row = database.sqlite.prepare("select current_score from subject_scores where subject_id = ?").get(seed.subjectId);
    expect(row).toEqual({ current_score: 5 });
  });

  it("reports a subject without a score row", () => {
    const result = runShortTransaction(database, (tx) =>
      SubjectStore.compareAndSetScore(tx, {
        subjectId: "no-such-subject",
        expectedVersion: 0,
        identityBaseScore: 0,
        behaviorAdjustTotal: 0,
        currentScore: 0,
        lastRewardAt: null,
        updatedAt: T0,
      }),
    );
    expect(result).toEqual({ status: "missing" });
  });
});

describe("SubjectStore.bumpGeneration", () => {
  it("increments the generation and reports an unknown subject as undefined", () => {
    expect(runShortTransaction(database, (tx) => SubjectStore.bumpGeneration(tx, seed.subjectId))).toBe(1);
    expect(runShortTransaction(database, (tx) => SubjectStore.bumpGeneration(tx, seed.subjectId))).toBe(2);
    expect(runShortTransaction(database, (tx) => SubjectStore.bumpGeneration(tx, "no-such-subject"))).toBeUndefined();
  });
});

describe("ScoreExceptionStore.ensureActive", () => {
  const ensure = (id: string) =>
    runShortTransaction(database, (tx) =>
      ScoreExceptionStore.ensureActive(tx, {
        id,
        channelId: seed.channelId,
        subjectId: seed.subjectId,
        sourceRequestId: null,
        createdAt: EVENT_TIME,
      }),
    );

  it("keeps one active marker per subject; a repeated request adds no row", () => {
    expect(ensure("exception-1")).toEqual({ status: "created", id: "exception-1" });
    expect(ensure("exception-2")).toEqual({ status: "existing", id: "exception-1" });
    expect(countRows(database, "score_exceptions")).toBe(1);
  });

  it("allows a new marker once the previous one has been removed", () => {
    ensure("exception-1");
    database.sqlite
      .prepare("update score_exceptions set removed_at = ?, removed_reason_code = 'USER_REVOKED' where id = ?")
      .run(EVENT_TIME, "exception-1");
    expect(ensure("exception-2")).toEqual({ status: "created", id: "exception-2" });
    expect(countRows(database, "score_exceptions")).toBe(2);
  });
});
