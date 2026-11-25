import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { runMigrations, DEFAULT_MIGRATIONS_FOLDER } from "../../src/db/migrate.js";
import { seedChannelAndSubject, countRows, migratedDatabase, removeDirectory, scratchDirectory, T0 } from "./helpers.js";

const SCHEMA_TABLE_COUNT = 29;

/** Number of migrations in the journal. Read from the journal so a new migration does not break this test. */
const JOURNAL_ENTRIES: readonly { readonly tag: string }[] = JSON.parse(
  readFileSync(join(DEFAULT_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
).entries;
const MIGRATION_COUNT = JOURNAL_ENTRIES.length;

describe("migrations", () => {
  let directory: string;
  let database: VoxwardDatabase | undefined;

  beforeEach(() => {
    directory = scratchDirectory("migrate-");
  });

  afterEach(() => {
    database?.close();
    database = undefined;
    removeDirectory(directory);
  });

  it("creates all 29 schema tables on an empty file", () => {
    database = migratedDatabase(directory);
    const names = database.sqlite
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name <> '__drizzle_migrations' order by name")
      .all() as Array<{ name: string }>;
    expect(names).toHaveLength(SCHEMA_TABLE_COUNT);
  });

  it("records each migration once and changes nothing when run again", () => {
    database = migratedDatabase(directory);
    const seed = seedChannelAndSubject(database);
    const before = countRows(database, "channels");

    runMigrations(database);
    runMigrations(database);

    expect(countRows(database, "__drizzle_migrations")).toBe(MIGRATION_COUNT);
    expect(countRows(database, "channels")).toBe(before);
    expect(seed.channelId).toBe("channel-1");
  });

  it("keeps committed data across a close and reopen, as after a service restart", () => {
    const filePath = join(directory, "restart.sqlite3");
    const first = openDatabase({ filePath });
    runMigrations(first);
    seedChannelAndSubject(first);
    first.close();

    database = openDatabase({ filePath });
    runMigrations(database);

    expect(countRows(database, "channels")).toBe(1);
    expect(countRows(database, "subjects")).toBe(1);
    expect(countRows(database, "__drizzle_migrations")).toBe(MIGRATION_COUNT);
  });

  it("keeps existing evidence rows when the audit-log fields migration runs on a database that already has logs", () => {
    // Apply only the migrations before 0002, write a log with evidence, then apply the rest.
    const earlier = join(directory, "earlier");
    mkdirSync(join(earlier, "meta"), { recursive: true });
    const earlierEntries = JOURNAL_ENTRIES.slice(0, JOURNAL_ENTRIES.findIndex((entry) => entry.tag.startsWith("0002_")));
    for (const entry of earlierEntries) copyFileSync(join(DEFAULT_MIGRATIONS_FOLDER, `${entry.tag}.sql`), join(earlier, `${entry.tag}.sql`));
    writeFileSync(join(earlier, "meta", "_journal.json"), JSON.stringify({ ...journalHeader(), entries: earlierEntries.map((entry, idx) => ({ ...entry, idx })) }));

    database = openDatabase({ filePath: join(directory, "upgrade.sqlite3") });
    runMigrations(database, earlier);
    const seed = seedChannelAndSubject(database);
    database.sqlite
      .prepare("insert into technical_logs (id, channel_id, correlation_id, sequence, stage, status, created_at, expires_at) values ('log-old', ?, 'corr-old', 0, 'INGEST', 'OK', ?, ?)")
      .run(seed.channelId, T0, T0);
    database.sqlite
      .prepare("insert into technical_log_evidence (id, log_id, evidence_kind, payload, payload_bytes, expires_at) values ('ev-old', 'log-old', 'MESSAGE_TEXT', 'hello', 5, ?)")
      .run(T0);

    runMigrations(database);

    expect(countRows(database, "technical_log_evidence")).toBe(1);
    const row = database.sqlite.prepare("select level, task_id, attempt, data_json from technical_logs where id = 'log-old'").get() as {
      level: string;
      task_id: string | null;
      attempt: number | null;
      data_json: string | null;
    };
    expect(row).toEqual({ level: "INFO", task_id: null, attempt: null, data_json: null });
  });

  it("upgrades a database made by the migrations up to 0002, keeps its rows, and removes the nickname check table (S006 Q8)", () => {
    const earlier = join(directory, "earlier-migrations");
    mkdirSync(join(earlier, "meta"), { recursive: true });
    // The old database stops at 0002_audit_log_fields. 0003_drop_subject_nickname_checks is the migration under test.
    const earlierTags = ["0000_initial", "0001_auth_sessions", "0002_audit_log_fields"];
    for (const tag of earlierTags) {
      copyFileSync(join(DEFAULT_MIGRATIONS_FOLDER, `${tag}.sql`), join(earlier, `${tag}.sql`));
    }
    const journal = JSON.parse(readFileSync(join(DEFAULT_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as {
      entries: unknown[];
    };
    writeFileSync(join(earlier, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, earlierTags.length) }));

    const filePath = join(directory, "upgrade.sqlite3");
    const before = openDatabase({ filePath });
    runMigrations(before, earlier);
    seedChannelAndSubject(before);
    expect(tableExists(before, "subject_nickname_checks")).toBe(true);
    before.close();

    database = openDatabase({ filePath });
    runMigrations(database);

    expect(tableExists(database, "subject_nickname_checks")).toBe(false);
    expect(countRows(database, "channels")).toBe(1);
    expect(countRows(database, "subjects")).toBe(1);
    expect(countRows(database, "__drizzle_migrations")).toBe(MIGRATION_COUNT);
  });
});

function journalHeader(): { version: string; dialect: string } {
  const journal = JSON.parse(readFileSync(join(DEFAULT_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as {
    version: string;
    dialect: string;
  };
  return { version: journal.version, dialect: journal.dialect };
}

function tableExists(database: VoxwardDatabase, name: string): boolean {
  const row = database.sqlite.prepare("select count(*) as n from sqlite_master where type = 'table' and name = ?").get(name);
  return (row as { n: number }).n === 1;
}
