import { randomUUID } from "node:crypto";
import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { OutputSubscriberRegistry, SubjectCacheHub } from "@voxward/contracts";
import { attachNativeOutput, type ClosedConnection, type NativeOutputTiming } from "./adapters/native-output/socket.js";
import { dataLifecycleRoutes } from "./auth/data-routes.js";
import { databaseViewerAccess } from "./auth/log-viewer-access.js";
import { logViewerRoutes } from "./auth/log-viewer-routes.js";
import { authRoutes } from "./auth/routes.js";
import { createAuditLogPort } from "./db/audit-log.js";
import type { VoxwardDatabase } from "./db/client.js";
import { createDataRequestPort } from "./db/data-request-store.js";
import { createApprovedContentPort, createOutputDeliveryPort, createOutputGrantPort } from "./db/output-store.js";
import { createSubjectCleanupPort } from "./db/subject-cleanup.js";
import { createSubjectReadPort } from "./db/subject-read.js";
import { RETENTION_DAYS } from "./modules/audit-store/content-policy.js";
import {
  CERTIFICATE_SUMMARY,
  createInvalidationBus,
  createLogViewer,
  createViewerCache,
  type InvalidationBus,
} from "./modules/audit-store/index.js";
import { createDataRoutes, type DataDeps } from "./modules/data-lifecycle-service/index.js";
import { createDeliveryPump } from "./modules/output-adapter/delivery.js";
import { createSubscriptionRegistry } from "./modules/output-adapter/subscription.js";
import type { ModuleRegistry } from "./modules/registry.js";
import { redactUrlText } from "./security/redaction.js";

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
    const deps = dataDepsFor(database, bus, subjectCaches ?? NO_SUBJECT_CACHES);
    app.register(dataLifecycleRoutes, { database, routes: createDataRoutes(deps) });
    startNativeOutput(app, database, outputSubscribers, nativeOutput);
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
  const endpoint = attachNativeOutput(app.server, {
    grants: createOutputGrantPort(database),
    subscribers,
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
  app.addHook("onClose", async () => {
    clearInterval(timer);
    endpoint.close();
  });
}

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/** Holds no in-process surface. A deletion then registers none of them, and the status says so. */
const NO_SUBJECT_CACHES: SubjectCacheHub = { names: [], forgetSubject: () => 0 };

/** Binds the data module to the database. Each port is one database layer, and the module sees only the ports. */
function dataDepsFor(database: VoxwardDatabase, bus: InvalidationBus, caches: SubjectCacheHub): DataDeps {
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

