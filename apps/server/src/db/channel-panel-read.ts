import { readScPayment, type ScPayment } from "@voxward/contracts";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { readPlatformDeleteStatusMap, type PlatformDeleteUiStatus } from "./channel-settings-store.js";
import type { VoxwardDatabase } from "./client.js";
import { parseScTranslationPayload, type ScTranslationPayload } from "./sc-translation-payload.js";
import {
  authOutputTokens,
  channelEvents,
  channels,
  deliveries,
  listEntries,
  outputGrants,
  ruleTerms,
  subjects,
  tasks,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "./schema/index.js";

export interface ChannelContextInfo {
  readonly channelId: string;
  readonly displayName: string;
  readonly platform: string;
}

export interface ScFeedItem {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly originalText: string | null;
  readonly translation: string | null;
  readonly notes: string | null;
  readonly acknowledgement: string | null;
  readonly safeAlias: string | null;
  readonly payment?: ScPayment;
  readonly sourceLanguage?: ScTranslationPayload["sourceLanguage"];
  readonly translations?: ScTranslationPayload["translations"];
  readonly thankYouReading?: ScTranslationPayload["thankYouReading"];
  readonly decidedAt: string;
  readonly deliveryId: string | null;
  readonly deliveryStatus: string | null;
}

export interface QueueItem {
  readonly taskId: string;
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly kind: string;
  readonly status: string;
  readonly deadlineAt: string;
  readonly originalText: string | null;
}

export interface ModerationItem {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly localStatus: "ALLOW" | "BLOCK";
  readonly classification: string;
  readonly platformDeleteStatus: PlatformDeleteUiStatus | "NOT_APPLICABLE";
  readonly bodyFolded: boolean;
  readonly originalText: string | null;
  readonly decidedAt: string;
  readonly deliveryId: string | null;
  readonly deliveryStatus: string | null;
}

export interface DockAndModerationFeed {
  readonly approvedSc: readonly ScFeedItem[];
  readonly reviewQueue: readonly QueueItem[];
  readonly blockedItems: readonly ModerationItem[];
  readonly liveStream: readonly ModerationItem[];
}

export function readChannelContext(database: VoxwardDatabase, channelId: string): ChannelContextInfo | undefined {
  const row = database.orm
    .select({ channelId: channels.id, displayName: channels.displayName, platform: channels.platform })
    .from(channels)
    .where(eq(channels.id, channelId))
    .get();
  return row;
}

function readEvidenceByCorrelation(
  database: VoxwardDatabase,
  channelId: string,
  correlationIds: readonly string[],
  nowIso: string,
): Map<string, { messageText: string | null; translationJson: string | null }> {
  const result = new Map<string, { messageText: string | null; translationJson: string | null }>();
  if (correlationIds.length === 0) return result;
  const rows = database.orm
    .select({
      correlationId: technicalLogs.correlationId,
      kind: technicalLogEvidence.evidenceKind,
      payload: technicalLogEvidence.payload,
    })
    .from(technicalLogEvidence)
    .innerJoin(technicalLogs, eq(technicalLogs.id, technicalLogEvidence.logId))
    .where(
      and(
        eq(technicalLogs.channelId, channelId),
        inArray(technicalLogs.correlationId, [...correlationIds]),
        inArray(technicalLogEvidence.evidenceKind, ["MESSAGE_TEXT", "TRANSLATION"]),
        gt(technicalLogEvidence.expiresAt, nowIso),
      ),
    )
    .orderBy(desc(technicalLogs.sequence), desc(technicalLogEvidence.id))
    .all();

  for (const row of rows) {
    const entry = result.get(row.correlationId) ?? { messageText: null, translationJson: null };
    if (row.kind === "MESSAGE_TEXT" && entry.messageText === null) entry.messageText = row.payload;
    if (row.kind === "TRANSLATION" && entry.translationJson === null) entry.translationJson = row.payload;
    result.set(row.correlationId, entry);
  }
  return result;
}

function readPaidEvents(database: VoxwardDatabase, channelId: string, correlationIds: readonly string[], nowIso: string) {
  const result = new Map<string, ScPayment | null>();
  if (correlationIds.length === 0) return result;
  const rows = database.orm
    .select({ correlationId: technicalLogs.correlationId, data: technicalLogs.dataJson })
    .from(technicalLogs)
    .where(and(eq(technicalLogs.channelId, channelId), eq(technicalLogs.stage, "BASE_RULE"),
      inArray(technicalLogs.correlationId, correlationIds), gt(technicalLogs.expiresAt, nowIso)))
    .orderBy(desc(technicalLogs.sequence))
    .all();
  for (const row of rows) {
    if (row.data === null || result.has(row.correlationId)) continue;
    const data = JSON.parse(row.data) as { isPaid?: unknown; scAmountMicros?: unknown; scCurrency?: unknown; scTier?: unknown } | null;
    const payment = readScPayment({ amountMicros: data?.scAmountMicros, currency: data?.scCurrency, tier: data?.scTier });
    if (payment !== null || data?.isPaid === true) result.set(row.correlationId, payment);
  }
  return result;
}

export function readDockAndModerationFeed(
  database: VoxwardDatabase,
  channelId: string,
  options: { readonly includeOriginal: boolean; readonly nowIso: string },
): DockAndModerationFeed {
  const events = database.orm
    .select({
      eventId: channelEvents.id,
      subjectId: channelEvents.subjectId,
      subjectKey: subjects.platformSubjectKey,
      correlationId: channelEvents.correlationId,
      receivedAt: channelEvents.receivedAt,
    })
    .from(channelEvents)
    .innerJoin(subjects, eq(subjects.id, channelEvents.subjectId))
    .where(eq(channelEvents.channelId, channelId))
    .orderBy(desc(channelEvents.platformOrder))
    .limit(50)
    .all();

  const correlationIds = events.map((e) => e.correlationId);
  const evidence = readEvidenceByCorrelation(database, channelId, correlationIds, options.nowIso);
  const paidEvents = readPaidEvents(database, channelId, correlationIds, options.nowIso);
  const platformDeletes = readPlatformDeleteStatusMap(database, channelId);

  const eventIds = events.map((e) => e.eventId);
  const currentVerdicts =
    eventIds.length === 0
      ? []
      : database.orm
          .select({
            eventId: verdicts.eventId,
            classification: verdicts.classification,
            downstream: verdicts.downstream,
            decidedAt: verdicts.decidedAt,
          })
          .from(verdicts)
          .where(and(inArray(verdicts.eventId, eventIds), eq(verdicts.isCurrent, 1)))
          .all();
  const verdictByEvent = new Map(currentVerdicts.map((v) => [v.eventId, v]));

  const deliveryRows =
    eventIds.length === 0
      ? []
      : database.orm
          .select({
            id: deliveries.id,
            eventId: deliveries.eventId,
            status: deliveries.status,
            deliverySequence: deliveries.deliverySequence,
          })
          .from(deliveries)
          .where(inArray(deliveries.eventId, eventIds))
          .orderBy(desc(deliveries.deliverySequence))
          .all();
  const deliveryByEvent = new Map<string, { id: string; status: string }>();
  for (const d of deliveryRows) {
    if (!deliveryByEvent.has(d.eventId)) deliveryByEvent.set(d.eventId, { id: d.id, status: d.status });
  }

  const paidTaskRows =
    eventIds.length === 0
      ? []
      : database.orm
          .select({ eventId: tasks.eventId })
          .from(tasks)
          .where(and(inArray(tasks.eventId, eventIds), eq(tasks.kind, "PAID_TEXT_REVIEW")))
          .all();
  const paidEventIds = new Set(paidTaskRows.map((t) => t.eventId));

  const queueRows = database.orm
    .select({
      taskId: tasks.id,
      eventId: tasks.eventId,
      kind: tasks.kind,
      status: tasks.status,
      deadlineAt: tasks.deadlineAt,
      correlationId: channelEvents.correlationId,
      subjectKey: subjects.platformSubjectKey,
    })
    .from(tasks)
    .innerJoin(channelEvents, eq(channelEvents.id, tasks.eventId))
    .innerJoin(subjects, eq(subjects.id, channelEvents.subjectId))
    .where(and(eq(tasks.channelId, channelId), inArray(tasks.status, ["QUEUED", "RUNNING", "PENDING_REVIEW"])))
    .orderBy(desc(tasks.createdAt))
    .limit(50)
    .all();

  const reviewQueue: QueueItem[] = queueRows.map((row) => ({
    taskId: row.taskId,
    eventId: row.eventId,
    correlationId: row.correlationId,
    subjectRef: row.subjectKey,
    kind: row.kind,
    status: row.status,
    deadlineAt: row.deadlineAt,
    originalText: evidence.get(row.correlationId)?.messageText ?? null,
  }));

  const approvedSc: ScFeedItem[] = [];
  const blockedItems: ModerationItem[] = [];
  const liveStream: ModerationItem[] = [];

  for (const ev of events) {
    const verdict = verdictByEvent.get(ev.eventId);
    if (verdict === undefined) continue;
    const evEvidence = evidence.get(ev.correlationId);
    const del = deliveryByEvent.get(ev.eventId) ?? null;
    const isBlocked = verdict.downstream === "BLOCK";
    const bodyFolded = isBlocked;
    const originalText = isBlocked && !options.includeOriginal ? null : (evEvidence?.messageText ?? null);

    const item: ModerationItem = {
      eventId: ev.eventId,
      correlationId: ev.correlationId,
      subjectRef: ev.subjectKey,
      localStatus: isBlocked ? "BLOCK" : "ALLOW",
      classification: verdict.classification,
      platformDeleteStatus: isBlocked ? (platformDeletes[ev.eventId] ?? "PENDING") : "NOT_APPLICABLE",
      bodyFolded,
      originalText,
      decidedAt: verdict.decidedAt,
      deliveryId: del?.id ?? null,
      deliveryStatus: del?.status ?? null,
    };
    liveStream.push(item);
    if (isBlocked) {
      blockedItems.push(item);
    } else if (paidEvents.has(ev.correlationId) || paidEventIds.has(ev.eventId) || evEvidence?.translationJson != null) {
      const sc = parseScTranslationPayload(evEvidence?.translationJson ?? null);
      const payment = paidEvents.get(ev.correlationId);
      approvedSc.push({
        eventId: ev.eventId,
        correlationId: ev.correlationId,
        subjectRef: ev.subjectKey,
        originalText: evEvidence?.messageText ?? null,
        ...sc,
        ...(payment == null ? {} : { payment }),
        decidedAt: verdict.decidedAt,
        deliveryId: del?.id ?? null,
        deliveryStatus: del?.status ?? null,
      });
    }
  }

  return { approvedSc, reviewQueue, blockedItems, liveStream };
}

export function readRulesAndLists(database: VoxwardDatabase, channelId: string) {
  const terms = database.orm
    .select({
      id: ruleTerms.id,
      term: ruleTerms.term,
      matchKind: ruleTerms.matchKind,
      language: ruleTerms.language,
      groupCode: ruleTerms.groupCode,
      createdAt: ruleTerms.createdAt,
    })
    .from(ruleTerms)
    .where(and(eq(ruleTerms.channelId, channelId), isNull(ruleTerms.retiredAt)))
    .orderBy(desc(ruleTerms.createdAt))
    .all();

  const entries = database.orm
    .select({
      id: listEntries.id,
      subjectId: listEntries.subjectId,
      subjectKey: subjects.platformSubjectKey,
      listKind: listEntries.listKind,
      createdAt: listEntries.createdAt,
    })
    .from(listEntries)
    .innerJoin(subjects, eq(subjects.id, listEntries.subjectId))
    .where(and(eq(listEntries.channelId, channelId), isNull(listEntries.removedAt)))
    .orderBy(desc(listEntries.createdAt))
    .all();

  return { terms, entries };
}

export function readOutputsSummary(database: VoxwardDatabase, channelId: string) {
  const grants = database.orm
    .select({
      grantId: outputGrants.id,
      outputKind: outputGrants.outputKind,
      scope: outputGrants.scope,
      createdAt: outputGrants.createdAt,
    })
    .from(outputGrants)
    .where(and(eq(outputGrants.channelId, channelId), isNull(outputGrants.revokedAt)))
    .orderBy(desc(outputGrants.createdAt))
    .all();

  const tokens = database.orm
    .select({
      tokenId: authOutputTokens.id,
      createdAt: authOutputTokens.createdAt,
    })
    .from(authOutputTokens)
    .where(and(eq(authOutputTokens.channelId, channelId), isNull(authOutputTokens.revokedAt)))
    .orderBy(desc(authOutputTokens.createdAt))
    .all();

  return { grants, tokens };
}
