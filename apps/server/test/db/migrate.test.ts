import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { DEFAULT_MIGRATIONS_FOLDER, runMigrations } from "../../src/db/migrate.js";
import { seedChannelAndSubject, countRows, migratedDatabase, removeDirectory, scratchDirectory } from "./helpers.js";

const SCHEMA_TABLE_COUNT = 26;

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

  it("creates all 26 schema tables on an empty file", () => {
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

    expect(countRows(database, "__drizzle_migrations")).toBe(3);
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
    expect(countRows(database, "__drizzle_migrations")).toBe(3);
  });

  it("upgrades a database made by the earlier migrations, keeps its rows, and removes the nickname check table (S006 Q8)", () => {
    const earlier = join(directory, "earlier-migrations");
    mkdirSync(join(earlier, "meta"), { recursive: true });
    for (const tag of ["0000_initial", "0001_auth_sessions"]) {
      copyFileSync(join(DEFAULT_MIGRATIONS_FOLDER, `${tag}.sql`), join(earlier, `${tag}.sql`));
    }
    const journal = JSON.parse(readFileSync(join(DEFAULT_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as {
      entries: unknown[];
    };
    writeFileSync(join(earlier, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 2) }));

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
    expect(countRows(database, "__drizzle_migrations")).toBe(3);
  });
});

function tableExists(database: VoxwardDatabase, name: string): boolean {
  const row = database.sqlite.prepare("select count(*) as n from sqlite_master where type = 'table' and name = ?").get(name);
  return (row as { n: number }).n === 1;
}
