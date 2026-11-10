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

await app.listen({ host: config.host, port: config.port });
