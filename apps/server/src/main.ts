import { readFileSync } from "node:fs";
import { buildApp } from "./app.js";
import { describeConfigError, loadConfig } from "./config/load.js";
import { buildRegistry } from "./modules/registry.js";

const loaded = loadConfig({ env: process.env, readFile: (path) => readFileSync(path, "utf8") });
if (!loaded.ok) {
  process.stderr.write(`${describeConfigError(loaded.error)}\n`);
  process.exit(1);
}

const { config } = loaded;
const app = buildApp({ modules: buildRegistry(config) });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  process.stderr.write(`${describeListenError(error)}\n`);
  process.exit(1);
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
