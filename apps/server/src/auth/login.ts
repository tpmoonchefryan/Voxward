import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authAccounts } from "../db/schema/index.js";
import { runShortTransaction } from "../db/transaction.js";
import { createSession, DEFAULT_SESSION_TTL_MS, type IssuedSession } from "./session.js";

/** Self-decided: the brief names no password policy. */
export const MIN_PASSWORD_LENGTH = 12;
export const LOGIN_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
/** Q26: cap concurrent scrypt derivations (~128 MiB each at N=2^17) to prevent memory exhaustion. */
export const MAX_SCRYPT_CONCURRENCY = 4;
/** Maximum queued scrypt requests waiting for a slot before rejecting with AUTH_BUSY (VW3-R-011). */
export const MAX_SCRYPT_WAITERS = 32;

export class ScryptOverloadedError extends Error {
  readonly code = "AUTH_BUSY" as const;
  constructor() {
    super("AUTH_BUSY");
    this.name = "ScryptOverloadedError";
  }
}
/** Minimum accepted stored cost parameters; weak hashes below these bounds are refused without deriving. */
export const MIN_STORED_COST_LN = 14;
export const MIN_STORED_COST_R = 8;
export const MIN_STORED_COST_P = 1;

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

let activeScryptCount = 0;
const scryptWaiters: Array<() => void> = [];

async function withScryptSlot<T>(action: () => Promise<T>): Promise<T> {
  if (activeScryptCount >= MAX_SCRYPT_CONCURRENCY) {
    if (scryptWaiters.length >= MAX_SCRYPT_WAITERS) {
      throw new ScryptOverloadedError();
    }
    await new Promise<void>((resolve) => {
      scryptWaiters.push(resolve);
    });
  }
  activeScryptCount += 1;
  try {
    return await action();
  } finally {
    activeScryptCount -= 1;
    const next = scryptWaiters.shift();
    if (next !== undefined) next();
  }
}

function deriveKey(password: string, salt: Buffer, cost: ScryptCost, keyLength: number): Promise<Buffer> {
  return withScryptSlot(
    () =>
      new Promise((resolve, reject) => {
        const options = { N: 2 ** cost.ln, r: cost.r, p: cost.p, maxmem: SCRYPT_MAX_MEMORY_BYTES };
        scryptCallback(password, salt, keyLength, options, (error, key) => {
          if (error) reject(error);
          else resolve(key);
        });
      }),
  );
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
  const costIsUsable =
    Number.isInteger(cost.ln) &&
    Number.isInteger(cost.r) &&
    Number.isInteger(cost.p) &&
    cost.ln >= MIN_STORED_COST_LN &&
    cost.r >= MIN_STORED_COST_R &&
    cost.p >= MIN_STORED_COST_P &&
    memoryOf(cost) <= MAX_STORED_COST_BYTES;
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

export interface LoginRateLimiterOptions {
  readonly maxFailuresPerAccount?: number;
  readonly maxFailuresPerIp?: number;
  readonly windowMs?: number;
  readonly lockoutMs?: number;
  readonly maxTrackedKeys?: number;
}

export interface LoginRateLimitVerdict {
  readonly allowed: boolean;
  readonly retryAfterSeconds?: number;
}

export interface LoginRateLimiter {
  check(input: { readonly ip: string; readonly loginName: string; readonly nowMs: number }): LoginRateLimitVerdict;
  recordFailure(input: { readonly ip: string; readonly loginName: string; readonly nowMs: number }): void;
  recordSuccess(input: { readonly ip: string; readonly loginName: string }): void;
}

interface FailureBucket {
  timestamps: number[];
  lockedUntilMs: number;
}

/**
 * Bounded in-memory brute-force rate limiter & temporary lockout for POST /auth/login (VW3-R-011).
 * Tracks failed attempts per loginName and per client IP.
 */
export function createLoginRateLimiter(options: LoginRateLimiterOptions = {}): LoginRateLimiter {
  const maxFailuresPerAccount = options.maxFailuresPerAccount ?? 8;
  const maxFailuresPerIp = options.maxFailuresPerIp ?? 20;
  const windowMs = options.windowMs ?? 5 * 60_000;
  const lockoutMs = options.lockoutMs ?? 60_000;
  const maxTrackedKeys = options.maxTrackedKeys ?? 4096;

  const accountBuckets = new Map<string, FailureBucket>();
  const ipBuckets = new Map<string, FailureBucket>();

  function pruneBucket(bucket: FailureBucket, nowMs: number): void {
    const cutoff = nowMs - windowMs;
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  }

  function pruneMap(map: Map<string, FailureBucket>, nowMs: number): void {
    if (map.size < maxTrackedKeys) return;
    for (const [key, bucket] of map) {
      pruneBucket(bucket, nowMs);
      if (bucket.timestamps.length === 0 && bucket.lockedUntilMs <= nowMs) {
        map.delete(key);
      }
    }
    while (map.size >= maxTrackedKeys) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
  }

  function bump(map: Map<string, FailureBucket>, key: string, limit: number, nowMs: number): void {
    pruneMap(map, nowMs);
    let bucket = map.get(key);
    if (bucket === undefined) {
      bucket = { timestamps: [], lockedUntilMs: 0 };
      map.set(key, bucket);
    }
    pruneBucket(bucket, nowMs);
    bucket.timestamps.push(nowMs);
    if (bucket.timestamps.length >= limit) {
      bucket.lockedUntilMs = Math.max(bucket.lockedUntilMs, nowMs + lockoutMs);
    }
  }

  return {
    check({ ip, loginName, nowMs }) {
      const acc = accountBuckets.get(loginName.toLowerCase());
      const ipb = ipBuckets.get(ip);
      const lockedUntil = Math.max(acc?.lockedUntilMs ?? 0, ipb?.lockedUntilMs ?? 0);
      if (lockedUntil > nowMs) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - nowMs) / 1000)) };
      }
      return { allowed: true };
    },
    recordFailure({ ip, loginName, nowMs }) {
      bump(accountBuckets, loginName.toLowerCase(), maxFailuresPerAccount, nowMs);
      bump(ipBuckets, ip, maxFailuresPerIp, nowMs);
    },
    recordSuccess({ loginName }) {
      accountBuckets.delete(loginName.toLowerCase());
    },
  };
}
