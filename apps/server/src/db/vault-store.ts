import { eq, like } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { deploymentSettings } from "./schema/index.js";

const VAULT_PREFIX = "__vault:";

export interface StoredSealedVaultRecord {
  readonly ref: string;
  readonly purpose: "PLATFORM_OAUTH" | "PLATFORM_PROJECT_KEY" | "MODEL_ACCESS" | "OUTPUT_GRANT";
  readonly createdAt: string;
  readonly ivHex: string;
  readonly tagHex: string;
  readonly ciphertextHex: string;
}

export interface SqliteVaultBackingStore {
  get(ref: string): StoredSealedVaultRecord | undefined;
  put(record: StoredSealedVaultRecord): void;
  delete(ref: string): boolean;
  list(): readonly StoredSealedVaultRecord[];
}

/**
 * SQLite persistence backing store for AES-256-GCM sealed credentials.
 * Only sealed ciphertext envelopes are written to `deployment_settings` under `__vault:<ref>`.
 */
export function createSqliteVaultBackingStore(database: VoxwardDatabase): SqliteVaultBackingStore {
  return {
    get(ref) {
      const row = database.orm
        .select({ valueJson: deploymentSettings.valueJson })
        .from(deploymentSettings)
        .where(eq(deploymentSettings.key, `${VAULT_PREFIX}${ref}`))
        .get();
      if (row === undefined) return undefined;
      try {
        return JSON.parse(row.valueJson) as StoredSealedVaultRecord;
      } catch {
        return undefined;
      }
    },

    put(record) {
      const key = `${VAULT_PREFIX}${record.ref}`;
      const valueJson = JSON.stringify(record);
      database.orm
        .insert(deploymentSettings)
        .values({
          key,
          valueJson,
          updatedAt: record.createdAt,
        })
        .onConflictDoUpdate({
          target: deploymentSettings.key,
          set: { valueJson, updatedAt: record.createdAt },
        })
        .run();
    },

    delete(ref) {
      const result = database.orm
        .delete(deploymentSettings)
        .where(eq(deploymentSettings.key, `${VAULT_PREFIX}${ref}`))
        .run();
      return result.changes > 0;
    },

    list() {
      const rows = database.orm
        .select({ valueJson: deploymentSettings.valueJson })
        .from(deploymentSettings)
        .where(like(deploymentSettings.key, `${VAULT_PREFIX}%`))
        .all();
      const out: StoredSealedVaultRecord[] = [];
      for (const row of rows) {
        try {
          out.push(JSON.parse(row.valueJson) as StoredSealedVaultRecord);
        } catch {
          // Skip malformed entries.
        }
      }
      return out;
    },
  };
}
