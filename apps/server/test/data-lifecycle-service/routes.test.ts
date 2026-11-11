import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { SubjectStore } from "../../src/db/repository.js";
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

describe("data-panel HTTP routes: permission, session and CSRF (VW-SUB033-AC001, VW-SUB034-AC001)", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;

  beforeEach(async () => {
    directory = scratchDirectory("data-routes-");
    database = migratedDatabase(directory);
    runShortTransaction(database, (tx) => {
      for (const id of ["channel-1", "channel-2"]) {
        tx.insert(channels)
          .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
          .run();
      }
      SubjectStore.create(tx, { id: "subject-1", channelId: "channel-1", platformSubjectKey: "synthetic-key-1", createdAt: T0 });
    });
    const accounts = {
      owner: (await createAccount(database, { loginName: "owner", displayName: "Owner", password: PASSWORD, now: NOW })).accountId,
      admin: (await createAccount(database, { loginName: "admin", displayName: "Admin", password: PASSWORD, now: NOW })).accountId,
      mod: (await createAccount(database, { loginName: "mod", displayName: "Mod", password: PASSWORD, now: NOW })).accountId,
      outsider: (await createAccount(database, { loginName: "outsider", displayName: "Out", password: PASSWORD, now: NOW })).accountId,
    };
    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: "channel-1", accountId: accounts.owner, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-1", accountId: accounts.admin, role: "DATA_ADMIN", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-1", accountId: accounts.mod, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-2", accountId: accounts.outsider, role: "DATA_ADMIN", logAccess: false, now: NOW });
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
    return { cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
  }

  const registerBody = { subjectRef: "subject-1", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "OPERATOR_INITIATED" };

  it("answers dataHandle false to the owner, who needs DATA_ADMIN as well, and true to the data admin", async () => {
    const owner = await signIn("owner");
    const admin = await signIn("admin");
    const asOwner = await app.inject({ method: "GET", url: "/channels/channel-1/data/capabilities", headers: { cookie: owner.cookie } });
    const asAdmin = await app.inject({ method: "GET", url: "/channels/channel-1/data/capabilities", headers: { cookie: admin.cookie } });
    expect(asOwner.json()).toEqual({ dataHandle: false });
    expect(asAdmin.json()).toEqual({ dataHandle: true });
  });

  it("refuses the panel and the request routes to the owner, the moderator and an outsider", async () => {
    for (const loginName of ["owner", "mod", "outsider"]) {
      const session = await signIn(loginName);
      const subject = await app.inject({
        method: "GET",
        url: "/channels/channel-1/data/subjects/subject-1",
        headers: { cookie: session.cookie },
      });
      expect(subject.statusCode, loginName).toBe(403);
      expect(subject.json()).toEqual({ error: "FORBIDDEN" });
      const created = await app.inject({
        method: "POST",
        url: "/channels/channel-1/data/requests",
        headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
        payload: registerBody,
      });
      expect(created.statusCode, loginName).toBe(403);
    }
  });

  it("lets the data admin register, read and decide, and writes the same answer the module gives", async () => {
    const admin = await signIn("admin");
    const created = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: registerBody,
    });
    expect(created.statusCode).toBe(201);
    const requestId = (created.json() as { requestId: string }).requestId;
    const decided = await app.inject({
      method: "POST",
      url: `/channels/channel-1/data/requests/${requestId}/verification`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(decided.statusCode).toBe(200);
    expect(decided.json()).toMatchObject({ stage: "AWAITING_EXECUTION", execution: "PENDING" });
    expect(decided.headers["cache-control"]).toBe("no-store");
  });

  it("refuses a state-changing request without the CSRF token", async () => {
    const admin = await signIn("admin");
    const response = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers: { cookie: admin.cookie },
      payload: registerBody,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "CSRF_INVALID" });
  });

  it("refuses a request with no session, and a downstream token on every data route", async () => {
    const anonymous = await app.inject({ method: "GET", url: "/channels/channel-1/data/subjects/subject-1" });
    expect(anonymous.statusCode).toBe(401);

    const owner = await signIn("owner");
    const issued = await app.inject({
      method: "POST",
      url: "/channels/channel-1/output-tokens",
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    const token = (issued.json() as { token: string }).token;
    const read = await app.inject({
      method: "GET",
      url: "/channels/channel-1/data/subjects/subject-1",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(read.statusCode).toBe(403);
    expect(read.json()).toEqual({ error: "FORBIDDEN" });
    const write = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers: { authorization: `Bearer ${token}` },
      payload: registerBody,
    });
    expect(write.statusCode).toBe(403);
  });

  it("refuses a malformed body with the fixed code, and a body with an unexpected field", async () => {
    const admin = await signIn("admin");
    const malformed = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf, "content-type": "application/json" },
      payload: "{not json",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ error: "INVALID_REQUEST" });

    const extra = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { ...registerBody, nickname: "Synthetic Name" },
    });
    expect(extra.statusCode).toBe(400);
  });

  it("exposes no material route: controlled material is a server function, not an HTTP resource", async () => {
    const admin = await signIn("admin");
    const response = await app.inject({
      method: "GET",
      url: "/channels/channel-1/data/requests/any-id/material",
      headers: { cookie: admin.cookie },
    });
    expect(response.statusCode).toBe(404);
  });
});
