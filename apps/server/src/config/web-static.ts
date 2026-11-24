import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const PRODUCTION_SPA_PATHS = [
  "/",
  "/login",
  "/sandbox",
  "/sandbox/*",
  "/guides",
  "/moderation",
  "/moderation/*",
  "/dock",
  "/dock/*",
  "/channels/:channelId/blocked",
  "/data",
  "/data/*",
  "/logs",
  "/logs/*",
  "/integrations",
  "/integrations/*",
  "/users",
  "/users/*",
  "/settings",
  "/settings/*",
  "/admin",
  "/admin/*",
  "/overlay",
  "/overlay/*",
] as const;

const SANDBOX_SPA_PATHS = [
  "/",
  "/login",
  "/guides",
  "/sandbox",
  "/sandbox/*",
  "/dock",
  "/dock/*",
  "/overlay",
  "/overlay/*",
] as const;

/** Locates the built `@voxward/web` distribution directory containing `index.html`, if present on disk. */
export function resolveWebDistDir(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../web/dist"),
    resolve(here, "../../../web/dist"),
    resolve(process.cwd(), "apps/web/dist"),
    resolve(process.cwd(), "../web/dist"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return undefined;
}

/** Sends a built static file from `webDistDir` without allowing path traversal outside `webDistDir`. */
export function sendStaticFile(reply: FastifyReply, webDistDir: string, urlPath: string): FastifyReply {
  const root = resolve(webDistDir);
  const cleanPath = urlPath.split("?")[0] ?? "/";
  const relPath = cleanPath.replace(/^\/+/, "");
  const candidate = resolve(root, relPath);
  if (!candidate.startsWith(`${root}/`) || !existsSync(candidate) || !statSync(candidate).isFile()) {
    return reply.code(404).send({ error: "NOT_FOUND" });
  }
  const ext = extname(candidate).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return reply.header("content-type", contentType).send(readFileSync(candidate));
}

function registerSpaRoutes(app: FastifyInstance, webDistDir: string, spaPaths: readonly string[]): void {
  const root = resolve(webDistDir);
  const indexHtml = join(root, "index.html");
  const serveSpaIndex = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.header("content-type", "text/html; charset=utf-8").send(readFileSync(indexHtml));
  };

  for (const spaPath of spaPaths) {
    app.get(spaPath, serveSpaIndex);
  }
  app.get("/assets/*", async (request, reply) => sendStaticFile(reply, root, request.url));
  app.get("/favicon.ico", async (request, reply) => sendStaticFile(reply, root, request.url));
}

/** Registers production SPA routes while preserving JSON 404 semantics for `/auth/*`, `/internal/*`, and API routes. */
export function registerProductionSpaRoutes(app: FastifyInstance, webDistDir: string): void {
  registerSpaRoutes(app, webDistDir, PRODUCTION_SPA_PATHS);
}

/** Registers synthetic sandbox SPA routes including overlay preview and static assets. */
export function registerSandboxSpaRoutes(app: FastifyInstance, webDistDir: string): void {
  registerSpaRoutes(app, webDistDir, SANDBOX_SPA_PATHS);
}
