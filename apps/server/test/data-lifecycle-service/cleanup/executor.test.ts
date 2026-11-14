import type {
  ChangeKind,
  ChangeLogRow,
  DataRequestItemRecord,
  DeletionTargetKind,
  EvidenceKind,
  EvidenceRow,
  SubjectCacheHub,
  SubjectCleanupPort,
  TechnicalLogRow,
} from "@voxward/contracts";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createSubjectCleanupPort } from "../../../src/db/subject-cleanup.js";
import {
  changeLogs,
  channelEvents,
  deliveries,
  scoreExceptions,
  scoreLedger,
  scoreOutcomes,
  subjectIdentities,
  subjectNicknameChanges,
  subjectScores,
  tasks,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "../../../src/db/schema/index.js";
import { CERTIFICATE_SUMMARY } from "../../../src/modules/audit-store/index.js";
import {
  executeRequest,
  startDeletionRequest,
  type DataDeps,
  type DeletedLogsEvent,
} from "../../../src/modules/data-lifecycle-service/index.js";
import { createCandidateStore } from "../../../src/modules/moderation-engine/candidates/store.js";
import { createNicknameVerdictCache } from "../../../src/modules/moderation-engine/nickname-cache/cache.js";
import type { ScopeCheck } from "../../../src/modules/moderation-engine/rules/engine.js";
import { createIdentityTracker, type IdentityObservation } from "../../../src/modules/platform-source/youtube/identity.js";
import { seedOpenTask } from "../../decision-service/fixtures.js";
import { T0 } from "../../db/helpers.js";
import { actorFor, CHANNEL, openDataFixture, SUBJECT, TWIN, type DataFixture } from "../fixtures.js";

/*
 * VW-SUB036-AC001 and its inherited rows: every storage surface of one subject is cleaned, a failed surface stops the run,
 * a repeat run resumes from the first unfinished surface, the other subject is untouched, and the request reads COMPLETED
 * only when the exception still holds. Every value here is synthetic.
 */

const EXPIRES_AT = "2026-12-10T10:00:00.000Z";
const COMPLETE: ScopeCheck = { scope: "nickname", hits: [], complete: true };
const MODERATOR: IdentityObservation = { kind: "MODERATOR", certain: true, evidence: "isChatModerator", subscription: "NOT_PROVIDED" };

let fixture: DataFixture;
let database: VoxwardDatabase;
let publishes: DeletedLogsEvent[];
let nicknames: ReturnType<typeof createNicknameVerdictCache>;
let identities: ReturnType<typeof createIdentityTracker>;
let candidates: ReturnType<typeof createCandidateStore>;

beforeEach(() => {
  fixture = openDataFixture("data-cleanup");
  database = fixture.database;
  publishes = [];
  seedHistory();
});

afterEach(() => {
  fixture.close();
});

function seedHistory(): void {
  seedOpenTask(database, {
    channelId: CHANNEL,
    subjectKey: "synthetic-key-1",
    subjectId: SUBJECT,
    eventId: "event-1",
    platformMessageRef: "synthetic-message-1",
    taskId: "task-1",
  });
  seedOpenTask(database, {
    channelId: CHANNEL,
    subjectKey: "synthetic-key-2",
    subjectId: TWIN,
    eventId: "event-2",
    platformMessageRef: "synthetic-message-2",
    taskId: "task-2",
  });
  const logs = createAuditLogPort(database);
  // log-1 belongs to SUBJECT. log-2 has no subject, and is reached only through task-1. log-3 belongs to TWIN.
  logs.insertTechnicalLog(techLog("log-1", "corr-event-1", SUBJECT, null), [
    evidence("ev-1", "MESSAGE_TEXT", "synthetic message"),
    evidence("ev-2", "VALIDATED_JSON", "{}"),
  ]);
  logs.insertTechnicalLog(techLog("log-2", "corr-event-1", null, "task-1"), [
    evidence("ev-3", "ITEM_ID_MAP", "{\"synthetic\":1}"),
    evidence("ev-4", "TRANSLATION", "synthetic translation"),
  ]);
  logs.insertTechnicalLog(techLog("log-3", "corr-event-2", TWIN, "task-2"), [evidence("ev-5", "MESSAGE_TEXT", "twin text")]);
  // change-1 and change-2 belong to SUBJECT (its chain and its subject chain). change-3 and change-4 belong to TWIN.
  logs.insertChangeLog(changeLog("change-1", "corr-event-1", "MANUAL_VERDICT"));
  logs.insertChangeLog(changeLog("change-2", `subject:${SUBJECT}`, "LIST_CHANGED"));
  logs.insertChangeLog(changeLog("change-3", "corr-event-2", "MANUAL_VERDICT"));
  logs.insertChangeLog(changeLog("change-4", `subject:${TWIN}`, "LIST_CHANGED"));
  database.orm.insert(verdicts).values([verdictRow("verdict-1", "event-1", "task-1"), verdictRow("verdict-2", "event-2", "task-2")]).run();
  database.orm
    .insert(deliveries)
    .values([deliveryRow("delivery-1", "event-1", "verdict-1"), deliveryRow("delivery-2", "event-2", "verdict-2")])
    .run();
  database.orm.insert(scoreOutcomes).values([outcomeRow("outcome-1", SUBJECT), outcomeRow("outcome-2", TWIN)]).run();

  candidates = createCandidateStore({
    newId: sequence("card"),
    now: () => new Date(T0),
    rules: { publishConfirmedTerm: () => 1 },
  });
  candidates.propose({ channelId: CHANNEL, term: "synthetic-term-1", note: null, sourceCorrelationId: "corr-event-1", sourceTaskId: "task-1" });
  candidates.propose({ channelId: CHANNEL, term: "synthetic-term-2", note: null, sourceCorrelationId: "corr-event-2", sourceTaskId: "task-2" });

  nicknames = createNicknameVerdictCache({ ttlMs: 60_000, maxEntries: 100, now: () => 0 });
  nicknames.store({ channelId: CHANNEL, senderRef: "synthetic-key-1" }, "digest-1", "v1", COMPLETE);
  nicknames.store({ channelId: CHANNEL, senderRef: "synthetic-key-2" }, "digest-2", "v1", COMPLETE);

  identities = createIdentityTracker({ capacity: 10 });
  identities.observe({ channelId: CHANNEL, subjectKey: "synthetic-key-1", observation: MODERATOR, sourceEventRef: "synthetic-message-1", effectiveFrom: T0 });
}

/** The in-process surfaces this process holds, forgotten by subject. */
function hub(names: readonly string[] = ["CANDIDATE_CARD", "NICKNAME_VERDICT", "IDENTITY_TRACKER"]): SubjectCacheHub {
  return {
    names,
    forgetSubject(name, channelId, platformSubjectKey, correlationIds) {
      if (name === "CANDIDATE_CARD") return candidates.removeBySourceCorrelations(channelId, correlationIds);
      if (name === "NICKNAME_VERDICT") return nicknames.forget({ channelId, senderRef: platformSubjectKey });
      return identities.forget(platformSubjectKey);
    },
  };
}

function depsWith(cleanup: SubjectCleanupPort = createSubjectCleanupPort(database), caches = hub()): DataDeps {
  return {
    ...fixture.deps,
    cleanup,
    caches,
    publishInvalidation: (event) => {
      publishes.push(event);
    },
  };
}

/** A cleanup port that fails once, on the first surface of one kind. The failure carries a code, as a database error does. */
function failingOnce(real: SubjectCleanupPort, kind: DeletionTargetKind): SubjectCleanupPort {
  let armed = true;
  return {
    readCleanupFacts: (channelId, subjectId) => real.readCleanupFacts(channelId, subjectId),
    cleanSurface(input) {
      if (armed && input.targetKind === kind) {
        armed = false;
        throw Object.assign(new Error("injected failure"), { code: "INJECTED_FAILURE" });
      }
      return real.cleanSurface(input);
    },
  };
}

function verifiedDelete(subjectRef: string, mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT"): string {
  const actor = actorFor("DATA_ADMIN");
  const created = fixture.routes.createRequest(actor, { subjectRef, kind: "DELETE", mode, requestSource: "OPERATOR_INITIATED" });
  expect(created.status).toBe(201);
  const requestId = (created.body as { requestId: string }).requestId;
  expect(fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" }).status).toBe(200);
  return requestId;
}

function itemOf(requestId: string, kind: string): DataRequestItemRecord | undefined {
  return fixture.deps.requests.readItems(requestId).find((item) => item.targetKind === kind);
}

function executionOf(response: { readonly body: unknown }): string {
  return (response.body as { execution: string }).execution;
}

function dataRequestChangeCount(): number {
  return database.orm.select().from(changeLogs).where(eq(changeLogs.changeKind, "DATA_REQUEST_CHANGED")).all().length;
}

describe("cleaning every storage surface of one subject (VW-SUB036-AC001)", () => {
  it("removes or resets each surface of SUBJECT, leaves TWIN alone, and completes with the exception in effect", () => {
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");
    const response = executeRequest(depsWith(), actorFor("DATA_ADMIN"), requestId);

    expect(response.status).toBe(200);
    expect(executionOf(response)).toBe("COMPLETED");
    const items = fixture.deps.requests.readItems(requestId);
    expect(items).toHaveLength(18);
    expect(items.every((item) => item.itemState === "DONE")).toBe(true);

    // Database surfaces of SUBJECT are gone, and TWIN's rows of the same kinds stay.
    expect(database.orm.select().from(scoreOutcomes).where(eq(scoreOutcomes.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(scoreOutcomes).where(eq(scoreOutcomes.subjectId, TWIN)).all()).toHaveLength(1);
    expect(database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(subjectIdentities).where(eq(subjectIdentities.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(subjectNicknameChanges).where(eq(subjectNicknameChanges.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(subjectNicknameChanges).where(eq(subjectNicknameChanges.subjectId, TWIN)).all()).toHaveLength(1);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, TWIN)).all()).toHaveLength(1);
    expect(database.orm.select().from(verdicts).where(eq(verdicts.id, "verdict-1")).all()).toHaveLength(0);
    expect(database.orm.select().from(verdicts).where(eq(verdicts.id, "verdict-2")).all()).toHaveLength(1);
    expect(database.orm.select().from(deliveries).where(eq(deliveries.id, "delivery-1")).all()).toHaveLength(0);
    expect(database.orm.select().from(tasks).where(eq(tasks.id, "task-1")).all()).toHaveLength(0);
    expect(database.orm.select().from(tasks).where(eq(tasks.id, "task-2")).all()).toHaveLength(1);

    // Technical logs and their evidence: SUBJECT's own row and the task-linked row are gone. TWIN's row stays.
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-1")).all()).toHaveLength(0);
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-2")).all()).toHaveLength(0);
    expect(database.orm.select().from(technicalLogs).where(eq(technicalLogs.id, "log-3")).all()).toHaveLength(1);
    expect(database.orm.select({ id: technicalLogEvidence.id }).from(technicalLogEvidence).all().map((row) => row.id)).toEqual(["ev-5"]);

    // Change Log rows of SUBJECT keep only the certificate. TWIN's rows keep their text.
    const summaryOf = (id: string) =>
      database.orm.select({ summary: changeLogs.summary }).from(changeLogs).where(eq(changeLogs.id, id)).get()?.summary;
    expect(summaryOf("change-1")).toBe(CERTIFICATE_SUMMARY);
    expect(summaryOf("change-2")).toBe(CERTIFICATE_SUMMARY);
    expect(summaryOf("change-3")).toBe("synthetic change");
    expect(summaryOf("change-4")).toBe("synthetic change");

    // The score is reset to zero and its version rises. The row stays. The exception is kept.
    const score = database.orm.select().from(subjectScores).where(eq(subjectScores.subjectId, SUBJECT)).get();
    expect(score?.currentScore).toBe(0);
    expect(score?.version).toBe(2);
    expect(database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, SUBJECT)).all()).toEqual([
      expect.objectContaining({ removedAt: null }),
    ]);

    // In-process surfaces: SUBJECT's card and nickname entry are gone, TWIN's stay, and the identity is forgotten.
    expect(candidates.listCards(CHANNEL).map((card) => card.term)).toEqual(["synthetic-term-2"]);
    expect(nicknames.lookup({ channelId: CHANNEL, senderRef: "synthetic-key-1" }, "digest-1", "v1")).toBeUndefined();
    expect(nicknames.lookup({ channelId: CHANNEL, senderRef: "synthetic-key-2" }, "digest-2", "v1")).toBeDefined();
    expect(identities.observe({ channelId: CHANNEL, subjectKey: "synthetic-key-1", observation: MODERATOR, sourceEventRef: "synthetic-message-9", effectiveFrom: T0 })).not.toBeNull();

    // Every removal is published once on the shared bus, and TWIN's identifiers never appear in it.
    const published = publishes.flatMap((event) => [...event.logIds, ...event.changeLogIds]);
    expect(publishes.every((event) => event.reason === "DELETED")).toBe(true);
    expect(published).toEqual(expect.arrayContaining(["log-1", "log-2", "change-1", "change-2"]));
    expect(published).not.toEqual(expect.arrayContaining(["log-3", "change-3", "change-4"]));
  });
});

describe("failure, resume and completion (VW-SUB036-AC001 and VW-SUB036-PARENT)", () => {
  it("stops at the failed surface, is not COMPLETED, and a repeat call resumes without repeating finished steps", () => {
    const actor = actorFor("DATA_ADMIN");
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");

    const first = executeRequest(depsWith(failingOnce(createSubjectCleanupPort(database), "SCORE_LEDGER")), actor, requestId);
    expect(executionOf(first)).toBe("PARTIAL_FAILED");
    expect(itemOf(requestId, "SCORE_LEDGER")).toMatchObject({ itemState: "FAILED", errorCode: "INJECTED_FAILURE" });
    expect(itemOf(requestId, "SCORE_OUTCOME")?.itemState).toBe("DONE");
    expect(itemOf(requestId, "VERDICT")?.itemState).toBe("PENDING");
    // The failed step wrote nothing, and the steps behind it did not run.
    expect(database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, SUBJECT)).all()).toHaveLength(1);
    expect(database.orm.select().from(verdicts).where(eq(verdicts.id, "verdict-1")).all()).toHaveLength(1);

    const second = executeRequest(depsWith(), actor, requestId);
    expect(executionOf(second)).toBe("COMPLETED");
    expect(fixture.deps.requests.readItems(requestId).every((item) => item.itemState === "DONE")).toBe(true);
    expect(database.orm.select().from(scoreLedger).where(eq(scoreLedger.subjectId, SUBJECT)).all()).toHaveLength(0);

    // A repeat call changes nothing: the request is COMPLETED, and no new Change Log row is written.
    const rowsBefore = dataRequestChangeCount();
    const third = executeRequest(depsWith(), actor, requestId);
    expect(executionOf(third)).toBe("COMPLETED");
    expect(dataRequestChangeCount()).toBe(rowsBefore);
  });

  it("does not record a surface that this process does not hold as cleaned", () => {
    const actor = actorFor("DATA_ADMIN");
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");
    // The start registers all three in-process surfaces. The run then sees a hub without the identity tracker.
    expect(startDeletionRequest(depsWith(), actor, requestId).status).toBe(200);

    const response = executeRequest(depsWith(createSubjectCleanupPort(database), hub(["CANDIDATE_CARD", "NICKNAME_VERDICT"])), actor, requestId);
    expect(executionOf(response)).toBe("PARTIAL_FAILED");
    const identity = fixture.deps.requests.readItems(requestId).find((item) => item.targetRef === "IDENTITY_TRACKER");
    expect(identity).toMatchObject({ itemState: "FAILED", errorCode: "SURFACE_NOT_REGISTERED" });
  });

  it("completes a data-only deletion and adds no exception", () => {
    const requestId = verifiedDelete(TWIN, "DELETE_DATA_ONLY");
    const response = executeRequest(depsWith(), actorFor("DATA_ADMIN"), requestId);

    expect(executionOf(response)).toBe("COMPLETED");
    expect(database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, TWIN)).all()).toHaveLength(0);
  });
});

describe("rework1 regressions: B8 candidate correlations and B9 resume FK sweep", () => {
  it("B8: clears CandidateStore via channel_events.correlation_id even when technical_logs have expired", () => {
    database.orm.delete(technicalLogEvidence).run();
    database.orm.delete(technicalLogs).where(eq(technicalLogs.subjectId, SUBJECT)).run();
    database.orm.delete(technicalLogs).where(eq(technicalLogs.taskId, "task-1")).run();

    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");
    const response = executeRequest(depsWith(), actorFor("DATA_ADMIN"), requestId);

    expect(executionOf(response)).toBe("COMPLETED");
    expect(candidates.listCards(CHANNEL).map((card) => card.term)).toEqual(["synthetic-term-2"]);
  });

  it("B8: clears CandidateStore on resume after step 4 CANDIDATE_CARD fails and TECHNICAL_LOG is already DONE", () => {
    const actor = actorFor("DATA_ADMIN");
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");
    let failCardOnce = true;
    const flakyHub: SubjectCacheHub = {
      names: ["CANDIDATE_CARD", "NICKNAME_VERDICT", "IDENTITY_TRACKER"],
      forgetSubject(name, channelId, platformSubjectKey, correlationIds) {
        if (failCardOnce && name === "CANDIDATE_CARD") {
          failCardOnce = false;
          throw Object.assign(new Error("transient card failure"), { code: "CARD_RETRY" });
        }
        return hub().forgetSubject(name, channelId, platformSubjectKey, correlationIds);
      },
    };

    const first = executeRequest(depsWith(createSubjectCleanupPort(database), flakyHub), actor, requestId);
    expect(executionOf(first)).toBe("PARTIAL_FAILED");
    expect(itemOf(requestId, "TECHNICAL_LOG")?.itemState).toBe("DONE");
    expect(itemOf(requestId, "CANDIDATE_CARD")).toMatchObject({ itemState: "FAILED", errorCode: "CARD_RETRY" });

    const second = executeRequest(depsWith(), actor, requestId);
    expect(executionOf(second)).toBe("COMPLETED");
    expect(candidates.listCards(CHANNEL).map((card) => card.term)).toEqual(["synthetic-term-2"]);
  });

  it("B9: resumes cleanly when an excepted subject sends a new unscored message after DELIVERY=DONE (VERDICT failure)", () => {
    const actor = actorFor("DATA_ADMIN");
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");

    const first = executeRequest(depsWith(failingOnce(createSubjectCleanupPort(database), "VERDICT")), actor, requestId);
    expect(executionOf(first)).toBe("PARTIAL_FAILED");
    expect(itemOf(requestId, "DELIVERY")?.itemState).toBe("DONE");
    expect(itemOf(requestId, "VERDICT")?.itemState).toBe("FAILED");

    seedNewUnscoredMessage("event-late-1", "task-late-1", "verdict-late-1", "delivery-late-1", "log-late-1");

    const second = executeRequest(depsWith(), actor, requestId);
    expect(executionOf(second)).toBe("COMPLETED");
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, TWIN)).all()).toHaveLength(1);
    expect(database.orm.select().from(tasks).where(eq(tasks.id, "task-2")).all()).toHaveLength(1);
  });

  it("B9: resumes cleanly when an excepted subject sends a new unscored message after TASK=DONE (CHANNEL_EVENT failure)", () => {
    const actor = actorFor("DATA_ADMIN");
    const requestId = verifiedDelete(SUBJECT, "DELETE_AND_EXCEPT");

    const first = executeRequest(depsWith(failingOnce(createSubjectCleanupPort(database), "CHANNEL_EVENT")), actor, requestId);
    expect(executionOf(first)).toBe("PARTIAL_FAILED");
    expect(itemOf(requestId, "TASK")?.itemState).toBe("DONE");
    expect(itemOf(requestId, "CHANNEL_EVENT")?.itemState).toBe("FAILED");

    seedNewUnscoredMessage("event-late-2", "task-late-2", "verdict-late-2", "delivery-late-2", "log-late-2");

    const second = executeRequest(depsWith(), actor, requestId);
    expect(executionOf(second)).toBe("COMPLETED");
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, SUBJECT)).all()).toHaveLength(0);
    expect(database.orm.select().from(channelEvents).where(eq(channelEvents.subjectId, TWIN)).all()).toHaveLength(1);
    expect(database.orm.select().from(deliveries).where(eq(deliveries.id, "delivery-2")).all()).toHaveLength(1);
  });
});

function seedNewUnscoredMessage(
  eventId: string,
  taskId: string,
  verdictId: string,
  deliveryId: string,
  logId: string,
): void {
  seedOpenTask(database, {
    channelId: CHANNEL,
    subjectKey: "synthetic-key-1",
    subjectId: SUBJECT,
    eventId,
    platformMessageRef: `msg-${eventId}`,
    taskId,
    platformOrder: 2,
  });
  createAuditLogPort(database).insertTechnicalLog(techLog(logId, `corr-${eventId}`, SUBJECT, taskId), [
    evidence(`ev-${logId}`, "MESSAGE_TEXT", "late unscored message"),
  ]);
  database.orm.insert(verdicts).values(verdictRow(verdictId, eventId, taskId)).run();
  database.orm.insert(deliveries).values(deliveryRow(deliveryId, eventId, verdictId)).run();
}

describe("explicit resumption of scoring (VW-SUB036-STORY)", () => {
  it("lifts the exception only through a verified RESUME_SCORING request", () => {
    const actor = actorFor("DATA_ADMIN");
    const created = fixture.routes.createRequest(actor, { subjectRef: SUBJECT, kind: "RESUME_SCORING", requestSource: "OPERATOR_INITIATED" });
    expect(created.status).toBe(201);
    const requestId = (created.body as { requestId: string }).requestId;
    expect(fixture.routes.decideVerification(actor, requestId, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" }).status).toBe(200);

    const response = executeRequest(depsWith(), actor, requestId);

    expect(response.status).toBe(200);
    expect(database.orm.select().from(scoreExceptions).where(eq(scoreExceptions.subjectId, SUBJECT)).all()).toEqual([
      expect.objectContaining({ removedAt: expect.any(String) }),
    ]);
  });
});

function sequence(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

function techLog(id: string, correlationId: string, subjectId: string | null, taskId: string | null): TechnicalLogRow {
  return {
    id,
    channelId: CHANNEL,
    correlationId,
    batchId: null,
    taskId,
    attempt: null,
    stage: "ROUTE",
    status: "OK",
    level: "INFO",
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    subjectId,
    data: null,
    createdAt: T0,
    expiresAt: EXPIRES_AT,
  };
}

function evidence(id: string, kind: EvidenceKind, payload: string): EvidenceRow {
  return { id, kind, payload, expiresAt: EXPIRES_AT };
}

function changeLog(id: string, correlationId: string, changeKind: ChangeKind): ChangeLogRow {
  return {
    id,
    channelId: CHANNEL,
    occurredAt: T0,
    actorKind: "SYSTEM",
    actorRef: "synthetic-actor",
    changeKind,
    summary: "synthetic change",
    outcome: "SUCCEEDED",
    correlationId,
    expiresAt: EXPIRES_AT,
  };
}

function verdictRow(id: string, eventId: string, taskId: string) {
  return {
    id,
    eventId,
    taskId,
    seq: 1,
    classification: "ALLOW_MEANINGFUL",
    downstream: "ALLOW",
    source: "MANUAL",
    isCurrent: 1,
    decidedAt: T0,
    decidedByRef: "synthetic-moderator",
  };
}

function deliveryRow(id: string, eventId: string, verdictId: string) {
  return {
    id,
    eventId,
    verdictId,
    outputGrantId: null,
    deliverySequence: 1,
    platformOrder: 1,
    validUntil: EXPIRES_AT,
    status: "SENT",
    attempts: 0,
    updatedAt: T0,
  };
}

function outcomeRow(id: string, subjectId: string) {
  return { idempotencyKey: `synthetic-${id}`, subjectId, outcome: "NO_EFFECT", reasonCode: "COOLDOWN", createdAt: T0 };
}
