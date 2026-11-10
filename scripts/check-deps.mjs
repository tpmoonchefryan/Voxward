#!/usr/bin/env node
// Checks the dependency-direction table in .kiro/specs/voxward-s001-skeleton/design.md, section 2,
// and its db-layer extension in .kiro/specs/voxward-s002-storage/design.md, section 2.
import { readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["packages/contracts/src", "apps/server/src", "apps/web/src"];
const CONTRACTS_PACKAGE = "@voxward/contracts";

// Third-party packages the db zone may import. Any other package is a violation for db files.
const DATABASE_PACKAGES = ["drizzle-orm", "better-sqlite3"];

// Target kinds each source zone may import. Modules are handled separately: same module only.
// The db zone reaches external packages only through DATABASE_PACKAGES, checked in allowed().
const ALLOWED_TARGETS = {
  contracts: ["contracts"],
  adapter: ["contracts", "adapter", "external", "builtin"],
  composition: ["contracts", "module", "adapter", "composition", "db", "external", "builtin"],
  db: ["contracts", "db", "builtin"],
  web: ["web", "contracts", "external"],
};

const IMPORT_PATTERNS = [
  /\b(?:import|export)\b[^;'"`]*?\bfrom\s*["']([^"'\n]+)["']/g,
  /\bimport\s*["']([^"'\n]+)["']/g,
  /\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)/g,
];

function listSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSources(path);
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function zoneOf(absolutePath) {
  // NodeNext sources import "./x.js" for the file "./x.ts" on disk; classify the file that is really there.
  const rel = relative(ROOT, absolutePath).split(sep).join("/").replace(/\.js$/, ".ts");
  if (rel.startsWith("packages/contracts/src/")) return { kind: "contracts", rel };
  if (rel.startsWith("apps/web/src/")) return { kind: "web", rel };
  if (rel === "apps/server/src/modules/registry.ts") return { kind: "composition", rel };
  const moduleMatch = /^apps\/server\/src\/modules\/([^/]+)\//.exec(rel);
  if (moduleMatch !== null) return { kind: "module", name: moduleMatch[1], rel };
  if (rel.startsWith("apps/server/src/adapters/")) return { kind: "adapter", rel };
  if (rel.startsWith("apps/server/src/db/")) return { kind: "db", rel };
  if (rel === "apps/server/src/app.ts" || rel === "apps/server/src/main.ts" || rel.startsWith("apps/server/src/config/")) {
    return { kind: "composition", rel };
  }
  return { kind: "unclassified", rel };
}

function targetOf(specifier, fromFile) {
  if (specifier.startsWith(".")) return zoneOf(resolve(dirname(fromFile), specifier));
  if (specifier === CONTRACTS_PACKAGE) return { kind: "contracts" };
  if (specifier.startsWith("@voxward/")) return { kind: "workspace", name: specifier };
  if (specifier.startsWith("node:") || builtinModules.includes(specifier)) return { kind: "builtin", name: specifier };
  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  return { kind: "external", name: packageName };
}

function allowed(from, target) {
  if (from.kind === "unclassified" || target.kind === "unclassified") return false;
  if (from.kind === "module") {
    return target.kind === "contracts" || (target.kind === "module" && target.name === from.name);
  }
  if (from.kind === "db" && target.kind === "external") {
    return DATABASE_PACKAGES.includes(target.name);
  }
  return (ALLOWED_TARGETS[from.kind] ?? []).includes(target.kind);
}

function describeZone(zone) {
  switch (zone.kind) {
    case "module":
      return `module ${zone.name}`;
    case "external":
      return `package ${zone.name}`;
    case "workspace":
      return `workspace package ${zone.name}`;
    case "builtin":
      return `builtin ${zone.name}`;
    default:
      return zone.kind;
  }
}

// Blank out comments but keep newlines, so line numbers stay correct.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (match, prefix) => prefix + " ".repeat(match.length - prefix.length));
}

function importsIn(source) {
  const found = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      found.push({ specifier: match[1], index: match.index });
    }
  }
  return found;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function main() {
  const violations = [];
  let scanned = 0;

  for (const scanRoot of SCAN_ROOTS) {
    for (const file of listSources(join(ROOT, scanRoot))) {
      scanned += 1;
      const from = zoneOf(file);
      if (from.kind === "unclassified") {
        violations.push(`${from.rel}: not assigned to a zone; classify it in scripts/check-deps.mjs`);
        continue;
      }
      const source = stripComments(readFileSync(file, "utf8"));
      for (const { specifier, index } of importsIn(source)) {
        const target = targetOf(specifier, file);
        if (!allowed(from, target)) {
          violations.push(
            `${from.rel}:${lineOf(source, index)}: ${describeZone(from)} may not import "${specifier}" (${describeZone(target)})`,
          );
        }
      }
    }
  }

  const contractsManifest = JSON.parse(readFileSync(join(ROOT, "packages/contracts/package.json"), "utf8"));
  const runtimeDependencies = Object.keys(contractsManifest.dependencies ?? {});
  if (runtimeDependencies.length > 0) {
    violations.push(`packages/contracts/package.json: runtime dependencies are not allowed (${runtimeDependencies.join(", ")})`);
  }

  if (violations.length > 0) {
    for (const line of violations) console.error(line);
    console.error(`check-deps: ${violations.length} violation(s) across ${scanned} files`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-deps: ok, ${scanned} files checked, 0 violations`);
}

main();
