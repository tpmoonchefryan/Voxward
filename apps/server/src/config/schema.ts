import { z } from "zod";

/** Adapter sets this build can bind. Supports synthetic (dev/test) and production (live adapters). */
export const ADAPTER_SETS = ["synthetic", "production"] as const;

/** Explicit list of configuration keys. `.strict()` rejects any key outside it. */
export const MIN_KIRO_TIMEOUT_MS = 1_000;
export const MAX_KIRO_TIMEOUT_MS = 300_000;

export const serverConfigSchema = z
  .object({
    host: z.string().min(1).default("127.0.0.1"),
    port: z.number().int().min(1).max(65535).default(3000),
    adapters: z.enum(ADAPTER_SETS),
    /** SQLite file. The default serves development only; deployments point it at a local persistent volume. */
    databaseFile: z.string().min(1).default("data/voxward.sqlite3"),
    /** Q37: Upper-bounded Kiro inference timeout in milliseconds. */
    kiroTimeoutMs: z.number().int().min(MIN_KIRO_TIMEOUT_MS).max(MAX_KIRO_TIMEOUT_MS).optional(),
    /** Optional path to kiro-cli binary for production adapter set. */
    kiroCommand: z.string().min(1).optional(),
    /** Optional isolated runtime root directory for Kiro CLI one-time sessions. */
    kiroRuntimeRoot: z.string().min(1).optional(),
    /** Optional max batch size for Kiro CLI runs. */
    kiroMaxItems: z.number().int().min(1).max(100).optional(),
    /** Optional 32-byte hex key or seed material for sealing persisted credential vault secrets. */
    vaultKey: z.string().min(16).optional(),
  })
  .strict();

export type ServerConfig = z.infer<typeof serverConfigSchema>;
