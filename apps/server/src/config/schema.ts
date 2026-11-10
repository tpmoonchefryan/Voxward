import { z } from "zod";

/** Adapter sets this build can bind. S001 provides only the synthetic set. */
export const ADAPTER_SETS = ["synthetic"] as const;

/** Explicit list of configuration keys. `.strict()` rejects any key outside it. */
export const serverConfigSchema = z
  .object({
    host: z.string().min(1).default("127.0.0.1"),
    port: z.number().int().min(1).max(65535).default(3000),
    adapters: z.enum(ADAPTER_SETS),
    /** SQLite file. The default serves development only; deployments point it at a local persistent volume. */
    databaseFile: z.string().min(1).default("data/voxward.sqlite3"),
  })
  .strict();

export type ServerConfig = z.infer<typeof serverConfigSchema>;
