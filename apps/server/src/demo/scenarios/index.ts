import { randomUUID } from "node:crypto";
import {
  CONTRACT_VERSION,
  toDownstreamVerdict,
  type ChannelEvent,
  type InternalClassification,
  type SubjectCacheHub,
  type Verdict,
} from "@voxward/contracts";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createAuditLogPort } from "../../db/audit-log.js";
import { readDockAndModerationFeed } from "../../db/channel-panel-read.js";
import { publishConfirmedCandidateTerm } from "../../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../../db/client.js";
import { createDataRequestPort } from "../../db/data-request-store.js";
import { createDecisionStorePort } from "../../db/decision-store.js";
import { createApprovedContentPort } from "../../db/output-store.js";
import {
  channelEvents,
  deliveries,
  scoreExceptions,
  subjectScores,
  subjects,
  tasks,
  verdicts,
} from "../../db/schema/index.js";
import { createScoringLedgerPort } from "../../db/scoring-ledger.js";
import { createSubjectCleanupPort } from "../../db/subject-cleanup.js";
import { createSubjectReadPort } from "../../db/subject-read.js";
import { runShortTransaction } from "../../db/transaction.js";
import { RETENTION_DAYS } from "../../modules/audit-store/content-policy.js";
import { CERTIFICATE_SUMMARY, createInvalidationBus } from "../../modules/audit-store/index.js";
import { executeRequest, startDeletionRequest, type DataDeps } from "../../modules/data-lifecycle-service/index.js";
import { createDecisionService, DEFAULT_DECISION_LIMITS } from "../../modules/decision-service/index.js";
import {
  createCandidateStore,
  createModerationChecker,
  type CandidateCard,
  type CandidateStore,
} from "../../modules/moderation-engine/index.js";
import { createScoringEngine, createScoringPlanner } from "../../modules/scoring-engine/index.js";
import { resetSandboxState, SANDBOX_RULE_SET } from "../reset.js";
import {
  buildCustomSyntheticEvent,
  buildScenarioEvent,
  SANDBOX_BANNER,
  SANDBOX_CHANNEL_ID,
  type ScenarioId,
  type SyntheticChatEvent,
} from "../synthetic-source.js";

export interface SandboxSubjectView {
  readonly subjectId: string;
  readonly subjectKey: string;
  readonly currentScore: number;
  readonly processingGeneration: number;
  readonly hasException: boolean;
}

export interface SandboxApprovedStageItem {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectKey: string;
  readonly text: string;
  readonly translation: string | null;
  readonly decidedAt: string;
}

export interface SandboxSnapshot {
  readonly banner: string;
  readonly syntheticOnly: true;
  readonly channelId: string;
  readonly subjects: readonly SandboxSubjectView[];
  readonly reviewQueue: ReturnType<typeof readDockAndModerationFeed>["reviewQueue"];
  readonly blockedItems: ReturnType<typeof readDockAndModerationFeed>["blockedItems"];
  readonly approvedStage: readonly SandboxApprovedStageItem[];
  readonly changeLogs: ReturnType<ReturnType<typeof createAuditLogPort>["pageChangeLogs"]>;
  readonly technicalLogs: ReturnType<ReturnType<typeof createAuditLogPort>["pageTechnicalLogs"]>;
  readonly dataRequests: ReturnType<ReturnType<typeof createDataRequestPort>["listRequests"]>;
  readonly candidateCards: readonly CandidateCard[];
  readonly cacheEntryCount: number;
}

export interface SandboxRuntime {
  readonly database: VoxwardDatabase;
  readonly subjectCaches: SubjectCacheHub;
  readonly candidateStore: CandidateStore;
  reset(): { readonly resetAt: string };
  runScenario(
    scenario: ScenarioId,
    options?: { readonly subjectKey?: string },
  ): Promise<{ readonly scenario: ScenarioId; readonly correlationId?: string; readonly requestId?: string }>;
  ingestCustom(input: {
    readonly subjectKey: string;
    readonly text: string;
    readonly isPaid?: boolean;
    readonly translationText?: string | null;
  }): Promise<{ readonly correlationId: string; readonly classification: InternalClassification | "PENDING_REVIEW" }>;
  decideReview(taskId: string, classification: InternalClassification): Promise<{ readonly status: number; readonly body: unknown }>;
  snapshot(): SandboxSnapshot;
}

export function createSandboxRuntime(database: VoxwardDatabase, now: () => Date = () => new Date()): SandboxRuntime {
  let seq = 0;
  const nextSeq = () => ++seq;
  const inProcessSubjectCache = new Map<string, { readonly lastText: string; readonly updatedAt: string }>();

  const candidateStore = createCandidateStore({
    newId: () => randomUUID(),
    now,
    rules: {
      publishConfirmedTerm: (input) => publishConfirmedCandidateTerm(database, input),
    },
  });

  const auditLog = createAuditLogPort(database);

  const subjectCaches: SubjectCacheHub = {
    names: ["sandbox-subject-cache", "sandbox-candidate-cards"],
    forgetSubject(name, channelId, platformSubjectKey, correlationIds) {
      let removed = 0;
      if (name === "sandbox-subject-cache") {
        const cacheKey = `${channelId}:${platformSubjectKey}`;
        if (inProcessSubjectCache.delete(cacheKey)) removed += 1;
      }
      if (name === "sandbox-candidate-cards" && correlationIds.length > 0) {
        removed += candidateStore.removeBySourceCorrelations(channelId, correlationIds);
      }
      return removed;
    },
  };

  const checker = createModerationChecker({
    ruleSet: SANDBOX_RULE_SET,
    nicknames: {
      displayNicknameOf: async (event) => event.sender.senderRef,
    },
  });
  const scoring = createScoringEngine({
    ledger: createScoringLedgerPort(database),
    config: { enabled: true },
    clock: now,
  });
  const decisionStore = createDecisionStorePort(database, {
    planner: createScoringPlanner(),
    changeLogExpiresAt: (occurredAt) =>
      new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
  });
  const decisionService = createDecisionService({
    store: decisionStore,
    newId: () => randomUUID(),
    now,
    limits: DEFAULT_DECISION_LIMITS,
  });
  const approvedContent = createApprovedContentPort(database);
  const requestsPort = createDataRequestPort(database);
  const bus = createInvalidationBus();

  const dataDeps: DataDeps = {
    requests: requestsPort,
    subjects: createSubjectReadPort(database),
    logs: auditLog,
    cleanup: createSubjectCleanupPort(database),
    caches: subjectCaches,
    publishInvalidation: (event) => bus.publish(event),
    certificateSummary: CERTIFICATE_SUMMARY,
    newId: () => randomUUID(),
    now,
    retentionDays: RETENTION_DAYS,
    tombstones: {
      record: () => {},
    },
  };

  function ensureSubject(subjectKey: string, nowIso: string): { id: string; processingGeneration: number; hasException: boolean } {
    const existing = database.orm
      .select({ id: subjects.id, processingGeneration: subjects.processingGeneration })
      .from(subjects)
      .where(and(eq(subjects.channelId, SANDBOX_CHANNEL_ID), eq(subjects.platformSubjectKey, subjectKey)))
      .get();

    if (existing !== undefined) {
      const exc = database.orm
        .select({ id: scoreExceptions.id })
        .from(scoreExceptions)
        .where(
          and(
            eq(scoreExceptions.channelId, SANDBOX_CHANNEL_ID),
            eq(scoreExceptions.subjectId, existing.id),
            isNull(scoreExceptions.removedAt),
          ),
        )
        .get();
      return { id: existing.id, processingGeneration: existing.processingGeneration, hasException: exc !== undefined };
    }

    const id = `sbx-sub-${randomUUID().slice(0, 8)}`;
    runShortTransaction(database, (tx) => {
      tx.insert(subjects)
        .values({
          id,
          channelId: SANDBOX_CHANNEL_ID,
          platformSubjectKey: subjectKey,
          processingGeneration: 0,
          createdAt: nowIso,
        })
        .run();
      tx.insert(subjectScores)
        .values({
          subjectId: id,
          identityBaseScore: 0,
          behaviorAdjustTotal: 0,
          currentScore: 0,
          version: 0,
          lastRewardAt: null,
          updatedAt: nowIso,
        })
        .run();
    });
    return { id, processingGeneration: 0, hasException: false };
  }

  async function processSyntheticEvent(
    ev: SyntheticChatEvent,
  ): Promise<{ readonly correlationId: string; readonly classification: InternalClassification | "PENDING_REVIEW" }> {
    const nowIso = now().toISOString();
    const expiresAt = new Date(Date.parse(nowIso) + 7 * 86_400_000).toISOString();
    const subject = ensureSubject(ev.subjectKey, nowIso);
    const eventId = `sbx-ev-${randomUUID().slice(0, 8)}`;
    const correlationId = `sbx-corr-${randomUUID().slice(0, 8)}`;
    const order = nextSeq();

    inProcessSubjectCache.set(`${SANDBOX_CHANNEL_ID}:${ev.subjectKey}`, {
      lastText: ev.text,
      updatedAt: nowIso,
    });

    const channelEvent: ChannelEvent = {
      contractVersion: CONTRACT_VERSION,
      channelId: SANDBOX_CHANNEL_ID,
      platform: "youtube",
      platformMessageId: ev.messageId,
      platformOrder: order,
      receivedAt: ev.receivedAt,
      correlationId,
      body: ev.text,
      sender: {
        contractVersion: CONTRACT_VERSION,
        senderRef: ev.subjectKey,
      },
    };

    const mod = await checker.check(channelEvent);

    runShortTransaction(database, (tx) => {
      tx.insert(channelEvents)
        .values({
          id: eventId,
          channelId: SANDBOX_CHANNEL_ID,
          subjectId: subject.id,
          platformMessageRef: ev.messageId,
          platformOrder: order,
          receivedAt: ev.receivedAt,
          correlationId,
          eventVersion: 1,
          settlementState: "NONE",
          exceptionMarked: subject.hasException ? 1 : 0,
          createdAt: nowIso,
        })
        .run();
    });

    const evidence: { id: string; kind: "MESSAGE_TEXT" | "TRANSLATION"; payload: string; expiresAt: string }[] = [
      { id: `sbx-evid-${randomUUID().slice(0, 8)}`, kind: "MESSAGE_TEXT", payload: ev.text, expiresAt },
    ];
    if (ev.translationText !== null && ev.translationText.length > 0) {
      evidence.push({
        id: `sbx-evid-${randomUUID().slice(0, 8)}`,
        kind: "TRANSLATION",
        payload: ev.translationText,
        expiresAt,
      });
    }

    auditLog.insertTechnicalLog(
      {
        id: `sbx-tlog-${randomUUID().slice(0, 8)}`,
        channelId: SANDBOX_CHANNEL_ID,
        correlationId,
        batchId: null,
        taskId: null,
        attempt: 1,
        level: mod.route === "BLOCK" ? "WARN" : "INFO",
        data: { scenarioTag: ev.scenarioTag, route: mod.route, isPaid: ev.isPaid },
        stage: "BASE_RULE",
        status: "OK",
        errorCode: null,
        providerRef: "synthetic",
        modelRef: "synthetic-demo",
        ruleTemplateVersion: "1",
        latencyMs: 1,
        subjectId: subject.id,
        createdAt: nowIso,
        expiresAt,
      },
      evidence,
    );

    if (mod.route === "REVIEW" || (subject.hasException && mod.route !== "BLOCK")) {
      const taskId = `sbx-task-${randomUUID().slice(0, 8)}`;
      const deadlineAt = new Date(Date.parse(nowIso) + 300_000).toISOString();
      runShortTransaction(database, (tx) => {
        tx.insert(tasks)
          .values({
            id: taskId,
            eventId,
            channelId: SANDBOX_CHANNEL_ID,
            kind: ev.isPaid ? "PAID_TEXT_REVIEW" : "REALTIME_REVIEW",
            status: "PENDING_REVIEW",
            eventVersion: 1,
            processingGeneration: subject.processingGeneration,
            deadlineAt,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .run();
      });

      if (ev.scenarioTag === "manual-review") {
        candidateStore.propose({
          channelId: SANDBOX_CHANNEL_ID,
          term: "check this link",
          note: "Synthetic demo candidate term from manual review",
          sourceCorrelationId: correlationId,
          sourceTaskId: taskId,
        });
      }

      return { correlationId, classification: "PENDING_REVIEW" };
    }

    const classification: InternalClassification = mod.route === "BLOCK" ? "BLOCK" : "ALLOW_MEANINGFUL";
    const verdict: Verdict = {
      contractVersion: CONTRACT_VERSION,
      classification,
      downstream: toDownstreamVerdict(classification),
      penaltyHits: classification === "BLOCK" ? [{ code: "sandbox-block", points: 5 }] : [],
    };
    const verdictId = `sbx-verd-${randomUUID().slice(0, 8)}`;

    runShortTransaction(database, (tx) => {
      tx.insert(verdicts)
        .values({
          id: verdictId,
          eventId,
          taskId: null,
          seq: 1,
          classification,
          downstream: verdict.downstream,
          source: "BASE_RULE",
          isCurrent: 1,
          decidedAt: nowIso,
          decidedByRef: "sandbox-moderation",
        })
        .run();

      if (verdict.downstream === "ALLOW" && ev.isPaid) {
        tx.insert(deliveries)
          .values({
            id: `sbx-del-${randomUUID().slice(0, 8)}`,
            eventId,
            verdictId,
            outputGrantId: null,
            deliverySequence: order,
            platformOrder: order,
            validUntil: new Date(Date.parse(nowIso) + 3600_000).toISOString(),
            status: "SENT",
            attempts: 1,
            updatedAt: nowIso,
          })
          .run();
      }
    });

    if (!subject.hasException) {
      await scoring.applyVerdict(channelEvent, verdict);
    }

    auditLog.insertChangeLog({
      id: `sbx-chg-${randomUUID().slice(0, 8)}`,
      channelId: SANDBOX_CHANNEL_ID,
      occurredAt: nowIso,
      actorKind: "SYSTEM",
      actorRef: "sandbox-pipeline",
      changeKind: "SCORE_CHANGED",
      summary: `SANDBOX_${classification} scenario=${ev.scenarioTag} subject=${ev.subjectKey}`,
      outcome: "SUCCEEDED",
      correlationId,
      expiresAt,
    });

    return { correlationId, classification };
  }

  function runPrivacyScenario(mode: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT", subjectKey: string) {
    const nowIso = now().toISOString();
    const subject = ensureSubject(subjectKey, nowIso);
    const requestId = `sbx-req-${randomUUID().slice(0, 8)}`;
    const expiresAt = new Date(Date.parse(nowIso) + 7 * 86_400_000).toISOString();

    requestsPort.insertRequest(
      {
        id: requestId,
        channelId: SANDBOX_CHANNEL_ID,
        subjectId: subject.id,
        kind: "DELETE",
        requestSource: "OPERATOR_INITIATED",
        verificationState: "VERIFIED",
        verificationMethod: "REQUEST_AUTHORIZATION",
        mode,
        executionState: "PENDING",
        createdAt: nowIso,
        verifiedAt: nowIso,
        completedAt: null,
        updatedAt: nowIso,
        handledByRef: "sandbox-privacy-auditor",
      },
      {
        id: `sbx-chg-${randomUUID().slice(0, 8)}`,
        channelId: SANDBOX_CHANNEL_ID,
        occurredAt: nowIso,
        actorKind: "ACCOUNT",
        actorRef: "sandbox-privacy-auditor",
        changeKind: "DATA_REQUEST_CHANGED",
        summary: `SANDBOX_PRIVACY_REQUEST mode=${mode} subject=${subjectKey}`,
        outcome: "SUCCEEDED",
        correlationId: null,
        expiresAt,
      },
    );

    const actor = {
      accountId: "sandbox-privacy-auditor",
      channelId: SANDBOX_CHANNEL_ID,
      capabilities: new Set(["data.handle"]),
    };
    startDeletionRequest(dataDeps, actor, requestId);
    executeRequest(dataDeps, actor, requestId);

    return { requestId };
  }

  // Initialize deterministic baseline on startup
  resetSandboxState({
    database,
    subjectCaches,
    candidateStore,
    now,
    onReset: () => {
      inProcessSubjectCache.clear();
    },
  });

  return {
    database,
    subjectCaches,
    candidateStore,
    reset() {
      return resetSandboxState({
        database,
        subjectCaches,
        candidateStore,
        now,
        onReset: () => {
          inProcessSubjectCache.clear();
        },
      });
    },
    async runScenario(scenario, options) {
      const nowIso = now().toISOString();
      if (scenario === "privacy-delete") {
        const { requestId } = runPrivacyScenario("DELETE_DATA_ONLY", options?.subjectKey ?? "demo-viewer-bob");
        return { scenario, requestId };
      }
      if (scenario === "privacy-delete-and-except") {
        const { requestId } = runPrivacyScenario("DELETE_AND_EXCEPT", options?.subjectKey ?? "demo-viewer-alice");
        return { scenario, requestId };
      }
      const ev = buildScenarioEvent(scenario, nextSeq(), nowIso);
      const res = await processSyntheticEvent(ev);
      return { scenario, correlationId: res.correlationId };
    },
    async ingestCustom(input) {
      const ev = buildCustomSyntheticEvent(input, nextSeq(), now().toISOString());
      return processSyntheticEvent(ev);
    },
    async decideReview(taskId, classification) {
      const verdict: Verdict = {
        contractVersion: CONTRACT_VERSION,
        classification,
        downstream: toDownstreamVerdict(classification),
        penaltyHits: classification === "BLOCK" ? [{ code: "manual-block", points: 5 }] : [],
      };
      const outcome = await decisionService.commit(taskId, verdict, {
        kind: "HUMAN",
        actor: {
          contractVersion: CONTRACT_VERSION,
          accountRef: "sandbox-moderator",
          channelId: SANDBOX_CHANNEL_ID,
          capabilities: new Set(["review.decide"]),
        },
      });
      if (outcome.status === "conflict") {
        return { status: 409, body: { conflict: true, reason: outcome.reason } };
      }
      if (outcome.status === "denied") {
        return { status: 403, body: { error: outcome.reason } };
      }
      return { status: 200, body: { ok: true, seq: outcome.seq, scoring: outcome.scoring } };
    },
    snapshot() {
      const nowIso = now().toISOString();
      const feed = readDockAndModerationFeed(database, SANDBOX_CHANNEL_ID, {
        includeOriginal: true,
        nowIso,
      });
      const subRows = database.orm
        .select({
          subjectId: subjects.id,
          subjectKey: subjects.platformSubjectKey,
          processingGeneration: subjects.processingGeneration,
          currentScore: subjectScores.currentScore,
        })
        .from(subjects)
        .innerJoin(subjectScores, eq(subjectScores.subjectId, subjects.id))
        .where(eq(subjects.channelId, SANDBOX_CHANNEL_ID))
        .all();

      const excSet = new Set(
        database.orm
          .select({ subjectId: scoreExceptions.subjectId })
          .from(scoreExceptions)
          .where(and(eq(scoreExceptions.channelId, SANDBOX_CHANNEL_ID), isNull(scoreExceptions.removedAt)))
          .all()
          .map((r) => r.subjectId),
      );

      const approvedRows = database.orm
        .select({
          eventId: channelEvents.id,
          correlationId: channelEvents.correlationId,
          subjectKey: subjects.platformSubjectKey,
          decidedAt: verdicts.decidedAt,
        })
        .from(channelEvents)
        .innerJoin(subjects, eq(subjects.id, channelEvents.subjectId))
        .innerJoin(verdicts, and(eq(verdicts.eventId, channelEvents.id), eq(verdicts.isCurrent, 1)))
        .where(and(eq(channelEvents.channelId, SANDBOX_CHANNEL_ID), eq(verdicts.downstream, "ALLOW")))
        .orderBy(desc(channelEvents.platformOrder))
        .limit(20)
        .all();

      const approvedStage: SandboxApprovedStageItem[] = [];
      for (const row of approvedRows) {
        const content = approvedContent.readApproved({
          channelId: SANDBOX_CHANNEL_ID,
          correlationId: row.correlationId,
          nowIso,
        });
        if (content !== undefined) {
          approvedStage.push({
            eventId: row.eventId,
            correlationId: row.correlationId,
            subjectKey: row.subjectKey,
            text: content.text,
            translation: content.translation,
            decidedAt: row.decidedAt,
          });
        }
      }

      const notExpiredAt = "1970-01-01T00:00:00.000Z";
      return {
        banner: SANDBOX_BANNER,
        syntheticOnly: true,
        channelId: SANDBOX_CHANNEL_ID,
        subjects: subRows.map((s) => ({
          subjectId: s.subjectId,
          subjectKey: s.subjectKey,
          currentScore: s.currentScore,
          processingGeneration: s.processingGeneration,
          hasException: excSet.has(s.subjectId),
        })),
        reviewQueue: feed.reviewQueue,
        blockedItems: feed.blockedItems,
        approvedStage,
        changeLogs: auditLog.pageChangeLogs(SANDBOX_CHANNEL_ID, {
          notExpiredAt,
          correlationId: null,
          after: null,
          limit: 30,
        }),
        technicalLogs: auditLog.pageTechnicalLogs(SANDBOX_CHANNEL_ID, {
          notExpiredAt,
          after: null,
          limit: 30,
        }),
        dataRequests: subRows.flatMap((s) => requestsPort.listRequests(SANDBOX_CHANNEL_ID, s.subjectId)),
        candidateCards: candidateStore.listCards(SANDBOX_CHANNEL_ID),
        cacheEntryCount: inProcessSubjectCache.size,
      };
    },
  };
}
