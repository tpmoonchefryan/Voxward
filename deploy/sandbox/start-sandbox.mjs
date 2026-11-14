#!/usr/bin/env node
import { readFileSync } from "node:fs";
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

console.log(JSON.stringify({
  ok: true,
  mode: config.mode,
  banner: config.banner,
  databasePath: resolve(root, dbPath),
  host: process.env.VOXWARD_SANDBOX_HOST ?? config.host,
  port: Number(process.env.VOXWARD_SANDBOX_PORT ?? config.port),
  note: "Use apps/server buildApp({ modules, database, sandbox: { enabled: true } }) to serve /sandbox-api/*.",
}, null, 2));
