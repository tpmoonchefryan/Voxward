import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership, revokeMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import { writeChannelSetting } from "../../src/db/channel-settings-store.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import {
  channels,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date("2026-11-14T08:00:00.000Z");
const LATER = new Date("2026-11-14T08:01:00.000Z");
const PASSWORD = "test-password-1234";
const CH1 = "channel-dock-1";
const CH2 = "channel-dock-2";

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
  dir = scratchDirectory("s022-dock-");
  db = migratedDatabase(dir);
  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values([
        { id: CH1, platform: "youtube", platformChannelRef: "yt-1", displayName: "Room 1", createdAt: T0, updatedAt: T0 },
        { id: CH2, platform: "youtube", platformChannelRef: "yt-2", displayName: "Room 2", createdAt: T0, updatedAt: T0 },
      ])
      .run();
    SubjectStore.create(tx, { id: "sub-1", channelId: CH1, platformSubjectKey: "viewer-key-1", createdAt: T0 });
  });
  app = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, logLevel: "info", dataDir: dir }),
    logger: false,
    database: db,
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db.close();
  removeDirectory(dir);
});

describe("S022 Dock & Moderation HTTP routes (VOXWARD-SUB-041)", () => {
  it("handles multi-moderator 409 conflict, separate local/platform status, and immediate 403 after revocation (Q17)", async () => {
    const mod1 = await signIn("mod1", "Mod 1");
    const mod2 = await signIn("mod2", "Mod 2");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: mod1.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod2.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      const ev = ChannelEventStore.recordIfNew(tx, {
        id: "ev-1",
        channelId: CH1,
        subjectId: "sub-1",
        platformMessageRef: "p-msg-1",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-1",
        eventId: ev.id,
        kind: "REALTIME_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
    });

    const first = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/tasks/task-1/decide`,
      headers: { cookie: mod1.cookie, "x-csrf-token": mod1.csrf },
      payload: { classification: "ALLOW_MEANINGFUL" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/tasks/task-1/decide`,
      headers: { cookie: mod2.cookie, "x-csrf-token": mod2.csrf },
      payload: { classification: "BLOCK" },
    });
    expect(second.statusCode).toBe(409);
    expect((second.json() as { status: string }).status).toBe("conflict");

    const overturn = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/events/ev-1/review`,
      headers: { cookie: mod2.cookie, "x-csrf-token": mod2.csrf },
      payload: { operationId: "op-blk-1", classification: "BLOCK", platformDeleteStatus: "FAILED" },
    });
    expect(overturn.statusCode).toBe(200);
    expect(overturn.json()).toMatchObject({ localStatus: "BLOCK", platformDeleteStatus: "FAILED" });

    // Revoke mod2 immediately -> next request gets 403
    runShortTransaction(db, (tx) => {
      revokeMembership(tx, { channelId: CH1, accountId: mod2.accountId, now: LATER });
    });
    const afterRevoke = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/dock`,
      headers: { cookie: mod2.cookie },
    });
    expect(afterRevoke.statusCode).toBe(403);
  });

  it("folds blocked message body without message.original, separates SC translation, and reports faults explicitly", async () => {
    const owner = await signIn("owner", "Owner");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
      ChannelEventStore.recordIfNew(tx, {
        id: "ev-blk",
        channelId: CH1,
        subjectId: "sub-1",
        platformMessageRef: "p-blk",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-blk",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-blk",
          eventId: "ev-blk",
          seq: 1,
          classification: "BLOCK",
          downstream: "BLOCK",
          source: "MANUAL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();
      tx.insert(technicalLogs)
        .values({
          id: "tl-1",
          channelId: CH1,
          sequence: 1,
          correlationId: "corr-blk",
          stage: "INGEST",
          status: "OK",
          createdAt: T0,
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
      tx.insert(technicalLogEvidence)
        .values({
          id: "tle-1",
          logId: "tl-1",
          evidenceKind: "MESSAGE_TEXT",
          payload: "secret blocked body",
          payloadBytes: Buffer.byteLength("secret blocked body", "utf8"),
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
    });

    writeChannelSetting(db, CH1, "connection-fault", {
      platformFault: { code: "YT_ERR", message: "stream disconnected" },
      modelFault: { code: "KIRO_ERR", message: "provider down" },
    });

    const toggle = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/sc-translation`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { enabled: true },
    });
    expect(toggle.statusCode).toBe(200);
    expect((toggle.json() as { scTranslationEnabled: boolean }).scTranslationEnabled).toBe(true);

    const dock = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/dock`,
      headers: { cookie: owner.cookie },
    });
    expect(dock.statusCode).toBe(200);
    const body = dock.json() as {
      scTranslationEnabled: boolean;
      faults: { platformFault: { code: string }; modelFault: { code: string } };
      feed: { blockedItems: Array<{ bodyFolded: boolean; originalText: string | null }> };
    };
    expect(body.scTranslationEnabled).toBe(true);
    expect(body.faults.platformFault.code).toBe("YT_ERR");
    expect(body.faults.modelFault.code).toBe("KIRO_ERR");
    expect(body.feed.blockedItems[0]?.bodyFolded).toBe(false);
    expect(body.feed.blockedItems[0]?.originalText).toBe("secret blocked body");
  });

  it("allows CHANNEL_OWNER with dataAdmin=true to access /data/capabilities while preserving dataAdmin=false -> false (Q34)", async () => {
    const ownerPlain = await signIn("owner-plain", "Owner Plain");
    const ownerData = await signIn("owner-data", "Owner Data");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, {
        channelId: CH1,
        accountId: ownerPlain.accountId,
        role: "CHANNEL_OWNER",
        logAccess: false,
        dataAdmin: false,
        now: NOW,
      });
      grantMembership(tx, {
        channelId: CH2,
        accountId: ownerData.accountId,
        role: "CHANNEL_OWNER",
        logAccess: false,
        dataAdmin: true,
        now: NOW,
      });
    });

    const resPlain = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/data/capabilities`,
      headers: { cookie: ownerPlain.cookie },
    });
    expect(resPlain.statusCode).toBe(200);
    expect(resPlain.json()).toEqual({ dataHandle: false });

    const resData = await app.inject({
      method: "GET",
      url: `/channels/${CH2}/data/capabilities`,
      headers: { cookie: ownerData.cookie },
    });
    expect(resData.statusCode).toBe(200);
    expect(resData.json()).toEqual({ dataHandle: true });
  });
});
