import { eq, inArray } from "drizzle-orm";
import type { SubjectCacheHub } from "@voxward/contracts";
import type { VoxwardDatabase } from "../db/client.js";
import {
  authOutputTokens,
  changeLogs,
  channelEvents,
  channels,
  credentialRefs,
  dataRequestItems,
  dataRequests,
  deliveries,
  eventPayments,
  listEntries,
  outputGrants,
  ruleTerms,
  ruleVersions,
  scoreExceptions,
  scoreLedger,
  scoreOutcomes,
  subjectIdentities,
  subjectNicknameChanges,
  subjectScores,
  subjects,
  tasks,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
  wordlistSnapshots,
} from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import type { RuleSetInput } from "../modules/moderation-engine/rules/groups.js";
import type { CandidateStore } from "../modules/moderation-engine/index.js";
import { SANDBOX_CHANNEL_ID, SANDBOX_SUBJECT_SEEDS } from "./synthetic-source.js";

export const SANDBOX_RULE_SET: RuleSetInput = {
  version: "1",
  groups: [
    {
      id: "sandbox-block",
      action: { kind: "BLOCK" },
      rules: [
        { id: "r-spam-link", kind: "normalized", text: "spam-link-xyz" },
        { id: "r-toxic-abuse", kind: "normalized", text: "toxic-abuse" },
      ],
    },
    {
      id: "sandbox-review",
      action: { kind: "REVIEW" },
      rules: [{ id: "r-check-link", kind: "normalized", text: "check this link" }],
    },
  ],
};

export interface SandboxResetContext {
  readonly database: VoxwardDatabase;
  readonly subjectCaches: SubjectCacheHub;
  readonly candidateStore: CandidateStore;
  readonly now?: () => Date;
  readonly onReset?: () => void;
}

/**
 * Deterministically resets all sandbox channel data in SQLite and clears
 * in-memory SubjectCacheHub and CandidateStore state for the sandbox channel.
 */
export function resetSandboxState(ctx: SandboxResetContext): { readonly resetAt: string } {
  const nowIso = (ctx.now ? ctx.now() : new Date()).toISOString();
  const expiresAt = new Date(Date.parse(nowIso) + 7 * 86_400_000).toISOString();

  const subjectRows = ctx.database.orm
    .select({ id: subjects.id, subjectKey: subjects.platformSubjectKey })
    .from(subjects)
    .where(eq(subjects.channelId, SANDBOX_CHANNEL_ID))
    .all();
  const subjectIds = subjectRows.map((r) => r.id);

  const correlationIds = ctx.database.orm
    .select({ correlationId: channelEvents.correlationId })
    .from(channelEvents)
    .where(eq(channelEvents.channelId, SANDBOX_CHANNEL_ID))
    .all()
    .map((r) => r.correlationId);

  for (const sub of subjectRows) {
    for (const cacheName of ctx.subjectCaches.names) {
      ctx.subjectCaches.forgetSubject(cacheName, SANDBOX_CHANNEL_ID, sub.subjectKey, correlationIds);
    }
  }
  if (correlationIds.length > 0) {
    ctx.candidateStore.removeBySourceCorrelations(SANDBOX_CHANNEL_ID, correlationIds);
  }
  const remainingCards = ctx.candidateStore.listCards(SANDBOX_CHANNEL_ID);
  if (remainingCards.length > 0) {
    ctx.candidateStore.removeBySourceCorrelations(
      SANDBOX_CHANNEL_ID,
      remainingCards.map((c) => c.sourceCorrelationId),
    );
  }

  runShortTransaction(ctx.database, (tx) => {
    const eventIds = tx
      .select({ id: channelEvents.id })
      .from(channelEvents)
      .where(eq(channelEvents.channelId, SANDBOX_CHANNEL_ID))
      .all()
      .map((r) => r.id);

    const logIds = tx
      .select({ id: technicalLogs.id })
      .from(technicalLogs)
      .where(eq(technicalLogs.channelId, SANDBOX_CHANNEL_ID))
      .all()
      .map((r) => r.id);

    const requestIds = tx
      .select({ id: dataRequests.id })
      .from(dataRequests)
      .where(eq(dataRequests.channelId, SANDBOX_CHANNEL_ID))
      .all()
      .map((r) => r.id);

    if (eventIds.length > 0) {
      tx.delete(deliveries).where(inArray(deliveries.eventId, eventIds)).run();
      tx.delete(verdicts).where(inArray(verdicts.eventId, eventIds)).run();
      tx.delete(tasks).where(inArray(tasks.eventId, eventIds)).run();
    }
    if (logIds.length > 0) {
      tx.delete(technicalLogEvidence).where(inArray(technicalLogEvidence.logId, logIds)).run();
    }
    tx.delete(technicalLogs).where(eq(technicalLogs.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(changeLogs).where(eq(changeLogs.channelId, SANDBOX_CHANNEL_ID)).run();

    if (requestIds.length > 0) {
      tx.delete(dataRequestItems).where(inArray(dataRequestItems.requestId, requestIds)).run();
    }
    tx.delete(scoreExceptions).where(eq(scoreExceptions.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(dataRequests).where(eq(dataRequests.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(listEntries).where(eq(listEntries.channelId, SANDBOX_CHANNEL_ID)).run();

    if (subjectIds.length > 0) {
      tx.delete(scoreOutcomes).where(inArray(scoreOutcomes.subjectId, subjectIds)).run();
      tx.delete(scoreLedger).where(inArray(scoreLedger.subjectId, subjectIds)).run();
      tx.delete(subjectIdentities).where(inArray(subjectIdentities.subjectId, subjectIds)).run();
      tx.delete(subjectNicknameChanges).where(inArray(subjectNicknameChanges.subjectId, subjectIds)).run();
      tx.delete(subjectScores).where(inArray(subjectScores.subjectId, subjectIds)).run();
    }

    tx.delete(eventPayments).where(eq(eventPayments.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(channelEvents).where(eq(channelEvents.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(subjects).where(eq(subjects.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(outputGrants).where(eq(outputGrants.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(credentialRefs).where(eq(credentialRefs.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(authOutputTokens).where(eq(authOutputTokens.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(ruleTerms).where(eq(ruleTerms.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(wordlistSnapshots).where(eq(wordlistSnapshots.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(ruleVersions).where(eq(ruleVersions.channelId, SANDBOX_CHANNEL_ID)).run();
    tx.delete(channels).where(eq(channels.id, SANDBOX_CHANNEL_ID)).run();

    tx.insert(channels)
      .values({
        id: SANDBOX_CHANNEL_ID,
        platform: "youtube",
        platformChannelRef: "synthetic-sandbox-room-01",
        displayName: "VoxWard Synthetic Sandbox",
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .run();

    tx.insert(ruleVersions)
      .values({
        id: "sbx-rule-v1",
        channelId: SANDBOX_CHANNEL_ID,
        version: 1,
        ruleJson: JSON.stringify(SANDBOX_RULE_SET),
        createdAt: nowIso,
        createdByRef: "sandbox-system",
      })
      .run();

    tx.insert(ruleTerms)
      .values([
        {
          id: "sbx-term-1",
          channelId: SANDBOX_CHANNEL_ID,
          term: "spam-link-xyz",
          matchKind: "NORMALIZED",
          language: "en",
          groupCode: "sandbox-block",
          createdAt: nowIso,
          createdByRef: "sandbox-system",
        },
        {
          id: "sbx-term-2",
          channelId: SANDBOX_CHANNEL_ID,
          term: "toxic-abuse",
          matchKind: "NORMALIZED",
          language: "en",
          groupCode: "sandbox-block",
          createdAt: nowIso,
          createdByRef: "sandbox-system",
        },
        {
          id: "sbx-term-3",
          channelId: SANDBOX_CHANNEL_ID,
          term: "check this link",
          matchKind: "NORMALIZED",
          language: "en",
          groupCode: "sandbox-review",
          createdAt: nowIso,
          createdByRef: "sandbox-system",
        },
      ])
      .run();

    for (const seed of SANDBOX_SUBJECT_SEEDS) {
      tx.insert(subjects)
        .values({
          id: seed.id,
          channelId: SANDBOX_CHANNEL_ID,
          platformSubjectKey: seed.subjectKey,
          processingGeneration: 0,
          createdAt: nowIso,
        })
        .run();

      tx.insert(subjectScores)
        .values({
          subjectId: seed.id,
          identityBaseScore: seed.initialScore,
          behaviorAdjustTotal: 0,
          currentScore: seed.initialScore,
          version: 0,
          lastRewardAt: null,
          updatedAt: nowIso,
        })
        .run();
    }

    tx.insert(changeLogs)
      .values({
        id: `sbx-chg-reset-${Date.now()}`,
        channelId: SANDBOX_CHANNEL_ID,
        occurredAt: nowIso,
        actorKind: "SYSTEM",
        actorRef: "sandbox-reset",
        changeKind: "CONFIG_CHANGED",
        summary: "SANDBOX_RESET deterministic synthetic baseline initialized",
        outcome: "SUCCEEDED",
        correlationId: null,
        expiresAt,
      })
      .run();
  });

  ctx.onReset?.();
  return { resetAt: nowIso };
}
