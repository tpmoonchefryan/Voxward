import { randomUUID } from "node:crypto";
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  CONTRACT_VERSION,
  type InferenceCapabilities,
  type OutputSubscriberRegistry,
  type SubjectCacheHub,
} from "@voxward/contracts";
import { createRealAdapterActionExecutor } from "./adapters/adapter-actions.js";
import { attachBlivechatOutput } from "./adapters/blivechat/socket.js";
import {
  attachNativeOutput,
  createWsUpgradeRateLimiter,
  type ClosedConnection,
  type NativeOutputTiming,
} from "./adapters/native-output/socket.js";
import {
  channelPanelRoutes,
  type ChannelPanelAdapterActionsPort,
  type ChannelPanelRoutesOptions,
  type ChannelPanelSecretsPort,
} from "./auth/channel-panel-routes.js";
import { dataLifecycleRoutes } from "./auth/data-routes.js";
import { databaseViewerAccess } from "./auth/log-viewer-access.js";
import { logViewerRoutes } from "./auth/log-viewer-routes.js";
import { authRoutes } from "./auth/routes.js";
import type { HttpRateLimitSettings } from "./auth/rate-limit.js";
import { createAuditLogPort } from "./db/audit-log.js";
import { createPersistentCandidateStore } from "./db/candidate-store.js";
import {
  publishConfirmedCandidateTerm,
  readChannelSetting,
  readLatestRuleVersion,
  writeChannelSetting,
  type ExtendedTermEntry,
} from "./db/channel-settings-store.js";
import { applyManagedWordlistToRuleSet, parseRuleSetJson, wordlistRuleId } from "./db/wordlist-rules.js";
import type { VoxwardDatabase } from "./db/client.js";
import { createDataRequestPort } from "./db/data-request-store.js";
import { createDecisionStorePort } from "./db/decision-store.js";
import { createApprovedContentPort, createOutputDeliveryPort, createOutputGrantPort } from "./db/output-store.js";
import { restoreDatabaseWithPorts } from "./db/restore-support.js";
import { createRetentionStore, type RetentionStore } from "./db/retention-store.js";
import { createSubjectCleanupPort } from "./db/subject-cleanup.js";
import { createSubjectReadPort } from "./db/subject-read.js";
import { ledgerRecorder, type TombstoneLedger } from "./db/tombstone-ledger.js";
import { createSqliteVaultBackingStore } from "./db/vault-store.js";
import { RETENTION_DAYS } from "./modules/audit-store/content-policy.js";
import {
  CERTIFICATE_SUMMARY,
  createInvalidationBus,
  createLogViewer,
  createViewerCache,
  type InvalidationBus,
} from "./modules/audit-store/index.js";
import { createDataRoutes, replayTombstones, type DataDeps } from "./modules/data-lifecycle-service/index.js";
import {
  createDecisionService,
  createListAdministration,
  DEFAULT_DECISION_LIMITS,
} from "./modules/decision-service/index.js";
import { createDecisionRoutes } from "./modules/decision-service/routes.js";
import {
  DEFAULT_MODEL_SETTINGS,
  readModelSettings,
  writeModelSettings,
  type ModelSettings,
  type ModelSettingsStore,
} from "./modules/inference-provider/index.js";
import {
  createCandidateRoutes,
  createCandidateStore,
  createModerationChecker,
  type CandidateStore,
} from "./modules/moderation-engine/index.js";
import { admitRegex } from "./modules/moderation-engine/rules/bounded-regex.js";
import { compileRuleSet, type RuleSetInput } from "./modules/moderation-engine/rules/groups.js";
import { DEFAULT_NORMALIZE_OPTIONS, normalizeText } from "./modules/moderation-engine/rules/normalize.js";
import { BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION, createBlivechatAdapter } from "./modules/output/index.js";
import { createDeliveryPump } from "./modules/output-adapter/delivery.js";
import { createSubscriptionRegistry, type OutputWsLimits } from "./modules/output-adapter/subscription.js";
import { createChannelAwareScoringPlanner, type ModuleRegistry } from "./modules/registry.js";
import { createPersistentCredentialVault, deriveVaultKey, isSecretRef } from "./security/persistent-vault.js";
import { redactUrlText } from "./security/redaction.js";
import { sandboxRoutes } from "./demo/routes.js";
import { assertSandboxStartupSafe, type SandboxOptions } from "./demo/sandbox-guard.js";

export interface AppOptions {
  readonly modules: ModuleRegistry;
  readonly logger?: boolean;
  /** Receives each log line. When omitted, lines go to standard output. Tests read the service's own log lines here. */
  readonly logStream?: { write(line: string): void };
  /** When set, the session, channel authorization and internal log viewer routes are registered on this database. */
  readonly database?: VoxwardDatabase;
  /**
   * The invalidation bus that deletions publish on. The log viewer cache listens to it. A new bus is created when this is
   * omitted.
   */
  readonly invalidation?: InvalidationBus;
  /** The native output endpoint and its delivery pump. They start only with a database. */
  readonly nativeOutput?: NativeOutputSettings;
  /**
   * The in-process surfaces that a deletion forgets (S019, SUB-036). The binding passes the instances it holds. Omitted,
   * no surface is held, and a deletion cleans none of them.
   */
  readonly subjectCaches?: SubjectCacheHub;
  /** Optional candidate card store for moderation/admin routes. */
  readonly candidateStore?: CandidateStore;
  /** External tombstone ledger for data deletion replay across backup restores (S020). */
  readonly tombstoneLedger?: TombstoneLedger;
  /** Optional periodic retention sweep interval in milliseconds (N15c). */
  readonly retentionSweepIntervalMs?: number;
  /** Opt-in isolated synthetic sandbox routes. Disabled by default. */
  readonly sandbox?: SandboxOptions;
  /** Optional 32-byte key (or derived seed) for sealing persisted adapter secrets in CredentialVault. */
  readonly vaultKey?: Buffer | string;
  /** Optional custom fetch implementation for real adapter probe / fetch-models / YouTube ban sync actions. */
  readonly adapterActionFetch?: typeof fetch;
  /** Optional adapter action executor override (used in tests). */
  readonly adapterActions?: ChannelPanelAdapterActionsPort;
  /** Optional Kiro CLI command path for adapter self-check / cleanup actions. */
  readonly kiroCommand?: string;
  /** Optional Kiro CLI runtime root for orphan cleanup action. */
  readonly kiroRuntimeRoot?: string;
  /** Optional HTTP route rate-limit overrides (primarily for deterministic testing). */
  readonly httpRateLimits?: HttpRateLimitSettings;
}

export interface NativeOutputSettings {
  readonly timing?: Partial<NativeOutputTiming>;
  /** Time between two delivery passes, in milliseconds (自定). Tests shorten it. */
  readonly passIntervalMs?: number;
  readonly onClosed?: (closed: ClosedConnection) => void;
  readonly wsLimits?: OutputWsLimits;
}

/** Delivery pump limits (自定, not measured). */
const DEFAULT_PASS_INTERVAL_MS = 250;
const DELIVERY_BATCH_LIMIT = 50;
const DELIVERY_EXPIRE_LIMIT = 500;
const DELIVERY_MAX_ATTEMPTS = 3;

declare module "fastify" {
  interface FastifyInstance {
    readonly modules: ModuleRegistry;
    readonly retention?: RetentionStore;
  }
}

/** Creates the Fastify instance. Business routes belong to later stories, not to this factory. */
export function buildApp({
  modules,
  logger = true,
  logStream,
  database,
  invalidation,
  nativeOutput,
  subjectCaches,
  candidateStore,
  tombstoneLedger,
  retentionSweepIntervalMs,
  sandbox,
  vaultKey,
  adapterActionFetch,
  adapterActions,
  kiroCommand,
  kiroRuntimeRoot,
  httpRateLimits,
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger: logger ? loggerOptions(logStream) : false, frameworkErrors: frameworkErrorReply });
  // One bus for the whole process: the viewer cache and the deletion path both use it (Q35).
  const bus = invalidation ?? createInvalidationBus();
  app.decorate("modules", modules);
  // Native output consumers of this process. Revoking a grant closes the consumers that the grant opened.
  const outputSubscribers = createSubscriptionRegistry(nativeOutput?.wsLimits);
  // A fixed body. The default one repeats the requested URL, and a URL can carry a credential.
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "NOT_FOUND" }));
  app.get("/healthz", async () => ({ status: "ok" }));
  if (database !== undefined) {
    if (sandbox?.enabled === true) {
      assertSandboxStartupSafe(sandbox, database.filePath);
    }
    app.register(authRoutes, {
      database,
      onOutputGrantRevoked: (grantId) => outputSubscribers.closeGrant(grantId),
      httpRateLimits,
    });
    const cache = createViewerCache(bus);
    const viewer = createLogViewer({
      port: createAuditLogPort(database),
      access: databaseViewerAccess(database),
      cache,
    });
    app.register(logViewerRoutes, { database, viewer });
    app.addHook("onClose", async () => {
      cache.dispose();
    });
    const retention = createRetentionStore(database, {
      onExpired: (batch) =>
        bus.publish({
          reason: "EXPIRED",
          logIds: batch.logIds,
          correlationIds: batch.correlationIds,
          changeLogIds: batch.changeLogIds,
        }),
    });
    app.decorate("retention", retention);
    if (retentionSweepIntervalMs !== undefined) {
      if (!Number.isFinite(retentionSweepIntervalMs) || retentionSweepIntervalMs <= 0) {
        throw new RangeError("retentionSweepIntervalMs must be a positive number");
      }
      let sweeping = false;
      const retentionTimer = setInterval(() => {
        if (sweeping) return;
        sweeping = true;
        try {
          retention.sweepExpired({ nowIso: new Date().toISOString() });
        } catch (error) {
          app.log.error({ errorName: errorNameOf(error) }, "retention sweep failed");
        } finally {
          sweeping = false;
        }
      }, retentionSweepIntervalMs);
      retentionTimer.unref();
      app.addHook("preClose", async () => {
        clearInterval(retentionTimer);
      });
    }
    const resolvedCandidateStore =
      candidateStore ??
      createPersistentCandidateStore(database, {
        newId: () => randomUUID(),
        now: () => new Date(),
        rules: {
          publishConfirmedTerm: (input) => publishConfirmedCandidateTerm(database, input),
        },
      });
    const effectiveSubjectCaches = mergeSubjectCaches(subjectCaches, resolvedCandidateStore);
    const deps = dataDepsFor(database, bus, effectiveSubjectCaches, tombstoneLedger);
    app.register(dataLifecycleRoutes, { database, routes: createDataRoutes(deps) });
    app.register(
      channelPanelRoutes,
      {
        ...channelPanelOptionsFor(database, modules, resolvedCandidateStore, {
          vaultKey,
          adapterActionFetch,
          adapterActions,
          kiroCommand,
          kiroRuntimeRoot,
        }),
        httpRateLimits,
      },
    );
    startNativeOutput(app, database, outputSubscribers, nativeOutput);
    if (sandbox?.enabled === true) {
      app.register(sandboxRoutes, { database });
    }
  }
  return app;
}

/**
 * Starts the native output endpoint on the HTTP server, and the delivery pump that sends approved rows to the consumers
 * connected to this process. Both stop when the app closes.
 */
function startNativeOutput(
  app: FastifyInstance,
  database: VoxwardDatabase,
  subscribers: OutputSubscriberRegistry,
  settings: NativeOutputSettings | undefined,
): void {
  const nativeGrants = createOutputGrantPort(database, ["NATIVE_V1", "OBS_OVERLAY"]);
  const blivechatGrants = createOutputGrantPort(database, ["NATIVE_V1", "BLIVECHAT"]);
  const authLimiter = createWsUpgradeRateLimiter({
    maxAttempts: settings?.wsLimits?.maxAuthAttemptsPerIp,
    windowMs: settings?.wsLimits?.authWindowMs,
  });
  const endpoint = attachNativeOutput(app.server, {
    grants: nativeGrants,
    subscribers,
    timing: settings?.timing,
    ignoredPaths: new Set([BLIVECHAT_OUTPUT_PATH]),
    log: app.log,
    onClosed: settings?.onClosed,
    authLimiter,
  });
  const blivechatEndpoint = attachBlivechatOutput(app.server, {
    path: BLIVECHAT_OUTPUT_PATH,
    protocolVersion: BLIVECHAT_PROTOCOL_VERSION,
    grants: blivechatGrants,
    subscribers,
    protocol: createBlivechatAdapter(),
    timing: settings?.timing,
    log: app.log,
    onClosed: settings?.onClosed,
    authLimiter,
  });
  const pump = createDeliveryPump({
    delivery: createOutputDeliveryPort(database),
    content: createApprovedContentPort(database),
    subscribers,
    now: () => new Date(),
    batchLimit: DELIVERY_BATCH_LIMIT,
    expireLimit: DELIVERY_EXPIRE_LIMIT,
    maxAttempts: DELIVERY_MAX_ATTEMPTS,
  });
  // A pass that is still running is not overlapped by the next tick.
  let passing = false;
  const timer = setInterval(() => {
    if (passing) return;
    passing = true;
    pump
      .runPass()
      .catch((error: unknown) => app.log.error({ errorName: errorNameOf(error) }, "delivery pass failed"))
      .finally(() => {
        passing = false;
      });
  }, settings?.passIntervalMs ?? DEFAULT_PASS_INTERVAL_MS);
  timer.unref();
  // preClose runs before Fastify closes the HTTP server and waits on upgraded WebSocket sockets.
  app.addHook("preClose", async () => {
    clearInterval(timer);
    endpoint.close();
    blivechatEndpoint.close();
  });
}

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/**
 * Always registers CANDIDATE_CARD into the process SubjectCacheHub (merged with any caller-provided caches),
 * preventing NO_SUBJECT_CACHES / SURFACE_NOT_REGISTERED during data deletion cleanup.
 */
function mergeSubjectCaches(
  external: SubjectCacheHub | undefined,
  candidateStore: Pick<CandidateStore, "removeBySourceCorrelations">,
): SubjectCacheHub {
  const externalNames = external?.names ?? [];
  const hasCandidate = externalNames.includes("CANDIDATE_CARD");
  const names = hasCandidate ? [...externalNames] : ["CANDIDATE_CARD", ...externalNames];
  return {
    names,
    forgetSubject(name, channelId, platformSubjectKey, correlationIds) {
      if (name === "CANDIDATE_CARD" && !hasCandidate) {
        return candidateStore.removeBySourceCorrelations(channelId, correlationIds);
      }
      if (external !== undefined && externalNames.includes(name)) {
        return external.forgetSubject(name, channelId, platformSubjectKey, correlationIds);
      }
      return 0;
    },
  };
}

/** Binds the data module to the database. Each port is one database layer, and the module sees only the ports. */
function dataDepsFor(
  database: VoxwardDatabase,
  bus: InvalidationBus,
  caches: SubjectCacheHub,
  tombstoneLedger?: TombstoneLedger,
): DataDeps {
  return {
    requests: createDataRequestPort(database),
    subjects: createSubjectReadPort(database),
    logs: createAuditLogPort(database),
    cleanup: createSubjectCleanupPort(database),
    caches,
    publishInvalidation: (event) => bus.publish(event),
    certificateSummary: CERTIFICATE_SUMMARY,
    newId: () => randomUUID(),
    now: () => new Date(),
    retentionDays: RETENTION_DAYS,
    ...(tombstoneLedger !== undefined ? { tombstones: ledgerRecorder(tombstoneLedger) } : {}),
  };
}

export interface RestoreDatabaseOptions {
  readonly backupPath: string;
  readonly targetPath: string;
  readonly ledger: TombstoneLedger;
  readonly certificateSummary?: string;
  readonly newId?: () => string;
  readonly now?: () => Date;
}

/**
 * Restores a backup in isolation and replays all external deletion tombstones before replacing the live file (S020).
 */
export function restoreDatabaseWithLedger(options: RestoreDatabaseOptions): void {
  restoreDatabaseWithPorts({
    backupPath: options.backupPath,
    targetPath: options.targetPath,
    ledger: options.ledger,
    certificateSummary: options.certificateSummary ?? CERTIFICATE_SUMMARY,
    newId: options.newId,
    now: options.now,
    replayWith: (ports, tombstones) => replayTombstones(ports, tombstones),
  });
}

function resolveVaultKeyBuffer(provided?: Buffer | string, env: NodeJS.ProcessEnv = process.env): Buffer | undefined {
  if (Buffer.isBuffer(provided)) {
    if (provided.length !== 32) {
      throw new Error("credential vault key must be 32 bytes");
    }
    return Buffer.from(provided);
  }
  if (typeof provided === "string") {
    const trimmed = provided.trim();
    return trimmed.length === 0 ? undefined : deriveVaultKey(trimmed);
  }
  const envKey = env.VOXWARD_VAULT_KEY?.trim();
  if (envKey) return deriveVaultKey(envKey);
  return undefined;
}

function channelPanelOptionsFor(
  database: VoxwardDatabase,
  modules: ModuleRegistry,
  resolvedCandidates: CandidateStore,
  extras: {
    readonly vaultKey?: Buffer | string;
    readonly adapterActionFetch?: typeof fetch;
    readonly adapterActions?: ChannelPanelAdapterActionsPort;
    readonly kiroCommand?: string;
    readonly kiroRuntimeRoot?: string;
  } = {},
): ChannelPanelRoutesOptions {
  const decisionStore = createDecisionStorePort(database, {
    planner: createChannelAwareScoringPlanner(database),
    changeLogExpiresAt: (occurredAt) =>
      new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
  });
  const decisionDeps = {
    store: decisionStore,
    newId: () => randomUUID(),
    now: () => new Date(),
    limits: DEFAULT_DECISION_LIMITS,
  };
  const decisions = createDecisionRoutes(
    createDecisionService(decisionDeps),
    createListAdministration(decisionDeps),
  );
  const candidates = createCandidateRoutes(resolvedCandidates);
  const vaultKeyBuffer = resolveVaultKeyBuffer(extras.vaultKey);
  const vault =
    vaultKeyBuffer === undefined
      ? undefined
      : createPersistentCredentialVault({
          key: vaultKeyBuffer,
          store: createSqliteVaultBackingStore(database),
        });
  const secrets: ChannelPanelSecretsPort | undefined =
    vault === undefined
      ? undefined
      : {
          seal: (purpose, plaintext) => vault.put(purpose, plaintext).ref,
          reveal: (ref, purpose) => vault.reveal(ref, purpose),
          remove: (ref, purpose) => {
            vault.remove(ref, purpose);
          },
          isSecretRef,
        };
  const adapterActions: ChannelPanelAdapterActionsPort =
    extras.adapterActions ??
    createRealAdapterActionExecutor({
      fetchImpl: extras.adapterActionFetch,
      kiroCommand: extras.kiroCommand,
      kiroRuntimeRoot: extras.kiroRuntimeRoot,
    });
  const modelStore = (channelId: string): ModelSettingsStore => ({
    read: async () => readChannelSetting<ModelSettings>(database, channelId, "model-settings", DEFAULT_MODEL_SETTINGS),
    write: async (next) => writeChannelSetting(database, channelId, "model-settings", next),
  });
  const describe = () => modules.inferenceProvider.describe();
  return {
    database,
    decisions,
    candidates,
    ...(secrets !== undefined ? { secrets } : {}),
    adapterActions,
    models: {
      describe,
      read: (channelId: string, capabilitiesOverride?: InferenceCapabilities) =>
        readModelSettings({ store: modelStore(channelId), describe: () => capabilitiesOverride ?? describe() }),
      write: (channelId: string, body: unknown, capabilitiesOverride?: InferenceCapabilities) =>
        writeModelSettings({ store: modelStore(channelId), describe: () => capabilitiesOverride ?? describe() }, body),
      toggleScTranslation: async (channelId: string, enabled: boolean) => {
        const store = modelStore(channelId);
        const current = await store.read();
        const updated: ModelSettings = { ...current, scTranslationEnabled: enabled };
        await store.write(updated);
        return { status: 200, body: { scTranslationEnabled: enabled, settings: updated } };
      },
    },
    rules: {
      validate: (input: unknown) => {
        if (typeof input !== "object" || input === null || !("version" in input) || !Array.isArray((input as { groups?: unknown }).groups)) {
          return { ok: false as const, issues: [{ code: "INVALID_REQUEST", ref: "rule-set" }] };
        }
        const compiled = compileRuleSet(input as RuleSetInput);
        return compiled.ok ? { ok: true as const } : { ok: false as const, issues: compiled.issues };
      },
      validateRegexPattern: (pattern: string) => {
        const res = admitRegex(pattern);
        if (res.ok) return { ok: true as const };
        const hint =
          res.rejection === "GROUP_ALTERNATION"
            ? "write the alternatives as top-level branches, such as a|b, or split them into several rules"
            : res.rejection === "UNBOUNDED_WITH_VARIABLE_REPEAT"
              ? "split the pattern into several rules, or give one of the quantifiers a fixed count"
              : undefined;
        return { ok: false as const, code: `REGEX_${res.rejection}`, hint };
      },
      normalizedTermIsEmpty: (channelId: string, term: string) => {
        const latest = readLatestRuleVersion(database, channelId);
        const norm = parseRuleSetJson(latest?.ruleJson ?? null).normalization;
        const stripCombiningMarks =
          typeof norm?.stripCombiningMarks === "boolean"
            ? norm.stripCombiningMarks
            : DEFAULT_NORMALIZE_OPTIONS.stripCombiningMarks;
        return normalizeText(term, { stripCombiningMarks }).length === 0;
      },
      previewWordlist: async (channelId: string, entries: readonly ExtendedTermEntry[], text: string, language?: string) => {
        const ruleSet = applyManagedWordlistToRuleSet({ version: "preview", groups: [] }, entries) as RuleSetInput;
        const hasRules = ruleSet.groups.length > 0 || (ruleSet.whitelist?.length ?? 0) > 0;
        if (!hasRules || !compileRuleSet(ruleSet).ok) {
          return { hits: [], whitelistMatches: [], language: language ?? "und", action: null };
        }
        const checker = createModerationChecker({
          ruleSet,
          nicknames: { displayNicknameOf: async () => "preview-viewer" },
        });
        const verdict = await checker.check(
          {
            contractVersion: CONTRACT_VERSION,
            platform: "synthetic",
            channelId,
            platformMessageId: "wordlist-preview",
            platformOrder: 0,
            receivedAt: new Date().toISOString(),
            correlationId: "wordlist-preview",
            body: text,
            sender: { contractVersion: CONTRACT_VERSION, senderRef: "wordlist-preview" },
          },
          language === undefined ? undefined : { language },
        );
        const blByRule = new Map(entries.filter((e) => e.listKind === "BLACKLIST").map((e) => [wordlistRuleId("bl", e.id), e.id]));
        const wlByRule = new Map(entries.filter((e) => e.listKind === "WHITELIST").map((e) => [wordlistRuleId("wl", e.id), e.id]));
        const hits = [...new Set(verdict.hits.flatMap((h) => blByRule.get(h.ruleId) ?? []))];
        const whitelistMatches = [...new Set((verdict.whitelistMatches ?? []).flatMap((h) => wlByRule.get(h.ruleId) ?? []))];
        const action = hits.length === 0 ? null : verdict.hits.some((h) => h.action.kind === "BLOCK") ? ("BLOCK" as const) : ("REVIEW" as const);
        return { hits, whitelistMatches, language: language ?? "und", action };
      },
    },
  };
}

function loggerOptions(logStream: AppOptions["logStream"]) {
  return {
    serializers: { req: serializeRequest },
    ...(logStream === undefined ? {} : { stream: logStream }),
  };
}

/** Logs the method and the path. The query string is dropped, because a credential can arrive there. */
function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: redactUrlText(pathOf(request.url)),
    host: redactUrlText(request.host),
    remoteAddress: request.ip,
    remotePort: request.socket.remotePort,
  };
}

/** Framework refusals of the request line, by Fastify error code. Any other code is a 400 with the fixed body. */
const FRAMEWORK_REFUSALS: Readonly<Record<string, { readonly status: number; readonly error: string }>> = {
  FST_ERR_MAX_PARAM_LENGTH: { status: 414, error: "URI_TOO_LONG" },
};

/**
 * Fastify puts the request path into its own refusal text, and the path can carry a credential. The body here is fixed:
 * the status and one code only.
 */
function frameworkErrorReply(error: FastifyError, _request: FastifyRequest, reply: FastifyReply): void {
  const refusal = FRAMEWORK_REFUSALS[error.code] ?? { status: 400, error: "BAD_REQUEST" };
  reply.code(refusal.status).send({ error: refusal.error });
}

function pathOf(url: string): string {
  return url.split("?", 1)[0] ?? "";
}

