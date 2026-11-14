import { openDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { BootstrapError, bootstrapOwner } from "./bootstrap.js";

export interface BootstrapCliOptions {
  readonly dbPath: string;
  readonly channelId: string;
  readonly loginName: string;
  readonly displayName: string;
  readonly password: string;
  readonly platformChannelRef?: string;
  readonly channelDisplayName?: string;
}

export function parseBootstrapArgs(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): BootstrapCliOptions {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (!arg.startsWith("--")) {
      throw new Error(`unexpected argument: ${arg}`);
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`missing value for ${arg}`);
    }
    flags.set(arg, next);
    i += 1;
  }

  const dbPath = flags.get("--db") ?? env.VOXWARD_DATABASE_FILE ?? "data/voxward.sqlite3";
  const channelId = flags.get("--channel-id") ?? "default-channel";
  const loginName = flags.get("--login-name") ?? "";
  const displayName = flags.get("--display-name") ?? loginName;
  const passwordEnv = flags.get("--password-env") ?? "VOXWARD_BOOTSTRAP_PASSWORD";
  const password = env[passwordEnv] ?? "";
  const platformChannelRef = flags.get("--platform-channel-ref");
  const channelDisplayName = flags.get("--channel-name");

  if (loginName === "") throw new Error("--login-name is required");
  if (password === "") throw new Error(`password env ${passwordEnv} is empty or unset`);

  return {
    dbPath,
    channelId,
    loginName,
    displayName,
    password,
    platformChannelRef,
    channelDisplayName,
  };
}

export async function runBootstrapCli(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<{ readonly accountId: string; readonly channelId: string }> {
  const options = parseBootstrapArgs(argv, env);
  const database = openDatabase({ filePath: options.dbPath });
  try {
    runMigrations(database);
    const result = await bootstrapOwner(database, {
      channelId: options.channelId,
      platformChannelRef: options.platformChannelRef,
      channelDisplayName: options.channelDisplayName,
      loginName: options.loginName,
      displayName: options.displayName,
      password: options.password,
      now: new Date(),
    });
    return { accountId: result.accountId, channelId: result.channelId };
  } finally {
    database.close();
  }
}

export { BootstrapError };
