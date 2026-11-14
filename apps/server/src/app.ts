import { randomUUID } from "node:crypto";
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { OutputSubscriberRegistry, SubjectCacheHub } from "@voxward/contracts";
import { attachBlivechatOutput } from "./adapters/blivechat/socket.js";
import { attachNativeOutput, type ClosedConnection, type NativeOutputTiming } from "./adapters/native-output/socket.js";
import { channelPanelRoutes } from "./auth/channel-panel-routes.js";
import { dataLifecycleRoutes } from "./auth/data-routes.js";
import { databaseViewerAccess } from "./auth/log-viewer-access.js";
import { logViewerRoutes } from "./auth/log-viewer-routes.js";
import { authRoutes } from "./auth/routes.js";
import { createAuditLogPort } from "./db/audit-log.js";
import {
  publishConfirmedCandidateTerm,
  readChannelSetting,
  writeChannelSetting,
} from "./db/channel-settings-store.js";
import type { VoxwardDatabase } from "./db/client.js";
import { createDataRequestPort } from "./db/data-request-store.js";
import { createDecisionStorePort } from "./db/decision-store.js";
import { createApprovedContentPort, createOutputDeliveryPort, createOutputGrantPort } from "./db/output-store.js";
import { restoreDatabaseWithPorts } from "./db/restore-support.js";
import { createRetentionStore, type RetentionStore } from "./db/retention-store.js";
import { createSubjectCleanupPort } from "./db/subject-cleanup.js";
import { createSubjectReadPort } from "./db/subject-read.js";
import { ledgerRecorder, type TombstoneLedger } from "./db/tombstone-ledger.js";
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
  type CandidateStore,
} from "./modules/moderation-engine/index.js";
import { compileRuleSet, type RuleSetInput } from "./modules/moderation-engine/rules/groups.js";
import { BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION, createBlivechatAdapter } from "./modules/output/index.js";
import { createDeliveryPump } from "./modules/output-adapter/delivery.js";
import { createSubscriptionRegistry } from "./modules/output-adapter/subscription.js";
import type { ModuleRegistry } from "./modules/registry.js";
import { createScoringPlanner } from "./modules/scoring-engine/index.js";
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
}

export interface NativeOutputSettings {
  readonly timing?: Partial<NativeOutputTiming>;
  /** Time between two delivery passes, in milliseconds (自定). Tests shorten it. */
  readonly passIntervalMs?: number;
  readonly onClosed?: (closed: ClosedConnection) => void;
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
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger: logger ? loggerOptions(logStream) : false, frameworkErrors: frameworkErrorReply });
  // One bus for the whole process: the viewer cache and the deletion path both use it (Q35).
  const bus = invalidation ?? createInvalidationBus();
  app.decorate("modules", modules);
  // Native output consumers of this process. Revoking a grant closes the consumers that the grant opened.
  const outputSubscribers = createSubscriptionRegistry();
  // A fixed body. The default one repeats the requested URL, and a URL can carry a credential.
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "NOT_FOUND" }));
  app.get("/healthz", async () => ({ status: "ok" }));
  if (database !== undefined) {
    app.register(authRoutes, { database, onOutputGrantRevoked: (grantId) => outputSubscribers.closeGrant(grantId) });
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
    const deps = dataDepsFor(database, bus, subjectCaches ?? NO_SUBJECT_CACHES, tombstoneLedger);
    app.register(dataLifecycleRoutes, { database, routes: createDataRoutes(deps) });
    app.register(channelPanelRoutes, channelPanelOptionsFor(database, modules, candidateStore));
    startNativeOutput(app, database, outputSubscribers, nativeOutput);
    if (sandbox?.enabled === true) {
      assertSandboxStartupSafe(sandbox, database.filePath);
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
  const grants = createOutputGrantPort(database);
  const endpoint = attachNativeOutput(app.server, {
    grants,
    subscribers,
    timing: settings?.timing,
    ignoredPaths: new Set([BLIVECHAT_OUTPUT_PATH]),
    log: app.log,
    onClosed: settings?.onClosed,
  });
  const blivechatEndpoint = attachBlivechatOutput(app.server, {
    path: BLIVECHAT_OUTPUT_PATH,
    protocolVersion: BLIVECHAT_PROTOCOL_VERSION,
    grants,
    subscribers,
    protocol: createBlivechatAdapter(),
    timing: settings?.timing,
    log: app.log,
    onClosed: settings?.onClosed,
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

/** Holds no in-process surface. A deletion then registers none of them, and the status says so. */
const NO_SUBJECT_CACHES: SubjectCacheHub = { names: [], forgetSubject: () => 0 };

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

function channelPanelOptionsFor(
  database: VoxwardDatabase,
  modules: ModuleRegistry,
  providedCandidates: CandidateStore | undefined,
) {
  const decisionStore = createDecisionStorePort(database, {
    planner: createScoringPlanner(),
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
  const candidates = createCandidateRoutes(
    providedCandidates ??
      createCandidateStore({
        newId: () => randomUUID(),
        now: () => new Date(),
        rules: {
          publishConfirmedTerm: (input) => publishConfirmedCandidateTerm(database, input),
        },
      }),
  );
  const modelStore = (channelId: string): ModelSettingsStore => ({
    read: async () => readChannelSetting<ModelSettings>(database, channelId, "model-settings", DEFAULT_MODEL_SETTINGS),
    write: async (next) => writeChannelSetting(database, channelId, "model-settings", next),
  });
  const describe = () => modules.inferenceProvider.describe();
  return {
    database,
    decisions,
    candidates,
    models: {
      describe,
      read: (channelId: string) => readModelSettings({ store: modelStore(channelId), describe }),
      write: (channelId: string, body: unknown) => writeModelSettings({ store: modelStore(channelId), describe }, body),
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

