import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, type VoxwardDatabase } from "../../src/db/client.js";
import { SubjectStore } from "../../src/db/repository.js";
import { runMigrations } from "../../src/db/migrate.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { channels } from "../../src/db/schema/index.js";

export const T0 = "2026-11-10T10:00:00.000Z";

const SERVER_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Test databases live in $KIROCREW_SCRATCH when it is set, otherwise in the git-ignored apps/server/.tmp. */
export function scratchDirectory(prefix: string): string {
  const base = process.env.KIROCREW_SCRATCH ?? join(SERVER_ROOT, ".tmp");
  mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, prefix));
}

export function removeDirectory(directory: string): void {
  rmSync(directory, { recursive: true, force: true });
}

export function migratedDatabase(directory: string, fileName = "voxward.sqlite3"): VoxwardDatabase {
  const database = openDatabase({ filePath: join(directory, fileName) });
  runMigrations(database);
  return database;
}

export interface Seed {
  readonly channelId: string;
  readonly subjectId: string;
}

/** Writes one channel and one subject with a zero score, in their own committed transaction. */
export function seedChannelAndSubject(database: VoxwardDatabase, suffix = "1"): Seed {
  const seed = { channelId: `channel-${suffix}`, subjectId: `subject-${suffix}` };
  runShortTransaction(database, (tx) => {
    tx.insert(channels)
      .values({
        id: seed.channelId,
        platform: "youtube",
        platformChannelRef: `UC-${suffix}`,
        displayName: `channel ${suffix}`,
        createdAt: T0,
        updatedAt: T0,
      })
      .run();
    SubjectStore.create(tx, {
      id: seed.subjectId,
      channelId: seed.channelId,
      platformSubjectKey: `subject-key-${suffix}`,
      createdAt: T0,
    });
  });
  return seed;
}

export function countRows(database: VoxwardDatabase, table: string): number {
  const row = database.sqlite.prepare(`select count(*) as n from ${table}`).get() as { n: number };
  return row.n;
}
