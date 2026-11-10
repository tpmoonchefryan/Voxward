import Fastify, { type FastifyInstance } from "fastify";
import type { ModuleRegistry } from "./modules/registry.js";

export interface AppOptions {
  readonly modules: ModuleRegistry;
  readonly logger?: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    readonly modules: ModuleRegistry;
  }
}

/** Creates the Fastify instance. Business routes belong to later stories, not to this factory. */
export function buildApp({ modules, logger = true }: AppOptions): FastifyInstance {
  const app = Fastify({ logger });
  app.decorate("modules", modules);
  app.get("/healthz", async () => ({ status: "ok" }));
  return app;
}
