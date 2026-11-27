#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  let root = DEFAULT_ROOT;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--env-file") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--env-file requires a path");
      }
      envFile = value;
      i += 1;
    } else if (arg === "--root") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--root requires a path");
      }
      root = resolve(value);
      i += 1;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return { json, envFile: envFile === undefined ? undefined : resolve(root, envFile), root };
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

function checkExists(root, relPath) {
  const abs = resolve(root, relPath);
  const ok = existsSync(abs);
  return { name: `exists:${relPath}`, ok, detail: ok ? "present" : "missing" };
}

function checkTemplateHygiene(root, relPath) {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) {
    return { name: `hygiene:${relPath}`, ok: false, detail: "missing" };
  }
  const content = readFileSync(abs, "utf8");
  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (content.includes(forbidden)) {
      return { name: `hygiene:${relPath}`, ok: false, detail: "contains forbidden local path token" };
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
    const ok = adaptersRaw === "synthetic" || adaptersRaw === "production";
    checks.push({
      name: `env:${sourceLabel}:adapters`,
      ok,
      detail: ok ? "supported adapter set" : "unsupported VOXWARD_ADAPTERS value",
    });
  }

  return checks;
}

function checkSupplyChainPinning(root) {
  const checks = [];
  const provPath = resolve(root, "deploy/provenance.json");
  if (!existsSync(provPath)) {
    return [{ name: "supply-chain:provenance", ok: false, detail: "deploy/provenance.json missing" }];
  }
  let provenance;
  try {
    provenance = JSON.parse(readFileSync(provPath, "utf8"));
  } catch {
    return [{ name: "supply-chain:provenance", ok: false, detail: "deploy/provenance.json invalid JSON" }];
  }

  // 1. Dockerfile base images & pnpm tarball SHA-256 verification
  const dockerfilePath = resolve(root, "Dockerfile");
  if (!existsSync(dockerfilePath)) {
    checks.push({ name: "supply-chain:dockerfile", ok: false, detail: "Dockerfile missing" });
  } else {
    const dockerfile = readFileSync(dockerfilePath, "utf8");
    const fromLines = dockerfile
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("FROM "));
    const aliases = new Set(["base", "builder", "prod-deps"]);
    const externalFroms = fromLines.filter((line) => {
      const target = line.slice(5).trim().split(/\s+/)[0] ?? "";
      return !aliases.has(target);
    });
    const pinnedBase = typeof provenance.baseImage === "string" ? provenance.baseImage : "";
    const allFromsPinned =
      externalFroms.length > 0 &&
      externalFroms.every((line) => {
        const target = line.slice(5).trim().split(/\s+/)[0] ?? "";
        return /@sha256:[0-9a-f]{64}$/.test(target) && (pinnedBase === "" || target === pinnedBase);
      });
    checks.push({
      name: "supply-chain:dockerfile-base-digest",
      ok: allFromsPinned,
      detail: allFromsPinned
        ? `pinned (${externalFroms.length} external FROM stages)`
        : "Dockerfile FROM must pin @sha256:<64-hex> matching deploy/provenance.json",
    });

    const pnpmSha = typeof provenance.pnpmTarballSha256 === "string" ? provenance.pnpmTarballSha256 : "";
    const pnpmPinned =
      /^[0-9a-f]{64}$/.test(pnpmSha) &&
      dockerfile.includes(`PNPM_TARBALL_SHA256=${pnpmSha}`) &&
      dockerfile.includes("createHash(\"sha256\")");
    checks.push({
      name: "supply-chain:dockerfile-pnpm-sha256",
      ok: pnpmPinned,
      detail: pnpmPinned
        ? `pnpm tarball SHA-256 pinned (${pnpmSha.slice(0, 12)}...)`
        : "Dockerfile must verify pnpm tarball against PNPM_TARBALL_SHA256 in deploy/provenance.json",
    });
  }

  // 2. GitHub Actions CI commit SHA pinning + permissions + Node 24
  const ciPath = resolve(root, ".github/workflows/ci.yml");
  if (!existsSync(ciPath)) {
    checks.push({ name: "supply-chain:ci", ok: false, detail: ".github/workflows/ci.yml missing" });
  } else {
    const ci = readFileSync(ciPath, "utf8");
    const usesMatches = [...ci.matchAll(/\buses:\s*([^\s#]+)/g)].map((m) => m[1]);
    const allUsesPinned =
      usesMatches.length > 0 &&
      usesMatches.every((ref) => {
        const atIdx = ref.indexOf("@");
        if (atIdx <= 0) return false;
        const repo = ref.slice(0, atIdx);
        const sha = ref.slice(atIdx + 1);
        const expectedSha = provenance.githubActions?.[repo];
        return /^[0-9a-f]{40}$/.test(sha) && (expectedSha === undefined || expectedSha === sha);
      });
    checks.push({
      name: "supply-chain:ci-actions-sha",
      ok: allUsesPinned,
      detail: allUsesPinned
        ? `all ${usesMatches.length} GitHub Actions pinned to 40-hex commit SHA`
        : "CI uses: entries must pin immutable 40-hex commit SHAs matching deploy/provenance.json",
    });

    const expectedNode = String(provenance.ciNodeVersion ?? "24");
    const hasPermissions = /^\s*permissions:/m.test(ci);
    const hasNode24 = ci.includes(`node-version: "${expectedNode}"`) || ci.includes(`node-version: '${expectedNode}'`);
    checks.push({
      name: "supply-chain:ci-node-and-perms",
      ok: hasPermissions && hasNode24,
      detail:
        hasPermissions && hasNode24
          ? `permissions set, node-version=${expectedNode}`
          : `CI must declare permissions and node-version: "${expectedNode}"`,
    });
  }

  // 3. k3s workload manifests image digest pinning & provenance parity
  const expectedRepo = provenance.appImage?.repository ?? "";
  const expectedDigest = provenance.appImage?.digest ?? "";
  const expectedImage = `${expectedRepo}@${expectedDigest}`;
  const manifests = Array.isArray(provenance.appImage?.manifests)
    ? provenance.appImage.manifests
    : [
        "deploy/k3s/production/deployment.yaml",
        "deploy/k3s/production/bootstrap-owner-job.yaml",
        "deploy/k3s/sandbox/deployment.yaml",
      ];
  const validDigestSyntax = /^sha256:[0-9a-f]{64}$/.test(expectedDigest);
  for (const rel of manifests) {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      checks.push({ name: `supply-chain:k3s:${rel}`, ok: false, detail: "manifest missing" });
      continue;
    }
    const yaml = readFileSync(abs, "utf8");
    const images = [...yaml.matchAll(/^\s*image:\s*([^\s#]+)/gm)].map((m) => m[1]);
    const ok =
      validDigestSyntax &&
      images.length > 0 &&
      images.every((img) => /@sha256:[0-9a-f]{64}$/.test(img) && img === expectedImage);
    checks.push({
      name: `supply-chain:k3s:${rel}`,
      ok,
      detail: ok
        ? `image pinned to ${expectedDigest.slice(0, 19)}...`
        : `k3s manifest image must match ${expectedImage} with @sha256:<64-hex>`,
    });
  }

  return checks;
}

export function runDeployChecks({ root = DEFAULT_ROOT, envFile, processEnv = process.env } = {}) {
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
    ".github/workflows/ci.yml",
    "deploy/provenance.json",
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
    ...requiredArtifacts.map((p) => checkExists(root, p)),
    ...templateFiles.map((p) => checkTemplateHygiene(root, p)),
    ...checkSupplyChainPinning(root),
    ...checkEnvConfig(processEnv, "process"),
  ];

  if (envFile !== undefined) {
    if (!existsSync(envFile)) {
      checks.push({ name: "env:file", ok: false, detail: "env file not found" });
    } else {
      checks.push(...checkEnvConfig(parseEnvFile(envFile), "file"));
    }
  }

  return { ok: checks.every((c) => c.ok), checks };
}

function main() {
  const { json, envFile, root } = parseArgs(process.argv.slice(2));
  const { ok, checks } = runDeployChecks({ root, envFile });
  if (json) {
    process.stdout.write(`${JSON.stringify({ ok, checks }, null, 2)}\n`);
  } else {
    for (const check of checks) {
      process.stdout.write(`[${check.ok ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}\n`);
    }
  }
  if (!ok) process.exit(1);
}

const isEntrypoint =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isEntrypoint) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected error";
    process.stderr.write(`DEPLOY_CHECK_ERROR: ${message}\n`);
    process.exit(1);
  }
}
