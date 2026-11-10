import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import { createSession, DEFAULT_SESSION_TTL_MS, type IssuedSession } from "./session.js";

/** Self-decided: the brief names no password policy. */
export const MIN_PASSWORD_LENGTH = 12;
const LOGIN_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

// Parameters are fixed in code. A stored hash made with other parameters does not verify.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const HASH_SCHEME = "scrypt";

export type AccountInputErrorCode = "INVALID_LOGIN_NAME" | "WEAK_PASSWORD" | "LOGIN_NAME_TAKEN";

export class AccountInputError extends Error {
  readonly code: AccountInputErrorCode;

  constructor(code: AccountInputErrorCode) {
    super(code);
    this.name = "AccountInputError";
    this.code = code;
  }
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 };
    scryptCallback(password, salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  return [HASH_SCHEME, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText, ...rest] = stored.split("$");
  if (scheme !== HASH_SCHEME || saltText === undefined || keyText === undefined || rest.length > 0) return false;
  const expected = Buffer.from(keyText, "base64");
  const actual = await deriveKey(password, Buffer.from(saltText, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

let unknownAccountHash: Promise<string> | undefined;

/** Hashes a fixed placeholder once. Unknown logins compare against it, so their timing resembles a real check. */
function placeholderHash(): Promise<string> {
  unknownAccountHash ??= hashPassword("unknown-account-placeholder");
  return unknownAccountHash;
}

function sqliteErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code.startsWith("SQLITE_")) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export interface NewAccount {
  readonly loginName: string;
  readonly displayName: string;
  readonly password: string;
  readonly now: Date;
}

/** Creates a page account. The brief names no creation entry point, so this function is the only one. */
export async function createAccount(database: VoxwardDatabase, input: NewAccount): Promise<{ readonly accountId: string }> {
  if (!LOGIN_NAME_PATTERN.test(input.loginName)) throw new AccountInputError("INVALID_LOGIN_NAME");
  if (input.password.length < MIN_PASSWORD_LENGTH) throw new AccountInputError("WEAK_PASSWORD");
  const passwordHash = await hashPassword(input.password);
  const accountId = randomUUID();
  try {
    runShortTransaction(database, (tx) => {
      tx.insert(authAccounts)
        .values({
          id: accountId,
          loginName: input.loginName,
          displayName: input.displayName,
          passwordHash,
          createdAt: input.now.toISOString(),
        })
        .run();
    });
  } catch (error) {
    if (sqliteErrorCode(error) === "SQLITE_CONSTRAINT_UNIQUE") throw new AccountInputError("LOGIN_NAME_TAKEN");
    throw error;
  }
  return { accountId };
}

export type LoginResult =
  | { readonly ok: true; readonly accountId: string; readonly displayName: string; readonly session: IssuedSession }
  | { readonly ok: false; readonly reason: "INVALID_CREDENTIALS" };

/** Checks the password and opens a session. Every failure returns the same reason. */
export async function login(
  database: VoxwardDatabase,
  input: { readonly loginName: string; readonly password: string; readonly now: Date; readonly ttlMs?: number },
): Promise<LoginResult> {
  const account = database.orm
    .select({
      id: authAccounts.id,
      displayName: authAccounts.displayName,
      passwordHash: authAccounts.passwordHash,
      disabledAt: authAccounts.disabledAt,
    })
    .from(authAccounts)
    .where(eq(authAccounts.loginName, input.loginName))
    .get();
  const storedHash = account?.passwordHash ?? (await placeholderHash());
  const passwordMatches = await verifyPassword(input.password, storedHash);
  if (account === undefined || account.disabledAt !== null || !passwordMatches) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }
  const session = runShortTransaction(database, (tx) =>
    createSession(tx, { accountId: account.id, now: input.now, ttlMs: input.ttlMs ?? DEFAULT_SESSION_TTL_MS }),
  );
  return { ok: true, accountId: account.id, displayName: account.displayName, session };
}
