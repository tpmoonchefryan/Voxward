import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { changeLogs, deploymentSettings, ruleTerms, ruleVersions, wordlistSnapshots } from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";
import {
  applyManagedWordlistToRuleSet,
  fromDbMatchKind,
  toDbMatchKind,
  type ExtendedTermEntry,
  type ManagedRuleSetShape,
} from "./wordlist-rules.js";

export type { ExtendedTermEntry, PanelTermMatchKind, ManagedRuleSetShape } from "./wordlist-rules.js";

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

function readChannelSettingInTx<T>(
  tx: Pick<VoxwardDatabase["orm"], "select">,
  channelId: string,
  section: string,
  fallback: T,
): T {
  const row = tx
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

function writeChannelSettingInTx(
  tx: ShortTransaction,
  channelId: string,
  section: string,
  value: unknown,
  now: Date = new Date(),
): void {
  const key = settingKey(channelId, section);
  const valueJson = JSON.stringify(value);
  const updatedAt = now.toISOString();
  tx.insert(deploymentSettings)
    .values({ key, valueJson, updatedAt })
    .onConflictDoUpdate({
      target: deploymentSettings.key,
      set: { valueJson, updatedAt },
    })
    .run();
}

/**
 * Atomic read-modify-write for a JSON section in `deployment_settings`, running both the read and the upsert
 * inside one short synchronous transaction so concurrent writers cannot lose updates (VW3-R-011).
 */
export function updateChannelSettingAtomic<T, R = T>(
  database: VoxwardDatabase,
  channelId: string,
  section: string,
  fallback: T,
  updater: (current: T) => { readonly write: boolean; readonly next: T; readonly result: R },
  now: Date = new Date(),
): R {
  return runShortTransaction(database, (tx) => {
    const current = readChannelSettingInTx(tx, channelId, section, fallback);
    const outcome = updater(current);
    if (outcome.write) {
      writeChannelSettingInTx(tx, channelId, section, outcome.next, now);
    }
    return outcome.result;
  });
}

export function readChannelSetting<T>(
  database: VoxwardDatabase,
  channelId: string,
  section: string,
  fallback: T,
): T {
  return readChannelSettingInTx(database.orm, channelId, section, fallback);
}

export function writeChannelSetting(
  database: VoxwardDatabase,
  channelId: string,
  section: string,
  value: unknown,
  now: Date = new Date(),
): void {
  runShortTransaction(database, (tx) => {
    writeChannelSettingInTx(tx, channelId, section, value, now);
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
  updateChannelSettingAtomic<Record<string, PlatformDeleteUiStatus>, void>(
    database,
    channelId,
    "platform-delete-status",
    {},
    (current) => ({ write: true, next: { ...current, [eventId]: status }, result: undefined }),
    now,
  );
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
  return runShortTransaction(database, (tx) => insertRuleVersion(tx, input));
}

function insertRuleVersion(
  tx: ShortTransaction,
  input: { readonly channelId: string; readonly ruleJson: string; readonly actorRef: string; readonly now: Date },
): number {
  const createdAt = input.now.toISOString();
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
}

export function readActiveTermEntriesInTx(tx: Pick<VoxwardDatabase["orm"], "select">, channelId: string): ExtendedTermEntry[] {
  return tx
    .select({
      id: ruleTerms.id,
      term: ruleTerms.term,
      matchKind: ruleTerms.matchKind,
      language: ruleTerms.language,
      groupCode: ruleTerms.groupCode,
      listKind: ruleTerms.listKind,
      enabled: ruleTerms.enabled,
      action: ruleTerms.action,
    })
    .from(ruleTerms)
    .where(and(eq(ruleTerms.channelId, channelId), isNull(ruleTerms.retiredAt)))
    .orderBy(desc(ruleTerms.createdAt), ruleTerms.id)
    .all()
    .map((row) => ({
      id: row.id,
      listKind: row.listKind === "WHITELIST" ? "WHITELIST" : "BLACKLIST",
      term: row.term,
      categoryCode: row.groupCode || (row.listKind === "WHITELIST" ? "friendly" : "spam"),
      matchKind: fromDbMatchKind(row.matchKind),
      enabled: row.enabled === 1,
      language: row.language,
      action: row.action === "BLOCK" ? "BLOCK" : "REVIEW",
    }));
}

/**
 * Rebuilds managed wordlist groups onto the channel's latest rule version from active `rule_terms` rows
 * and records a `rule_versions` + `wordlist_snapshots` entry inside the caller's transaction.
 */
export function syncRuleVersionFromActiveTermsInTx(
  tx: ShortTransaction,
  input: {
    readonly channelId: string;
    readonly actorRef: string;
    readonly nowIso: string;
    readonly baseRuleSetOverride?: ManagedRuleSetShape;
  },
): { readonly version: number; readonly entries: readonly ExtendedTermEntry[]; readonly ruleSet: ManagedRuleSetShape } {
  const entries = readActiveTermEntriesInTx(tx, input.channelId);
  const latest = tx
    .select({ version: ruleVersions.version, ruleJson: ruleVersions.ruleJson })
    .from(ruleVersions)
    .where(eq(ruleVersions.channelId, input.channelId))
    .orderBy(desc(ruleVersions.version))
    .limit(1)
    .get();
  const ruleSet = applyManagedWordlistToRuleSet(input.baseRuleSetOverride ?? latest?.ruleJson ?? null, entries);
  const nextVersion = (latest?.version ?? 0) + 1;
  tx.insert(ruleVersions)
    .values({
      id: randomUUID(),
      channelId: input.channelId,
      version: nextVersion,
      ruleJson: JSON.stringify(ruleSet),
      createdAt: input.nowIso,
      createdByRef: input.actorRef,
    })
    .run();
  tx.insert(wordlistSnapshots)
    .values({
      id: randomUUID(),
      channelId: input.channelId,
      ruleVersion: nextVersion,
      entriesJson: JSON.stringify(entries),
      createdAt: input.nowIso,
      createdByRef: input.actorRef,
    })
    .run();
  return { version: nextVersion, entries, ruleSet };
}

export function publishConfirmedCandidateTerm(
  database: VoxwardDatabase,
  input: {
    readonly channelId: string;
    readonly term: string;
    readonly candidateId: string;
    readonly actorRef: string;
    readonly language?: string;
    readonly now?: Date;
  },
): number {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const language = input.language ?? "und";
  return runShortTransaction(database, (tx) => {
    const existing = tx
      .select({ id: ruleTerms.id })
      .from(ruleTerms)
      .where(
        and(
          eq(ruleTerms.channelId, input.channelId),
          eq(ruleTerms.listKind, "BLACKLIST"),
          eq(ruleTerms.matchKind, "NORMALIZED"),
          eq(ruleTerms.language, language),
          eq(ruleTerms.term, input.term),
          isNull(ruleTerms.retiredAt),
        ),
      )
      .get();
    if (existing === undefined) {
      tx.insert(ruleTerms)
        .values({
          id: randomUUID(),
          channelId: input.channelId,
          term: input.term,
          matchKind: "NORMALIZED",
          language,
          groupCode: `candidate:${input.candidateId}`,
          listKind: "BLACKLIST",
          enabled: 1,
          action: "REVIEW",
          createdAt,
          createdByRef: input.actorRef,
          retiredAt: null,
        })
        .run();
    }
    const synced = syncRuleVersionFromActiveTermsInTx(tx, {
      channelId: input.channelId,
      actorRef: input.actorRef,
      nowIso: createdAt,
    });
    tx.insert(changeLogs)
      .values({
        id: randomUUID(),
        channelId: input.channelId,
        occurredAt: createdAt,
        actorKind: "ACCOUNT",
        actorRef: input.actorRef,
        changeKind: "TERM_CHANGED",
        summary: "词条变更：确认候选词条入库",
        summaryCode: "TERM_CANDIDATE_CONFIRMED",
        summaryParamsJson: null,
        outcome: "SUCCEEDED",
        correlationId: null,
        expiresAt,
      })
      .run();
    return synced.version;
  });
}

// ---------------------------------------------------------------- VW-Draft-04..08 KV extensions

export interface ShellPreferencesState {
  readonly pins: readonly string[];
  readonly rightPins?: readonly string[];
  readonly theme?: "light" | "dark" | "halloween";
  readonly locale?: string;
  readonly density?: "compact" | "comfortable";
}

const DEFAULT_SHELL_PREFERENCES: ShellPreferencesState = {
  pins: ["moderation", "blocked", "data"],
  rightPins: ["logs", "integrations", "users", "settings"],
  theme: "halloween",
  locale: "en",
  density: "comfortable",
};

function shellPrefKey(accountId: string, tenant: string, product: string): string {
  return `shell-pref:${accountId}:${tenant}:${product}`;
}

export function readShellPreferences(
  database: VoxwardDatabase,
  input: { readonly accountId: string; readonly tenant: string; readonly product: string },
): ShellPreferencesState {
  const row = database.orm
    .select({ valueJson: deploymentSettings.valueJson })
    .from(deploymentSettings)
    .where(eq(deploymentSettings.key, shellPrefKey(input.accountId, input.tenant, input.product)))
    .get();
  if (row === undefined) return DEFAULT_SHELL_PREFERENCES;
  try {
    const parsed = JSON.parse(row.valueJson) as Partial<ShellPreferencesState>;
    return {
      pins: Array.isArray(parsed.pins) ? parsed.pins : DEFAULT_SHELL_PREFERENCES.pins,
      rightPins: Array.isArray(parsed.rightPins) ? parsed.rightPins : DEFAULT_SHELL_PREFERENCES.rightPins,
      theme: parsed.theme === "dark" || parsed.theme === "halloween" || parsed.theme === "light" ? parsed.theme : "halloween",
      locale: typeof parsed.locale === "string" && parsed.locale ? parsed.locale : "en",
      density: parsed.density === "compact" ? "compact" : "comfortable",
    };
  } catch {
    return DEFAULT_SHELL_PREFERENCES;
  }
}

export function writeShellPreferences(
  database: VoxwardDatabase,
  input: {
    readonly accountId: string;
    readonly tenant: string;
    readonly product: string;
    readonly state: ShellPreferencesState;
    readonly now?: Date;
  },
): ShellPreferencesState {
  const key = shellPrefKey(input.accountId, input.tenant, input.product);
  const valueJson = JSON.stringify(input.state);
  const updatedAt = (input.now ?? new Date()).toISOString();
  runShortTransaction(database, (tx) => {
    tx.insert(deploymentSettings)
      .values({ key, valueJson, updatedAt })
      .onConflictDoUpdate({
        target: deploymentSettings.key,
        set: { valueJson, updatedAt },
      })
      .run();
  });
  return input.state;
}

export interface TermCategoryItem {
  readonly code: string;
  readonly label: string;
  readonly listKind: "BLACKLIST" | "WHITELIST";
  readonly description: string;
  readonly createdAt: string;
  readonly builtIn?: boolean;
}

const DEFAULT_TERM_CATEGORIES: readonly TermCategoryItem[] = [
  { code: "spam", label: "垃圾刷屏", listKind: "BLACKLIST", description: "高频重复、外链导流或广告垃圾信息", createdAt: "2026-11-18T00:00:00.000Z", builtIn: true },
  { code: "abuse", label: "人身攻击", listKind: "BLACKLIST", description: "辱骂、恶意骚扰与仇恨言论", createdAt: "2026-11-18T00:00:00.000Z", builtIn: true },
  { code: "sensitive", label: "高敏禁词", listKind: "BLACKLIST", description: "违禁词与规避变形表达", createdAt: "2026-11-18T00:00:00.000Z", builtIn: true },
  { code: "friendly", label: "常用热梗", listKind: "WHITELIST", description: "已确认安全的社区友好高频词", createdAt: "2026-11-18T00:00:00.000Z", builtIn: true },
];

export function readTermCategories(database: VoxwardDatabase, channelId: string): TermCategoryItem[] {
  const saved = readChannelSetting<TermCategoryItem[] | null>(database, channelId, "term-categories", null);
  return saved ?? [...DEFAULT_TERM_CATEGORIES];
}

export function appendTermCategory(
  database: VoxwardDatabase,
  channelId: string,
  item: Omit<TermCategoryItem, "createdAt">,
  now: Date = new Date(),
): { readonly ok: true; readonly categories: TermCategoryItem[] } | { readonly ok: false; readonly code: "CATEGORY_EXISTS" } {
  return updateChannelSettingAtomic<
    TermCategoryItem[] | null,
    { readonly ok: true; readonly categories: TermCategoryItem[] } | { readonly ok: false; readonly code: "CATEGORY_EXISTS" }
  >(
    database,
    channelId,
    "term-categories",
    null,
    (saved) => {
      const existing = saved ?? [...DEFAULT_TERM_CATEGORIES];
      if (existing.some((c) => c.code === item.code)) {
        return { write: false, next: existing, result: { ok: false, code: "CATEGORY_EXISTS" } };
      }
      const next: TermCategoryItem[] = [...existing, { ...item, createdAt: now.toISOString() }];
      return { write: true, next, result: { ok: true, categories: next } };
    },
    now,
  );
}

export interface TermListVersion {
  readonly version: number;
  readonly createdAt: string;
  readonly createdByRef: string;
  readonly entries: readonly ExtendedTermEntry[];
}

export function readTermEntries(database: VoxwardDatabase, channelId: string): ExtendedTermEntry[] {
  return readActiveTermEntriesInTx(database.orm, channelId);
}

export function readTermListVersions(database: VoxwardDatabase, channelId: string, limit = 50): readonly TermListVersion[] {
  const rows = database.orm
    .select({
      version: wordlistSnapshots.ruleVersion,
      createdAt: wordlistSnapshots.createdAt,
      createdByRef: wordlistSnapshots.createdByRef,
      entriesJson: wordlistSnapshots.entriesJson,
    })
    .from(wordlistSnapshots)
    .where(eq(wordlistSnapshots.channelId, channelId))
    .orderBy(desc(wordlistSnapshots.ruleVersion))
    .limit(limit)
    .all();
  return rows.map((row) => ({
    version: row.version,
    createdAt: row.createdAt,
    createdByRef: row.createdByRef,
    entries: JSON.parse(row.entriesJson) as ExtendedTermEntry[],
  }));
}

export function publishTermList(
  database: VoxwardDatabase,
  input: {
    readonly channelId: string;
    readonly entries: readonly ExtendedTermEntry[];
    readonly actorRef: string;
    readonly now: Date;
    readonly changeLogExpiresAt?: string;
    readonly baseRuleSetOverride?: ManagedRuleSetShape;
  },
): TermListVersion & { readonly ruleSet: ManagedRuleSetShape } {
  const nowIso = input.now.toISOString();
  const expiresAt = input.changeLogExpiresAt ?? new Date(input.now.getTime() + 30 * 86_400_000).toISOString();
  return runShortTransaction(database, (tx) => {
    const deduped: ExtendedTermEntry[] = [];
    const seenKeys = new Set<string>();
    for (const entry of input.entries) {
      const language = entry.language ?? "und";
      const dbKind = toDbMatchKind(entry.matchKind);
      const key = JSON.stringify([entry.listKind, dbKind, language, entry.term]);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push({
        ...entry,
        language,
        action: entry.listKind === "WHITELIST" ? "REVIEW" : (entry.action ?? "REVIEW"),
      });
    }

    const activeRows = tx
      .select()
      .from(ruleTerms)
      .where(and(eq(ruleTerms.channelId, input.channelId), isNull(ruleTerms.retiredAt)))
      .all();
    const activeById = new Map(activeRows.map((row) => [row.id, row]));

    const unchangedIds = new Set<string>();
    const toInsert: ExtendedTermEntry[] = [];
    for (const entry of deduped) {
      const active = activeById.get(entry.id);
      if (
        active !== undefined &&
        active.listKind === entry.listKind &&
        active.matchKind === toDbMatchKind(entry.matchKind) &&
        active.language === (entry.language ?? "und") &&
        active.term === entry.term &&
        active.groupCode === entry.categoryCode &&
        (active.enabled === 1) === entry.enabled &&
        active.action === (entry.action ?? "REVIEW")
      ) {
        unchangedIds.add(active.id);
      } else {
        toInsert.push(entry);
      }
    }

    const retireIds = activeRows.filter((row) => !unchangedIds.has(row.id)).map((row) => row.id);
    if (retireIds.length > 0) {
      tx.update(ruleTerms)
        .set({ retiredAt: nowIso })
        .where(inArray(ruleTerms.id, retireIds))
        .run();
    }

    const candidateIds = toInsert.map((entry) => entry.id);
    const takenIds =
      candidateIds.length === 0
        ? new Set<string>()
        : new Set(
            tx
              .select({ id: ruleTerms.id })
              .from(ruleTerms)
              .where(inArray(ruleTerms.id, candidateIds))
              .all()
              .map((row) => row.id),
          );

    for (const entry of toInsert) {
      let id = entry.id;
      if (takenIds.has(id)) {
        id = randomUUID();
      }
      takenIds.add(id);
      tx.insert(ruleTerms)
        .values({
          id,
          channelId: input.channelId,
          term: entry.term,
          matchKind: toDbMatchKind(entry.matchKind),
          language: entry.language ?? "und",
          groupCode: entry.categoryCode,
          listKind: entry.listKind,
          enabled: entry.enabled ? 1 : 0,
          action: entry.action ?? "REVIEW",
          createdAt: nowIso,
          createdByRef: input.actorRef,
          retiredAt: null,
        })
        .run();
    }

    const synced = syncRuleVersionFromActiveTermsInTx(tx, {
      channelId: input.channelId,
      actorRef: input.actorRef,
      nowIso,
      baseRuleSetOverride: input.baseRuleSetOverride,
    });
    tx.insert(changeLogs)
      .values({
        id: randomUUID(),
        channelId: input.channelId,
        occurredAt: nowIso,
        actorKind: "ACCOUNT",
        actorRef: input.actorRef,
        changeKind: "TERM_CHANGED",
        summary: "词条变更：已发布词表版本",
        summaryCode: "TERM_LIST_PUBLISHED",
        summaryParamsJson: JSON.stringify({ version: synced.version }),
        outcome: "SUCCEEDED",
        correlationId: null,
        expiresAt,
      })
      .run();

    return {
      version: synced.version,
      createdAt: nowIso,
      createdByRef: input.actorRef,
      entries: synced.entries,
      ruleSet: synced.ruleSet,
    };
  });
}

export interface ManualBlockedUserRecord {
  readonly subjectRef: string;
  readonly nickname: string | null;
  readonly reason: string;
  readonly syncYouTube: boolean;
  readonly banId: string | null;
  readonly createdAt: string;
  readonly createdBy: string;
}

export function readBlockedUsers(database: VoxwardDatabase, channelId: string): ManualBlockedUserRecord[] {
  return readChannelSetting<ManualBlockedUserRecord[]>(database, channelId, "blocked-users", []);
}

export function upsertBlockedUser(
  database: VoxwardDatabase,
  channelId: string,
  record: ManualBlockedUserRecord,
  now: Date = new Date(),
): ManualBlockedUserRecord[] {
  return updateChannelSettingAtomic<ManualBlockedUserRecord[], ManualBlockedUserRecord[]>(
    database,
    channelId,
    "blocked-users",
    [],
    (current) => {
      const next = [record, ...current.filter((u) => u.subjectRef !== record.subjectRef)];
      return { write: true, next, result: next };
    },
    now,
  );
}

export function removeBlockedUser(
  database: VoxwardDatabase,
  channelId: string,
  subjectRef: string,
  now: Date = new Date(),
): { readonly removed: ManualBlockedUserRecord | null; readonly users: ManualBlockedUserRecord[] } {
  return updateChannelSettingAtomic<
    ManualBlockedUserRecord[],
    { readonly removed: ManualBlockedUserRecord | null; readonly users: ManualBlockedUserRecord[] }
  >(
    database,
    channelId,
    "blocked-users",
    [],
    (current) => {
      const removed = current.find((u) => u.subjectRef === subjectRef) ?? null;
      const next = current.filter((u) => u.subjectRef !== subjectRef);
      return { write: removed !== null, next, result: { removed, users: next } };
    },
    now,
  );
}

export type AdapterCategory = "LIVE_PLATFORM" | "AI_PROVIDER" | "OUTPUT_TARGET";
export type AdapterDriverId =
  | "youtube-live-v3"
  | "kiro-cli"
  | "openai-compat"
  | "anthropic-compat"
  | "obs-overlay-source"
  | "native-readonly-protocol";

export interface AdapterSystemDescriptor {
  readonly driverId: AdapterDriverId;
  readonly category: AdapterCategory;
  readonly displayName: string;
  readonly summary: string;
  readonly secretFields: readonly string[];
  readonly controlActions: readonly { readonly action: string; readonly label: string }[];
}

export const ADAPTER_SYSTEM_CATALOG: readonly AdapterSystemDescriptor[] = [
  {
    driverId: "youtube-live-v3",
    category: "LIVE_PLATFORM",
    displayName: "YouTube Live Data API v3",
    summary: "官方直播聊天 streamList 拉流与 Super Chat / 会员身份映射。",
    secretFields: ["clientSecret", "refreshToken"],
    controlActions: [
      { action: "test-connection", label: "检测连接与配额" },
      { action: "reauthorize", label: "发起 OAuth 重授权" },
      { action: "restart-ingest", label: "重启直播拉流" },
    ],
  },
  {
    driverId: "kiro-cli",
    category: "AI_PROVIDER",
    displayName: "Kiro CLI 本地运行时适配器",
    summary: "一次性受限会话调用 Kiro CLI / Crew 执行内容审核与 SC 精翻，并在终态自动清理运行目录。",
    secretFields: ["kiroApiKey"],
    controlActions: [
      { action: "cli-self-check", label: "执行 CLI 自检" },
      { action: "cleanup-orphans", label: "清理孤儿运行目录" },
      { action: "fetch-models", label: "获取远端可用模型列表" },
    ],
  },
  {
    driverId: "openai-compat",
    category: "AI_PROVIDER",
    displayName: "OpenAI 基础格式适配器",
    summary: "兼容 OpenAI Chat/Responses 基础协议与自定义 Base Endpoint，支持从 /models 拉取可用模型。",
    secretFields: ["apiKey"],
    controlActions: [
      { action: "test-connection", label: "检测端点连通性" },
      { action: "fetch-models", label: "获取远端可用模型列表" },
    ],
  },
  {
    driverId: "anthropic-compat",
    category: "AI_PROVIDER",
    displayName: "Anthropic 基础格式适配器",
    summary: "兼容 Anthropic Messages 基础协议、自定义 Endpoint 与版本请求头。",
    secretFields: ["apiKey"],
    controlActions: [
      { action: "test-connection", label: "检测端点连通性" },
      { action: "fetch-models", label: "获取远端可用模型列表" },
    ],
  },
  {
    driverId: "obs-overlay-source",
    category: "OUTPUT_TARGET",
    displayName: "OBS 透明投屏源",
    summary: "通过单向只读通道向 OBS 浏览器源推送已放行弹幕与 7 级 Super Chat，提供 preview=1 预览地址与一次性令牌。",
    secretFields: [],
    controlActions: [
      { action: "test-connection", label: "检测投屏通道状态" },
      { action: "issue-output-token", label: "签发 OBS 投屏令牌" },
    ],
  },
  {
    driverId: "native-readonly-protocol",
    category: "OUTPUT_TARGET",
    displayName: "blivechat / 原生只读输出协议",
    summary: "面向本机回环连接器与 blivechat 等原生桌面客户端的单向只读 WebSocket 推送与一次性授权凭据。",
    secretFields: [],
    controlActions: [
      { action: "test-connection", label: "检测回环协议状态" },
      { action: "issue-output-grant", label: "签发桌面插件凭据" },
    ],
  },
];

export interface AdapterModelPoolItem {
  readonly modelId: string;
  readonly displayName: string;
  readonly reasoningLevels: readonly string[];
  readonly source: "remote" | "manual";
}

export const ADAPTER_STATUS_CODES = [
  "CONFIG_SAVED",
  "ACTION_EXECUTED",
  "ACTION_FAILED",
  "CONNECTION_OK",
  "CONNECTION_FAILED",
  "CLI_OK",
  "CLI_FAILED",
  "ORPHANS_CLEANED",
  "OBS_OVERLAY_READY",
  "NATIVE_OUTPUT_READY",
  "MODELS_FETCHED",
] as const;
export type AdapterStatusCode = (typeof ADAPTER_STATUS_CODES)[number];

export interface ChannelAdapterRecord {
  readonly id: string;
  readonly category: AdapterCategory;
  readonly driverId: AdapterDriverId;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly config: Readonly<Record<string, string | number | boolean | null>>;
  readonly models: readonly AdapterModelPoolItem[];
  readonly lastStatus: string;
  readonly lastStatusCode?: AdapterStatusCode;
  readonly lastStatusParams?: Readonly<Record<string, string | number>>;
  readonly updatedAt: string;
}

export function redactAdapterConfig(
  driverId: AdapterDriverId,
  config: Readonly<Record<string, string | number | boolean | null>>,
): Record<string, string | number | boolean | null> {
  const desc = ADAPTER_SYSTEM_CATALOG.find((d) => d.driverId === driverId);
  const secrets = new Set(desc?.secretFields ?? []);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(config)) {
    if (k === "__secretBoundEndpoint") continue;
    if (secrets.has(k) && typeof v === "string" && v.length > 0) {
      out[k] = "••••••";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function readChannelAdapters(database: VoxwardDatabase, channelId: string): ChannelAdapterRecord[] {
  return readChannelSetting<ChannelAdapterRecord[]>(database, channelId, "adapters", []);
}

export function writeChannelAdapters(
  database: VoxwardDatabase,
  channelId: string,
  adapters: readonly ChannelAdapterRecord[],
  now: Date = new Date(),
): ChannelAdapterRecord[] {
  writeChannelSetting(database, channelId, "adapters", adapters, now);
  return [...adapters];
}

export interface IntegrationLogRecord {
  readonly id: string;
  readonly correlationId: string;
  readonly adapterId: string;
  readonly adapterName: string;
  readonly providerKind: "LIVE_PLATFORM" | "AI_PROVIDER" | "OUTPUT_TARGET";
  readonly method: string;
  readonly url: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly rawRequestBody: string | null;
  readonly rawResponseBody: string | null;
  readonly occurredAt: string;
}

const SENSITIVE_HTTP_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api-key",
  "cookie",
  "set-cookie",
  "x-csrf-token",
]);

const ALLOWED_ADAPTER_ACTIONS = new Set([
  "test-connection",
  "fetch-models",
  "cli-self-check",
  "self-check",
  "cleanup-orphans",
  "sync-ban",
  "verify",
]);

const ALLOWED_TARGET_DRIVERS = new Set(["obs-overlay-source", "native-readonly-protocol"]);

const SAFE_DIAGNOSTIC_PATH_SEGMENTS = new Set([
  "v1",
  "v1beta",
  "v2",
  "v3",
  "youtube",
  "liveBroadcasts",
  "liveChat",
  "bans",
  "models",
  "messages",
  "chat",
  "completions",
  "runtime",
  "self-check",
  "cleanup-orphans",
]);

const ALLOWED_YOUTUBE_PART_TOKENS = new Set(["id", "status", "snippet", "contentDetails"]);

const FIXED_INTERNAL_URIS = new Set([
  "kiro-cli://runtime/self-check",
  "kiro-cli://runtime/models",
  "kiro-cli://runtime/cleanup-orphans",
  "/output/v1/room",
]);

function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function sanitizePathname(pathname: string): string {
  const segments = pathname.split("/").filter((seg) => seg.length > 0);
  if (segments.length === 0) return "";
  const sanitized: string[] = [];
  for (const rawSeg of segments) {
    const decoded = safeDecodeSegment(rawSeg);
    if (decoded !== "[REDACTED]" && SAFE_DIAGNOSTIC_PATH_SEGMENTS.has(decoded)) {
      sanitized.push(decoded);
    } else if (sanitized[sanitized.length - 1] !== "[REDACTED]") {
      sanitized.push("[REDACTED]");
    }
  }
  return `/${sanitized.join("/")}`;
}

function sanitizeSearch(rawSearch: string): string {
  if (!rawSearch || rawSearch === "?") return "";
  const body = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
  if (!body) return "";
  const parts: string[] = [];
  for (const rawPair of body.split("&")) {
    if (!rawPair) continue;
    const eqIdx = rawPair.indexOf("=");
    if (eqIdx < 0) continue;
    const key = safeDecodeSegment(rawPair.slice(0, eqIdx));
    const val = safeDecodeSegment(rawPair.slice(eqIdx + 1));
    if (key === "part") {
      const tokens = val.split(",").filter((token) => token.length > 0);
      if (tokens.length > 0 && tokens.every((token) => ALLOWED_YOUTUBE_PART_TOKENS.has(token))) {
        parts.push(`part=${tokens.join(",")}`);
      }
      continue;
    }
    if (key === "mine" && (val === "true" || val === "false")) {
      parts.push(`mine=${val}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function sanitizeDiagnosticBody(raw: string | null): string | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof obj.ok === "boolean") out.ok = obj.ok;
  if (typeof obj.statusCode === "number" && Number.isInteger(obj.statusCode) && obj.statusCode >= 100 && obj.statusCode <= 599) {
    out.statusCode = obj.statusCode;
  }
  if (typeof obj.modelCount === "number" && Number.isInteger(obj.modelCount) && obj.modelCount >= 0 && obj.modelCount <= 100_000) {
    out.modelCount = obj.modelCount;
  }
  if (
    typeof obj.broadcastCount === "number" &&
    Number.isInteger(obj.broadcastCount) &&
    obj.broadcastCount >= 0 &&
    obj.broadcastCount <= 100_000
  ) {
    out.broadcastCount = obj.broadcastCount;
  }
  if (typeof obj.removed === "number" && Number.isInteger(obj.removed) && obj.removed >= 0 && obj.removed <= 100_000) {
    out.removed = obj.removed;
  }
  if (typeof obj.manualAction === "boolean") out.manualAction = obj.manualAction;
  if (typeof obj.action === "string" && ALLOWED_ADAPTER_ACTIONS.has(obj.action)) out.action = obj.action;
  if (typeof obj.target === "string" && ALLOWED_TARGET_DRIVERS.has(obj.target)) out.target = obj.target;
  if (obj.version === null || (typeof obj.version === "string" && /^[A-Za-z0-9._+-]{1,32}$/.test(obj.version))) {
    out.version = obj.version;
  }
  if (obj.error === null || (typeof obj.error === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(obj.error))) {
    out.error = obj.error;
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null;
}

/**
 * Normalizes integration diagnostic URLs to a closed allowlisted projection:
 * - Drops userinfo and fragments (`#...`)
 * - Preserves only allowlisted canonical API path segments; custom path segments become `[REDACTED]`
 * - Retains only business-defined diagnostic query parameters with validated values; drops all other keys/values
 */
export function sanitizeIntegrationUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  const withoutHash = trimmed.split("#", 1)[0] ?? "";
  const withoutQueryAndHash = withoutHash.split("?", 1)[0] ?? "";
  if (FIXED_INTERNAL_URIS.has(withoutQueryAndHash)) {
    return withoutQueryAndHash;
  }
  if (/^\/overlay\/[A-Za-z0-9_-]{1,64}$/.test(withoutQueryAndHash)) {
    return withoutQueryAndHash;
  }
  try {
    const parsed = new URL(trimmed);
    const sanitizedPath = sanitizePathname(parsed.pathname);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const origin = `${parsed.protocol}//${parsed.host}`;
      const sanitizedQuery = sanitizeSearch(parsed.search);
      return `${origin}${sanitizedPath}${sanitizedQuery}`;
    }
    return `${parsed.protocol}//${parsed.host}${sanitizedPath}`;
  } catch {
    if (withoutQueryAndHash.startsWith("/")) {
      return `${sanitizePathname(withoutQueryAndHash)}${sanitizeSearch(withoutHash.slice(withoutQueryAndHash.length))}`;
    }
    return "[REDACTED]";
  }
}

export function sanitizeIntegrationLogEntry(entry: IntegrationLogRecord): IntegrationLogRecord {
  return {
    ...entry,
    url: sanitizeIntegrationUrl(entry.url),
    requestHeaders: redactHttpHeaders(entry.requestHeaders),
    responseHeaders: redactHttpHeaders(entry.responseHeaders),
    rawRequestBody: sanitizeDiagnosticBody(entry.rawRequestBody),
    rawResponseBody: sanitizeDiagnosticBody(entry.rawResponseBody),
  };
}

export function redactHttpHeaders(headers: Readonly<Record<string, string>>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, rawVal] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HTTP_HEADERS.has(lowerKey)) {
      sanitized[lowerKey] = "[REDACTED]";
      continue;
    }
    const val = rawVal.trim();
    if (
      lowerKey === "accept" &&
      val.length <= 64 &&
      /^[a-z*][a-z0-9!#$&^_.+-]*\/[a-z*][a-z0-9!#$&^_.+-]*(?:\s*;\s*charset=[a-z0-9-]+)?$/i.test(val)
    ) {
      sanitized.accept = val;
    } else if (
      lowerKey === "content-type" &&
      val.length <= 64 &&
      /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:\s*;\s*charset=[a-z0-9-]+)?$/i.test(val)
    ) {
      sanitized["content-type"] = val;
    } else if (lowerKey === "x-voxward-action" && ALLOWED_ADAPTER_ACTIONS.has(val)) {
      sanitized["x-voxward-action"] = val;
    }
  }
  return sanitized;
}

export function readIntegrationLogs(database: VoxwardDatabase, channelId: string): IntegrationLogRecord[] {
  return readChannelSetting<IntegrationLogRecord[]>(database, channelId, "integration-logs", []).map(
    sanitizeIntegrationLogEntry,
  );
}

/**
 * Idempotently normalizes existing integration log rows in `deployment_settings` onto the safe
 * diagnostic URL & header projection so legacy stored path/query credentials are scrubbed on disk.
 */
export function migrateLegacyIntegrationLogs(database: VoxwardDatabase, now: Date = new Date()): number {
  const rows = database.sqlite
    .prepare("SELECT key, value_json AS valueJson FROM deployment_settings WHERE key LIKE 'channel:%:integration-logs'")
    .all() as Array<{ key: string; valueJson: string }>;

  let migratedRows = 0;
  const updatedAt = now.toISOString();
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.valueJson);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const sanitized = (parsed as IntegrationLogRecord[]).map(sanitizeIntegrationLogEntry);
    const nextJson = JSON.stringify(sanitized);
    if (nextJson === row.valueJson) continue;
    migratedRows += 1;
    runShortTransaction(database, (tx) => {
      tx.insert(deploymentSettings)
        .values({ key: row.key, valueJson: nextJson, updatedAt })
        .onConflictDoUpdate({
          target: deploymentSettings.key,
          set: { valueJson: nextJson, updatedAt },
        })
        .run();
    });
  }
  return migratedRows;
}

export function appendIntegrationLog(
  database: VoxwardDatabase,
  channelId: string,
  entry: IntegrationLogRecord,
  now: Date = new Date(),
): void {
  const redacted = sanitizeIntegrationLogEntry(entry);
  updateChannelSettingAtomic<IntegrationLogRecord[], void>(
    database,
    channelId,
    "integration-logs",
    [],
    (existing) => ({
      write: true,
      next: [redacted, ...existing].slice(0, 200),
      result: undefined,
    }),
    now,
  );
}

export interface StoredRbacRole {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPreset: boolean;
  readonly builtIn?: boolean;
  readonly permissions: Readonly<Record<string, "GRANT" | "DENY" | "NOT_SET">>;
}

export interface StoredRbacUser {
  readonly accountId: string;
  readonly displayName: string;
  readonly loginName: string;
  readonly enabled: boolean;
  readonly roleIds: readonly string[];
  readonly updatedAt: string;
}

const DEFAULT_RBAC_ROLES: readonly StoredRbacRole[] = [
  {
    id: "role-owner",
    name: "频道所有者",
    description: "拥有审核、配置、集成与成员完全管理权。",
    systemPreset: true,
    builtIn: true,
    permissions: {
      "queue.read": "GRANT",
      "review.decide": "GRANT",
      "list.edit": "GRANT",
      "score.config": "GRANT",
      "output.manage": "GRANT",
      "members.manage": "GRANT",
      "tokens.manage": "GRANT",
      "message.original": "GRANT",
      "subject.evidence": "GRANT",
      "data.handle": "GRANT",
      "logs.view": "GRANT",
    },
  },
  {
    id: "role-moderator",
    name: "房管",
    description: "负责实时审核队列、拦截重判、词条与手动黑名单管理。",
    systemPreset: true,
    builtIn: true,
    permissions: {
      "queue.read": "GRANT",
      "review.decide": "GRANT",
      "list.edit": "GRANT",
      "message.original": "GRANT",
      "score.config": "NOT_SET",
      "output.manage": "NOT_SET",
      "members.manage": "NOT_SET",
      "tokens.manage": "NOT_SET",
      "subject.evidence": "NOT_SET",
      "data.handle": "NOT_SET",
      "logs.view": "NOT_SET",
    },
  },
  {
    id: "role-data-admin",
    name: "隐私与数据管理员",
    description: "专责处理观众数据查询、核验与两阶段删除请求。",
    systemPreset: true,
    builtIn: true,
    permissions: {
      "queue.read": "NOT_SET",
      "review.decide": "DENY",
      "list.edit": "DENY",
      "message.original": "NOT_SET",
      "subject.evidence": "GRANT",
      "data.handle": "GRANT",
      "logs.view": "NOT_SET",
    },
  },
  {
    id: "role-auditor",
    name: "只读日志审计员",
    description: "仅查看技术日志、变更日志与外部集成日志，禁止改判与修改配置。",
    systemPreset: false,
    builtIn: true,
    permissions: {
      "queue.read": "GRANT",
      "logs.view": "GRANT",
      "review.decide": "DENY",
      "list.edit": "DENY",
      "data.handle": "DENY",
    },
  },
];

export function readRbacRoles(database: VoxwardDatabase, channelId: string): StoredRbacRole[] {
  return readChannelSetting<StoredRbacRole[]>(database, channelId, "rbac-roles", [...DEFAULT_RBAC_ROLES]);
}

export function writeRbacRoles(
  database: VoxwardDatabase,
  channelId: string,
  roles: readonly StoredRbacRole[],
  now: Date = new Date(),
): StoredRbacRole[] {
  writeChannelSetting(database, channelId, "rbac-roles", roles, now);
  return [...roles];
}

export function readRbacUsers(database: VoxwardDatabase, channelId: string): StoredRbacUser[] {
  return readChannelSetting<StoredRbacUser[]>(database, channelId, "rbac-users", []);
}

export function writeRbacUsers(
  database: VoxwardDatabase,
  channelId: string,
  users: readonly StoredRbacUser[],
  now: Date = new Date(),
): StoredRbacUser[] {
  writeChannelSetting(database, channelId, "rbac-users", users, now);
  return [...users];
}
