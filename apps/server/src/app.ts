import Fastify, { type FastifyInstance } from "fastify";
import { authRoutes } from "./auth/routes.js";
import type { VoxwardDatabase } from "./db/client.js";
import type { ModuleRegistry } from "./modules/registry.js";

export interface AppOptions {
  readonly modules: ModuleRegistry;
  readonly logger?: boolean;
  /** When set, the session and channel authorization routes are registered on this database. */
  readonly database?: VoxwardDatabase;
}

declare module "fastify" {
  interface FastifyInstance {
    readonly modules: ModuleRegistry;
  }
}

/** Creates the Fastify instance. Business routes belong to later stories, not to this factory. */
export function buildApp({ modules, logger = true, database }: AppOptions): FastifyInstance {
  const app = Fastify({ logger });
  app.decorate("modules", modules);
  app.get("/healthz", async () => ({ status: "ok" }));
  if (database !== undefined) app.register(authRoutes, { database });
  return app;
}
