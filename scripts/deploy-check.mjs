#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_KIRO_TIMEOUT_MS = 1_000;
const MAX_KIRO_TIMEOUT_MS = 300_000;
const TRUTHY_FLAGS = new Set(["1", "true", "yes", "on"]);

// Construct forbidden path tokens dynamically so this script does not contain raw literal matches.
const FORBIDDEN_PATTERNS = [
  ["/home/", "ryanlan"].join(""),
  ["file:", "///"].join(""),
  [".work", "trees"].join(""),
  ["/tm", "p/"].join(""),
];

function parseArgs(argv) {
  let json = false;
  let envFile;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--env-file") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--env-file requires a path");
      }
      envFile = resolve(ROOT, value);
      i += 1;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return { json, envFile };
}

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

function checkExists(relPath) {
  const abs = resolve(ROOT, relPath);
  const ok = existsSync(abs);
  return { name: `exists:${relPath}`, ok, detail: ok ? "present" : "missing" };
}

function checkTemplateHygiene(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) {
    return { name: `hygiene:${relPath}`, ok: false, detail: "missing" };
  }
  const content = readFileSync(abs, "utf8");
  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (content.includes(forbidden)) {
      return { name: `hygiene:${relPath}`, ok: false, detail: `contains forbidden local path token` };
    }
  }
  if (relPath.endsWith("runtime.env.example")) {
    const keyLine = content.split(/\r?\n/).find((line) => line.startsWith("KIRO_API_KEY="));
    if (keyLine !== "KIRO_API_KEY=") {
      return { name: `hygiene:${relPath}`, ok: false, detail: "KIRO_API_KEY must be empty in template" };
    }
  }
  return { name: `hygiene:${relPath}`, ok: true, detail: "clean" };
}

function checkEnvConfig(env, sourceLabel) {
  const checks = [];
  const sandboxRaw = env.VOXWARD_SANDBOX_ENABLED?.trim().toLowerCase();
  if (sandboxRaw !== undefined && TRUTHY_FLAGS.has(sandboxRaw)) {
    checks.push({
      name: `env:${sourceLabel}:sandbox`,
      ok: false,
      detail: "VOXWARD_SANDBOX_ENABLED must not be enabled in production",
    });
  } else {
    checks.push({ name: `env:${sourceLabel}:sandbox`, ok: true, detail: "sandbox disabled" });
  }

  const timeoutRaw = env.VOXWARD_KIRO_TIMEOUT_MS;
  if (timeoutRaw !== undefined && timeoutRaw !== "") {
    const parsed = /^\d+$/.test(timeoutRaw) ? Number(timeoutRaw) : Number.NaN;
    const ok = Number.isInteger(parsed) && parsed >= MIN_KIRO_TIMEOUT_MS && parsed <= MAX_KIRO_TIMEOUT_MS;
    checks.push({
      name: `env:${sourceLabel}:kiro-timeout`,
      ok,
      detail: ok
        ? `within [${MIN_KIRO_TIMEOUT_MS}, ${MAX_KIRO_TIMEOUT_MS}]`
        : `VOXWARD_KIRO_TIMEOUT_MS must be an integer in [${MIN_KIRO_TIMEOUT_MS}, ${MAX_KIRO_TIMEOUT_MS}]`,
    });
  }

  const portRaw = env.VOXWARD_PORT;
  if (portRaw !== undefined && portRaw !== "") {
    const parsed = /^\d+$/.test(portRaw) ? Number(portRaw) : Number.NaN;
    const ok = Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535;
    checks.push({
      name: `env:${sourceLabel}:port`,
      ok,
      detail: ok ? "valid port" : "VOXWARD_PORT must be an integer in [1, 65535]",
    });
  }

  const adaptersRaw = env.VOXWARD_ADAPTERS;
  if (adaptersRaw !== undefined && adaptersRaw !== "") {
    const ok = adaptersRaw === "synthetic";
    checks.push({
      name: `env:${sourceLabel}:adapters`,
      ok,
      detail: ok ? "supported adapter set" : "unsupported VOXWARD_ADAPTERS value",
    });
  }

  return checks;
}

function main() {
  const { json, envFile } = parseArgs(process.argv.slice(2));
  const requiredArtifacts = [
    "apps/server/dist/main.js",
    "apps/server/dist/sandbox-main.js",
    "apps/server/dist/bootstrap-owner.js",
    "apps/server/dist/migrations/meta/_journal.json",
    "apps/server/src/db/migrations/meta/_journal.json",
    "apps/web/dist/index.html",
  ];
  const templateFiles = [
    "Dockerfile",
    ".dockerignore",
    "deploy/k3s/README.md",
    "deploy/k3s/production/bootstrap-owner-job.yaml",
    "deploy/k3s/production/configmap.yaml",
    "deploy/k3s/production/deployment.yaml",
    "deploy/k3s/production/ingress.yaml",
    "deploy/k3s/production/kustomization.yaml",
    "deploy/k3s/production/namespace.yaml",
    "deploy/k3s/production/pvc.yaml",
    "deploy/k3s/production/service.yaml",
    "deploy/k3s/sandbox/deployment.yaml",
    "deploy/k3s/sandbox/ingress.yaml",
    "deploy/k3s/sandbox/kustomization.yaml",
    "deploy/k3s/sandbox/namespace.yaml",
    "deploy/k3s/sandbox/service.yaml",
    "deploy/server/server.env.example",
    "deploy/server/voxward.service",
    "deploy/server/Caddyfile.example",
    "deploy/server/README.md",
    "deploy/kiro-runtime/README.md",
    "deploy/kiro-runtime/runtime.env.example",
    "deploy/kiro-runtime/agent.template.json",
    "deploy/kiro-runtime/mcp.json",
  ];

  const checks = [
    ...requiredArtifacts.map(checkExists),
    ...templateFiles.map(checkTemplateHygiene),
    ...checkEnvConfig(process.env, "process"),
  ];

  if (envFile !== undefined) {
    if (!existsSync(envFile)) {
      checks.push({ name: "env:file", ok: false, detail: "env file not found" });
    } else {
      checks.push(...checkEnvConfig(parseEnvFile(envFile), "file"));
    }
  }

  const ok = checks.every((c) => c.ok);
  if (json) {
    process.stdout.write(`${JSON.stringify({ ok, checks }, null, 2)}\n`);
  } else {
    for (const check of checks) {
      process.stdout.write(`[${check.ok ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}\n`);
    }
  }
  if (!ok) process.exit(1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "unexpected error";
  process.stderr.write(`DEPLOY_CHECK_ERROR: ${message}\n`);
  process.exit(1);
}
