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
import { createInvalidationBus, type InvalidationEvent } from "../../src/modules/audit-store/index.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

/*
 * VW-SUB036 over HTTP. The execute route runs a verified deletion, and the deletion publishes on the bus that the app was
 * given. The viewer cache listens to the same bus (Q35). Synthetic data only.
 */

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const NOW = new Date(T0);

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("execute route over HTTP (VW-SUB036-AC001, Q35)", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;
  let events: InvalidationEvent[];

  beforeEach(async () => {
    directory = scratchDirectory("data-execute-");
    database = migratedDatabase(directory);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({ id: "channel-1", platform: "youtube", platformChannelRef: "UC-channel-1", displayName: "channel-1", createdAt: T0, updatedAt: T0 })
        .run();
      SubjectStore.create(tx, { id: "subject-1", channelId: "channel-1", platformSubjectKey: "synthetic-key-1", createdAt: T0 });
    });
    const admin = (await createAccount(database, { loginName: "admin", displayName: "Admin", password: PASSWORD, now: NOW })).accountId;
    const moderator = (await createAccount(database, { loginName: "mod", displayName: "Mod", password: PASSWORD, now: NOW })).accountId;
    runShortTransaction(database, (tx) => {
      grantMembership(tx, { channelId: "channel-1", accountId: admin, role: "DATA_ADMIN", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: "channel-1", accountId: moderator, role: "MODERATOR", logAccess: false, now: NOW });
    });
    const bus = createInvalidationBus();
    events = [];
    bus.subscribe((event) => events.push(event));
    app = buildApp({ modules: buildRegistry(config), logger: false, database, invalidation: bus });
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

  it("runs a verified deletion to completion and publishes the certified rows on the app's bus", async () => {
    const admin = await signIn("admin");
    const headers = { cookie: admin.cookie, "x-csrf-token": admin.csrf };
    const created = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests",
      headers,
      payload: { subjectRef: "subject-1", kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "OPERATOR_INITIATED" },
    });
    expect(created.statusCode).toBe(201);
    const requestId = (created.json() as { requestId: string }).requestId;
    const decided = await app.inject({
      method: "POST",
      url: `/channels/channel-1/data/requests/${requestId}/verification`,
      headers,
      payload: { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" },
    });
    expect(decided.statusCode).toBe(200);

    const executed = await app.inject({ method: "POST", url: `/channels/channel-1/data/requests/${requestId}/execute`, headers });

    expect(executed.statusCode).toBe(200);
    expect(executed.json()).toMatchObject({ execution: "COMPLETED", stage: "COMPLETED" });
    expect(events.some((event) => event.reason === "DELETED" && event.changeLogIds.length > 0)).toBe(true);
  });

  it("refuses execution to a moderator, who holds no data capability", async () => {
    const moderator = await signIn("mod");
    const response = await app.inject({
      method: "POST",
      url: "/channels/channel-1/data/requests/request-1/execute",
      headers: { cookie: moderator.cookie, "x-csrf-token": moderator.csrf },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "FORBIDDEN" });
  });
});
