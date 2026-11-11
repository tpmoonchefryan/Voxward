import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { dataLifecycleRoutes } from "./auth/data-routes.js";
import { databaseViewerAccess } from "./auth/log-viewer-access.js";
import { logViewerRoutes } from "./auth/log-viewer-routes.js";
import { authRoutes } from "./auth/routes.js";
import { createAuditLogPort } from "./db/audit-log.js";
import type { VoxwardDatabase } from "./db/client.js";
import { createDataRequestPort } from "./db/data-request-store.js";
import { createSubjectReadPort } from "./db/subject-read.js";
import { RETENTION_DAYS } from "./modules/audit-store/content-policy.js";
import {
  createInvalidationBus,
  createLogViewer,
  createViewerCache,
  type InvalidationBus,
} from "./modules/audit-store/index.js";
import { createDataRoutes, type DataDeps } from "./modules/data-lifecycle-service/index.js";
import type { ModuleRegistry } from "./modules/registry.js";
import { redactText } from "./security/redaction.js";

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
}

declare module "fastify" {
  interface FastifyInstance {
    readonly modules: ModuleRegistry;
  }
}

/** Creates the Fastify instance. Business routes belong to later stories, not to this factory. */
export function buildApp({ modules, logger = true, logStream, database, invalidation }: AppOptions): FastifyInstance {
  const app = Fastify({ logger: logger ? loggerOptions(logStream) : false });
  app.decorate("modules", modules);
  // A fixed body. The default one repeats the requested URL, and a URL can carry a credential.
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "NOT_FOUND" }));
  app.get("/healthz", async () => ({ status: "ok" }));
  if (database !== undefined) {
    app.register(authRoutes, { database });
    const cache = createViewerCache(invalidation ?? createInvalidationBus());
    const viewer = createLogViewer({
      port: createAuditLogPort(database),
      access: databaseViewerAccess(database),
      cache,
    });
    app.register(logViewerRoutes, { database, viewer });
    app.addHook("onClose", async () => {
      cache.dispose();
    });
    app.register(dataLifecycleRoutes, { database, routes: createDataRoutes(dataDepsFor(database)) });
  }
  return app;
}

/** Binds the data module to the database. Each port is one database layer, and the module sees only the ports. */
function dataDepsFor(database: VoxwardDatabase): DataDeps {
  return {
    requests: createDataRequestPort(database),
    subjects: createSubjectReadPort(database),
    logs: createAuditLogPort(database),
    newId: () => randomUUID(),
    now: () => new Date(),
    retentionDays: RETENTION_DAYS,
    // No in-process surface is mounted by this binding yet (S019 design §8). SUB-036 lists the ones it holds.
    caches: { names: [], forgetSubject: () => 0 },
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
    url: redactText(pathOf(request.url)),
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket.remotePort,
  };
}

function pathOf(url: string): string {
  return url.split("?", 1)[0] ?? "";
}

