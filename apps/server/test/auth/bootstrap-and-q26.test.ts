import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BootstrapError, bootstrapOwner } from "../../src/auth/bootstrap.js";
import { login, verifyPassword } from "../../src/auth/login.js";
import { findActiveMembership } from "../../src/auth/members.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date(T0);
const STRONG_PASSWORD = "correct-horse-battery-staple";

function unpaddedBase64(bytes: Buffer): string {
  return bytes.toString("base64").replace(/=+$/, "");
}

describe("Q17 one-time owner bootstrap and Q26 scrypt hardening", () => {
  let directory: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("auth-q17-q26-");
    database = migratedDatabase(directory);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  it("bootstraps the first owner once and fails closed on any second attempt (Q17)", async () => {
    const first = await bootstrapOwner(database, {
      channelId: "room-main",
      loginName: "owner-1",
      displayName: "Main Owner",
      password: STRONG_PASSWORD,
      now: NOW,
    });

    expect(first.channelId).toBe("room-main");
    expect(findActiveMembership(database, "room-main", first.accountId)).toMatchObject({
      role: "CHANNEL_OWNER",
      logAccess: true,
      dataAdmin: true,
    });

    const loginResult = await login(database, {
      loginName: "owner-1",
      password: STRONG_PASSWORD,
      now: NOW,
    });
    expect(loginResult.ok).toBe(true);

    await expect(
      bootstrapOwner(database, {
        channelId: "room-other",
        loginName: "owner-2",
        displayName: "Second Owner",
        password: STRONG_PASSWORD,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "OWNER_ALREADY_BOOTSTRAPPED" });
  }, 30_000);

  it("rejects weak passwords and invalid login names before creating an owner (Q17)", async () => {
    await expect(
      bootstrapOwner(database, {
        channelId: "room-main",
        loginName: "owner-1",
        displayName: "Owner",
        password: "short",
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(BootstrapError);

    await expect(
      bootstrapOwner(database, {
        channelId: "room-main",
        loginName: "bad login name",
        displayName: "Owner",
        password: STRONG_PASSWORD,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOGIN_NAME" });
  });

  it("rejects weak/non-PHC/oversized hashes without deriving (Q26)", async () => {
    const salt = randomBytes(16);
    const weakKey = scryptSync(STRONG_PASSWORD, salt, 64, { N: 2 ** 10, r: 8, p: 1 });
    const weakHash = `$scrypt$ln=10,r=8,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(weakKey)}`;
    expect(await verifyPassword(STRONG_PASSWORD, weakHash)).toBe(false);

    const lowRHash = `$scrypt$ln=14,r=4,p=1$${unpaddedBase64(salt)}$${unpaddedBase64(weakKey)}`;
    expect(await verifyPassword(STRONG_PASSWORD, lowRHash)).toBe(false);

    expect(await verifyPassword(STRONG_PASSWORD, "$bcrypt$2b$12$invalid")).toBe(false);
    expect(
      await verifyPassword(
        STRONG_PASSWORD,
        "$scrypt$ln=30,r=8,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNo",
      ),
    ).toBe(false);
  });

  it("handles concurrent logins within the scrypt concurrency cap (Q26)", async () => {
    await bootstrapOwner(database, {
      channelId: "room-main",
      loginName: "owner-concurrent",
      displayName: "Owner",
      password: STRONG_PASSWORD,
      now: NOW,
    });

    const attempts = Array.from({ length: 6 }, () =>
      login(database, {
        loginName: "owner-concurrent",
        password: STRONG_PASSWORD,
        now: NOW,
      }),
    );
    const results = await Promise.all(attempts);
    expect(results.every((r) => r.ok)).toBe(true);
  }, 30_000);
});
