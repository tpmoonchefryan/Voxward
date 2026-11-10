import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import { createSession, DEFAULT_SESSION_TTL_MS, type IssuedSession } from "./session.js";

/** Self-decided: the brief names no password policy. */
export const MIN_PASSWORD_LENGTH = 12;
const LOGIN_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export type AccountInputErrorCode = "INVALID_LOGIN_NAME" | "WEAK_PASSWORD" | "LOGIN_NAME_TAKEN";

export class AccountInputError extends Error {
  readonly code: AccountInputErrorCode;

  constructor(code: AccountInputErrorCode) {
    super(code);
    this.name = "AccountInputError";
    this.code = code;
  }
}

/** Cost of new hashes: the OWASP Password Storage Cheat Sheet minimum for scrypt (N = 2^17, r = 8, p = 1). */
const CURRENT_COST: ScryptCost = { ln: 17, r: 8, p: 1 };
const SALT_BYTES = 16;
const KEY_BYTES = 64;
/** The most memory scrypt may use. Stored costs are refused above MAX_STORED_COST_BYTES, which is below this. */
const SCRYPT_MAX_MEMORY_BYTES = 512 * 1024 * 1024;
/** A stored hash whose cost needs more memory than this is refused without running scrypt. */
const MAX_STORED_COST_BYTES = 256 * 1024 * 1024;

interface ScryptCost {
  readonly ln: number;
  readonly r: number;
  readonly p: number;
}

interface StoredHash {
  readonly cost: ScryptCost;
  readonly salt: Buffer;
  readonly key: Buffer;
}

/**
 * A PHC string: $scrypt$ln=<log2 N>,r=<r>,p=<p>$<salt>$<key>. The cost is written into each hash, so a later change of
 * CURRENT_COST does not make a stored hash unverifiable.
 */
const STORED_HASH = /^\$scrypt\$ln=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

function deriveKey(password: string, salt: Buffer, cost: ScryptCost, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options = { N: 2 ** cost.ln, r: cost.r, p: cost.p, maxmem: SCRYPT_MAX_MEMORY_BYTES };
    scryptCallback(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** The working memory scrypt allocates for a cost, in bytes: 128 * r * (N + p + 2). */
function memoryOf(cost: ScryptCost): number {
  return 128 * cost.r * (2 ** cost.ln + cost.p + 2);
}

function parseStoredHash(stored: string): StoredHash | undefined {
  const match = STORED_HASH.exec(stored);
  if (match === null) return undefined;
  const [, ln = "", r = "", p = "", saltText = "", keyText = ""] = match;
  const cost = { ln: Number(ln), r: Number(r), p: Number(p) };
  const salt = Buffer.from(saltText, "base64");
  const key = Buffer.from(keyText, "base64");
  const costIsUsable = cost.ln >= 1 && cost.r >= 1 && cost.p >= 1 && memoryOf(cost) <= MAX_STORED_COST_BYTES;
  if (!costIsUsable || salt.length !== SALT_BYTES || key.length !== KEY_BYTES) return undefined;
  return { cost, salt, key };
}

/** Standard base64 without padding, the encoding the PHC string format uses. */
function unpaddedBase64(bytes: Buffer): string {
  return bytes.toString("base64").replace(/=+$/, "");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, CURRENT_COST, KEY_BYTES);
  const { ln, r, p } = CURRENT_COST;
  return `$scrypt$ln=${ln},r=${r},p=${p}$${unpaddedBase64(salt)}$${unpaddedBase64(key)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const hash = parseStoredHash(stored);
  if (hash === undefined) return false;
  const actual = await deriveKey(password, hash.salt, hash.cost, hash.key.length);
  return timingSafeEqual(hash.key, actual);
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
