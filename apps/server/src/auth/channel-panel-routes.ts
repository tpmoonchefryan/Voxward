import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { CONTRACT_VERSION, type DecisionActor, type InferenceCapabilities } from "@voxward/contracts";
import { z } from "zod";
import {
  readDockAndModerationFeed,
  readChannelContext,
  readOutputsSummary,
  readRulesAndLists,
} from "../db/channel-panel-read.js";
import {
  ADAPTER_SYSTEM_CATALOG,
  appendIntegrationLog,
  appendTermCategory,
  DEFAULT_CONNECTION_FAULT_STATE,
  DEFAULT_QUEUE_ADMIN_SETTINGS,
  DEFAULT_RETENTION_ADMIN_SETTINGS,
  DEFAULT_SCORING_ADMIN_SETTINGS,
  publishTermList,
  readBlockedUsers,
  readChannelAdapters,
  readChannelSetting,
  readLatestRuleVersion,
  readRbacRoles,
  readRbacUsers,
  readTermCategories,
  readTermEntries,
  readTermListVersions,
  redactAdapterConfig,
  removeBlockedUser,
  upsertBlockedUser,
  writeChannelAdapters,
  writeChannelSetting,
  writePlatformDeleteStatus,
  writeRbacRoles,
  writeRbacUsers,
  type AdapterDriverId,
  type AdapterStatusCode,
  type ChannelAdapterRecord,
  type ConnectionFaultState,
  type ExtendedTermEntry,
  type ManagedRuleSetShape,
  type QueueAdminSettings,
  type RetentionAdminSettings,
  type ScoringAdminSettings,
  type StoredRbacRole,
  type StoredRbacUser,
} from "../db/channel-settings-store.js";
import { applyManagedWordlistToRuleSet, toDbMatchKind } from "../db/wordlist-rules.js";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import fastifyRateLimit from "@fastify/rate-limit";
import { authenticateRequest } from "./guard.js";
import { findActiveMembership, listActiveMembers, listActiveMembershipsOf, type Membership } from "./members.js";
import { CAPABILITIES, resolveEffectivePermissions, type Capability, type RbacRoleDefinition } from "./permissions.js";
import {
  buildRouteRateLimitConfig,
  DEFAULT_HTTP_RATE_LIMITS,
  ROUTE_RATE_LIMIT_PLUGIN_OPTIONS,
  type HttpRateLimitSettings,
} from "./rate-limit.js";
import { defaultRoleIdsForMembership, resolveChannelAccess } from "./rbac-enforce.js";
import { parseTermCsv } from "./term-csv.js";

export interface ChannelPanelDecisionHandlers {
  commitTask(actor: DecisionActor, taskId: unknown, body: unknown): Promise<{ status: number; body: unknown }>;
  reviewEvent(actor: DecisionActor, eventId: unknown, body: unknown): Promise<{ status: number; body: unknown }>;
  resendDelivery(actor: DecisionActor, deliveryId: unknown, body: unknown): Promise<{ status: number; body: unknown }>;
  editSubjectList(actor: DecisionActor, body: unknown): { status: number; body: unknown };
  editTerm(actor: DecisionActor, body: unknown): { status: number; body: unknown };
}

export interface ChannelPanelCandidateHandlers {
  listCards(actor: { accountId: string; channelId: string; capabilities: ReadonlySet<string> }): {
    status: number;
    body: unknown;
  };
  confirm(
    actor: { accountId: string; channelId: string; capabilities: ReadonlySet<string> },
    cardId: unknown,
  ): { status: number; body: unknown };
  reject(
    actor: { accountId: string; channelId: string; capabilities: ReadonlySet<string> },
    cardId: unknown,
  ): { status: number; body: unknown };
}

export interface ChannelPanelModelHandlers {
  describe(): InferenceCapabilities;
  read(channelId: string, capabilitiesOverride?: InferenceCapabilities): Promise<{ status: number; body: unknown }>;
  write(
    channelId: string,
    body: unknown,
    capabilitiesOverride?: InferenceCapabilities,
  ): Promise<{ status: number; body: unknown }>;
  toggleScTranslation(channelId: string, enabled: boolean): Promise<{ status: number; body: unknown }>;
}

export interface ChannelPanelRuleValidator {
  validate(input: unknown): { ok: true } | { ok: false; issues: readonly { code: string; ref: string; hint?: string }[] };
  validateRegexPattern?(pattern: string): { ok: true } | { ok: false; code: string; hint?: string };
  normalizedTermIsEmpty(channelId: string, term: string): boolean;
  previewWordlist(
    channelId: string,
    entries: readonly ExtendedTermEntry[],
    text: string,
    language?: string,
  ): Promise<{
    readonly hits: readonly string[];
    readonly whitelistMatches: readonly string[];
    readonly language: string;
    readonly action: "BLOCK" | "REVIEW" | null;
  }>;
}

export type ChannelSecretPurpose = "PLATFORM_OAUTH" | "MODEL_ACCESS";

export interface ChannelPanelSecretsPort {
  seal(purpose: ChannelSecretPurpose, plaintext: string): string;
  reveal(ref: string, purpose: ChannelSecretPurpose): string;
  remove(ref: string, purpose: ChannelSecretPurpose): void;
  isSecretRef(value: unknown): value is string;
}

export interface ChannelPanelAdapterActionResult {
  readonly ok: boolean;
  readonly httpStatus: number;
  readonly upstreamStatusCode: number;
  readonly latencyMs: number;
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly summary: string;
  readonly statusCode: AdapterStatusCode;
  readonly statusParams: Readonly<Record<string, string | number>>;
  readonly fetchedModels?: readonly {
    readonly modelId: string;
    readonly displayName: string;
    readonly reasoningLevels: readonly string[];
    readonly source: "remote";
  }[];
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly rawRequestBody: string | null;
  readonly rawResponseBody: string | null;
}

export interface ChannelPanelAdapterActionsPort {
  execute(input: {
    readonly channelId: string;
    readonly adapterId: string;
    readonly category: "LIVE_PLATFORM" | "AI_PROVIDER" | "OUTPUT_TARGET";
    readonly driverId: AdapterDriverId;
    readonly displayName: string;
    readonly action: string;
    readonly config: Readonly<Record<string, string | number | boolean | null>>;
    readonly resolvedSecrets: Readonly<Record<string, string>>;
  }): Promise<ChannelPanelAdapterActionResult>;
  syncYouTubeBan(input: {
    readonly channelId: string;
    readonly subjectRef: string;
    readonly reason: string;
    readonly liveChatId?: string;
    readonly accessToken?: string;
  }): Promise<{ readonly synced: boolean; readonly banId: string | null; readonly errorCode?: string }>;
}

export interface ChannelPanelRoutesOptions {
  readonly database: VoxwardDatabase;
  readonly decisions: ChannelPanelDecisionHandlers;
  readonly candidates: ChannelPanelCandidateHandlers;
  readonly models: ChannelPanelModelHandlers;
  readonly rules: ChannelPanelRuleValidator;
  readonly secrets?: ChannelPanelSecretsPort;
  readonly adapterActions?: ChannelPanelAdapterActionsPort;
  readonly httpRateLimits?: HttpRateLimitSettings;
}

const RESERVED_PRESET_ROLE_IDS = new Set([
  "role-owner",
  "role-moderator",
  "role-data-admin",
  "role-auditor",
]);
const VALID_CAPABILITY_SET = new Set<string>(CAPABILITIES);

function validateRolePermissions(permissions: Readonly<Record<string, "GRANT" | "DENY" | "NOT_SET">>): void {
  for (const key of Object.keys(permissions)) {
    if (!VALID_CAPABILITY_SET.has(key)) {
      throw new PanelRouteFailure(400, "INVALID_REQUEST");
    }
  }
}

function effectiveAllowCapabilities(roles: readonly RbacRoleDefinition[]): Set<Capability> {
  const effective = resolveEffectivePermissions(roles);
  const allowed = new Set<Capability>();
  for (const entry of effective) {
    if (entry.effect === "ALLOW") {
      allowed.add(entry.capability);
    }
  }
  return allowed;
}

function assertCapabilitiesWithinActor(
  actorCapabilities: ReadonlySet<string>,
  targetCapabilities: Iterable<Capability>,
): void {
  for (const cap of targetCapabilities) {
    if (!actorCapabilities.has(cap)) {
      throw new PanelRouteFailure(403, "PRIVILEGE_ESCALATION_DENIED");
    }
  }
}

class PanelRouteFailure extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "PanelRouteFailure";
    this.status = status;
    this.code = code;
  }
}

const SC_TOGGLE_BODY = z.object({ enabled: z.boolean() }).strict();
const SCORING_BODY = z
  .object({
    initialScore: z.number().int().min(-1000).max(1000),
    minScore: z.number().int().min(-1000).max(1000),
    maxScore: z.number().int().min(-1000).max(1000),
    rewardDelta: z.number().int().min(0).max(100),
    penaltyDelta: z.number().int().min(0).max(500),
  })
  .strict()
  .refine((s) => s.minScore <= s.initialScore && s.initialScore <= s.maxScore, {
    message: "minScore <= initialScore <= maxScore required",
  });
const QUEUE_BODY = z
  .object({
    realtimeConcurrency: z.number().int().min(1).max(64),
    scConcurrency: z.number().int().min(1).max(32),
    reviewBatchSize: z.number().int().min(1).max(200),
    taskDeadlineMs: z.number().int().min(500).max(120_000),
  })
  .strict();
const RETENTION_BODY = z
  .object({
    changeLogDays: z.number().int().min(1).max(3650),
    technicalLogDays: z.number().int().min(1).max(365),
    evidenceDays: z.number().int().min(1).max(90),
  })
  .strict();
const ADMIN_SETTINGS_BODY = z
  .object({
    scoring: SCORING_BODY,
    queue: QUEUE_BODY,
    retention: RETENTION_BODY,
  })
  .strict();
const FAULT_ENTRY = z.object({ code: z.string().min(1).max(64), message: z.string().min(1).max(256) }).strict().nullable();
const FAULT_BODY = z.object({ platformFault: FAULT_ENTRY, modelFault: FAULT_ENTRY }).strict();

const TERM_CATEGORY_BODY = z
  .object({
    code: z.string().min(1).max(48).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().min(1).max(64),
    listKind: z.enum(["BLACKLIST", "WHITELIST"]),
    description: z.string().max(200).optional(),
  })
  .strict();

const TERM_ENTRY_SCHEMA = z
  .object({
    id: z.string().min(1).max(64),
    listKind: z.enum(["BLACKLIST", "WHITELIST"]),
    term: z.string().min(1).max(100),
    categoryCode: z.string().min(1).max(48),
    matchKind: z.enum(["EXACT", "CONTAINS", "REGEX", "NORMALIZED", "PHONETIC"]),
    enabled: z.boolean(),
    language: z.string().min(1).max(63).optional(),
    action: z.enum(["BLOCK", "REVIEW"]).optional(),
  })
  .strict();

const TERM_ENTRIES_PUT_BODY = z.object({ entries: z.array(TERM_ENTRY_SCHEMA).max(500) }).strict();
const TERM_CSV_IMPORT_BODY = z
  .object({
    listKind: z.enum(["BLACKLIST", "WHITELIST"]),
    csvText: z.string().max(64_000),
    delimiter: z.enum([",", ";", "\t"]).optional(),
  })
  .strict();

const BLOCKED_USER_BODY = z
  .object({
    subjectRef: z.string().min(1).max(128),
    nickname: z.string().max(128).nullable().optional(),
    reason: z.string().max(240).optional(),
    syncYouTube: z.boolean().optional(),
  })
  .strict();

const REJUDGE_SCORE_ONLY_BODY = z
  .object({
    classification: z.enum(["ALLOW_MEANINGFUL", "ALLOW_NOISE"]),
    operationId: z.string().min(1).max(128),
  })
  .strict();

const ADAPTER_MODEL_SCHEMA = z
  .object({
    modelId: z.string().min(1).max(128),
    displayName: z.string().min(1).max(128),
    reasoningLevels: z.array(z.string().min(1).max(32)).max(8),
    source: z.enum(["remote", "manual"]),
  })
  .strict();

const ADAPTER_CREATE_BODY = z
  .object({
    category: z.enum(["LIVE_PLATFORM", "AI_PROVIDER", "OUTPUT_TARGET"]),
    driverId: z.enum([
      "youtube-live-v3",
      "kiro-cli",
      "openai-compat",
      "anthropic-compat",
      "obs-overlay-source",
      "native-readonly-protocol",
    ]),
    displayName: z.string().min(1).max(80),
    enabled: z.boolean(),
    config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    models: z.array(ADAPTER_MODEL_SCHEMA).max(100).optional(),
  })
  .strict();

const ADAPTER_UPDATE_BODY = z
  .object({
    displayName: z.string().min(1).max(80),
    enabled: z.boolean(),
    config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    models: z.array(ADAPTER_MODEL_SCHEMA).max(100).optional(),
  })
  .strict();

const RBAC_ROLE_BODY = z
  .object({
    id: z.string().min(1).max(64).optional(),
    name: z.string().min(1).max(64),
    description: z.string().max(240).optional(),
    permissions: z.record(z.string(), z.enum(["GRANT", "DENY", "NOT_SET"])),
  })
  .strict();

const RBAC_USER_BODY = z
  .object({
    accountId: z.string().min(1).max(64),
    displayName: z.string().min(1).max(64),
    loginName: z.string().min(1).max(64),
    enabled: z.boolean(),
    roleIds: z.array(z.string().min(1).max(64)).max(24),
  })
  .strict();

function sanitizeAdapterOut(adapter: ChannelAdapterRecord): ChannelAdapterRecord {
  return {
    ...adapter,
    config: redactAdapterConfig(adapter.driverId, adapter.config),
  };
}

function mergeMaskedConfig(
  driverId: AdapterDriverId,
  existingConfig: Readonly<Record<string, string | number | boolean | null>>,
  incomingConfig: Readonly<Record<string, string | number | boolean | null>>,
): Record<string, string | number | boolean | null> {
  const desc = ADAPTER_SYSTEM_CATALOG.find((item) => item.driverId === driverId);
  const secrets = new Set(desc?.secretFields ?? []);
  const next: Record<string, string | number | boolean | null> = { ...existingConfig };
  for (const [k, v] of Object.entries(incomingConfig)) {
    if (secrets.has(k) && typeof v === "string" && v.includes("••••")) {
      continue;
    }
    next[k] = v;
  }
  return next;
}

function authenticateAccount(database: VoxwardDatabase, request: FastifyRequest): { accountId: string; displayName: string } {
  const allowed = authenticateRequest(database, { method: request.method, headers: request.headers, now: new Date() });
  if (!allowed.ok) throw new PanelRouteFailure(allowed.status, allowed.code);
  if (allowed.principal.kind !== "account") throw new PanelRouteFailure(403, "FORBIDDEN");
  return { accountId: allowed.principal.accountId, displayName: allowed.principal.displayName };
}

function secretPurposeFor(driverId: AdapterDriverId): ChannelSecretPurpose {
  return driverId === "youtube-live-v3" ? "PLATFORM_OAUTH" : "MODEL_ACCESS";
}

function sealConfigSecrets(
  driverId: AdapterDriverId,
  config: Readonly<Record<string, string | number | boolean | null>>,
  secrets: ChannelPanelSecretsPort | undefined,
): Record<string, string | number | boolean | null> {
  if (secrets === undefined) return { ...config };
  const desc = ADAPTER_SYSTEM_CATALOG.find((item) => item.driverId === driverId);
  const secretFields = new Set(desc?.secretFields ?? []);
  const purpose = secretPurposeFor(driverId);
  const out: Record<string, string | number | boolean | null> = { ...config };
  for (const [k, v] of Object.entries(out)) {
    if (!secretFields.has(k) || typeof v !== "string" || v.length === 0) continue;
    if (secrets.isSecretRef(v)) continue;
    out[k] = secrets.seal(purpose, v);
  }
  return out;
}

function releaseReplacedSecrets(
  driverId: AdapterDriverId,
  previous: Readonly<Record<string, string | number | boolean | null>>,
  next: Readonly<Record<string, string | number | boolean | null>>,
  secrets: ChannelPanelSecretsPort | undefined,
): void {
  if (secrets === undefined) return;
  const desc = ADAPTER_SYSTEM_CATALOG.find((item) => item.driverId === driverId);
  const secretFields = new Set(desc?.secretFields ?? []);
  const purpose = secretPurposeFor(driverId);
  for (const field of secretFields) {
    const oldVal = previous[field];
    const newVal = next[field];
    if (secrets.isSecretRef(oldVal) && oldVal !== newVal) {
      try {
        secrets.remove(oldVal, purpose);
      } catch {
        // Ignore missing/already removed references.
      }
    }
  }
}

function revealConfigSecrets(
  driverId: AdapterDriverId,
  config: Readonly<Record<string, string | number | boolean | null>>,
  secrets: ChannelPanelSecretsPort | undefined,
): Record<string, string> {
  const desc = ADAPTER_SYSTEM_CATALOG.find((item) => item.driverId === driverId);
  const secretFields = new Set(desc?.secretFields ?? []);
  const purpose = secretPurposeFor(driverId);
  const resolved: Record<string, string> = {};
  for (const field of secretFields) {
    const raw = config[field];
    if (typeof raw !== "string" || raw.length === 0) continue;
    if (secrets !== undefined && secrets.isSecretRef(raw)) {
      try {
        resolved[field] = secrets.reveal(raw, purpose);
      } catch {
        // Unreadable or removed secret reference stays absent.
      }
    } else if (!raw.startsWith("secretref:")) {
      resolved[field] = raw;
    }
  }
  return resolved;
}

function requireChannelMember(
  database: VoxwardDatabase,
  request: FastifyRequest,
  channelId: string,
  requiredAnyOf?: readonly Capability[],
): { accountId: string; membership: Membership; capabilities: ReadonlySet<string> } {
  const { accountId } = authenticateAccount(database, request);
  const access = resolveChannelAccess(database, channelId, accountId);
  if (access === null) throw new PanelRouteFailure(403, "FORBIDDEN");
  if (requiredAnyOf !== undefined && !requiredAnyOf.some((cap) => access.capabilities.has(cap))) {
    throw new PanelRouteFailure(403, "FORBIDDEN");
  }
  return {
    accountId,
    membership: access.membership,
    capabilities: access.capabilities,
  };
}

function toDecisionActor(accountId: string, channelId: string, capabilities: ReadonlySet<string>): DecisionActor {
  return { contractVersion: CONTRACT_VERSION, channelId, accountRef: accountId, capabilities };
}

function send(reply: FastifyReply, status: number, body: unknown) {
  return reply.code(status).header("cache-control", "no-store").send(body);
}

export const channelPanelRoutes: FastifyPluginAsync<ChannelPanelRoutesOptions> = async (
  app: FastifyInstance,
  options,
) => {
  const { database, decisions, candidates, models, rules, secrets, adapterActions } = options;
  const channelsListRateConfig = buildRouteRateLimitConfig(
    options.httpRateLimits?.channelsListMax ?? DEFAULT_HTTP_RATE_LIMITS.channelsListMax,
    options.httpRateLimits?.windowMs ?? DEFAULT_HTTP_RATE_LIMITS.windowMs,
    "RATE_LIMITED",
  );

  await app.register(fastifyRateLimit, ROUTE_RATE_LIMIT_PLUGIN_OPTIONS);

  function saveTerms(
    channelId: string,
    actorRef: string,
    entries: readonly ExtendedTermEntry[],
    reply: FastifyReply,
    baseRuleSetOverride?: ManagedRuleSetShape,
  ) {
    const latest = readLatestRuleVersion(database, channelId);
    const ruleSet = applyManagedWordlistToRuleSet(baseRuleSetOverride ?? latest?.ruleJson ?? null, entries);
    const hasRules = ruleSet.groups.length > 0 || (ruleSet.whitelist?.length ?? 0) > 0;
    if (hasRules) {
      const validation = rules.validate(ruleSet);
      if (!validation.ok) {
        send(reply, 400, { error: "RULE_SET_INVALID", issues: validation.issues });
        return undefined;
      }
    }
    return publishTermList(database, {
      channelId,
      entries,
      actorRef,
      now: new Date(),
      baseRuleSetOverride,
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof PanelRouteFailure) {
      return reply.code(error.status).header("cache-control", "no-store").send({ error: error.code });
    }
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (statusCode === 429) {
      const code = (error as { error?: unknown }).error;
      return reply
        .code(429)
        .header("cache-control", "no-store")
        .send({ error: typeof code === "string" ? code : "RATE_LIMITED" });
    }
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode <= 499) {
      return reply.code(statusCode).header("cache-control", "no-store").send({ error: "INVALID_REQUEST" });
    }
    request.log.error({ errorCode: (error as { code?: unknown }).code }, "channel panel route failed");
    return reply.code(500).header("cache-control", "no-store").send({ error: "INTERNAL_ERROR" });
  });

  app.get(
    "/auth/channels",
    {
      onRequest: app.rateLimit(channelsListRateConfig),
      config: { rateLimit: channelsListRateConfig },
    },
    async (request, reply) => {
      const { accountId } = authenticateAccount(database, request);
      const memberships = listActiveMembershipsOf(database, accountId);
      const items = memberships.flatMap((m) => {
        const access = resolveChannelAccess(database, m.channelId, accountId);
        if (access === null) return [];
        const ctx = readChannelContext(database, m.channelId);
        return [
          {
            channelId: m.channelId,
            displayName: ctx?.displayName ?? m.channelId,
            platform: ctx?.platform ?? "unknown",
            role: m.role,
            logAccess: m.logAccess,
            dataAdmin: m.dataAdmin,
            capabilities: [...access.capabilities],
          },
        ];
      });
      return send(reply, 200, { channels: items });
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/context", async (request, reply) => {
    const { channelId } = request.params;
    const { membership, capabilities } = requireChannelMember(database, request, channelId);
    const ctx = readChannelContext(database, channelId);
    if (ctx === undefined) throw new PanelRouteFailure(404, "CHANNEL_NOT_FOUND");
    const faults = readChannelSetting<ConnectionFaultState>(
      database,
      channelId,
      "connection-fault",
      DEFAULT_CONNECTION_FAULT_STATE,
    );
    return send(reply, 200, {
      ...ctx,
      role: membership.role,
      logAccess: membership.logAccess,
      dataAdmin: membership.dataAdmin,
      capabilities: [...capabilities],
      faults,
    });
  });

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/dock", async (request, reply) => {
    const { channelId } = request.params;
    const { capabilities } = requireChannelMember(database, request, channelId, ["queue.read"]);
    const ctx = readChannelContext(database, channelId);
    if (ctx === undefined) throw new PanelRouteFailure(404, "CHANNEL_NOT_FOUND");
    const includeOriginal = capabilities.has("message.original");
    const feed = readDockAndModerationFeed(database, channelId, { includeOriginal, nowIso: new Date().toISOString() });
    const modelRes = await models.read(channelId);
    const modelBody = modelRes.body as { settings?: { scTranslationEnabled?: boolean }; issues?: unknown[] };
    const faults = readChannelSetting<ConnectionFaultState>(
      database,
      channelId,
      "connection-fault",
      DEFAULT_CONNECTION_FAULT_STATE,
    );
    return send(reply, 200, {
      channel: ctx,
      capabilities: [...capabilities],
      scTranslationEnabled: modelBody.settings?.scTranslationEnabled ?? false,
      modelIssues: modelBody.issues ?? [],
      faults,
      feed,
    });
  });

  app.post<{ Params: { channelId: string; taskId: string }; Body: unknown }>(
    "/channels/:channelId/tasks/:taskId/decide",
    async (request, reply) => {
      const { channelId, taskId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["review.decide"]);
      const res = await decisions.commitTask(toDecisionActor(accountId, channelId, capabilities), taskId, request.body);
      return send(reply, res.status, res.body);
    },
  );

  app.post<{ Params: { channelId: string; eventId: string }; Body: unknown }>(
    "/channels/:channelId/events/:eventId/review",
    async (request, reply) => {
      const { channelId, eventId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["review.decide"]);
      const res = await decisions.reviewEvent(toDecisionActor(accountId, channelId, capabilities), eventId, request.body);
      if (res.status === 200 && typeof request.body === "object" && request.body !== null) {
        const classification = (request.body as { classification?: unknown }).classification;
        if (classification === "BLOCK") {
          const requestedDeleteStatus = (request.body as { platformDeleteStatus?: unknown }).platformDeleteStatus;
          const deleteStatus =
            requestedDeleteStatus === "DELETED" ||
            requestedDeleteStatus === "FAILED" ||
            requestedDeleteStatus === "UNKNOWN" ||
            requestedDeleteStatus === "PENDING"
              ? requestedDeleteStatus
              : "PENDING";
          writePlatformDeleteStatus(database, channelId, eventId, deleteStatus);
          return send(reply, 200, { ...(res.body as Record<string, unknown>), localStatus: "BLOCK", platformDeleteStatus: deleteStatus });
        }
      }
      return send(reply, res.status, res.body);
    },
  );

  app.post<{ Params: { channelId: string; deliveryId: string }; Body: unknown }>(
    "/channels/:channelId/deliveries/:deliveryId/resend",
    async (request, reply) => {
      const { channelId, deliveryId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["review.decide"]);
      const res = await decisions.resendDelivery(
        toDecisionActor(accountId, channelId, capabilities),
        deliveryId,
        request.body,
      );
      return send(reply, res.status, res.body);
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/rules", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "list.edit", "score.config"]);
    const latest = readLatestRuleVersion(database, channelId);
    const lists = readRulesAndLists(database, channelId);
    let ruleSet: unknown = null;
    if (latest !== null) {
      try {
        ruleSet = JSON.parse(latest.ruleJson);
      } catch {
        ruleSet = null;
      }
    }
    return send(reply, 200, { version: latest?.version ?? 0, ruleSet, ...lists });
  });

  app.put<{ Params: { channelId: string }; Body: unknown }>("/channels/:channelId/rules", async (request, reply) => {
    const { channelId } = request.params;
    const { accountId } = requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
    const validation = rules.validate(request.body);
    if (!validation.ok) {
      return send(reply, 400, { error: "RULE_SET_INVALID", issues: validation.issues });
    }
    const activeEntries = readTermEntries(database, channelId);
    const saved = saveTerms(
      channelId,
      accountId,
      activeEntries,
      reply,
      request.body as ManagedRuleSetShape,
    );
    if (saved !== undefined) {
      return send(reply, 200, { version: saved.version, ruleSet: saved.ruleSet });
    }
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/lists/subjects",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const res = decisions.editSubjectList(toDecisionActor(accountId, channelId, capabilities), request.body);
      return send(reply, res.status, res.body);
    },
  );

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/lists/terms",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const res = decisions.editTerm(toDecisionActor(accountId, channelId, capabilities), request.body);
      return send(reply, res.status, res.body);
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/candidates", async (request, reply) => {
    const { channelId } = request.params;
    const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["queue.read"]);
    const res = candidates.listCards({ accountId, channelId, capabilities });
    return send(reply, res.status, res.body);
  });

  app.post<{ Params: { channelId: string; cardId: string } }>(
    "/channels/:channelId/candidates/:cardId/confirm",
    async (request, reply) => {
      const { channelId, cardId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const res = candidates.confirm({ accountId, channelId, capabilities }, cardId);
      return send(reply, res.status, res.body);
    },
  );

  app.post<{ Params: { channelId: string; cardId: string } }>(
    "/channels/:channelId/candidates/:cardId/reject",
    async (request, reply) => {
      const { channelId, cardId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const res = candidates.reject({ accountId, channelId, capabilities }, cardId);
      return send(reply, res.status, res.body);
    },
  );

  function mergedCapabilitiesFor(channelId: string): InferenceCapabilities {
    const baseCaps = models.describe();
    const adapterModels = readChannelAdapters(database, channelId)
      .filter((a) => a.category === "AI_PROVIDER" && a.enabled)
      .flatMap((a) =>
        a.models.map((m) => ({
          modelId: m.modelId,
          displayName: `${m.displayName} (${a.displayName})`,
          reasoningLevels: m.reasoningLevels,
        })),
      );
    const mergedModels = [...(baseCaps.models ?? [])];
    for (const am of adapterModels) {
      if (!mergedModels.some((existing) => existing.modelId === am.modelId)) {
        mergedModels.push(am);
      }
    }
    return { ...baseCaps, models: mergedModels };
  }

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/model-settings", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["score.config"]);
    const mergedCaps = mergedCapabilitiesFor(channelId);
    const res = await models.read(channelId, mergedCaps);
    const faults = readChannelSetting<ConnectionFaultState>(
      database,
      channelId,
      "connection-fault",
      DEFAULT_CONNECTION_FAULT_STATE,
    );
    return send(reply, res.status, {
      ...(res.body as Record<string, unknown>),
      capabilities: mergedCaps,
      modelFault: faults.modelFault,
    });
  });

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/model-settings",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config"]);
      const mergedCaps = mergedCapabilitiesFor(channelId);
      const res = await models.write(channelId, request.body, mergedCaps);
      const faults = readChannelSetting<ConnectionFaultState>(
        database,
        channelId,
        "connection-fault",
        DEFAULT_CONNECTION_FAULT_STATE,
      );
      return send(reply, res.status, {
        ...(res.body as Record<string, unknown>),
        capabilities: mergedCaps,
        modelFault: faults.modelFault,
      });
    },
  );

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/sc-translation",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["review.decide", "score.config"]);
      const parsed = SC_TOGGLE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const res = await models.toggleScTranslation(channelId, parsed.data.enabled);
      return send(reply, res.status, res.body);
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/admin-settings", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["score.config"]);
    return send(reply, 200, {
      scoring: readChannelSetting<ScoringAdminSettings>(database, channelId, "scoring-config", DEFAULT_SCORING_ADMIN_SETTINGS),
      queue: readChannelSetting<QueueAdminSettings>(database, channelId, "queue-config", DEFAULT_QUEUE_ADMIN_SETTINGS),
      retention: readChannelSetting<RetentionAdminSettings>(
        database,
        channelId,
        "retention-config",
        DEFAULT_RETENTION_ADMIN_SETTINGS,
      ),
    });
  });

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/admin-settings",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config"]);
      const parsed = ADMIN_SETTINGS_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const now = new Date();
      writeChannelSetting(database, channelId, "scoring-config", parsed.data.scoring, now);
      writeChannelSetting(database, channelId, "queue-config", parsed.data.queue, now);
      writeChannelSetting(database, channelId, "retention-config", parsed.data.retention, now);
      return send(reply, 200, parsed.data);
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/outputs", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["output.manage", "tokens.manage"]);
    return send(reply, 200, readOutputsSummary(database, channelId));
  });

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/connection-fault",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config"]);
      const parsed = FAULT_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      writeChannelSetting(database, channelId, "connection-fault", parsed.data);
      return send(reply, 200, parsed.data);
    },
  );

  // ---------------- VW-Draft-03 / 03B / 04 / 04B / 04C extensions

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/term-categories", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "list.edit", "score.config"]);
    return send(reply, 200, { categories: readTermCategories(database, channelId) });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/term-categories",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
      const parsed = TERM_CATEGORY_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const result = appendTermCategory(database, channelId, {
        code: parsed.data.code,
        label: parsed.data.label,
        listKind: parsed.data.listKind,
        description: parsed.data.description ?? "",
      });
      if (!result.ok) return send(reply, 409, { error: result.code });
      return send(reply, 201, { categories: result.categories });
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/term-entries", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "list.edit", "score.config"]);
    return send(reply, 200, { entries: readTermEntries(database, channelId) });
  });

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/term-entries/versions", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
    const versions = readTermListVersions(database, channelId);
    return send(reply, 200, {
      versions: versions.map(({ version, createdAt, createdByRef }) => ({ version, createdAt, createdByRef })),
    });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/term-entries/rollback",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId } = requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
      const body = z.object({ version: z.number().int().min(1) }).strict().safeParse(request.body);
      if (!body.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const target = readTermListVersions(database, channelId, 200).find((entry) => entry.version === body.data.version);
      if (target === undefined) throw new PanelRouteFailure(404, "RULE_VERSION_NOT_FOUND");
      const saved = saveTerms(channelId, accountId, target.entries, reply);
      if (saved !== undefined) {
        return send(reply, 200, { version: saved.version, createdAt: saved.createdAt, entries: saved.entries });
      }
    },
  );

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/term-entries/preview",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
      const body = z
        .object({ text: z.string().min(1).max(500), language: z.string().min(1).max(63).optional() })
        .strict()
        .safeParse(request.body);
      if (!body.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const preview = await rules.previewWordlist(
        channelId,
        readTermEntries(database, channelId),
        body.data.text,
        body.data.language,
      );
      return send(reply, 200, preview);
    },
  );

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/term-entries",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId } = requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
      const parsed = TERM_ENTRIES_PUT_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      for (const entry of parsed.data.entries) {
        if (entry.matchKind === "REGEX" && rules.validateRegexPattern) {
          const v = rules.validateRegexPattern(entry.term);
          if (!v.ok) {
            return send(reply, 400, {
              error: "RULE_SET_INVALID",
              issues: [{ code: v.code, ref: entry.id, hint: v.hint }],
            });
          }
        }
        if (entry.matchKind === "NORMALIZED" && rules.normalizedTermIsEmpty(channelId, entry.term)) {
          return send(reply, 400, {
            error: "RULE_SET_INVALID",
            issues: [{ code: "PATTERN_EMPTY", ref: entry.id }],
          });
        }
        if (entry.matchKind === "PHONETIC" && !/^[a-z0-9]+$/.test(entry.term.toLowerCase())) {
          return send(reply, 400, {
            error: "RULE_SET_INVALID",
            issues: [{ code: "READING_PATTERN_INVALID", ref: entry.id }],
          });
        }
      }
      const saved = saveTerms(channelId, accountId, parsed.data.entries, reply);
      if (saved !== undefined) {
        return send(reply, 200, { version: saved.version, createdAt: saved.createdAt, entries: saved.entries });
      }
    },
  );

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/term-entries/import-csv",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId } = requireChannelMember(database, request, channelId, ["list.edit", "score.config"]);
      const parsed = TERM_CSV_IMPORT_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const current = readTermEntries(database, channelId);
      const result = parseTermCsv(parsed.data.csvText, {
        ...(parsed.data.delimiter !== undefined ? { delimiter: parsed.data.delimiter } : {}),
        listKind: parsed.data.listKind,
        defaultCategoryCode: parsed.data.listKind === "WHITELIST" ? "friendly" : "spam",
        maxRows: 500,
        maxTermLength: 100,
        normalizedTermIsEmpty: (term) => rules.normalizedTermIsEmpty(channelId, term),
        ...(rules.validateRegexPattern ? { validateRegexPattern: rules.validateRegexPattern } : {}),
      });
      const existingKeys = new Set(
        current.map((entry) =>
          JSON.stringify([entry.listKind, toDbMatchKind(entry.matchKind), entry.language ?? "und", entry.term]),
        ),
      );
      const added: ExtendedTermEntry[] = [];
      let skippedDuplicates = 0;
      for (const row of result.rows) {
        const key = JSON.stringify([parsed.data.listKind, toDbMatchKind(row.matchKind), row.language, row.term]);
        if (existingKeys.has(key)) {
          skippedDuplicates += 1;
          continue;
        }
        existingKeys.add(key);
        added.push({
          id: `term-${randomUUID()}`,
          listKind: parsed.data.listKind,
          term: row.term,
          categoryCode: row.categoryCode,
          matchKind: row.matchKind,
          enabled: true,
          language: row.language,
          action: parsed.data.listKind === "WHITELIST" ? "REVIEW" : (row.action === "BLOCK" ? "BLOCK" : "REVIEW"),
        });
      }
      if (added.length === 0) {
        return send(reply, 200, { imported: 0, skippedDuplicates, errors: result.errors, entries: current });
      }
      const saved = saveTerms(channelId, accountId, [...added, ...current], reply);
      if (saved !== undefined) {
        return send(reply, 200, {
          imported: added.length,
          skippedDuplicates,
          errors: result.errors,
          version: saved.version,
          entries: saved.entries,
        });
      }
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/blocked-users", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "list.edit"]);
    return send(reply, 200, { users: readBlockedUsers(database, channelId) });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/blocked-users",
    async (request, reply) => {
      const { channelId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const parsed = BLOCKED_USER_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      decisions.editSubjectList(toDecisionActor(accountId, channelId, capabilities), {
        subjectKey: parsed.data.subjectRef,
        listKind: "BLACKLIST",
      });
      const syncYouTube = parsed.data.syncYouTube === true;
      let banId: string | null = null;
      let youtubeSyncError: string | undefined;
      if (syncYouTube) {
        if (adapterActions === undefined) {
          youtubeSyncError = "YOUTUBE_SYNC_UNAVAILABLE";
        } else {
          const ytAdapter = readChannelAdapters(database, channelId).find(
            (a) => a.driverId === "youtube-live-v3" && a.enabled,
          );
          const ytSecrets = ytAdapter ? revealConfigSecrets("youtube-live-v3", ytAdapter.config, secrets) : {};
          const liveChatId =
            ytAdapter && typeof ytAdapter.config.liveChatId === "string" && ytAdapter.config.liveChatId.trim()
              ? ytAdapter.config.liveChatId.trim()
              : undefined;
          const syncRes = await adapterActions.syncYouTubeBan({
            channelId,
            subjectRef: parsed.data.subjectRef,
            reason: parsed.data.reason ?? "",
            ...(liveChatId !== undefined ? { liveChatId } : {}),
            ...(ytSecrets.refreshToken ? { accessToken: ytSecrets.refreshToken } : {}),
          });
          banId = syncRes.banId;
          if (!syncRes.synced) youtubeSyncError = syncRes.errorCode ?? "YOUTUBE_SYNC_FAILED";
        }
      }
      const users = upsertBlockedUser(database, channelId, {
        subjectRef: parsed.data.subjectRef,
        nickname: parsed.data.nickname ?? null,
        reason: parsed.data.reason ?? "",
        syncYouTube,
        banId,
        createdAt: new Date().toISOString(),
        createdBy: accountId,
      });
      return send(reply, 201, {
        users,
        ...(youtubeSyncError !== undefined ? { youtubeSyncError } : {}),
      });
    },
  );

  app.delete<{ Params: { channelId: string; subjectRef: string }; Querystring: { restoreBaseScore?: string } }>(
    "/channels/:channelId/blocked-users/:subjectRef",
    async (request, reply) => {
      const { channelId, subjectRef } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["list.edit"]);
      const restoreBaseScore = request.query.restoreBaseScore === "true";
      const { removed, users } = removeBlockedUser(database, channelId, subjectRef);
      decisions.editSubjectList(toDecisionActor(accountId, channelId, capabilities), {
        subjectKey: subjectRef,
        listKind: null,
      });
      return send(reply, 200, {
        removed,
        youtubeUnbanned: Boolean(removed?.banId),
        restoreBaseScoreApplied: restoreBaseScore,
        users,
      });
    },
  );

  app.post<{ Params: { channelId: string; eventId: string }; Body: unknown }>(
    "/channels/:channelId/blocked/:eventId/rejudge",
    async (request, reply) => {
      const { channelId, eventId } = request.params;
      const { accountId, capabilities } = requireChannelMember(database, request, channelId, ["review.decide"]);
      const parsed = REJUDGE_SCORE_ONLY_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const res = await decisions.reviewEvent(toDecisionActor(accountId, channelId, capabilities), eventId, {
        operationId: parsed.data.operationId,
        classification: parsed.data.classification,
      });
      return send(reply, res.status, {
        ...(res.body as Record<string, unknown>),
        scoreOnly: true,
        downstreamReissued: false,
      });
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/adapters/catalog", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "score.config"]);
    return send(reply, 200, { catalog: ADAPTER_SYSTEM_CATALOG });
  });

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/adapters", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["queue.read", "score.config", "output.manage"]);
    const adapters = readChannelAdapters(database, channelId).map(sanitizeAdapterOut);
    return send(reply, 200, { adapters });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/adapters",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config", "output.manage"]);
      const parsed = ADAPTER_CREATE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const desc = ADAPTER_SYSTEM_CATALOG.find(
        (d) => d.driverId === parsed.data.driverId && d.category === parsed.data.category,
      );
      if (desc === undefined) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const now = new Date();
      const sealedConfig = sealConfigSecrets(parsed.data.driverId, parsed.data.config, secrets);
      const record: ChannelAdapterRecord = {
        id: `adp-${randomUUID().slice(0, 10)}`,
        category: parsed.data.category,
        driverId: parsed.data.driverId,
        displayName: parsed.data.displayName,
        enabled: parsed.data.enabled,
        config: sealedConfig,
        models: parsed.data.models ?? [],
        lastStatus: "已保存配置",
        lastStatusCode: "CONFIG_SAVED",
        updatedAt: now.toISOString(),
      };
      const existing = readChannelAdapters(database, channelId);
      writeChannelAdapters(database, channelId, [...existing, record], now);
      return send(reply, 201, { adapter: sanitizeAdapterOut(record) });
    },
  );

  app.put<{ Params: { channelId: string; adapterId: string }; Body: unknown }>(
    "/channels/:channelId/adapters/:adapterId",
    async (request, reply) => {
      const { channelId, adapterId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config", "output.manage"]);
      const parsed = ADAPTER_UPDATE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const list = readChannelAdapters(database, channelId);
      const current = list.find((a) => a.id === adapterId);
      if (current === undefined) throw new PanelRouteFailure(404, "ADAPTER_NOT_FOUND");
      const now = new Date();
      const mergedConfig = mergeMaskedConfig(current.driverId, current.config, parsed.data.config);
      const sealedConfig = sealConfigSecrets(current.driverId, mergedConfig, secrets);
      releaseReplacedSecrets(current.driverId, current.config, sealedConfig, secrets);
      const updated: ChannelAdapterRecord = {
        ...current,
        displayName: parsed.data.displayName,
        enabled: parsed.data.enabled,
        config: sealedConfig,
        models: parsed.data.models ?? current.models,
        updatedAt: now.toISOString(),
      };
      writeChannelAdapters(
        database,
        channelId,
        list.map((a) => (a.id === adapterId ? updated : a)),
        now,
      );
      return send(reply, 200, { adapter: sanitizeAdapterOut(updated) });
    },
  );

  app.delete<{ Params: { channelId: string; adapterId: string } }>(
    "/channels/:channelId/adapters/:adapterId",
    async (request, reply) => {
      const { channelId, adapterId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config", "output.manage"]);
      const list = readChannelAdapters(database, channelId);
      const current = list.find((a) => a.id === adapterId);
      if (current === undefined) throw new PanelRouteFailure(404, "ADAPTER_NOT_FOUND");
      releaseReplacedSecrets(current.driverId, current.config, {}, secrets);
      writeChannelAdapters(
        database,
        channelId,
        list.filter((a) => a.id !== adapterId),
      );
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { channelId: string; adapterId: string; action: string } }>(
    "/channels/:channelId/adapters/:adapterId/actions/:action",
    async (request, reply) => {
      const { channelId, adapterId, action } = request.params;
      requireChannelMember(database, request, channelId, ["score.config", "output.manage"]);
      const list = readChannelAdapters(database, channelId);
      const current = list.find((a) => a.id === adapterId);
      if (current === undefined) throw new PanelRouteFailure(404, "ADAPTER_NOT_FOUND");
      if (adapterActions === undefined) throw new PanelRouteFailure(503, "ADAPTER_ACTIONS_UNAVAILABLE");

      const now = new Date();
      const correlationId = `corr-int-${randomUUID().slice(0, 8)}`;
      const resolvedSecrets = revealConfigSecrets(current.driverId, current.config, secrets);
      const outcome = await adapterActions.execute({
        channelId,
        adapterId: current.id,
        category: current.category,
        driverId: current.driverId,
        displayName: current.displayName,
        action,
        config: current.config,
        resolvedSecrets,
      });

      const manualOnly = current.models.filter((m) => m.source === "manual");
      const fetchedModels =
        outcome.fetchedModels !== undefined ? [...outcome.fetchedModels, ...manualOnly] : current.models;

      const updated: ChannelAdapterRecord = {
        ...current,
        models: fetchedModels,
        lastStatus: outcome.summary,
        lastStatusCode: outcome.statusCode,
        lastStatusParams: outcome.statusParams,
        updatedAt: now.toISOString(),
      };
      writeChannelAdapters(
        database,
        channelId,
        list.map((a) => (a.id === adapterId ? updated : a)),
        now,
      );
      appendIntegrationLog(
        database,
        channelId,
        {
          id: `int-${randomUUID().slice(0, 10)}`,
          correlationId,
          adapterId: current.id,
          adapterName: current.displayName,
          providerKind: current.category,
          method: outcome.method,
          url: outcome.url,
          statusCode: outcome.upstreamStatusCode,
          latencyMs: outcome.latencyMs,
          requestHeaders: outcome.requestHeaders,
          responseHeaders: outcome.responseHeaders,
          rawRequestBody: outcome.rawRequestBody,
          rawResponseBody: outcome.rawResponseBody,
          occurredAt: now.toISOString(),
        },
        now,
      );
      return send(reply, outcome.httpStatus, {
        ok: outcome.ok,
        adapter: sanitizeAdapterOut(updated),
        summary: outcome.summary,
        summaryCode: outcome.statusCode,
        summaryParams: outcome.statusParams,
        correlationId,
      });
    },
  );

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/rbac/roles", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["members.manage"]);
    return send(reply, 200, { roles: readRbacRoles(database, channelId) });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/rbac/roles",
    async (request, reply) => {
      const { channelId } = request.params;
      const actor = requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_ROLE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      validateRolePermissions(parsed.data.permissions);
      const id = parsed.data.id ?? `role-${randomUUID().slice(0, 8)}`;
      if (RESERVED_PRESET_ROLE_IDS.has(id)) {
        throw new PanelRouteFailure(403, "PRESET_ROLE_IMMUTABLE");
      }
      if (actor.membership.role !== "CHANNEL_OWNER") {
        assertCapabilitiesWithinActor(actor.capabilities, effectiveAllowCapabilities([
          { id, name: parsed.data.name, permissions: parsed.data.permissions },
        ]));
      }
      const roles = readRbacRoles(database, channelId);
      if (roles.some((r) => r.id === id)) throw new PanelRouteFailure(409, "ROLE_EXISTS");
      const created: StoredRbacRole = {
        id,
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        systemPreset: false,
        permissions: parsed.data.permissions,
      };
      const next = writeRbacRoles(database, channelId, [...roles, created]);
      return send(reply, 201, { role: created, roles: next });
    },
  );

  app.put<{ Params: { channelId: string; roleId: string }; Body: unknown }>(
    "/channels/:channelId/rbac/roles/:roleId",
    async (request, reply) => {
      const { channelId, roleId } = request.params;
      const actor = requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_ROLE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      validateRolePermissions(parsed.data.permissions);
      const roles = readRbacRoles(database, channelId);
      const existing = roles.find((r) => r.id === roleId);
      if (existing === undefined) throw new PanelRouteFailure(404, "ROLE_NOT_FOUND");
      if (RESERVED_PRESET_ROLE_IDS.has(roleId) || existing.systemPreset || existing.builtIn === true) {
        throw new PanelRouteFailure(403, "PRESET_ROLE_IMMUTABLE");
      }
      const updated: StoredRbacRole = {
        ...existing,
        name: parsed.data.name,
        description: parsed.data.description ?? existing.description,
        permissions: parsed.data.permissions,
      };
      if (actor.membership.role !== "CHANNEL_OWNER") {
        assertCapabilitiesWithinActor(actor.capabilities, effectiveAllowCapabilities([updated]));
        const users = hydrateRbacUsersFromChannel(database, channelId);
        const actorRecord = users.find((u) => u.accountId === actor.accountId);
        if (actorRecord?.roleIds.includes(roleId)) {
          for (const [cap, prevState] of Object.entries(existing.permissions)) {
            if (prevState === "DENY" && updated.permissions[cap] !== "DENY") {
              throw new PanelRouteFailure(403, "PRIVILEGE_ESCALATION_DENIED");
            }
          }
        }
      }
      const next = writeRbacRoles(database, channelId, roles.map((r) => (r.id === roleId ? updated : r)));
      return send(reply, 200, { role: updated, roles: next });
    },
  );

  app.delete<{ Params: { channelId: string; roleId: string } }>(
    "/channels/:channelId/rbac/roles/:roleId",
    async (request, reply) => {
      const { channelId, roleId } = request.params;
      const actor = requireChannelMember(database, request, channelId, ["members.manage"]);
      const roles = readRbacRoles(database, channelId);
      const existing = roles.find((r) => r.id === roleId);
      if (existing === undefined) throw new PanelRouteFailure(404, "ROLE_NOT_FOUND");
      if (RESERVED_PRESET_ROLE_IDS.has(roleId) || existing.systemPreset || existing.builtIn === true) {
        throw new PanelRouteFailure(400, "CANNOT_DELETE_PRESET_ROLE");
      }
      const users = hydrateRbacUsersFromChannel(database, channelId);
      if (actor.membership.role !== "CHANNEL_OWNER") {
        const prevMap = new Map(roles.map((r) => [r.id, r]));
        const nextRoles = roles.filter((r) => r.id !== roleId);
        const nextMap = new Map(nextRoles.map((r) => [r.id, r]));
        for (const u of users) {
          if (!u.roleIds.includes(roleId)) continue;
          const beforeCaps = effectiveAllowCapabilities(
            u.roleIds.map((id) => prevMap.get(id)).filter((r): r is StoredRbacRole => r !== undefined),
          );
          const afterCaps = effectiveAllowCapabilities(
            u.roleIds.filter((id) => id !== roleId).map((id) => nextMap.get(id)).filter((r): r is StoredRbacRole => r !== undefined),
          );
          if (u.accountId === actor.accountId) {
            for (const cap of afterCaps) {
              if (!beforeCaps.has(cap)) {
                throw new PanelRouteFailure(403, "PRIVILEGE_ESCALATION_DENIED");
              }
            }
          } else {
            assertCapabilitiesWithinActor(actor.capabilities, afterCaps);
          }
        }
      }
      writeRbacRoles(database, channelId, roles.filter((r) => r.id !== roleId));
      const storedUsers = readRbacUsers(database, channelId);
      if (storedUsers.length > 0) {
        writeRbacUsers(
          database,
          channelId,
          storedUsers.map((u) => ({ ...u, roleIds: u.roleIds.filter((id) => id !== roleId) })),
        );
      }
      return reply.code(204).send();
    },
  );

function hydrateRbacUsersFromChannel(database: VoxwardDatabase, channelId: string): StoredRbacUser[] {
  const stored = readChannelSetting<StoredRbacUser[] | null>(database, channelId, "rbac-users", null);
  if (stored !== null) return stored;
  const members = listActiveMembers(database, channelId);
  if (members.length === 0) return [];
  const accountRows = database.orm
    .select({
      id: authAccounts.id,
      loginName: authAccounts.loginName,
      displayName: authAccounts.displayName,
      disabledAt: authAccounts.disabledAt,
    })
    .from(authAccounts)
    .where(inArray(authAccounts.id, members.map((m) => m.accountId)))
    .all();
  const accountMap = new Map(accountRows.map((row) => [row.id, row]));
  return members.map((member) => {
    const account = accountMap.get(member.accountId);
    return {
      accountId: member.accountId,
      displayName: account?.displayName ?? member.accountId,
      loginName: account?.loginName ?? member.accountId,
      enabled: account?.disabledAt === null || account?.disabledAt === undefined,
      roleIds: defaultRoleIdsForMembership(member),
      updatedAt: member.grantedAt,
    };
  });
}

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/rbac/users", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["members.manage"]);
    const roles = readRbacRoles(database, channelId);
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const users = hydrateRbacUsersFromChannel(database, channelId).map((u) => {
      const assignedRoles = u.roleIds.map((id) => roleMap.get(id)).filter((r): r is StoredRbacRole => r !== undefined);
      return {
        ...u,
        effectivePermissions: resolveEffectivePermissions(assignedRoles),
      };
    });
    return send(reply, 200, { users, roles });
  });

  app.post<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/rbac/users",
    async (request, reply) => {
      const { channelId } = request.params;
      const actor = requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_USER_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const targetMember = findActiveMembership(database, channelId, parsed.data.accountId);
      if (targetMember === undefined) {
        throw new PanelRouteFailure(404, "MEMBERSHIP_NOT_FOUND");
      }
      const roles = readRbacRoles(database, channelId);
      const roleMap = new Map(roles.map((r) => [r.id, r]));
      const assigned: StoredRbacRole[] = [];
      for (const id of parsed.data.roleIds) {
        const role = roleMap.get(id);
        if (role === undefined) {
          throw new PanelRouteFailure(400, "INVALID_REQUEST");
        }
        assigned.push(role);
      }
      const targetCaps = effectiveAllowCapabilities(assigned);
      if (actor.membership.role !== "CHANNEL_OWNER") {
        if (targetMember.role === "CHANNEL_OWNER" || parsed.data.roleIds.includes("role-owner")) {
          throw new PanelRouteFailure(403, "FORBIDDEN");
        }
        if (parsed.data.accountId === actor.accountId) {
          throw new PanelRouteFailure(403, "PRIVILEGE_ESCALATION_DENIED");
        }
        assertCapabilitiesWithinActor(actor.capabilities, targetCaps);
      }
      if (targetMember.role === "CHANNEL_OWNER" && (!parsed.data.enabled || !targetCaps.has("members.manage"))) {
        const hasOtherActiveOwner = listActiveMembers(database, channelId).some(
          (m) =>
            m.accountId !== parsed.data.accountId &&
            m.role === "CHANNEL_OWNER" &&
            resolveChannelAccess(database, channelId, m.accountId)?.capabilities.has("members.manage") === true,
        );
        if (!hasOtherActiveOwner) {
          throw new PanelRouteFailure(409, "LAST_OWNER_REQUIRED");
        }
      }
      const users = hydrateRbacUsersFromChannel(database, channelId).filter(
        (u) => u.accountId !== parsed.data.accountId,
      );
      const now = new Date();
      const record: StoredRbacUser = {
        accountId: parsed.data.accountId,
        displayName: parsed.data.displayName,
        loginName: parsed.data.loginName,
        enabled: parsed.data.enabled,
        roleIds: parsed.data.roleIds,
        updatedAt: now.toISOString(),
      };
      const next = writeRbacUsers(database, channelId, [...users, record], now);
      return send(reply, 201, {
        user: { ...record, effectivePermissions: resolveEffectivePermissions(assigned) },
        users: next,
      });
    },
  );

  app.delete<{ Params: { channelId: string; accountId: string } }>(
    "/channels/:channelId/rbac/users/:accountId",
    async (request, reply) => {
      const { channelId, accountId } = request.params;
      const actor = requireChannelMember(database, request, channelId, ["members.manage"]);
      const targetMember = findActiveMembership(database, channelId, accountId);
      if (targetMember === undefined) {
        throw new PanelRouteFailure(404, "MEMBERSHIP_NOT_FOUND");
      }
      const users = hydrateRbacUsersFromChannel(database, channelId);
      if (!users.some((u) => u.accountId === accountId)) throw new PanelRouteFailure(404, "USER_NOT_FOUND");
      if (actor.membership.role !== "CHANNEL_OWNER") {
        if (targetMember.role === "CHANNEL_OWNER") {
          throw new PanelRouteFailure(403, "FORBIDDEN");
        }
        if (accountId === actor.accountId) {
          throw new PanelRouteFailure(403, "PRIVILEGE_ESCALATION_DENIED");
        }
        const roles = readRbacRoles(database, channelId);
        const roleMap = new Map(roles.map((r) => [r.id, r]));
        const fallbackAssigned = defaultRoleIdsForMembership(targetMember)
          .map((id) => roleMap.get(id))
          .filter((r): r is StoredRbacRole => r !== undefined);
        assertCapabilitiesWithinActor(actor.capabilities, effectiveAllowCapabilities(fallbackAssigned));
      }
      writeRbacUsers(database, channelId, users.filter((u) => u.accountId !== accountId));
      return reply.code(204).send();
    },
  );
};
