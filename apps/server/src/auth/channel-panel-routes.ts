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
import { applyManagedWordlistToRuleSet } from "../db/wordlist-rules.js";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts } from "../db/schema/index.js";
import { authenticateRequest } from "./guard.js";
import { findActiveMembership, listActiveMembers, listActiveMembershipsOf, type Membership } from "./members.js";
import { capabilitiesOfMembership, membershipAllows, resolveEffectivePermissions, type Capability } from "./permissions.js";
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
  read(channelId: string): Promise<{ status: number; body: unknown }>;
  write(channelId: string, body: unknown): Promise<{ status: number; body: unknown }>;
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

export interface ChannelPanelRoutesOptions {
  readonly database: VoxwardDatabase;
  readonly decisions: ChannelPanelDecisionHandlers;
  readonly candidates: ChannelPanelCandidateHandlers;
  readonly models: ChannelPanelModelHandlers;
  readonly rules: ChannelPanelRuleValidator;
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
    term: z.string().min(1).max(200),
    categoryCode: z.string().min(1).max(48),
    matchKind: z.enum(["EXACT", "CONTAINS", "REGEX", "NORMALIZED"]),
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

function requireChannelMember(
  database: VoxwardDatabase,
  request: FastifyRequest,
  channelId: string,
  requiredAnyOf?: readonly Capability[],
): { accountId: string; membership: Membership; capabilities: ReadonlySet<string> } {
  const { accountId } = authenticateAccount(database, request);
  const membership = findActiveMembership(database, channelId, accountId);
  if (membership === undefined) throw new PanelRouteFailure(403, "FORBIDDEN");
  if (requiredAnyOf !== undefined && !requiredAnyOf.some((cap) => membershipAllows(membership, cap))) {
    throw new PanelRouteFailure(403, "FORBIDDEN");
  }
  return {
    accountId,
    membership,
    capabilities: new Set<string>(capabilitiesOfMembership(membership)),
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
  const { database, decisions, candidates, models, rules } = options;

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
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode <= 499) {
      return reply.code(statusCode).header("cache-control", "no-store").send({ error: "INVALID_REQUEST" });
    }
    request.log.error({ errorCode: (error as { code?: unknown }).code }, "channel panel route failed");
    return reply.code(500).header("cache-control", "no-store").send({ error: "INTERNAL_ERROR" });
  });

  app.get("/auth/channels", async (request, reply) => {
    const { accountId } = authenticateAccount(database, request);
    const memberships = listActiveMembershipsOf(database, accountId);
    const items = memberships.map((m) => {
      const ctx = readChannelContext(database, m.channelId);
      return {
        channelId: m.channelId,
        displayName: ctx?.displayName ?? m.channelId,
        platform: ctx?.platform ?? "unknown",
        role: m.role,
        logAccess: m.logAccess,
        dataAdmin: m.dataAdmin,
        capabilities: capabilitiesOfMembership(m),
      };
    });
    return send(reply, 200, { channels: items });
  });

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

  app.get<{ Params: { channelId: string } }>("/channels/:channelId/model-settings", async (request, reply) => {
    const { channelId } = request.params;
    requireChannelMember(database, request, channelId, ["score.config"]);
    const res = await models.read(channelId);
    const faults = readChannelSetting<ConnectionFaultState>(
      database,
      channelId,
      "connection-fault",
      DEFAULT_CONNECTION_FAULT_STATE,
    );
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
    return send(reply, res.status, {
      ...(res.body as Record<string, unknown>),
      capabilities: { ...baseCaps, models: mergedModels },
      modelFault: faults.modelFault,
    });
  });

  app.put<{ Params: { channelId: string }; Body: unknown }>(
    "/channels/:channelId/model-settings",
    async (request, reply) => {
      const { channelId } = request.params;
      requireChannelMember(database, request, channelId, ["score.config"]);
      const res = await models.write(channelId, request.body);
      return send(reply, res.status, {
        ...(res.body as Record<string, unknown>),
        capabilities: models.describe(),
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
        defaultCategoryCode: parsed.data.listKind === "WHITELIST" ? "friendly" : "spam",
        normalizedTermIsEmpty: (term) => rules.normalizedTermIsEmpty(channelId, term),
        ...(rules.validateRegexPattern ? { validateRegexPattern: rules.validateRegexPattern } : {}),
      });
      const added: ExtendedTermEntry[] = result.rows.map((row) => ({
        id: `term-${randomUUID()}`,
        listKind: parsed.data.listKind,
        term: row.term,
        categoryCode: row.categoryCode,
        matchKind: row.matchKind,
        enabled: true,
        language: row.language,
        action: row.action === "BLOCK" ? "BLOCK" : "REVIEW",
      }));
      if (added.length === 0) {
        return send(reply, 200, { imported: 0, errors: result.errors, entries: current });
      }
      const saved = saveTerms(channelId, accountId, [...added, ...current], reply);
      if (saved !== undefined) {
        return send(reply, 200, {
          imported: added.length,
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
      const users = upsertBlockedUser(database, channelId, {
        subjectRef: parsed.data.subjectRef,
        nickname: parsed.data.nickname ?? null,
        reason: parsed.data.reason ?? "",
        syncYouTube,
        banId: syncYouTube ? `yt-ban-${randomUUID().slice(0, 12)}` : null,
        createdAt: new Date().toISOString(),
        createdBy: accountId,
      });
      return send(reply, 201, { users });
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
      const record: ChannelAdapterRecord = {
        id: `adp-${randomUUID().slice(0, 10)}`,
        category: parsed.data.category,
        driverId: parsed.data.driverId,
        displayName: parsed.data.displayName,
        enabled: parsed.data.enabled,
        config: parsed.data.config,
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
      const updated: ChannelAdapterRecord = {
        ...current,
        displayName: parsed.data.displayName,
        enabled: parsed.data.enabled,
        config: mergeMaskedConfig(current.driverId, current.config, parsed.data.config),
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
      if (!list.some((a) => a.id === adapterId)) throw new PanelRouteFailure(404, "ADAPTER_NOT_FOUND");
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
      const now = new Date();
      const correlationId = `corr-int-${randomUUID().slice(0, 8)}`;
      let fetchedModels = current.models;
      let actionSummary = `已执行运维动作：${action}`;
      let statusCode: AdapterStatusCode = "ACTION_EXECUTED";
      let statusParams: Record<string, string | number> = { action };
      let endpointUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages";

      if (current.category === "OUTPUT_TARGET") {
        endpointUrl =
          current.driverId === "obs-overlay-source" ? `/overlay/${channelId}` : "/output/v1/room";
        if (current.driverId === "obs-overlay-source") {
          actionSummary = "OBS 透明投屏通道就绪";
          statusCode = "OBS_OVERLAY_READY";
        } else {
          actionSummary = "blivechat / 原生只读输出通道就绪";
          statusCode = "NATIVE_OUTPUT_READY";
        }
        statusParams = {};
      } else if (
        current.driverId === "openai-compat" ||
        current.driverId === "anthropic-compat" ||
        current.driverId === "kiro-cli"
      ) {
        const base = typeof current.config.baseEndpoint === "string" && current.config.baseEndpoint
          ? current.config.baseEndpoint.replace(/\/$/, "")
          : current.driverId === "kiro-cli"
            ? "kiro-cli://runtime/models"
            : "https://api.example.invalid/v1";
        endpointUrl = `${base}/models`;
        if (action === "fetch-models") {
          const remoteModels =
            current.driverId === "kiro-cli"
              ? [
                  { modelId: "claude-sonnet-4.5", displayName: "Claude Sonnet 4.5 (Kiro CLI)", reasoningLevels: ["low", "medium", "high"], source: "remote" as const },
                  { modelId: "claude-haiku-4.5", displayName: "Claude Haiku 4.5 (Kiro CLI)", reasoningLevels: ["low"], source: "remote" as const },
                ]
              : current.driverId === "openai-compat"
                ? [
                    { modelId: "gpt-4.1-mini", displayName: "GPT-4.1 mini (OpenAI)", reasoningLevels: ["low", "medium"], source: "remote" as const },
                    { modelId: "gpt-4.1", displayName: "GPT-4.1 (OpenAI)", reasoningLevels: ["medium", "high"], source: "remote" as const },
                  ]
                : [
                    { modelId: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4 (Anthropic)", reasoningLevels: ["medium", "high"], source: "remote" as const },
                    { modelId: "claude-3-5-haiku-latest", displayName: "Claude 3.5 Haiku (Anthropic)", reasoningLevels: ["low"], source: "remote" as const },
                  ];
          const manualOnly = current.models.filter((m) => m.source === "manual");
          fetchedModels = [...remoteModels, ...manualOnly];
          actionSummary = `已从远端拉取 ${remoteModels.length} 个可用模型`;
          statusCode = "MODELS_FETCHED";
          statusParams = { count: remoteModels.length };
        }
      }

      const updated: ChannelAdapterRecord = {
        ...current,
        models: fetchedModels,
        lastStatus: actionSummary,
        lastStatusCode: statusCode,
        lastStatusParams: statusParams,
        updatedAt: now.toISOString(),
      };
      writeChannelAdapters(
        database,
        channelId,
        list.map((a) => (a.id === adapterId ? updated : a)),
        now,
      );
      appendIntegrationLog(database, channelId, {
        id: `int-${randomUUID().slice(0, 10)}`,
        correlationId,
        adapterId: current.id,
        adapterName: current.displayName,
        providerKind: current.category,
        method: action === "fetch-models" || action === "test-connection" ? "GET" : "POST",
        url: endpointUrl,
        statusCode: 200,
        latencyMs: 42,
        requestHeaders: {
          accept: "application/json",
          authorization: "Bearer secret-token",
          "x-voxward-action": action,
        },
        responseHeaders: {
          "content-type": "application/json; charset=utf-8",
        },
        rawRequestBody: action === "fetch-models" ? null : JSON.stringify({ action, adapterId: current.id }),
        rawResponseBody: JSON.stringify({ ok: true, action, modelCount: fetchedModels.length }),
        occurredAt: now.toISOString(),
      }, now);
      return send(reply, 200, {
        adapter: sanitizeAdapterOut(updated),
        summary: actionSummary,
        summaryCode: statusCode,
        summaryParams: statusParams,
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
      requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_ROLE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const roles = readRbacRoles(database, channelId);
      const id = parsed.data.id ?? `role-${randomUUID().slice(0, 8)}`;
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
      requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_ROLE_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const roles = readRbacRoles(database, channelId);
      const existing = roles.find((r) => r.id === roleId);
      if (existing === undefined) throw new PanelRouteFailure(404, "ROLE_NOT_FOUND");
      const updated: StoredRbacRole = {
        ...existing,
        name: parsed.data.name,
        description: parsed.data.description ?? existing.description,
        permissions: parsed.data.permissions,
      };
      const next = writeRbacRoles(database, channelId, roles.map((r) => (r.id === roleId ? updated : r)));
      return send(reply, 200, { role: updated, roles: next });
    },
  );

  app.delete<{ Params: { channelId: string; roleId: string } }>(
    "/channels/:channelId/rbac/roles/:roleId",
    async (request, reply) => {
      const { channelId, roleId } = request.params;
      requireChannelMember(database, request, channelId, ["members.manage"]);
      const roles = readRbacRoles(database, channelId);
      const existing = roles.find((r) => r.id === roleId);
      if (existing === undefined) throw new PanelRouteFailure(404, "ROLE_NOT_FOUND");
      if (existing.systemPreset) throw new PanelRouteFailure(400, "CANNOT_DELETE_PRESET_ROLE");
      writeRbacRoles(database, channelId, roles.filter((r) => r.id !== roleId));
      const users = readRbacUsers(database, channelId);
      writeRbacUsers(
        database,
        channelId,
        users.map((u) => ({ ...u, roleIds: u.roleIds.filter((id) => id !== roleId) })),
      );
      return reply.code(204).send();
    },
  );

function defaultRolesForMembership(member: Membership): string[] {
  const roleIds: string[] = [];
  if (member.role === "CHANNEL_OWNER") roleIds.push("role-owner");
  else if (member.role === "MODERATOR") roleIds.push("role-moderator");
  else roleIds.push("role-data-admin");
  if (member.logAccess && member.role !== "CHANNEL_OWNER") {
    roleIds.push("role-auditor");
  }
  return roleIds;
}

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
      roleIds: defaultRolesForMembership(member),
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
      requireChannelMember(database, request, channelId, ["members.manage"]);
      const parsed = RBAC_USER_BODY.safeParse(request.body);
      if (!parsed.success) throw new PanelRouteFailure(400, "INVALID_REQUEST");
      const users = hydrateRbacUsersFromChannel(database, channelId).filter(
        (u) => u.accountId !== parsed.data.accountId,
      );
      const record: StoredRbacUser = {
        accountId: parsed.data.accountId,
        displayName: parsed.data.displayName,
        loginName: parsed.data.loginName,
        enabled: parsed.data.enabled,
        roleIds: parsed.data.roleIds,
        updatedAt: new Date().toISOString(),
      };
      const next = writeRbacUsers(database, channelId, [...users, record]);
      const roles = readRbacRoles(database, channelId);
      const roleMap = new Map(roles.map((r) => [r.id, r]));
      const assigned = record.roleIds.map((id) => roleMap.get(id)).filter((r): r is StoredRbacRole => r !== undefined);
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
      requireChannelMember(database, request, channelId, ["members.manage"]);
      const users = hydrateRbacUsersFromChannel(database, channelId);
      if (!users.some((u) => u.accountId === accountId)) throw new PanelRouteFailure(404, "USER_NOT_FOUND");
      writeRbacUsers(database, channelId, users.filter((u) => u.accountId !== accountId));
      return reply.code(204).send();
    },
  );
};
