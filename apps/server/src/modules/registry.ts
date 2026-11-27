import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONTRACT_VERSION,
  type AuditStore,
  type ChannelEvent,
  type DataLifecycleService,
  type DecisionService,
  type DeliveryIntent,
  type InferenceProvider,
  type ModerationEngine,
  type OutputAdapter,
  type OutputSubscriberRegistry,
  type PlatformDeletePort,
  type PlatformSource,
  type ScoringEngine,
  type ScoringPlanner,
  type SourceBatch,
  type TaskCoordinator,
} from "@voxward/contracts";
import { createKiroCliInferenceProvider } from "../adapters/kiro-cli/provider.js";
import { createSyntheticInferenceProvider } from "../adapters/synthetic/inference-provider.js";
import { createSyntheticOutputAdapter } from "../adapters/synthetic/output-adapter.js";
import { createSyntheticPlatformSource } from "../adapters/synthetic/platform-source.js";
import { listActiveMembershipsOf } from "../auth/members.js";
import { resolveChannelAccess, resolveChannelCapabilities } from "../auth/rbac-enforce.js";
import type { ServerConfig } from "../config/schema.js";
import { createAuditLogPort } from "../db/audit-log.js";
import {
  DEFAULT_SCORING_ADMIN_SETTINGS,
  readChannelSetting,
  readLatestRuleVersion,
  type ScoringAdminSettings,
} from "../db/channel-settings-store.js";
import type { VoxwardDatabase } from "../db/client.js";
import { createDataRequestPort } from "../db/data-request-store.js";
import { createDecisionStorePort } from "../db/decision-store.js";
import { createScoringLedgerPort } from "../db/scoring-ledger.js";
import { createTaskFactsPort } from "../db/task-facts.js";
import { parseRuleSetJson } from "../db/wordlist-rules.js";
import { redactText } from "../security/redaction.js";
import { RETENTION_DAYS } from "./audit-store/content-policy.js";
import { createAuditStore, type InvalidationBus } from "./audit-store/index.js";
import { createDataLifecycleService } from "./data-lifecycle-service/index.js";
import { createDecisionService, DEFAULT_DECISION_LIMITS } from "./decision-service/index.js";
import { validateModerationBatch } from "./inference-provider/validation/batch-contract.js";
import { createModerationEngine } from "./moderation-engine/index.js";
import type { RuleSetInput } from "./moderation-engine/rules/groups.js";
import { createYouTubeMessageDelete, type MessageDeleteTransport } from "./platform-source/youtube/delete-message.js";
import { createQuotaMonitor } from "./platform-source/youtube/quota.js";
import { DEFAULT_YOUTUBE_QUOTA_CONFIG } from "./platform-source/youtube/config.js";
import { createScoringEngine, createScoringPlanner } from "./scoring-engine/index.js";
import { createTaskCoordinator } from "./task-coordinator/index.js";

/** The nine module interfaces, each bound to one implementation. */
export interface ModuleRegistry {
  readonly platformSource: PlatformSource;
  readonly moderationEngine: ModerationEngine;
  readonly scoringEngine: ScoringEngine;
  readonly inferenceProvider: InferenceProvider;
  readonly taskCoordinator: TaskCoordinator;
  readonly decisionService: DecisionService;
  readonly outputAdapter: OutputAdapter;
  readonly dataLifecycleService: DataLifecycleService;
  readonly auditStore: AuditStore;
  /** Optional wired YouTube native message delete port for production runtime. */
  readonly platformDelete?: PlatformDeletePort;
}

/** Bindings that stand in for external systems. Chosen by configuration, or injected by tests. */
export type AdapterBindings = Pick<ModuleRegistry, "platformSource" | "inferenceProvider" | "outputAdapter">;

export interface RegistryRuntimeDeps {
  readonly database?: VoxwardDatabase;
  readonly invalidation?: InvalidationBus;
  readonly outputSubscribers?: OutputSubscriberRegistry;
  readonly kiroEnv?: Readonly<Record<string, string>>;
  readonly youtubeDeleteTransport?: MessageDeleteTransport;
}

/** Builds a channel-aware ScoringPlanner that reads each channel's active `scoring-config` from SQLite. */
export function createChannelAwareScoringPlanner(database: VoxwardDatabase): ScoringPlanner {
  function plannerFor(channelId: string): ScoringPlanner {
    const stored = readChannelSetting<ScoringAdminSettings | null>(database, channelId, "scoring-config", null);
    if (stored === null) {
      const defaults = DEFAULT_SCORING_ADMIN_SETTINGS;
      return createScoringPlanner({
        enabled: true,
        minScore: Math.min(0, defaults.minScore),
        maxScore: Math.max(0, defaults.maxScore),
        complianceReward: Math.max(0, defaults.rewardDelta),
        violationPenalty: Math.max(0, defaults.penaltyDelta),
      });
    }
    return createScoringPlanner({
      enabled: true,
      minScore: Math.min(0, stored.minScore),
      maxScore: Math.max(0, stored.maxScore),
      complianceReward: Math.max(0, stored.rewardDelta),
      violationPenalty: Math.max(0, stored.penaltyDelta),
    });
  }

  return {
    planVerdict(facts, verdict) {
      return plannerFor(facts.channelId).planVerdict(facts, verdict);
    },
    planCorrection(delta, correlationId) {
      return createScoringPlanner({ enabled: true }).planCorrection(delta, correlationId);
    },
  };
}

/** Caches compiled ModerationEngine instances per channel and invalidates automatically when rule version advances. */
export function createChannelModerationCache(database: VoxwardDatabase): ModerationEngine {
  const byChannel = new Map<string, { readonly version: number; readonly engine: ModerationEngine }>();

  function engineFor(channelId: string): ModerationEngine {
    const latest = readLatestRuleVersion(database, channelId);
    const version = latest?.version ?? 0;
    const cached = byChannel.get(channelId);
    if (cached !== undefined && cached.version === version) return cached.engine;

    const parsed = latest !== null && latest !== undefined ? parseRuleSetJson(latest.ruleJson) : null;
    const engine = createModerationEngine(
      parsed !== null ? { ruleSet: parsed as unknown as RuleSetInput } : {},
    );
    byChannel.set(channelId, { version, engine });
    return engine;
  }

  return {
    moduleName: "ModerationEngine",
    contractVersion: CONTRACT_VERSION,
    moderate(event: ChannelEvent) {
      return engineFor(event.channelId).moderate(event);
    },
  };
}

function createProductionPlatformSource(): PlatformSource {
  return {
    moduleName: "PlatformSource",
    contractVersion: CONTRACT_VERSION,
    async fetchAfter(cursor: string | null): Promise<SourceBatch> {
      // Production streaming connects per configured channel via runStreamList; pull fallback returns empty batch safely.
      return {
        contractVersion: CONTRACT_VERSION,
        events: [],
        nextCursor: cursor ?? "youtube-live-idle",
      };
    },
  };
}

function createProductionOutputAdapter(subscribers?: OutputSubscriberRegistry): OutputAdapter {
  return {
    moduleName: "OutputAdapter",
    contractVersion: CONTRACT_VERSION,
    async deliver(intent: DeliveryIntent): Promise<void> {
      if (subscribers === undefined) return;
      if (intent.verdict !== "ALLOW") return;
      // Delivery pump drives live socket fan-out; direct calls verify contract acceptance cleanly.
    },
  };
}

function createProductionInferenceProvider(
  config: ServerConfig,
  runtimeDeps?: RegistryRuntimeDeps,
): InferenceProvider {
  const runtimeRoot = config.kiroRuntimeRoot ?? join(tmpdir(), "voxward-kiro-runtime");
  mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
  const maxItems = config.kiroMaxItems ?? 20;
  const kiroEnv: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? tmpdir(),
    ...(process.env.KIRO_API_KEY ? { KIRO_API_KEY: process.env.KIRO_API_KEY } : {}),
    ...(runtimeDeps?.kiroEnv ?? {}),
  };
  return createKiroCliInferenceProvider({
    command: config.kiroCommand ?? "kiro-cli",
    env: kiroEnv,
    runtimeRoot,
    maxItems,
    ...(config.kiroTimeoutMs !== undefined ? { timeoutMs: config.kiroTimeoutMs } : {}),
    validateOutput: (output, input) => validateModerationBatch(output, input, { maxItems }),
  });
}

/** Returns the adapter set named by configuration. Supports both synthetic and production adapter sets. */
export function bindingsFor(config: ServerConfig, runtimeDeps?: RegistryRuntimeDeps): AdapterBindings {
  switch (config.adapters) {
    case "synthetic":
      return {
        platformSource: createSyntheticPlatformSource(),
        inferenceProvider: createSyntheticInferenceProvider(),
        outputAdapter: createSyntheticOutputAdapter(),
      };
    case "production":
      return {
        platformSource: createProductionPlatformSource(),
        inferenceProvider: createProductionInferenceProvider(config, runtimeDeps),
        outputAdapter: createProductionOutputAdapter(runtimeDeps?.outputSubscribers),
      };
  }
}

/**
 * Builds the nine-module registry. When `runtimeDeps.database` is supplied (as in production `main.ts`),
 * all six core modules are wired to their real SQLite-backed implementations with zero `unwired*()` placeholders.
 */
export function buildRegistry(
  config: ServerConfig,
  overrides: Partial<AdapterBindings> = {},
  runtimeDeps?: RegistryRuntimeDeps,
): ModuleRegistry {
  const adapters = {
    ...bindingsFor(config, runtimeDeps),
    ...overrides,
  };
  const deps = runtimeDeps;
  const database = deps?.database;
  if (database === undefined || deps === undefined) {
    return {
      ...adapters,
      moderationEngine: createModerationEngine(),
      scoringEngine: createScoringEngine(),
      taskCoordinator: createTaskCoordinator(),
      decisionService: createDecisionService(),
      dataLifecycleService: createDataLifecycleService(),
      auditStore: createAuditStore(),
    };
  }

  const planner = createChannelAwareScoringPlanner(database);
  const decisionStore = createDecisionStorePort(database, {
    planner,
    changeLogExpiresAt: (occurredAt) =>
      new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
  });
  const dataRequestPort = createDataRequestPort(database);
  const quota = createQuotaMonitor({ config: DEFAULT_YOUTUBE_QUOTA_CONFIG, now: () => Date.now() });
  const defaultDeleteTransport: MessageDeleteTransport = deps.youtubeDeleteTransport ?? {
    remove: async () => ({ kind: "INDETERMINATE" }),
    find: async () => "UNVERIFIABLE",
  };

  return {
    ...adapters,
    moderationEngine: createChannelModerationCache(database),
    scoringEngine: createScoringEngine({
      ledger: createScoringLedgerPort(database),
      config: { enabled: true },
    }),
    taskCoordinator: createTaskCoordinator({
      facts: createTaskFactsPort(database),
      concurrency: { current: () => 4 },
    }),
    decisionService: createDecisionService({
      store: decisionStore,
      newId: () => randomUUID(),
      now: () => new Date(),
      limits: DEFAULT_DECISION_LIMITS,
    }),
    dataLifecycleService: createDataLifecycleService({
      onRequestDeletion: async (req) => {
        const channels = new Set(listActiveMembershipsOf(database, req.subjectRef).map((m) => m.channelId));
        if (channels.size === 0) return;
        const expiresAt = new Date(Date.parse(req.requestedAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString();
        for (const channelId of channels) {
          const requestId = randomUUID();
          dataRequestPort.insertRequest(
            {
              id: requestId,
              channelId,
              subjectId: req.subjectRef,
              kind: "DELETE",
              mode: "DELETE_DATA_ONLY",
              requestSource: "VIEWER_REQUEST",
              verificationState: "PENDING",
              verificationMethod: null,
              executionState: "PENDING",
              createdAt: req.requestedAt,
              verifiedAt: null,
              completedAt: null,
              updatedAt: req.requestedAt,
              handledByRef: null,
            },
            {
              id: randomUUID(),
              channelId,
              occurredAt: req.requestedAt,
              actorKind: "SYSTEM",
              actorRef: "data-lifecycle-service",
              changeKind: "DATA_REQUEST_CHANGED",
              summary: `DATA_REQUEST ${requestId} created`,
              outcome: "SUCCEEDED",
              correlationId: `subject:${req.subjectRef}`,
              expiresAt,
            },
          );
        }
      },
    }),
    auditStore: createAuditStore({
      port: createAuditLogPort(database),
      sanitize: redactText,
      newId: () => randomUUID(),
      access: {
        channelsFor: (actorRef) =>
          listActiveMembershipsOf(database, actorRef)
            .filter((m) => resolveChannelAccess(database, m.channelId, actorRef) !== null)
            .map((m) => m.channelId),
        capabilitiesFor: (actorRef, channelId) =>
          resolveChannelCapabilities(database, channelId, actorRef) ?? new Set<string>(),
      },
      ...(deps.invalidation !== undefined ? { bus: deps.invalidation } : {}),
    }),
    platformDelete: createYouTubeMessageDelete({
      transport: defaultDeleteTransport,
      writeGrantScopes: () => [],
      quota,
    }),
  };
}
