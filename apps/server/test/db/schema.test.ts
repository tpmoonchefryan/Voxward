import { readdirSync, readFileSync } from "node:fs";
import { TASK_STATUSES } from "@voxward/contracts";
import { is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";

const DICTIONARY_PATH = new URL("../../../../docs/data-dictionary.md", import.meta.url);
const MIGRATIONS_DIRECTORY = new URL("../../src/db/migrations/", import.meta.url);

const dictionary = parseDictionary(readFileSync(DICTIONARY_PATH, "utf8"));
const migrationSql = readdirSync(MIGRATIONS_DIRECTORY)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, MIGRATIONS_DIRECTORY), "utf8"))
  .join("\n");

// The schema module also exports enumeration arrays, so keep only the table objects.
const tables = Object.values(schema as Record<string, unknown>).filter((value): value is SQLiteTable =>
  is(value, SQLiteTable),
);
const configs = new Map(tables.map((table) => {
  const config = getTableConfig(table);
  return [config.name, config] as const;
}));

interface DictionaryTable {
  readonly columns: Map<string, { readonly nullable: boolean }>;
  readonly constraints: Set<string>;
}

/** Reads the tables in docs/data-dictionary.md: `### \`name\`` headings, then column and constraint rows. */
function parseDictionary(markdown: string): Map<string, DictionaryTable> {
  const parsed = new Map<string, DictionaryTable>();
  let current: DictionaryTable | undefined;
  let section: "columns" | "constraints" | undefined;

  for (const line of markdown.split("\n")) {
    const heading = /^### `([a-z_]+)`$/.exec(line);
    if (heading !== null) {
      current = { columns: new Map(), constraints: new Set() };
      parsed.set(heading[1] ?? "", current);
      section = undefined;
      continue;
    }
    if (line.startsWith("## ")) {
      current = undefined;
      section = undefined;
      continue;
    }
    if (line === "#### 列") section = "columns";
    if (line === "#### 索引与约束") section = "constraints";

    const row = /^\| `([a-z_0-9]+)` \|/.exec(line);
    if (row === null || current === undefined || section === undefined) continue;
    const name = row[1] ?? "";
    if (section === "columns") {
      const cells = line.split("|").map((cell) => cell.trim());
      current.columns.set(name, { nullable: cells[3] === "是" });
    } else {
      current.constraints.add(name);
    }
  }
  return parsed;
}

function constraintNames(name: string): string[] {
  const config = configs.get(name);
  if (config === undefined) throw new Error(`no table ${name}`);
  return [...config.indexes.map((index) => index.config.name), ...config.checks.map((check) => check.name)];
}

describe("data dictionary matches the schema", () => {
  it("documents exactly the 27 schema tables", () => {
    expect(tables).toHaveLength(27);
    expect([...dictionary.keys()].sort()).toEqual([...configs.keys()].sort());
  });

  for (const [name, config] of configs) {
    it(`documents every column and constraint of ${name}`, () => {
      const documented = dictionary.get(name);
      expect(documented).toBeDefined();
      if (documented === undefined) return;

      expect([...documented.columns.keys()].sort()).toEqual(config.columns.map((column) => column.name).sort());
      for (const column of config.columns) {
        expect(documented.columns.get(column.name)?.nullable, column.name).toBe(!column.notNull);
      }
      expect([...documented.constraints].sort()).toEqual(constraintNames(name).sort());
    });
  }
});

describe("generated migration matches the schema", () => {
  it("creates every schema table and every named index and CHECK", () => {
    // Replay the statements in order. A table that a migration drops and creates again (a rebuild, migration 0004)
    // survives. A table dropped and never created again must not stay in the schema (S006 Q8).
    const events = [...migrationSql.matchAll(/^(CREATE TABLE|DROP TABLE) `([a-z_]+)`/gm)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    );
    const surviving = new Set<string>();
    for (const [kind, name] of events) {
      if (kind === "CREATE TABLE") surviving.add(name);
      else surviving.delete(name);
    }
    expect([...surviving].sort()).toEqual([...configs.keys()].sort());
    // Dropped on purpose: the old nickname-checks table, and the rebuild of data_requests (migration 0004) with its
    // temporary copy.
    // Migration 0006 (S019) rebuilds data_request_items and data_requests with a temporary copy of each, so the new
    // CHECK values (RESUME_SCORING, SCORE_OUTCOME, CANDIDATE_CARD, CACHE) take effect.
    expect(events.filter(([kind]) => kind === "DROP TABLE").map(([, name]) => name)).toEqual([
      "subject_nickname_checks",
      "data_requests",
      "data_requests_copy",
      "data_request_items",
      "data_request_items_copy",
      "data_requests",
      "data_requests_copy",
    ]);

    for (const name of configs.keys()) {
      for (const constraint of constraintNames(name)) {
        const present =
          migrationSql.includes(`INDEX \`${constraint}\``) || migrationSql.includes(`CONSTRAINT "${constraint}"`);
        expect(present, constraint).toBe(true);
      }
    }
  });

  it("writes the task status values from the contracts package into a CHECK", () => {
    for (const status of TASK_STATUSES) {
      expect(migrationSql).toContain(`'${status}'`);
    }
  });
});

/**
 * Digest columns hold a one-way scrypt or SHA-256 value, never the plaintext. They are the only auth-table columns
 * whose names match the credential pattern below. Any other match is still a failure.
 */
const DIGEST_COLUMNS = new Set([
  "auth_accounts.password_hash",
  "auth_sessions.token_hash",
  "auth_output_tokens.token_hash",
]);

describe("sensitive data placement", () => {
  it("has no plaintext credential column; secret_ref is the only reference", () => {
    const suspicious = /token|password|passwd|api_?key|secret/i;
    const offenders = [...configs].flatMap(([name, config]) =>
      config.columns.filter((column) => suspicious.test(column.name) && column.name !== "secret_ref" && !DIGEST_COLUMNS.has(`${name}.${column.name}`)).map((column) => `${name}.${column.name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("stores message text only in technical_log_evidence", () => {
    const payloadTables = [...configs]
      .filter(([, config]) => config.columns.some((column) => column.name === "payload"))
      .map(([name]) => name);
    expect(payloadTables).toEqual(["technical_log_evidence"]);

    const bodyLike = /^(body|text|content|message|nickname|raw)$/;
    const offenders = [...configs].flatMap(([name, config]) =>
      config.columns.filter((column) => bodyLike.test(column.name)).map((column) => `${name}.${column.name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the channel event reference free of message text", () => {
    const columns = configs.get("channel_events")?.columns.map((column) => column.name) ?? [];
    expect(columns).not.toContain("body");
    expect(columns).not.toContain("payload");
  });
});
