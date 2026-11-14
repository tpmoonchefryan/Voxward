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
  DEFAULT_CONNECTION_FAULT_STATE,
  DEFAULT_QUEUE_ADMIN_SETTINGS,
  DEFAULT_RETENTION_ADMIN_SETTINGS,
  DEFAULT_SCORING_ADMIN_SETTINGS,
  publishRuleVersion,
  readChannelSetting,
  readLatestRuleVersion,
  writeChannelSetting,
  writePlatformDeleteStatus,
  type ConnectionFaultState,
  type QueueAdminSettings,
  type RetentionAdminSettings,
  type ScoringAdminSettings,
} from "../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../db/client.js";
import { authenticateRequest } from "./guard.js";
import { findActiveMembership, listActiveMembershipsOf, type Membership } from "./members.js";
import { capabilitiesOfMembership, membershipAllows, type Capability } from "./permissions.js";

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
  .strict();
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
    const version = publishRuleVersion(database, {
      channelId,
      ruleJson: JSON.stringify(request.body),
      actorRef: accountId,
      now: new Date(),
    });
    return send(reply, 200, { version, ruleSet: request.body });
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
    return send(reply, res.status, {
      ...(res.body as Record<string, unknown>),
      capabilities: models.describe(),
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
};
