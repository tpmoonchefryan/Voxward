import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyReply, FastifyRequest } from "fastify";
import { buildApp } from "./app.js";
import { serverConfigSchema } from "./config/schema.js";
import { openDatabase } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { assertSandboxStartupSafe } from "./demo/sandbox-guard.js";
import { buildRegistry } from "./modules/registry.js";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
};

function resolveWebDistDir(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../web/dist"),
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

function sendStaticFile(reply: FastifyReply, webDistDir: string, urlPath: string): FastifyReply {
  const cleanPath = urlPath.split("?")[0] ?? "/";
  const relPath = cleanPath.replace(/^\/+/, "");
  const candidate = resolve(webDistDir, relPath);
  if (!candidate.startsWith(webDistDir + "/") || !existsSync(candidate) || !statSync(candidate).isFile()) {
    return reply.code(404).send({ error: "NOT_FOUND" });
  }
  const ext = extname(candidate).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return reply.header("content-type", contentType).send(readFileSync(candidate));
}

function registerSandboxSpaRoutes(app: ReturnType<typeof buildApp>, webDistDir: string): void {
  const indexHtml = join(webDistDir, "index.html");

  const serveSpaIndex = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.header("content-type", "text/html; charset=utf-8").send(readFileSync(indexHtml));
  };

  app.get("/", serveSpaIndex);
  app.get("/sandbox", serveSpaIndex);
  app.get("/sandbox/*", serveSpaIndex);
  app.get("/assets/*", async (request, reply) => sendStaticFile(reply, webDistDir, request.url));
  app.get("/overlay/*", async (request, reply) => sendStaticFile(reply, webDistDir, request.url));
}

async function main(): Promise<void> {
  const requestedDbPath = process.env.VOXWARD_SANDBOX_DB ?? "data/voxward-sandbox.sqlite3";
  const host = process.env.VOXWARD_SANDBOX_HOST ?? "127.0.0.1";
  const port = Number(process.env.VOXWARD_SANDBOX_PORT ?? 3100);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write("SANDBOX_CONFIG_FAILED: invalid VOXWARD_SANDBOX_PORT\n");
    process.exit(1);
  }

  assertSandboxStartupSafe({ enabled: true, databasePath: requestedDbPath, env: process.env }, requestedDbPath);

  let ephemeralDir: string | undefined;
  let dbPath = requestedDbPath;
  if (requestedDbPath === ":memory:") {
    ephemeralDir = mkdtempSync(join(tmpdir(), "voxward-sandbox-mem-"));
    dbPath = join(ephemeralDir, "sandbox.sqlite3");
  } else {
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  }

  const cleanupEphemeral = () => {
    if (ephemeralDir !== undefined) {
      rmSync(ephemeralDir, { recursive: true, force: true });
      ephemeralDir = undefined;
    }
  };

  const database = openDatabase({ filePath: dbPath });
  try {
    runMigrations(database);
  } catch (error) {
    database.close();
    cleanupEphemeral();
    throw error;
  }

  const config = serverConfigSchema.parse({
    host,
    port,
    adapters: "synthetic",
    databaseFile: dbPath,
  });

  const app = buildApp({
    modules: buildRegistry(config),
    database,
    logger: false,
    sandbox: {
      enabled: true,
      databasePath: dbPath,
      env: process.env,
    },
  });

  const webDistDir = resolveWebDistDir();
  if (webDistDir !== undefined) {
    registerSandboxSpaRoutes(app, webDistDir);
  }

  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    void app.close().then(
      () => {
        database.close();
        cleanupEphemeral();
        process.exit(0);
      },
      () => {
        database.close();
        cleanupEphemeral();
        process.exit(1);
      },
    );
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  try {
    await app.listen({ host, port });
  } catch (error) {
    database.close();
    cleanupEphemeral();
    throw error;
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`SANDBOX_STARTUP_FAILED: ${message}\n`);
  process.exit(1);
});
