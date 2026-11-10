import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { seedChannelAndSubject, countRows, migratedDatabase, removeDirectory, scratchDirectory } from "./helpers.js";

const SCHEMA_TABLE_COUNT = 27;

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

  it("creates all 27 schema tables on an empty file", () => {
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

    expect(countRows(database, "__drizzle_migrations")).toBe(2);
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
    expect(countRows(database, "__drizzle_migrations")).toBe(2);
  });
});
