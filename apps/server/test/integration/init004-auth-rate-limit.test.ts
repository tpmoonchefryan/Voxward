import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount, withScryptSlot } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import { registerProductionSpaRoutes } from "../../src/config/web-static.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { readRbacUsers, writeRbacRoles, readRbacRoles } from "../../src/db/channel-settings-store.js";
import { channels } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date();
const PASSWORD = "test-password-1234";
const CH1 = "ch-init004-1";
const CH2 = "ch-init004-2";

describe("INIT-004 Auth, Channel RBAC & HTTP Rate Limits (STORY-049..054)", () => {
  let dir: string;
  let db: VoxwardDatabase;
  let app: FastifyInstance;

  async function signIn(loginName: string, displayName: string) {
    const account = await createAccount(db, { loginName, displayName, password: PASSWORD, now: NOW });
    const session = runShortTransaction(db, (tx) => createSession(tx, { accountId: account.accountId, now: NOW }));
    return {
      accountId: account.accountId,
      cookie: `vw_session=${session.token}`,
      csrf: session.csrfToken,
    };
  }

  beforeEach(async () => {
    dir = scratchDirectory("init004-");
    db = migratedDatabase(dir);
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values([
          { id: CH1, platform: "youtube", platformChannelRef: "yt-1", displayName: "Room One", createdAt: T0, updatedAt: T0 },
          { id: CH2, platform: "youtube", platformChannelRef: "yt-2", displayName: "Room Two", createdAt: T0, updatedAt: T0 },
        ])
        .run();
    });
    app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
      httpRateLimits: {
        windowMs: 60_000,
        loginMax: 3,
        batchMembersMax: 2,
        channelsListMax: 2,
        spaMax: 2,
      },
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
    removeDirectory(dir);
  });

  it("STORY-049: GET /auth/channels & audit access filter disabled users and enforce custom role DENY", async () => {
    const owner = await signIn("owner49", "Owner 49");
    const mod = await signIn("mod49", "Mod 49");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod.accountId, role: "MODERATOR", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH2, accountId: mod.accountId, role: "MODERATOR", logAccess: true, now: NOW });
    });

    // Customize built-in role-moderator DENY before rbac-users is written: GET /auth/channels reflects it
    const roles = readRbacRoles(db, CH1);
    writeRbacRoles(
      db,
      CH1,
      roles.map((r) =>
        r.id === "role-moderator"
          ? { ...r, permissions: { ...r.permissions, "logs.view": "DENY" } }
          : r,
      ),
    );

    const beforeDisable = await app.inject({
      method: "GET",
      url: "/auth/channels",
      headers: { cookie: mod.cookie },
    });
    expect(beforeDisable.statusCode).toBe(200);
    const ch1Before = (beforeDisable.json() as { channels: Array<{ channelId: string; capabilities: string[] }> }).channels.find(
      (c) => c.channelId === CH1,
    );
    expect(ch1Before).toBeDefined();
    expect(ch1Before?.capabilities).not.toContain("logs.view");

    // Disabled in CH1 -> excluded from GET /auth/channels and rejected 403 on CH1 while CH2 remains active
    const disableRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: mod.accountId,
        displayName: "Mod 49",
        loginName: "mod49",
        enabled: false,
        roleIds: ["role-moderator"],
      },
    });
    expect(disableRes.statusCode).toBe(201);

    const afterDisable = await app.inject({
      method: "GET",
      url: "/auth/channels",
      headers: { cookie: mod.cookie },
    });
    expect(afterDisable.statusCode).toBe(200);
    const listedIds = (afterDisable.json() as { channels: Array<{ channelId: string }> }).channels.map((c) => c.channelId);
    expect(listedIds).not.toContain(CH1);
    expect(listedIds).toContain(CH2);

    const ch1Logs = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH1}/logs/integration`,
      headers: { cookie: mod.cookie },
    });
    expect(ch1Logs.statusCode).toBe(403);
    const ch2Logs = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH2}/logs/integration`,
      headers: { cookie: mod.cookie },
    });
    expect(ch2Logs.statusCode).toBe(200);
  });

  it("STORY-050 & STORY-051: protects preset roles, enforces delegator ceilings & anti-self-escalation, and scopes disable", async () => {
    const owner = await signIn("owner50", "Owner 50");
    const delegator = await signIn("deleg50", "Delegator 50");
    const target = await signIn("target50", "Target 50");
    const outsider = await signIn("outsider50", "Outsider 50");

    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: delegator.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: target.accountId, role: "MODERATOR", logAccess: false, now: NOW });
    });

    // Preset role tampering blocked even for owner
    const editPreset = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/rbac/roles/role-moderator`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { name: "Tampered", permissions: { "members.manage": "GRANT" } },
    });
    expect(editPreset.statusCode).toBe(403);

    const createPresetId = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/roles`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { id: "role-auditor", name: "Fake", permissions: { "logs.view": "GRANT" } },
    });
    expect(createPresetId.statusCode).toBe(403);

    // Owner creates custom roles: manager (members.manage + queue.read, no data.handle) and deny-review
    const mgrRoleRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/roles`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { name: "Member Mgr", permissions: { "queue.read": "GRANT", "members.manage": "GRANT" } },
    });
    expect(mgrRoleRes.statusCode).toBe(201);
    const mgrRoleId = (mgrRoleRes.json() as { role: { id: string } }).role.id;

    const denyReviewRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/roles`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { name: "Deny Review", permissions: { "review.decide": "DENY" } },
    });
    expect(denyReviewRes.statusCode).toBe(201);
    const denyReviewRoleId = (denyReviewRes.json() as { role: { id: string } }).role.id;

    // Assign delegator: role-moderator + mgrRoleId + denyReviewRoleId (so delegator has members.manage, lacks data.handle & review.decide)
    const assignDeleg = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: delegator.accountId,
        displayName: "Delegator 50",
        loginName: "deleg50",
        enabled: true,
        roleIds: ["role-moderator", mgrRoleId, denyReviewRoleId],
      },
    });
    expect(assignDeleg.statusCode).toBe(201);

    // Delegator cannot grant capabilities above their own ceiling (e.g., data.handle / CHANNEL_OWNER)
    const escalateRole = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/roles`,
      headers: { cookie: delegator.cookie, "x-csrf-token": delegator.csrf },
      payload: { name: "Super", permissions: { "data.handle": "GRANT" } },
    });
    expect(escalateRole.statusCode).toBe(403);

    const escalateMember = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/members`,
      headers: { cookie: delegator.cookie, "x-csrf-token": delegator.csrf },
      payload: { accountId: target.accountId, role: "CHANNEL_OWNER", logAccess: false },
    });
    expect(escalateMember.statusCode).toBe(403);

    // Anti-self-escalation: delegator cannot edit/delete own rbac/users row or delete denyReviewRoleId
    const selfModify = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: delegator.cookie, "x-csrf-token": delegator.csrf },
      payload: {
        accountId: delegator.accountId,
        displayName: "Delegator 50",
        loginName: "deleg50",
        enabled: true,
        roleIds: ["role-moderator", mgrRoleId],
      },
    });
    expect(selfModify.statusCode).toBe(403);

    const selfDelete = await app.inject({
      method: "DELETE",
      url: `/channels/${CH1}/rbac/users/${delegator.accountId}`,
      headers: { cookie: delegator.cookie, "x-csrf-token": delegator.csrf },
    });
    expect(selfDelete.statusCode).toBe(403);

    const deleteDenyRole = await app.inject({
      method: "DELETE",
      url: `/channels/${CH1}/rbac/roles/${denyReviewRoleId}`,
      headers: { cookie: delegator.cookie, "x-csrf-token": delegator.csrf },
    });
    expect(deleteDenyRole.statusCode).toBe(403);

    // Last owner cannot disable themselves via rbac/users
    const lastOwnerDisable = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: owner.accountId,
        displayName: "Owner 50",
        loginName: "owner50",
        enabled: false,
        roleIds: ["role-owner"],
      },
    });
    expect(lastOwnerDisable.statusCode).toBe(409);

    // Non-member target returns 404 without mutating stored rbac-users
    const beforeUsers = readRbacUsers(db, CH1);
    const nonMemberWrite = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: outsider.accountId,
        displayName: "Outsider",
        loginName: "outsider50",
        enabled: false,
        roleIds: ["role-moderator"],
      },
    });
    expect(nonMemberWrite.statusCode).toBe(404);
    expect(readRbacUsers(db, CH1)).toEqual(beforeUsers);
  });

  it("STORY-052 & STORY-053: enforces scrypt concurrency queue and HTTP route rate limits with Retry-After", async () => {
    // Scrypt slot bounds concurrent tasks and waiters
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const slots = Array.from({ length: 4 + 32 }, () => withScryptSlot(() => gate));
    await expect(withScryptSlot(async () => "overflow")).rejects.toThrow(/AUTH_BUSY/);
    release();
    await Promise.all(slots);

    const owner = await signIn("owner53", "Owner 53");
    const target = await signIn("target53", "Target 53");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
    });

    // /auth/login rate limit (max=3)
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { loginName: "owner53", password: PASSWORD },
      });
      expect(ok.statusCode).toBe(200);
    }
    const loginBlocked = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "owner53", password: PASSWORD },
    });
    expect(loginBlocked.statusCode).toBe(429);
    expect(loginBlocked.json()).toEqual({ error: "TOO_MANY_ATTEMPTS" });
    expect(loginBlocked.headers["retry-after"]).toBeDefined();

    // /members/batch rate limit (max=2)
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/members/batch",
        headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
        payload: { items: [{ channelId: CH1, accountId: target.accountId, role: "MODERATOR", logAccess: false }] },
      });
      expect(res.statusCode).toBe(201);
    }
    const batchBlocked = await app.inject({
      method: "POST",
      url: "/members/batch",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { items: [{ channelId: CH1, accountId: target.accountId, role: "MODERATOR", logAccess: false }] },
    });
    expect(batchBlocked.statusCode).toBe(429);
    expect(batchBlocked.json()).toEqual({ error: "RATE_LIMITED" });
    expect(batchBlocked.headers["retry-after"]).toBeDefined();

    // /auth/channels rate limit (max=2)
    expect((await app.inject({ method: "GET", url: "/auth/channels", headers: { cookie: owner.cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/auth/channels", headers: { cookie: owner.cookie } })).statusCode).toBe(200);
    const chBlocked = await app.inject({ method: "GET", url: "/auth/channels", headers: { cookie: owner.cookie } });
    expect(chBlocked.statusCode).toBe(429);
    expect(chBlocked.json()).toEqual({ error: "RATE_LIMITED" });
    expect(chBlocked.headers["retry-after"]).toBeDefined();
  });

  it("STORY-054: caches index.html in registerProductionSpaRoutes, rate-limits SPA routes, and keeps API 404 JSON", async () => {
    const webDist = mkdtempSync(join(tmpdir(), "vw-web-dist-"));
    try {
      mkdirSync(join(webDist, "assets"), { recursive: true });
      writeFileSync(join(webDist, "index.html"), "<!doctype html><html><body>SPA</body></html>");
      writeFileSync(join(webDist, "assets", "app.js"), "console.log('ok');");

      const spaApp = buildApp({
        modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
        logger: false,
      });
      registerProductionSpaRoutes(spaApp, webDist, { spaMax: 2, windowMs: 60_000 });
      await spaApp.ready();

      try {
        // Delete index.html on disk after registration to prove cached memory delivery without sync disk read per request
        rmSync(join(webDist, "index.html"));

        const r1 = await spaApp.inject({ method: "GET", url: "/login" });
        expect(r1.statusCode).toBe(200);
        expect(r1.body).toContain("SPA");

        const r2 = await spaApp.inject({ method: "GET", url: "/assets/app.js" });
        expect(r2.statusCode).toBe(200);

        const r3 = await spaApp.inject({ method: "GET", url: "/dock" });
        expect(r3.statusCode).toBe(429);
        expect(r3.headers["retry-after"]).toBeDefined();

        // API paths outside SPA scope keep JSON 404
        const api404 = await spaApp.inject({ method: "GET", url: "/auth/does-not-exist" });
        expect(api404.statusCode).toBe(404);
        expect(api404.json()).toEqual({ error: "NOT_FOUND" });
      } finally {
        await spaApp.close();
      }
    } finally {
      rmSync(webDist, { recursive: true, force: true });
    }
  });
});
