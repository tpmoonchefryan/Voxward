import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { deploymentSettings, ruleTerms, ruleVersions } from "./schema/index.js";
import { runShortTransaction } from "./transaction.js";

export type PlatformDeleteUiStatus = "PENDING" | "DELETED" | "FAILED" | "UNKNOWN";

export interface ConnectionFaultState {
  readonly platformFault: { readonly code: string; readonly message: string } | null;
  readonly modelFault: { readonly code: string; readonly message: string } | null;
}

export const DEFAULT_CONNECTION_FAULT_STATE: ConnectionFaultState = {
  platformFault: null,
  modelFault: null,
};

export interface ScoringAdminSettings {
  readonly initialScore: number;
  readonly minScore: number;
  readonly maxScore: number;
  readonly rewardDelta: number;
  readonly penaltyDelta: number;
}

export const DEFAULT_SCORING_ADMIN_SETTINGS: ScoringAdminSettings = {
  initialScore: 50,
  minScore: 0,
  maxScore: 100,
  rewardDelta: 2,
  penaltyDelta: 10,
};

export interface QueueAdminSettings {
  readonly realtimeConcurrency: number;
  readonly scConcurrency: number;
  readonly reviewBatchSize: number;
  readonly taskDeadlineMs: number;
}

export const DEFAULT_QUEUE_ADMIN_SETTINGS: QueueAdminSettings = {
  realtimeConcurrency: 4,
  scConcurrency: 2,
  reviewBatchSize: 20,
  taskDeadlineMs: 15000,
};

export interface RetentionAdminSettings {
  readonly changeLogDays: number;
  readonly technicalLogDays: number;
  readonly evidenceDays: number;
}

export const DEFAULT_RETENTION_ADMIN_SETTINGS: RetentionAdminSettings = {
  changeLogDays: 30,
  technicalLogDays: 14,
  evidenceDays: 7,
};

function settingKey(channelId: string, section: string): string {
  return `channel:${channelId}:${section}`;
}

export function readChannelSetting<T>(
  database: VoxwardDatabase,
  channelId: string,
  section: string,
  fallback: T,
): T {
  const row = database.orm
    .select({ valueJson: deploymentSettings.valueJson })
    .from(deploymentSettings)
    .where(eq(deploymentSettings.key, settingKey(channelId, section)))
    .get();
  if (row === undefined) return fallback;
  try {
    return JSON.parse(row.valueJson) as T;
  } catch {
    return fallback;
  }
}

export function writeChannelSetting(
  database: VoxwardDatabase,
  channelId: string,
  section: string,
  value: unknown,
  now: Date = new Date(),
): void {
  const key = settingKey(channelId, section);
  const valueJson = JSON.stringify(value);
  const updatedAt = now.toISOString();
  runShortTransaction(database, (tx) => {
    tx.insert(deploymentSettings)
      .values({ key, valueJson, updatedAt })
      .onConflictDoUpdate({
        target: deploymentSettings.key,
        set: { valueJson, updatedAt },
      })
      .run();
  });
}

export function readPlatformDeleteStatusMap(
  database: VoxwardDatabase,
  channelId: string,
): Record<string, PlatformDeleteUiStatus> {
  return readChannelSetting<Record<string, PlatformDeleteUiStatus>>(
    database,
    channelId,
    "platform-delete-status",
    {},
  );
}

export function writePlatformDeleteStatus(
  database: VoxwardDatabase,
  channelId: string,
  eventId: string,
  status: PlatformDeleteUiStatus,
  now: Date = new Date(),
): void {
  const current = readPlatformDeleteStatusMap(database, channelId);
  writeChannelSetting(database, channelId, "platform-delete-status", { ...current, [eventId]: status }, now);
}

export function readLatestRuleVersion(
  database: VoxwardDatabase,
  channelId: string,
): { readonly version: number; readonly ruleJson: string; readonly createdAt: string } | null {
  const row = database.orm
    .select({
      version: ruleVersions.version,
      ruleJson: ruleVersions.ruleJson,
      createdAt: ruleVersions.createdAt,
    })
    .from(ruleVersions)
    .where(eq(ruleVersions.channelId, channelId))
    .orderBy(desc(ruleVersions.version))
    .limit(1)
    .get();
  return row ?? null;
}

export function publishRuleVersion(
  database: VoxwardDatabase,
  input: { readonly channelId: string; readonly ruleJson: string; readonly actorRef: string; readonly now: Date },
): number {
  const createdAt = input.now.toISOString();
  return runShortTransaction(database, (tx) => {
    const latest = tx
      .select({ version: ruleVersions.version })
      .from(ruleVersions)
      .where(eq(ruleVersions.channelId, input.channelId))
      .orderBy(desc(ruleVersions.version))
      .limit(1)
      .get();
    const nextVersion = (latest?.version ?? 0) + 1;
    tx.insert(ruleVersions)
      .values({
        id: randomUUID(),
        channelId: input.channelId,
        version: nextVersion,
        ruleJson: input.ruleJson,
        createdAt,
        createdByRef: input.actorRef,
      })
      .run();
    return nextVersion;
  });
}

export function publishConfirmedCandidateTerm(
  database: VoxwardDatabase,
  input: { readonly channelId: string; readonly term: string; readonly candidateId: string; readonly actorRef: string },
): number {
  const createdAt = new Date().toISOString();
  return runShortTransaction(database, (tx) => {
    const latest = tx
      .select({ version: ruleVersions.version, ruleJson: ruleVersions.ruleJson })
      .from(ruleVersions)
      .where(eq(ruleVersions.channelId, input.channelId))
      .orderBy(desc(ruleVersions.version))
      .limit(1)
      .get();
    const nextVersion = (latest?.version ?? 0) + 1;
    tx.insert(ruleVersions)
      .values({
        id: randomUUID(),
        channelId: input.channelId,
        version: nextVersion,
        ruleJson: latest?.ruleJson ?? JSON.stringify({ version: `v${nextVersion}`, groups: [] }),
        createdAt,
        createdByRef: input.actorRef,
      })
      .run();
    tx.insert(ruleTerms)
      .values({
        id: randomUUID(),
        channelId: input.channelId,
        term: input.term,
        matchKind: "NORMALIZED",
        language: "und",
        groupCode: `candidate:${input.candidateId}`,
        createdAt,
        createdByRef: input.actorRef,
      })
      .onConflictDoNothing()
      .run();
    return nextVersion;
  });
}
