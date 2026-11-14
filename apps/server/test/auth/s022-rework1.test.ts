import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import {
  channels,
  listEntries,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date("2026-11-14T08:00:00.000Z");
const PASSWORD = "test-password-1234";
const CH1 = "channel-rw1";

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
  dir = scratchDirectory("s022-rw1-");
  db = migratedDatabase(dir);
  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values({ id: CH1, platform: "youtube", platformChannelRef: "yt-rw1", displayName: "RW1", createdAt: T0, updatedAt: T0 })
      .run();
    SubjectStore.create(tx, { id: "sub-uuid-1", channelId: CH1, platformSubjectKey: "yt-viewer-abc", createdAt: T0 });
  });
  app = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
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

describe("S022 Rework 1 server fixes (B10, N12a)", () => {
  it("B10a: returns platformSubjectKey in subjectRef so editSubjectList returns 200 and persists list_entries", async () => {
    const mod = await signIn("rw1-mod", "Mod");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: mod.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      const ev = ChannelEventStore.recordIfNew(tx, {
        id: "ev-b10a",
        channelId: CH1,
        subjectId: "sub-uuid-1",
        platformMessageRef: "pm-b10a",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-b10a",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-b10a",
        eventId: ev.id,
        kind: "REALTIME_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-b10a",
          eventId: ev.id,
          seq: 1,
          classification: "BLOCK",
          downstream: "BLOCK",
          source: "MANUAL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();
    });

    const dockRes = await app.inject({ method: "GET", url: `/channels/${CH1}/dock`, headers: { cookie: mod.cookie } });
    expect(dockRes.statusCode).toBe(200);
    const body = dockRes.json() as {
      feed: {
        reviewQueue: Array<{ subjectRef: string }>;
        blockedItems: Array<{ subjectRef: string; bodyFolded: boolean }>;
        liveStream: Array<{ subjectRef: string }>;
      };
    };
    expect(body.feed.reviewQueue[0]?.subjectRef).toBe("yt-viewer-abc");
    expect(body.feed.blockedItems[0]?.subjectRef).toBe("yt-viewer-abc");
    expect(body.feed.blockedItems[0]?.bodyFolded).toBe(true);
    expect(body.feed.liveStream[0]?.subjectRef).toBe("yt-viewer-abc");

    const banRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/lists/subjects`,
      headers: { cookie: mod.cookie, "x-csrf-token": mod.csrf },
      payload: { subjectKey: body.feed.blockedItems[0]!.subjectRef, listKind: "BLACKLIST" },
    });
    expect(banRes.statusCode).toBe(200);
    expect(banRes.json()).toMatchObject({ status: "applied" });
    const rows = db.orm.select().from(listEntries).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.listKind).toBe("BLACKLIST");
  });

  it("B10b-1 & B10b-2: excludes ALLOW_NOISE and plain chat without SC evidence from approvedSc; keeps bodyFolded=true with originalText for message.original", async () => {
    const mod = await signIn("rw1-mod2", "Mod 2");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: mod.accountId, role: "MODERATOR", logAccess: false, now: NOW });

      const evNoise = ChannelEventStore.recordIfNew(tx, {
        id: "ev-noise",
        channelId: CH1,
        subjectId: "sub-uuid-1",
        platformMessageRef: "pm-noise",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-noise",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-noise",
          eventId: evNoise.id,
          seq: 1,
          classification: "ALLOW_NOISE",
          downstream: "ALLOW",
          source: "MANUAL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();

      const evChat = ChannelEventStore.recordIfNew(tx, {
        id: "ev-chat",
        channelId: CH1,
        subjectId: "sub-uuid-1",
        platformMessageRef: "pm-chat",
        platformOrder: 2,
        receivedAt: T0,
        correlationId: "corr-chat",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-chat",
          eventId: evChat.id,
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "MANUAL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();
      tx.insert(technicalLogs)
        .values({
          id: "log-chat",
          sequence: 1,
          channelId: CH1,
          correlationId: "corr-chat",
          stage: "INGEST",
          status: "OK",
          createdAt: T0,
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
      tx.insert(technicalLogEvidence)
        .values({
          id: "evid-chat",
          logId: "log-chat",
          evidenceKind: "MESSAGE_TEXT",
          payload: "plain chat hello",
          payloadBytes: Buffer.byteLength("plain chat hello", "utf8"),
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();

      const evSc = ChannelEventStore.recordIfNew(tx, {
        id: "ev-sc",
        channelId: CH1,
        subjectId: "sub-uuid-1",
        platformMessageRef: "pm-sc",
        platformOrder: 3,
        receivedAt: T0,
        correlationId: "corr-sc",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-sc",
        eventId: evSc.id,
        kind: "PAID_TEXT_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-sc",
          eventId: evSc.id,
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "MANUAL",
          isCurrent: 1,
          decidedAt: T0,
          decidedByRef: "system",
        })
        .run();

      const evBlk = ChannelEventStore.recordIfNew(tx, {
        id: "ev-blk",
        channelId: CH1,
        subjectId: "sub-uuid-1",
        platformMessageRef: "pm-blk",
        platformOrder: 4,
        receivedAt: T0,
        correlationId: "corr-blk",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-blk",
          eventId: evBlk.id,
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
          id: "log-blk",
          sequence: 2,
          channelId: CH1,
          correlationId: "corr-blk",
          stage: "INGEST",
          status: "OK",
          createdAt: T0,
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
      tx.insert(technicalLogEvidence)
        .values({
          id: "evid-blk",
          logId: "log-blk",
          evidenceKind: "MESSAGE_TEXT",
          payload: "secret blocked body",
          payloadBytes: Buffer.byteLength("secret blocked body", "utf8"),
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
    });

    const res = await app.inject({ method: "GET", url: `/channels/${CH1}/dock`, headers: { cookie: mod.cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      feed: {
        approvedSc: Array<{ eventId: string }>;
        liveStream: Array<{ eventId: string }>;
        blockedItems: Array<{ eventId: string; bodyFolded: boolean; originalText: string | null }>;
      };
    };
    expect(body.feed.approvedSc.map((i) => i.eventId)).toEqual(["ev-sc"]);
    expect(body.feed.liveStream.map((i) => i.eventId)).toEqual(["ev-blk", "ev-sc", "ev-chat", "ev-noise"]);
    expect(body.feed.blockedItems[0]).toMatchObject({
      eventId: "ev-blk",
      bodyFolded: true,
      originalText: "secret blocked body",
    });
  });

  it("N12a: rejects invalid scoring bounds order with 400", async () => {
    const owner = await signIn("rw1-owner", "Owner");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
    });

    const badOrder = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/admin-settings`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        scoring: { initialScore: 10, minScore: 50, maxScore: 100, rewardDelta: 2, penaltyDelta: 10 },
        queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 15000 },
        retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
      },
    });
    expect(badOrder.statusCode).toBe(400);
    expect(badOrder.json()).toMatchObject({ error: "INVALID_REQUEST" });

    const goodOrder = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/admin-settings`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        scoring: { initialScore: 50, minScore: 0, maxScore: 100, rewardDelta: 2, penaltyDelta: 10 },
        queue: { realtimeConcurrency: 4, scConcurrency: 2, reviewBatchSize: 20, taskDeadlineMs: 15000 },
        retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
      },
    });
    expect(goodOrder.statusCode).toBe(200);
  });
});
