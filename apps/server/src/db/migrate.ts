import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { VoxwardDatabase } from "./client.js";

/** The drizzle-kit output that ships with the source tree. */
export const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));

/**
 * Applies every migration not yet recorded in `__drizzle_migrations`. Recorded migrations are skipped, so
 * running this again on an up-to-date database changes nothing. Migrations only move forward.
 */
export function runMigrations(database: VoxwardDatabase, migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER): void {
  migrate(database.orm, { migrationsFolder });
}
