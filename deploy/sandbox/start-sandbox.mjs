#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const config = JSON.parse(readFileSync(resolve(here, "sandbox.config.json"), "utf8"));

const forbiddenEnv = [
  "GOOGLE_CLIENT_SECRET",
  "YOUTUBE_CLIENT_SECRET",
  "OAUTH_CLIENT_SECRET",
  "YOUTUBE_REFRESH_TOKEN",
  "YOUTUBE_ACCESS_TOKEN",
  "GOOGLE_REFRESH_TOKEN",
];

for (const key of forbiddenEnv) {
  if (typeof process.env[key] === "string" && process.env[key].trim().length > 0) {
    console.error(`[sandbox-guard] Refusing to start: forbidden production credential ${key} is set.`);
    process.exit(1);
  }
}

const dbPath = process.env.VOXWARD_SANDBOX_DB ?? config.databasePath;
if (!dbPath.toLowerCase().includes("sandbox") && dbPath !== ":memory:") {
  console.error(`[sandbox-guard] Refusing to start: non-sandbox database path "${dbPath}".`);
  process.exit(1);
}

const host = process.env.VOXWARD_SANDBOX_HOST ?? config.host;
const port = Number(process.env.VOXWARD_SANDBOX_PORT ?? config.port);
const resolvedDbPath = dbPath === ":memory:" ? ":memory:" : resolve(root, dbPath);

if (process.argv.includes("--check-only")) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: config.mode,
        banner: config.banner,
        databasePath: resolvedDbPath,
        host,
        port,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const distEntry = resolve(root, "apps/server/dist/sandbox-main.js");
const srcEntry = resolve(root, "apps/server/src/sandbox-main.ts");
const tsxBin = resolve(root, "apps/server/node_modules/.bin/tsx");

let command;
let args;
if (existsSync(distEntry)) {
  command = process.execPath;
  args = [distEntry];
} else if (existsSync(tsxBin)) {
  command = tsxBin;
  args = [srcEntry];
} else {
  console.error("[sandbox-launcher] Missing apps/server/dist/sandbox-main.js; run `pnpm build` first.");
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    VOXWARD_SANDBOX_ENABLED: "true",
    VOXWARD_SANDBOX_DB: resolvedDbPath,
    VOXWARD_SANDBOX_HOST: host,
    VOXWARD_SANDBOX_PORT: String(port),
  },
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.once("SIGINT", () => forwardSignal("SIGINT"));
process.once("SIGTERM", () => forwardSignal("SIGTERM"));

child.once("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});
