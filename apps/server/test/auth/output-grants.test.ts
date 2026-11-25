import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { createOutputGrantPort } from "../../src/db/output-store.js";
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

describe("native output grant routes (VW-SUB039-AC001, Q18)", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;

  beforeEach(async () => {
    directory = scratchDirectory("output-grant-routes-");
    database = migratedDatabase(directory);
    for (const id of ["channel-1", "channel-2"]) {
      runShortTransaction(database, (tx) => {
        tx.insert(channels)
          .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
          .run();
      });
    }
    const ownerId = (await createAccount(database, { loginName: "owner", displayName: "Owner", password: PASSWORD, now: NOW })).accountId;
    const modId = (await createAccount(database, { loginName: "mod", displayName: "Mod", password: PASSWORD, now: NOW })).accountId;
    const otherId = (await createAccount(database, { loginName: "other", displayName: "Other", password: PASSWORD, now: NOW })).accountId;
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

  async function issue(session: Session, channelId: string, outputKind?: "NATIVE_V1" | "OBS_OVERLAY" | "BLIVECHAT") {
    return app.inject({
      method: "POST",
      url: `/channels/${channelId}/output-grants`,
      headers: { cookie: session.cookie, "x-csrf-token": session.csrf },
      ...(outputKind === undefined ? {} : { payload: { outputKind } }),
    });
  }

  it("the channel owner gets a credential once, uncached, and the database resolves it to that channel", async () => {
    const owner = await signIn("owner");
    const issued = await issue(owner, "channel-1");

    expect(issued.statusCode).toBe(201);
    expect(issued.headers["cache-control"]).toBe("no-store");
    const body = issued.json() as { grantId: string; credential: string };
    expect(body.credential).toMatch(/^vwo_[A-Za-z0-9_-]{43}$/);
    expect(createOutputGrantPort(database).resolveCredential(body.credential)).toEqual({ grantId: body.grantId, channelId: "channel-1" });

    const stored = database.sqlite.prepare("SELECT COUNT(*) AS n FROM credential_refs WHERE secret_ref = ?").get(body.credential) as { n: number };
    expect(stored.n).toBe(0);
  });

  it("a moderator and an owner of another channel cannot issue a grant for this channel", async () => {
    const moderator = await signIn("mod");
    const other = await signIn("other");

    expect((await issue(moderator, "channel-1")).statusCode).toBe(403);
    expect((await issue(other, "channel-1")).statusCode).toBe(403);
  });

  it("revoking a grant stops its credential at once, a second revoke is not found, and a moderator cannot revoke", async () => {
    const owner = await signIn("owner");
    const moderator = await signIn("mod");
    const { grantId, credential } = (await issue(owner, "channel-1")).json() as { grantId: string; credential: string };
    const port = createOutputGrantPort(database);
    expect(port.resolveCredential(credential)).toBeDefined();

    const refused = await app.inject({
      method: "DELETE",
      url: `/channels/channel-1/output-grants/${grantId}`,
      headers: { cookie: moderator.cookie, "x-csrf-token": moderator.csrf },
    });
    expect(refused.statusCode).toBe(403);
    expect(port.resolveCredential(credential)).toBeDefined();

    const revoked = await app.inject({
      method: "DELETE",
      url: `/channels/channel-1/output-grants/${grantId}`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(revoked.statusCode).toBe(204);
    expect(port.resolveCredential(credential)).toBeUndefined();
    expect(port.isActive(grantId)).toBe(false);

    const again = await app.inject({
      method: "DELETE",
      url: `/channels/channel-1/output-grants/${grantId}`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(again.statusCode).toBe(404);
    expect(again.json()).toEqual({ error: "GRANT_NOT_FOUND" });
  });

  it("issues scoped OBS_OVERLAY and BLIVECHAT grants enforced per output port", async () => {
    const owner = await signIn("owner");
    const obsRes = await issue(owner, "channel-1", "OBS_OVERLAY");
    const bliveRes = await issue(owner, "channel-1", "BLIVECHAT");
    expect(obsRes.statusCode).toBe(201);
    expect(bliveRes.statusCode).toBe(201);

    const obsBody = obsRes.json() as { grantId: string; outputKind: string; credential: string };
    const bliveBody = bliveRes.json() as { grantId: string; outputKind: string; credential: string };
    expect(obsBody.outputKind).toBe("OBS_OVERLAY");
    expect(bliveBody.outputKind).toBe("BLIVECHAT");

    const nativePort = createOutputGrantPort(database, ["NATIVE_V1", "OBS_OVERLAY"]);
    const blivePort = createOutputGrantPort(database, ["NATIVE_V1", "BLIVECHAT"]);
    expect(nativePort.resolveCredential(obsBody.credential)?.grantId).toBe(obsBody.grantId);
    expect(nativePort.resolveCredential(bliveBody.credential)).toBeUndefined();
    expect(blivePort.resolveCredential(bliveBody.credential)?.grantId).toBe(bliveBody.grantId);
    expect(blivePort.resolveCredential(obsBody.credential)).toBeUndefined();
  });
});
