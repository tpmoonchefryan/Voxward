import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildApp } from "./app.js";
import { serverConfigSchema } from "./config/schema.js";
import { registerSandboxSpaRoutes, resolveWebDistDir } from "./config/web-static.js";
import { openDatabase } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { assertSandboxStartupSafe } from "./demo/sandbox-guard.js";
import { buildRegistry } from "./modules/registry.js";

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
