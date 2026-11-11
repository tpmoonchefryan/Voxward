import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { removeDirectory, scratchDirectory } from "./helpers.js";

const MIGRATIONS = fileURLToPath(new URL("../../src/db/migrations/", import.meta.url));
const LAST_BEFORE_REBUILD = 3;

/**
 * Copies the migrations up to 0003 into a folder of their own. The journal lists only those entries, so the migrator
 * stops before the rebuild in 0004. Reading the real files keeps the test honest about what ships.
 */
function migrationsBeforeRebuild(directory: string): string {
  const folder = join(directory, "migrations-0003");
  mkdirSync(join(folder, "meta"), { recursive: true });
  for (const file of readdirSync(MIGRATIONS)) {
    if (file.endsWith(".sql") && Number(file.slice(0, 4)) <= LAST_BEFORE_REBUILD) {
      copyFileSync(join(MIGRATIONS, file), join(folder, file));
    }
  }
  const journal = JSON.parse(readFileSync(join(MIGRATIONS, "meta", "_journal.json"), "utf8")) as {
    entries: { idx: number }[];
  };
  journal.entries = journal.entries.filter((entry) => entry.idx <= LAST_BEFORE_REBUILD);
  writeFileSync(join(folder, "meta", "_journal.json"), JSON.stringify(journal, null, 2));
  return folder;
}

describe("migration 0004 rebuilds data_requests without losing rows", () => {
  let directory: string | undefined;
  let database: VoxwardDatabase | undefined;

  afterEach(() => {
    database?.close();
    if (directory !== undefined) removeDirectory(directory);
    database = undefined;
    directory = undefined;
  });

  it("keeps an existing deletion request and its target, marks the request DELETE, and keeps references valid", () => {
    directory = scratchDirectory("migration-0004-");
    database = openDatabase({ filePath: join(directory, "voxward.sqlite3") });
    runMigrations(database, migrationsBeforeRebuild(directory));

    // Rows written in the 0003 shape, which has no request_kind or verification_method column.
    database.sqlite
      .prepare("INSERT INTO channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run("channel-1", "youtube", "UC-1", "channel 1", "2026-11-10T10:00:00.000Z", "2026-11-10T10:00:00.000Z");
    database.sqlite
      .prepare("INSERT INTO subjects (id, channel_id, platform_subject_key, processing_generation, created_at) VALUES (?, ?, ?, 0, ?)")
      .run("subject-1", "channel-1", "key-1", "2026-11-10T10:00:00.000Z");
    database.sqlite
      .prepare(
        "INSERT INTO data_requests (id, channel_id, subject_id, request_source, verification_state, mode, execution_state, scope_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "req-1",
        "channel-1",
        "subject-1",
        "OPERATOR_INITIATED",
        "PENDING",
        "DELETE_AND_EXCEPT",
        "PENDING",
        "{}",
        "2026-11-10T10:00:00.000Z",
        "2026-11-10T10:00:00.000Z",
      );
    database.sqlite
      .prepare("INSERT INTO data_request_items (id, request_id, target_kind, target_ref, item_state) VALUES (?, ?, ?, ?, ?)")
      .run("item-1", "req-1", "SUBJECT", "subject-1", "PENDING");

    runMigrations(database);

    const row = database.sqlite
      .prepare("SELECT id, channel_id, subject_id, request_kind, mode, verification_method FROM data_requests")
      .all() as Record<string, unknown>[];
    expect(row).toEqual([
      {
        id: "req-1",
        channel_id: "channel-1",
        subject_id: "subject-1",
        request_kind: "DELETE",
        mode: "DELETE_AND_EXCEPT",
        verification_method: null,
      },
    ]);
    const items = database.sqlite.prepare("SELECT id, request_id FROM data_request_items").all();
    expect(items).toEqual([{ id: "item-1", request_id: "req-1" }]);
    expect(database.sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    const itemForeignKey = database.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'data_request_items'")
      .get() as { sql: string };
    expect(itemForeignKey.sql).toContain("REFERENCES `data_requests`");
  });

  it("after the upgrade, a non-delete request carries no mode, and a mode on it is refused", () => {
    directory = scratchDirectory("migration-0004-check-");
    database = openDatabase({ filePath: join(directory, "voxward.sqlite3") });
    runMigrations(database);
    database.sqlite
      .prepare("INSERT INTO channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run("channel-1", "youtube", "UC-1", "channel 1", "2026-11-10T10:00:00.000Z", "2026-11-10T10:00:00.000Z");
    database.sqlite
      .prepare("INSERT INTO subjects (id, channel_id, platform_subject_key, processing_generation, created_at) VALUES (?, ?, ?, 0, ?)")
      .run("subject-1", "channel-1", "key-1", "2026-11-10T10:00:00.000Z");
    const insert = database.sqlite.prepare(
      "INSERT INTO data_requests (id, channel_id, subject_id, request_kind, request_source, verification_state, verification_method, mode, execution_state, scope_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const at = "2026-11-10T10:00:00.000Z";
    expect(() =>
      insert.run("req-ok", "channel-1", "subject-1", "ACCESS", "VIEWER_REQUEST", "PENDING", null, null, "PENDING", "{}", at, at),
    ).not.toThrow();
    expect(() =>
      insert.run("req-bad", "channel-1", "subject-1", "ACCESS", "VIEWER_REQUEST", "PENDING", null, "DELETE_DATA_ONLY", "PENDING", "{}", at, at),
    ).toThrow();
    expect(() =>
      insert.run("req-unverified", "channel-1", "subject-1", "DELETE", "VIEWER_REQUEST", "VERIFIED", null, "DELETE_DATA_ONLY", "PENDING", "{}", at, at),
    ).toThrow();
  });
});
