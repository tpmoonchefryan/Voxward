import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership, listActiveMembers } from "../../src/auth/members.js";
import { channels } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const NOW = new Date(T0);

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("auth HTTP routes", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;
  let ownerId: string;
  let modId: string;
  let otherId: string;

  beforeEach(async () => {
    directory = scratchDirectory("auth-routes-");
    database = migratedDatabase(directory);
    for (const id of ["channel-1", "channel-2"]) {
      runShortTransaction(database, (tx) => {
        tx.insert(channels)
          .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
          .run();
      });
    }
    ownerId = (await createAccount(database, { loginName: "owner", displayName: "Owner", password: PASSWORD, now: NOW })).accountId;
    modId = (await createAccount(database, { loginName: "mod", displayName: "Mod", password: PASSWORD, now: NOW })).accountId;
    otherId = (await createAccount(database, { loginName: "other", displayName: "Other", password: PASSWORD, now: NOW })).accountId;
    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: "channel-1", accountId: ownerId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-1", accountId: modId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-2", accountId: otherId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
    });
    app = buildApp({ modules: buildRegistry(config), logger: false, database });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(directory);
  });

  async function signIn(loginName: string): Promise<Session> {
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { csrfToken: string };
    const cookie = String(response.headers["set-cookie"]).split(";")[0] ?? "";
    return { cookie, csrf: body.csrfToken };
  }

  async function issueToken(session: Session, channelId: string): Promise<{ id: string; token: string }> {
    const issued = await app.inject({
      method: "POST",
      url: `/channels/${channelId}/output-tokens`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
    });
    expect(issued.statusCode).toBe(201);
    return issued.json() as { id: string; token: string };
  }

  it("sets a session cookie that scripts cannot read and that is sent same-site only", async () => {
    const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "owner", password: PASSWORD } });
    const setCookie = String(response.headers["set-cookie"]);
    expect(setCookie.startsWith("vw_session=vws_")).toBe(true);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(JSON.stringify(response.json())).not.toMatch(/scrypt|vws_/);
  });

  it("refuses a wrong password and a malformed body with fixed codes", async () => {
    const wrong = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName: "owner", password: "wrong password here" } });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: "INVALID_CREDENTIALS" });
    const malformed = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "owner", password: PASSWORD, extra: true },
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ error: "INVALID_REQUEST" });
  });

  it("answers the session route only for a live cookie", async () => {
    const owner = await signIn("owner");
    const live = await app.inject({ method: "GET", url: "/auth/session", headers: { cookie: owner.cookie } });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({ accountId: ownerId });
    const anonymous = await app.inject({ method: "GET", url: "/auth/session" });
    expect(anonymous.statusCode).toBe(401);
  });

  it("refuses a state change without the CSRF token and accepts it with the token", async () => {
    const owner = await signIn("owner");
    const payload = { accountId: otherId, role: "DATA_ADMIN", logAccess: false };
    const without = await app.inject({ method: "POST", url: "/channels/channel-1/members", headers: { cookie: owner.cookie }, payload });
    expect(without.statusCode).toBe(403);
    expect(without.json()).toEqual({ error: "CSRF_INVALID" });
    const withToken = await app.inject({
      method: "POST",
      url: "/channels/channel-1/members",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload,
    });
    expect(withToken.statusCode).toBe(201);
    expect(listActiveMembers(database, "channel-1").map((member) => member.accountId)).toContain(otherId);
  });

  it("refuses a moderator, and an owner who names another channel in the path", async () => {
    const moderator = await signIn("mod");
    const moderatorRead = await app.inject({ method: "GET", url: "/channels/channel-1/members", headers: { cookie: moderator.cookie } });
    expect(moderatorRead.statusCode).toBe(403);
    expect(moderatorRead.json()).toEqual({ error: "FORBIDDEN" });
    const owner = await signIn("owner");
    const forged = await app.inject({ method: "GET", url: "/channels/channel-2/members", headers: { cookie: owner.cookie } });
    expect(forged.statusCode).toBe(403);
    expect(forged.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("stops a session at the next request after logout", async () => {
    const owner = await signIn("owner");
    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(logout.statusCode).toBe(204);
    const after = await app.inject({ method: "GET", url: "/auth/session", headers: { cookie: owner.cookie } });
    expect(after.statusCode).toBe(401);
  });

  it("issues a downstream token once, and that token reaches no admin route", async () => {
    const owner = await signIn("owner");
    const { token } = await issueToken(owner, "channel-1");
    expect(token.startsWith("vwo_")).toBe(true);
    const bearer = { authorization: `Bearer ${token}` };

    const members = await app.inject({ method: "GET", url: "/channels/channel-1/members", headers: bearer });
    expect(members.statusCode).toBe(403);
    expect(members.json()).toEqual({ error: "FORBIDDEN" });

    const write = await app.inject({
      method: "POST",
      url: "/channels/channel-1/members",
      headers: bearer,
      payload: { accountId: otherId, role: "DATA_ADMIN", logAccess: false },
    });
    expect(write.statusCode).toBe(403);
    expect(write.json()).toEqual({ error: "DOWNSTREAM_READ_ONLY" });

    const session = await app.inject({ method: "GET", url: "/auth/session", headers: bearer });
    expect(session.statusCode).toBe(403);

    const listing = await app.inject({ method: "GET", url: "/channels/channel-1/members", headers: { cookie: owner.cookie } });
    expect(listing.statusCode).toBe(200);
    expect(listing.body).not.toContain(token);
    expect(listing.body).not.toMatch(/scrypt|vws_|vwo_|tokenHash|passwordHash/);
  });

  it("ignores a token passed in the URL, and stops accepting a revoked downstream token", async () => {
    const owner = await signIn("owner");
    const { id, token } = await issueToken(owner, "channel-1");
    const inUrl = await app.inject({ method: "GET", url: `/channels/channel-1/members?access_token=${token}` });
    expect(inUrl.statusCode).toBe(401);
    const revoked = await app.inject({
      method: "DELETE",
      url: `/channels/channel-1/output-tokens/${id}`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(revoked.statusCode).toBe(204);
    const after = await app.inject({ method: "GET", url: "/channels/channel-1/members", headers: { authorization: `Bearer ${token}` } });
    expect(after.statusCode).toBe(401);
  });

  it("refuses to revoke a token through a channel it does not belong to", async () => {
    const owner = await signIn("owner");
    const { id, token } = await issueToken(owner, "channel-1");
    const other = await signIn("other");
    const attempt = await app.inject({
      method: "DELETE",
      url: `/channels/channel-2/output-tokens/${id}`,
      headers: { cookie: other.cookie, "x-csrf-token": other.csrf },
    });
    expect(attempt.statusCode).toBe(404);
    const stillValid = await app.inject({ method: "GET", url: "/channels/channel-1/members", headers: { authorization: `Bearer ${token}` } });
    expect(stillValid.statusCode).toBe(403);
  });

  it("applies a batch only when every item is allowed, and writes nothing on refusal", async () => {
    const owner = await signIn("owner");
    const refused = await app.inject({
      method: "POST",
      url: "/members/batch",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        items: [
          { channelId: "channel-1", accountId: otherId, role: "DATA_ADMIN", logAccess: false },
          { channelId: "channel-2", accountId: modId, role: "MODERATOR", logAccess: false },
        ],
      },
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ error: "BATCH_DENIED", index: 1 });
    expect(listActiveMembers(database, "channel-1").map((member) => member.accountId)).not.toContain(otherId);

    const granted = await app.inject({
      method: "POST",
      url: "/members/batch",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { items: [{ channelId: "channel-1", accountId: otherId, role: "DATA_ADMIN", logAccess: false }] },
    });
    expect(granted.statusCode).toBe(201);
    expect(granted.json()).toEqual({ granted: 1 });
  });
});
