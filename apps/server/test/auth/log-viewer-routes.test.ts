import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import type { ServerConfig } from "../../src/config/schema.js";
import { createAuditLogPort } from "../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import {
  createAuditStore,
  createInvalidationBus,
  type AuditAccess,
  type AuditService,
  type InvalidationBus,
} from "../../src/modules/audit-store/index.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { redactText } from "../../src/security/redaction.js";
import { migratedDatabase, removeDirectory, scratchDirectory, seedChannelAndSubject, T0 } from "../db/helpers.js";
import { technicalEntry } from "../audit-store/viewer/viewer-helpers.js";

/*
 * VW-SUB031-AC001 over HTTP. Every request goes through the real session check, the real permission tables and the real
 * SQLite database. The data is synthetic.
 */

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const NOW = new Date(T0);
const CH1 = "channel-1";
const CH2 = "channel-2";
const NO_ACCESS: AuditAccess = { channelsFor: () => [], capabilitiesFor: () => new Set<string>() };

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

describe("internal log viewer routes", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;
  let bus: InvalidationBus;
  let writer: AuditService;
  let chainIds: string[];
  let otherChannelId: string;

  beforeEach(async () => {
    directory = scratchDirectory("log-viewer-routes-");
    database = migratedDatabase(directory);
    seedChannelAndSubject(database, "1");
    seedChannelAndSubject(database, "2");

    const owner = await createAccount(database, { loginName: "owner", displayName: "Owner", password: PASSWORD, now: NOW });
    const moderator = await createAccount(database, { loginName: "moderator", displayName: "Moderator", password: PASSWORD, now: NOW });
    const dataAdmin = await createAccount(database, { loginName: "data-admin", displayName: "Data admin", password: PASSWORD, now: NOW });
    const otherOwner = await createAccount(database, { loginName: "other", displayName: "Other", password: PASSWORD, now: NOW });
    runShortTransaction(database, (tx) => {
      // Owner: role carries logs.view. Moderator: no log access. Data admin: no role logs.view, but log access granted.
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: moderator.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: dataAdmin.accountId, role: "DATA_ADMIN", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH2, accountId: otherOwner.accountId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
    });

    bus = createInvalidationBus();
    let counter = 0;
    writer = createAuditStore({
      port: createAuditLogPort(database),
      sanitize: redactText,
      newId: () => `http-${++counter}`,
      access: NO_ACCESS,
      clock: () => NOW,
      invalidation: bus,
    });
    const onChannel = { channelId: CH1, subjectRef: "subject-1" };
    chainIds = [
      writer.recordTechnical(
        technicalEntry("corr-1", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "synthetic message one" }], onChannel),
      ).logId,
      writer.recordTechnical(
        technicalEntry(
          "corr-1",
          "JSON_VALIDATE",
          [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-1", classification: "ALLOW" }) }],
          { ...onChannel, modelRef: "model-synthetic-b", taskId: null },
        ),
      ).logId,
      writer.recordTechnical(technicalEntry("corr-1", "COMMIT", [], onChannel)).logId,
    ];
    otherChannelId = writer.recordTechnical(
      technicalEntry("corr-2", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "synthetic message of channel two" }], {
        channelId: CH2,
        subjectRef: "subject-2",
      }),
    ).logId;

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

  function get(url: string, session?: Session, headers: Record<string, string> = {}) {
    return app.inject({ method: "GET", url, headers: { ...(session === undefined ? {} : { cookie: session.cookie }), ...headers } });
  }

  it("refuses a request with no session", async () => {
    const response = await get(`/internal/channels/${CH1}/logs/technical`);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  it("refuses a downstream output credential, which carries no log capability", async () => {
    const owner = await signIn("owner");
    const issued = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/output-tokens`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(issued.statusCode).toBe(201);
    const token = (issued.json() as { token: string }).token;

    const response = await get(`/internal/channels/${CH1}/logs/technical`, undefined, { authorization: `Bearer ${token}` });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("refuses a member without logs.view on every viewer route", async () => {
    const moderator = await signIn("moderator");
    const urls = [
      `/internal/channels/${CH1}/logs/change`,
      `/internal/channels/${CH1}/logs/technical`,
      `/internal/channels/${CH1}/logs/technical/${chainIds[0] ?? ""}`,
      `/internal/channels/${CH1}/logs/chains/corr-1`,
    ];
    for (const url of urls) {
      const response = await get(url, moderator);
      expect(response.statusCode, url).toBe(403);
      expect(response.json(), url).toEqual({ error: "FORBIDDEN" });
    }
  });

  it("lists channel entries with no-store and with no content field in the list", async () => {
    const owner = await signIn("owner");

    const response = await get(`/internal/channels/${CH1}/logs/technical?limit=2`, owner);

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
    expect(body.items).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
    expect(body.items.every((item) => !("evidence" in item) && !("data" in item))).toBe(true);
    expect(response.body).not.toContain("synthetic message one");
    expect(response.body).not.toContain("synthetic message of channel two");
  });

  it("returns the content a reader may see, and nothing a reader may not", async () => {
    const owner = await signIn("owner");
    const dataAdmin = await signIn("data-admin");

    const ownerView = (await get(`/internal/channels/${CH1}/logs/technical/${chainIds[0] ?? ""}`, owner)).json() as {
      evidence: Array<{ kind: string; payload: string | null }>;
    };
    expect(ownerView.evidence).toEqual([{ kind: "MESSAGE_TEXT", state: "AVAILABLE", payload: "synthetic message one" }]);

    // A data admin holds subject.evidence and log access, but not message.original.
    const adminFirst = (await get(`/internal/channels/${CH1}/logs/technical/${chainIds[0] ?? ""}`, dataAdmin)).json() as {
      evidence: unknown[];
    };
    expect(adminFirst.evidence).toEqual([]);
    const adminSecond = (await get(`/internal/channels/${CH1}/logs/technical/${chainIds[1] ?? ""}`, dataAdmin)).json() as {
      evidence: Array<{ kind: string }>;
      modelRef: string;
    };
    expect(adminSecond.evidence.map((item) => item.kind)).toEqual(["VALIDATED_JSON"]);
    expect(adminSecond.modelRef).toBe("model-synthetic-b");
  });

  it("does not show another channel's entry, nor its list, to a reader of this channel", async () => {
    const owner = await signIn("owner");
    const otherOwner = await signIn("other");

    const crossDetail = await get(`/internal/channels/${CH1}/logs/technical/${otherChannelId}`, owner);
    expect(crossDetail.statusCode).toBe(404);
    expect(crossDetail.json()).toEqual({ error: "NOT_FOUND" });

    const crossList = await get(`/internal/channels/${CH1}/logs/technical`, otherOwner);
    expect(crossList.statusCode).toBe(403);

    const ownEntryUnderOtherChannel = await get(`/internal/channels/${CH2}/logs/technical/${chainIds[0] ?? ""}`, otherOwner);
    expect(ownEntryUnderOtherChannel.statusCode).toBe(404);
  });

  it("walks a whole chain over HTTP, one page at a time, in sequence order", async () => {
    const owner = await signIn("owner");
    const sequences: number[] = [];
    let cursor: string | null = null;
    do {
      const query = cursor === null ? "limit=2" : `limit=2&cursor=${encodeURIComponent(cursor)}`;
      const response = await get(`/internal/channels/${CH1}/logs/chains/corr-1?${query}`, owner);
      expect(response.statusCode).toBe(200);
      const body = response.json() as { items: Array<{ sequence: number }>; nextCursor: string | null };
      sequences.push(...body.items.map((item) => item.sequence));
      cursor = body.nextCursor;
    } while (cursor !== null);

    expect(sequences).toEqual([0, 1, 2]);
  });

  it("refuses a malformed cursor, an out-of-range page size and an unknown query field with a fixed code", async () => {
    const owner = await signIn("owner");
    const refusals = [
      `/internal/channels/${CH1}/logs/technical?cursor=bogus`,
      `/internal/channels/${CH1}/logs/technical?limit=500`,
      `/internal/channels/${CH1}/logs/technical?limit=abc`,
      `/internal/channels/${CH1}/logs/technical?unknown=1`,
      `/internal/channels/${CH1}/logs/chains/${encodeURIComponent("corr with spaces")}`,
    ];
    for (const url of refusals) {
      const response = await get(url, owner);
      expect(response.statusCode, url).toBe(400);
      expect(response.json(), url).toEqual({ error: "INVALID_REQUEST" });
    }
  });

  it("has no public, downstream or bulk log route", async () => {
    const owner = await signIn("owner");

    expect((await get("/api/logs/technical", owner)).statusCode).toBe(404);
    expect((await get(`/internal/channels/${CH1}/logs/export`, owner)).statusCode).toBe(404);
    const write = await app.inject({
      method: "POST",
      url: `/internal/channels/${CH1}/logs/technical`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {},
    });
    expect(write.statusCode).toBe(404);
  });

  it("stops showing a deleted subject's entries at once, through the same bus the cache listens to", async () => {
    const owner = await signIn("owner");
    const before = await get(`/internal/channels/${CH1}/logs/technical/${chainIds[0] ?? ""}`, owner);
    expect(before.statusCode).toBe(200);

    writer.removeSubject("subject-1");

    const after = await get(`/internal/channels/${CH1}/logs/technical/${chainIds[0] ?? ""}`, owner);
    expect(after.statusCode).toBe(404);
    const list = await get(`/internal/channels/${CH1}/logs/technical`, owner);
    expect((list.json() as { items: unknown[] }).items).toEqual([]);
  });
});
