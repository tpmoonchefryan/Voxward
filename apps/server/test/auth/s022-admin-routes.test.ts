import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { createSession } from "../../src/auth/session.js";
import { publishConfirmedCandidateTerm, writeChannelSetting } from "../../src/db/channel-settings-store.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { channels } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { createCandidateStore, type CandidateStore } from "../../src/modules/moderation-engine/index.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date();
const PASSWORD = "test-password-1234";
const CH1 = "channel-admin-1";
const CH2 = "channel-admin-2";

let dir: string;
let db: VoxwardDatabase;
let app: FastifyInstance;
let candidates: CandidateStore;

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
  dir = scratchDirectory("s022-admin-");
  db = migratedDatabase(dir);
  runShortTransaction(db, (tx) => {
    tx.insert(channels)
      .values([
        { id: CH1, platform: "youtube", platformChannelRef: "yt-a1", displayName: "Admin 1", createdAt: T0, updatedAt: T0 },
        { id: CH2, platform: "youtube", platformChannelRef: "yt-a2", displayName: "Admin 2", createdAt: T0, updatedAt: T0 },
      ])
      .run();
  });
  candidates = createCandidateStore({
    newId: () => randomUUID(),
    now: () => NOW,
    rules: {
      publishConfirmedTerm: (input) => publishConfirmedCandidateTerm(db, input),
    },
  });
  app = buildApp({
    modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
    logger: false,
    database: db,
    candidateStore: candidates,
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db.close();
  removeDirectory(dir);
});

describe("S022 Admin HTTP routes & RBAC (VOXWARD-SUB-042)", () => {
  it("forwards Q12 regex admission hints when publishing invalid regex rules", async () => {
    const owner = await signIn("admin-owner", "Owner");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: false, now: NOW });
    });

    const badRuleSet = {
      version: "v1",
      groups: [
        {
          id: "g1",
          action: { kind: "BLOCK" },
          rules: [{ id: "r1", kind: "regex", source: "(foo|bar)" }],
        },
      ],
    };

    const res = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/rules`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: badRuleSet,
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string; issues: Array<{ code: string; hint?: string }> };
    expect(body.error).toBe("RULE_SET_INVALID");
    expect(body.issues[0]?.hint).toBeTruthy();
  });

  it("supports Q50 candidate card list (queue.read) and confirm/reject REJECTED (list.edit), refusing DATA_ADMIN", async () => {
    const mod = await signIn("admin-mod", "Mod");
    const dataAdmin = await signIn("admin-da", "DataAdmin");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: mod.accountId, role: "MODERATOR", logAccess: false, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: dataAdmin.accountId, role: "DATA_ADMIN", logAccess: false, now: NOW });
    });

    const card1 = candidates.propose({ channelId: CH1, term: "badword1", note: "note1", sourceCorrelationId: "c1", sourceTaskId: "t1" });
    const card2 = candidates.propose({ channelId: CH1, term: "badword2", note: "note2", sourceCorrelationId: "c2", sourceTaskId: "t2" });

    const daList = await app.inject({ method: "GET", url: `/channels/${CH1}/candidates`, headers: { cookie: dataAdmin.cookie } });
    expect(daList.statusCode).toBe(403);

    const modList = await app.inject({ method: "GET", url: `/channels/${CH1}/candidates`, headers: { cookie: mod.cookie } });
    expect(modList.statusCode).toBe(200);
    expect((modList.json() as { cards: unknown[] }).cards).toHaveLength(2);

    const confirmRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/candidates/${card1!.id}/confirm`,
      headers: { cookie: mod.cookie, "x-csrf-token": mod.csrf },
    });
    expect(confirmRes.statusCode).toBe(200);
    expect((confirmRes.json() as { card: { status: string } }).card.status).toBe("CONFIRMED");

    const rejectRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/candidates/${card2!.id}/reject`,
      headers: { cookie: mod.cookie, "x-csrf-token": mod.csrf },
    });
    expect(rejectRes.statusCode).toBe(200);
    expect((rejectRes.json() as { card: { status: string } }).card.status).toBe("REJECTED");
  });

  it("enforces channel-scoped Q48 model settings, admin settings, outputs, and cross-channel/role RBAC", async () => {
    const owner1 = await signIn("owner1", "Owner 1");
    const mod1 = await signIn("mod1", "Mod 1");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner1.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
      grantMembership(tx, { channelId: CH1, accountId: mod1.accountId, role: "MODERATOR", logAccess: false, now: NOW });
    });

    // Moderator is refused score.config, members.manage, output.manage, and cross-channel CH2
    expect((await app.inject({ method: "GET", url: `/channels/${CH1}/model-settings`, headers: { cookie: mod1.cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/channels/${CH1}/admin-settings`, headers: { cookie: mod1.cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/channels/${CH1}/outputs`, headers: { cookie: mod1.cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/channels/${CH2}/context`, headers: { cookie: owner1.cookie } })).statusCode).toBe(403);

    // Owner reads real describe() capability report and rejects unsupported model with 422
    const getModels = await app.inject({ method: "GET", url: `/channels/${CH1}/model-settings`, headers: { cookie: owner1.cookie } });
    expect(getModels.statusCode).toBe(200);
    expect((getModels.json() as { capabilities: { providerName: string } }).capabilities.providerName).toBe("synthetic");

    const badModel = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/model-settings`,
      headers: { cookie: owner1.cookie, "x-csrf-token": owner1.csrf },
      payload: {
        realtimeModeration: { modelId: "nonexistent-model", reasoning: null },
        scTranslation: null,
        review: null,
        scTranslationEnabled: false,
      },
    });
    expect(badModel.statusCode).toBe(422);

    const settingsUrl = `/channels/${CH1}/model-settings`;
    const languagePolicy = { sourceLanguage: "auto", targetLanguages: ["ja", "fr"] };
    const saveLanguages = await app.inject({
      method: "PUT", url: settingsUrl,
      headers: { cookie: owner1.cookie, "x-csrf-token": owner1.csrf },
      payload: { realtimeModeration: null, scTranslation: null, review: null, scTranslationEnabled: false, scLanguages: languagePolicy },
    });
    expect(saveLanguages.statusCode).toBe(200);
    const reread = await app.inject({ method: "GET", url: settingsUrl, headers: { cookie: owner1.cookie } });
    expect(reread.json()).toMatchObject({ settings: { scLanguages: languagePolicy } });
    writeChannelSetting(db, CH1, "model-settings", {
      ...reread.json().settings,
      scLanguages: { sourceLanguage: "zh-TW", targetLanguages: ["ja", "fr-CA", "fr"] },
    });
    const legacy = await app.inject({ method: "GET", url: settingsUrl, headers: { cookie: owner1.cookie } });
    expect(legacy.json()).toMatchObject({ settings: { scLanguages: languagePolicy } });
    writeChannelSetting(db, CH1, "model-settings", {
      ...legacy.json().settings,
      scLanguages: { sourceLanguage: "zh-Hans", targetLanguages: ["fr-CA", "en-GB", "fr", "ko-KR", "zh-Hant"] },
    });
    const migrated = await app.inject({ method: "GET", url: settingsUrl, headers: { cookie: owner1.cookie } });
    expect(migrated.json()).toMatchObject({
      settings: { scLanguages: { sourceLanguage: "zh-Hans", targetLanguages: ["fr", "en", "ko"] } },
    });
    const resaved = await app.inject({
      method: "PUT", url: settingsUrl,
      headers: { cookie: owner1.cookie, "x-csrf-token": owner1.csrf },
      payload: migrated.json().settings,
    });
    expect(resaved.statusCode).toBe(200);

    // Owner updates admin-settings
    const saveAdmin = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/admin-settings`,
      headers: { cookie: owner1.cookie, "x-csrf-token": owner1.csrf },
      payload: {
        scoring: { initialScore: 60, minScore: 0, maxScore: 100, rewardDelta: 3, penaltyDelta: 15 },
        queue: { realtimeConcurrency: 6, scConcurrency: 3, reviewBatchSize: 25, taskDeadlineMs: 12000 },
        retention: { changeLogDays: 30, technicalLogDays: 14, evidenceDays: 7 },
      },
    });
    expect(saveAdmin.statusCode).toBe(200);
    expect((saveAdmin.json() as { scoring: { initialScore: number } }).scoring.initialScore).toBe(60);
  });
});
