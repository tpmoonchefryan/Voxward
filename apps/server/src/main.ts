import { readFileSync } from "node:fs";
import { buildApp } from "./app.js";
import { describeConfigError, loadConfig } from "./config/load.js";
import { DatabaseSetupError, openDatabase, type VoxwardDatabase } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { buildRegistry } from "./modules/registry.js";

const loaded = loadConfig({ env: process.env, readFile: (path) => readFileSync(path, "utf8") });
if (!loaded.ok) {
  process.stderr.write(`${describeConfigError(loaded.error)}\n`);
  process.exit(1);
}

const { config } = loaded;
const database = openDatabaseOrExit(config.databaseFile);
const app = buildApp({ modules: buildRegistry(config), database });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      database.close();
      process.exit(0);
    });
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  process.stderr.write(`${describeListenError(error)}\n`);
  database.close();
  process.exit(1);
}

/** Opens the SQLite file and applies pending migrations. A failure prints one line and exits, like a config error. */
function openDatabaseOrExit(filePath: string): VoxwardDatabase {
  try {
    const database = openDatabase({ filePath });
    try {
      runMigrations(database);
    } catch (error) {
      database.close();
      throw error;
    }
    return database;
  } catch (error) {
    process.stderr.write(`${describeDatabaseError(error)}\n`);
    process.exit(1);
  }
}

/** One line for operators: the failure code only. The file path is not echoed. */
function describeDatabaseError(error: unknown): string {
  if (error instanceof DatabaseSetupError) return `DATABASE_SETUP_FAILED: ${error.code}`;
  return `DATABASE_SETUP_FAILED: ${errorCode(error) ?? "unexpected error"}`;
}

/** One line for operators: the setting and the reason. Like config errors, it never echoes a value. */
function describeListenError(error: unknown): string {
  const code = errorCode(error);
  switch (code) {
    case "EADDRINUSE":
      return "LISTEN_FAILED: port (address already in use)";
    case "EADDRNOTAVAIL":
      return "LISTEN_FAILED: host (address is not available on this machine)";
    case "ENOTFOUND":
    case "EAI_AGAIN":
    case "EAI_NONAME":
      return "LISTEN_FAILED: host (cannot be resolved)";
    case "EACCES":
      return "LISTEN_FAILED: port (permission denied)";
    default:
      return `LISTEN_FAILED: ${code ?? "unexpected error"}`;
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}
