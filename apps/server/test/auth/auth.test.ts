import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { issueOutputToken, resolveOutputToken, revokeOutputToken } from "../../src/auth/downstream-tokens.js";
import { csrfMatches, isUnsafeMethod } from "../../src/auth/csrf.js";
import {
  authenticateRequest,
  authorizeBatch,
  authorizeChannel,
  authorizeSocketHandshake,
  checkRoomScope,
  readCookie,
  SESSION_COOKIE,
  type Principal,
} from "../../src/auth/guard.js";
import { AccountInputError, createAccount, hashPassword, login, verifyPassword } from "../../src/auth/login.js";
import { findActiveMembership, grantMembership, listActiveMembers, revokeMembership } from "../../src/auth/members.js";
import { capabilitiesOf, downstreamAllows, membershipAllows } from "../../src/auth/permissions.js";
import { createSession, digestSecret, resolveSession, revokeAccountSessions, revokeSession } from "../../src/auth/session.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { authAccounts, authSessions, channelMembers, channels } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const PASSWORD = "correct horse battery";
const NOW = new Date(T0);
const THIRTEEN_HOURS_LATER = new Date(Date.parse(T0) + 13 * 60 * 60 * 1000);

/** Encodes bytes as the PHC string format writes them: standard base64 without padding. */
function unpaddedBase64(bytes: Buffer): string {
  return bytes.toString("base64").replace(/=+$/, "");
}

function asAccount(accountId: string): Principal {
  return { kind: "account", accountId, displayName: accountId };
}

function seedChannel(database: VoxwardDatabase, id: string): void {
  runShortTransaction(database, (tx) => {
    tx.insert(channels)
      .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
      .run();
  });
}

async function newAccount(database: VoxwardDatabase, loginName: string): Promise<string> {
  const created = await createAccount(database, { loginName, displayName: loginName, password: PASSWORD, now: NOW });
  return created.accountId;
}

describe("auth modules", () => {
  let directory: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("auth-units-");
    database = migratedDatabase(directory);
    seedChannel(database, "channel-1");
    seedChannel(database, "channel-2");
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  describe("permissions", () => {
    it("lets the owner manage members, tokens and logs", () => {
      const owner = { role: "CHANNEL_OWNER", logAccess: false } as const;
      expect(membershipAllows(owner, "members.manage")).toBe(true);
      expect(membershipAllows(owner, "tokens.manage")).toBe(true);
      expect(membershipAllows(owner, "logs.view")).toBe(true);
    });

    it("keeps member and token management away from moderators and data admins", () => {
      for (const role of ["MODERATOR", "DATA_ADMIN"] as const) {
        expect(membershipAllows({ role, logAccess: false }, "members.manage")).toBe(false);
        expect(membershipAllows({ role, logAccess: false }, "tokens.manage")).toBe(false);
      }
    });

    it("keeps the live queue and the original message away from data admins", () => {
      expect(membershipAllows({ role: "DATA_ADMIN", logAccess: false }, "queue.read")).toBe(false);
      expect(membershipAllows({ role: "DATA_ADMIN", logAccess: false }, "message.original")).toBe(false);
    });

    it("opens the log viewer to a member only with log access", () => {
      expect(membershipAllows({ role: "MODERATOR", logAccess: false }, "logs.view")).toBe(false);
      expect(membershipAllows({ role: "MODERATOR", logAccess: true }, "logs.view")).toBe(true);
    });

    it("gives downstream credentials output.feed and nothing else", () => {
      expect(downstreamAllows("output.feed")).toBe(true);
      expect(downstreamAllows("queue.read")).toBe(false);
      expect(downstreamAllows("members.manage")).toBe(false);
    });

    it("lists the capabilities of a role in matrix order", () => {
      expect(capabilitiesOf("DATA_ADMIN")).toEqual(["subject.evidence", "data.handle"]);
    });
  });

  describe("sessions and login", () => {
    it("resolves a live session and stores only the digest of its token", async () => {
      const accountId = await newAccount(database, "owner");
      const issued = runShortTransaction(database, (tx) => createSession(tx, { accountId, now: NOW }));
      expect(resolveSession(database, issued.token, NOW)).toEqual({
        accountId,
        displayName: "owner",
        csrfToken: issued.csrfToken,
      });
      const rows = database.orm.select({ tokenHash: authSessions.tokenHash }).from(authSessions).all();
      expect(rows).toEqual([{ tokenHash: digestSecret(issued.token) }]);
    });

    it("stops resolving a session once it is revoked, expired, or its account is disabled", async () => {
      const ownerId = await newAccount(database, "owner");
      const modId = await newAccount(database, "mod");
      const revoked = runShortTransaction(database, (tx) => createSession(tx, { accountId: ownerId, now: NOW }));
      const expired = runShortTransaction(database, (tx) =>
        createSession(tx, { accountId: ownerId, now: NOW, ttlMs: 1000 }),
      );
      const disabled = runShortTransaction(database, (tx) => createSession(tx, { accountId: modId, now: NOW }));
      runShortTransaction(database, (tx) => {
        revokeSession(tx, revoked.token, NOW);
      });
      expect(resolveSession(database, revoked.token, NOW)).toBeUndefined();
      expect(resolveSession(database, expired.token, THIRTEEN_HOURS_LATER)).toBeUndefined();
      database.orm.update(authAccounts).set({ disabledAt: T0 }).where(eq(authAccounts.id, modId)).run();
      expect(resolveSession(database, disabled.token, NOW)).toBeUndefined();
    });

    it("revokes every live session of one account at once", async () => {
      const accountId = await newAccount(database, "owner");
      const first = runShortTransaction(database, (tx) => createSession(tx, { accountId, now: NOW }));
      const second = runShortTransaction(database, (tx) => createSession(tx, { accountId, now: NOW }));
      expect(runShortTransaction(database, (tx) => revokeAccountSessions(tx, accountId, NOW))).toBe(2);
      expect(resolveSession(database, first.token, NOW)).toBeUndefined();
      expect(resolveSession(database, second.token, NOW)).toBeUndefined();
    });

    it("rejects a short password, a malformed login name and a taken login name", async () => {
      await expect(
        createAccount(database, { loginName: "owner", displayName: "owner", password: "short", now: NOW }),
      ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
      await expect(
        createAccount(database, { loginName: "bad name", displayName: "x", password: PASSWORD, now: NOW }),
      ).rejects.toBeInstanceOf(AccountInputError);
      await newAccount(database, "owner");
      await expect(
        createAccount(database, { loginName: "owner", displayName: "owner", password: PASSWORD, now: NOW }),
      ).rejects.toMatchObject({ code: "LOGIN_NAME_TAKEN" });
    });

    it("opens a session only for the right password of an active account, and stores no plain password", async () => {
      const accountId = await newAccount(database, "owner");
      expect(await login(database, { loginName: "owner", password: PASSWORD, now: NOW })).toMatchObject({
        ok: true,
        accountId,
        displayName: "owner",
      });
      expect(await login(database, { loginName: "owner", password: "wrong password here", now: NOW })).toEqual({
        ok: false,
        reason: "INVALID_CREDENTIALS",
      });
      expect(await login(database, { loginName: "nobody", password: PASSWORD, now: NOW })).toEqual({
        ok: false,
        reason: "INVALID_CREDENTIALS",
      });
      database.orm.update(authAccounts).set({ disabledAt: T0 }).where(eq(authAccounts.id, accountId)).run();
      expect(await login(database, { loginName: "owner", password: PASSWORD, now: NOW })).toEqual({
        ok: false,
        reason: "INVALID_CREDENTIALS",
      });
      const [row] = database.orm.select({ passwordHash: authAccounts.passwordHash }).from(authAccounts).all();
      expect(row?.passwordHash.startsWith("$scrypt$ln=17,r=8,p=1$")).toBe(true);
      expect(row?.passwordHash).not.toContain(PASSWORD);
    });
  });

  describe("password hashes", () => {
    it("stores scrypt at the OWASP minimum cost, and writes the cost into the string", async () => {
      const stored = await hashPassword(PASSWORD);
      expect(stored).toMatch(/^\$scrypt\$ln=17,r=8,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{86}$/);
      expect(await verifyPassword(PASSWORD, stored)).toBe(true);
      expect(await verifyPassword("wrong password here", stored)).toBe(false);
    });

    it("verifies a hash written at the previous cost, so a later cost change strands no stored hash", async () => {
      const salt = randomBytes(16);
      const key = scryptSync(PASSWORD, salt, 64, { N: 2 ** 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      const previous = `$scrypt$ln=14,r=8,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(key)}`;
      expect(await verifyPassword(PASSWORD, previous)).toBe(true);
      expect(await verifyPassword("wrong password here", previous)).toBe(false);
    });

    it("refuses a stored cost that needs more memory than the cap, without deriving a key", async () => {
      const tooCostly = "$scrypt$ln=30,r=8,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNo";
      expect(await verifyPassword(PASSWORD, tooCostly)).toBe(false);
    });
  });

  describe("members", () => {
    it("keeps one active grant per account and channel, and keeps the history", async () => {
      const modId = await newAccount(database, "mod");
      runShortTransaction(database, (tx) => {
        grantMembership(tx, { channelId: "channel-1", accountId: modId, role: "MODERATOR", logAccess: false, now: NOW });
        grantMembership(tx, { channelId: "channel-1", accountId: modId, role: "DATA_ADMIN", logAccess: true, now: NOW });
      });
      expect(findActiveMembership(database, "channel-1", modId)).toMatchObject({ role: "DATA_ADMIN", logAccess: true });
      expect(listActiveMembers(database, "channel-1").map((member) => member.role)).toEqual(["DATA_ADMIN"]);
      expect(database.orm.select().from(channelMembers).all()).toHaveLength(2);
    });

    it("revokes a grant so that it no longer authorizes, and reports a second revoke as a no-op", async () => {
      const modId = await newAccount(database, "mod");
      runShortTransaction(database, (tx) => {
        grantMembership(tx, { channelId: "channel-1", accountId: modId, role: "MODERATOR", logAccess: false, now: NOW });
      });
      expect(runShortTransaction(database, (tx) => revokeMembership(tx, { channelId: "channel-1", accountId: modId, now: NOW }))).toBe(true);
      expect(findActiveMembership(database, "channel-1", modId)).toBeUndefined();
      expect(runShortTransaction(database, (tx) => revokeMembership(tx, { channelId: "channel-1", accountId: modId, now: NOW }))).toBe(false);
    });
  });

  describe("downstream output tokens", () => {
    it("resolves a token only to its channel and stops after revocation", async () => {
      const ownerId = await newAccount(database, "owner");
      const issued = runShortTransaction(database, (tx) =>
        issueOutputToken(tx, { channelId: "channel-1", createdByAccountId: ownerId, now: NOW }),
      );
      expect(issued.token.startsWith("vwo_")).toBe(true);
      expect(resolveOutputToken(database, issued.token)).toEqual({ id: issued.id, channelId: "channel-1", scope: "ROOM_READ_ONLY" });
      expect(runShortTransaction(database, (tx) => revokeOutputToken(tx, { id: issued.id, channelId: "channel-2", now: NOW }))).toBe(false);
      expect(resolveOutputToken(database, issued.token)).toBeDefined();
      expect(runShortTransaction(database, (tx) => revokeOutputToken(tx, { id: issued.id, channelId: "channel-1", now: NOW }))).toBe(true);
      expect(resolveOutputToken(database, issued.token)).toBeUndefined();
    });
  });

  describe("guard", () => {
    it("refuses a client-named room that differs from the trusted record", () => {
      expect(checkRoomScope("channel-1", "channel-2")).toEqual({ ok: false, status: 403, code: "ROOM_SCOPE_MISMATCH" });
      expect(checkRoomScope("channel-1", "channel-1")).toEqual({ ok: true });
      expect(checkRoomScope("channel-1", undefined)).toEqual({ ok: true });
    });

    it("authorizes a capability only through a membership of that channel", async () => {
      const modId = await newAccount(database, "mod");
      runShortTransaction(database, (tx) => {
        grantMembership(tx, { channelId: "channel-1", accountId: modId, role: "MODERATOR", logAccess: false, now: NOW });
      });
      expect(authorizeChannel(database, asAccount(modId), { channelId: "channel-1", capability: "queue.read" })).toEqual({ ok: true });
      expect(authorizeChannel(database, asAccount(modId), { channelId: "channel-2", capability: "queue.read" })).toEqual({
        ok: false,
        status: 403,
        code: "FORBIDDEN",
      });
      expect(authorizeChannel(database, asAccount(modId), { channelId: "channel-1", capability: "members.manage" })).toEqual({
        ok: false,
        status: 403,
        code: "FORBIDDEN",
      });
    });

    it("gives a downstream principal output.feed for its own channel only", () => {
      const downstream: Principal = { kind: "downstream", tokenId: "token-1", channelId: "channel-1" };
      expect(authorizeChannel(database, downstream, { channelId: "channel-1", capability: "output.feed" })).toEqual({ ok: true });
      expect(authorizeChannel(database, downstream, { channelId: "channel-2", capability: "output.feed" })).toMatchObject({ ok: false });
      expect(authorizeChannel(database, downstream, { channelId: "channel-1", capability: "members.manage" })).toMatchObject({ ok: false });
    });

    it("refuses a whole batch when one item is out of scope, and reports the position of that item", async () => {
      const ownerId = await newAccount(database, "owner");
      runShortTransaction(database, (tx) => {
        grantMembership(tx, { channelId: "channel-1", accountId: ownerId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
      });
      const items = [
        { channelId: "channel-1", capability: "members.manage" as const },
        { channelId: "channel-2", capability: "members.manage" as const },
      ];
      expect(authorizeBatch(database, asAccount(ownerId), items)).toEqual({ ok: false, status: 403, code: "BATCH_DENIED", index: 1 });
      expect(authorizeBatch(database, asAccount(ownerId), items.slice(0, 1))).toEqual({ ok: true });
    });

    it("accepts a same-origin WebSocket handshake, refuses other origins, and accepts a bearer client without Origin", async () => {
      const accountId = await newAccount(database, "owner");
      const issued = runShortTransaction(database, (tx) => createSession(tx, { accountId, now: NOW }));
      const cookie = `${SESSION_COOKIE}=${issued.token}`;
      const sameOrigin = { method: "GET", now: NOW, headers: { host: "voxward.example", origin: "https://voxward.example", cookie } };
      expect(authorizeSocketHandshake(database, sameOrigin)).toMatchObject({ ok: true, principal: { kind: "account", accountId } });
      const crossOrigin = { ...sameOrigin, headers: { host: "voxward.example", origin: "https://evil.example", cookie } };
      expect(authorizeSocketHandshake(database, crossOrigin)).toMatchObject({ ok: false, code: "ORIGIN_MISMATCH" });
      const cookieWithoutOrigin = { method: "GET", now: NOW, headers: { host: "voxward.example", cookie } };
      expect(authorizeSocketHandshake(database, cookieWithoutOrigin)).toMatchObject({ ok: false, code: "ORIGIN_MISMATCH" });

      const ownerId = accountId;
      const token = runShortTransaction(database, (tx) =>
        issueOutputToken(tx, { channelId: "channel-1", createdByAccountId: ownerId, now: NOW }),
      );
      const bearerClient = { method: "GET", now: NOW, headers: { host: "voxward.example", authorization: `Bearer ${token.token}` } };
      expect(authorizeSocketHandshake(database, bearerClient)).toMatchObject({
        ok: true,
        principal: { kind: "downstream", channelId: "channel-1" },
      });
    });

    it("reads the session cookie by name and requires the CSRF token for state changes", async () => {
      expect(readCookie("theme=dark; vw_session=abc.def; other=1", SESSION_COOKIE)).toBe("abc.def");
      expect(readCookie(undefined, SESSION_COOKIE)).toBeUndefined();
      const accountId = await newAccount(database, "owner");
      const issued = runShortTransaction(database, (tx) => createSession(tx, { accountId, now: NOW }));
      const headers = { cookie: `${SESSION_COOKIE}=${issued.token}` };
      expect(authenticateRequest(database, { method: "GET", headers, now: NOW })).toMatchObject({ ok: true });
      expect(authenticateRequest(database, { method: "POST", headers, now: NOW })).toEqual({
        ok: false,
        status: 403,
        code: "CSRF_INVALID",
      });
      expect(
        authenticateRequest(database, { method: "POST", headers: { ...headers, "x-csrf-token": issued.csrfToken }, now: NOW }),
      ).toMatchObject({ ok: true });
    });

    it("compares CSRF tokens exactly and applies only to state-changing methods", () => {
      expect(csrfMatches("abc", "abc")).toBe(true);
      expect(csrfMatches("abc", "abd")).toBe(false);
      expect(csrfMatches("abc", "ab")).toBe(false);
      expect(csrfMatches("abc", undefined)).toBe(false);
      expect(isUnsafeMethod("get")).toBe(false);
      expect(isUnsafeMethod("delete")).toBe(true);
    });
  });
});
