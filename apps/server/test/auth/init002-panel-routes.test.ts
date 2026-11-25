import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import { resolveEffectivePermissions } from "../../src/auth/permissions.js";
import { createSession } from "../../src/auth/session.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import { channels, deliveries, ruleTerms, ruleVersions, verdicts, wordlistSnapshots } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const NOW = new Date();
const PASSWORD = "test-password-1234";
const CH1 = "ch-init002-1";

describe("INIT-002 extended panel & RBAC routes (VOXWARD-STORY-036)", () => {
  let dir: string;
  let db: VoxwardDatabase;
  let app: FastifyInstance;

  async function signIn(loginName: string, displayName: string) {
    const account = await createAccount(db, { loginName, displayName, password: PASSWORD, now: NOW });
    const session = runShortTransaction(db, (tx) => createSession(tx, { accountId: account.accountId, now: NOW }));
    return { accountId: account.accountId, cookie: `vw_session=${session.token}`, csrf: session.csrfToken };
  }

  beforeEach(async () => {
    dir = scratchDirectory("init002-panel-");
    db = migratedDatabase(dir);
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values({ id: CH1, platform: "youtube", platformChannelRef: "yt-ch-1", displayName: "Main Room", createdAt: T0, updatedAt: T0 })
        .run();
      SubjectStore.create(tx, { id: "sub-1", channelId: CH1, platformSubjectKey: "yt-viewer-001", createdAt: T0 });
      const ev = ChannelEventStore.recordIfNew(tx, {
        id: "ev-blk-1",
        channelId: CH1,
        subjectId: "sub-1",
        platformMessageRef: "pm-blk-1",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-blk-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      TaskStore.create(tx, {
        id: "task-blk-1",
        eventId: ev.id,
        kind: "REALTIME_REVIEW",
        deadlineAt: "2099-01-01T00:00:00.000Z",
        createdAt: T0,
      });
      tx.insert(verdicts)
        .values({
          id: "v-blk-1",
          eventId: ev.id,
          taskId: "task-blk-1",
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

  it("enforces Deny > Grant > Not Set across multiple roles in pure resolver and HTTP endpoints", async () => {
    const resolved = resolveEffectivePermissions([
      {
        id: "r1",
        name: "Mod",
        permissions: { "queue.read": "GRANT", "review.decide": "GRANT", "logs.view": "NOT_SET" },
      },
      {
        id: "r2",
        name: "Restrictor",
        permissions: { "review.decide": "DENY", "logs.view": "NOT_SET" },
      },
    ]);
    expect(resolved.find((e) => e.capability === "queue.read")?.effect).toBe("ALLOW");
    expect(resolved.find((e) => e.capability === "review.decide")).toMatchObject({ effect: "DENY", decidedBy: "DENY_RULE" });
    expect(resolved.find((e) => e.capability === "logs.view")).toMatchObject({ effect: "DENY", decidedBy: "DEFAULT_DENY" });

    const owner = await signIn("owner-rbac", "Owner");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
    });

    const roleRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/roles`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { name: "Deny Review", permissions: { "review.decide": "DENY", "queue.read": "GRANT" } },
    });
    expect(roleRes.statusCode).toBe(201);
    const createdRoleId = (roleRes.json() as { role: { id: string } }).role.id;

    const userRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        accountId: "acc-multi",
        displayName: "Multi User",
        loginName: "multi",
        enabled: true,
        roleIds: ["role-moderator", createdRoleId],
      },
    });
    expect(userRes.statusCode).toBe(201);
    const eff = (userRes.json() as { user: { effectivePermissions: Array<{ capability: string; effect: string }> } }).user.effectivePermissions;
    expect(eff.find((p) => p.capability === "review.decide")?.effect).toBe("DENY");
    expect(eff.find((p) => p.capability === "queue.read")?.effect).toBe("ALLOW");

    // Hydrates existing channel_members on GET /rbac/users when rbac-users setting was never initialized
    const rbacList = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/rbac/users`,
      headers: { cookie: owner.cookie },
    });
    expect(rbacList.statusCode).toBe(200);
    const listedUsers = (rbacList.json() as { users: Array<{ accountId: string; roleIds: string[] }> }).users;
    expect(listedUsers.some((u) => u.accountId === owner.accountId && u.roleIds.includes("role-owner"))).toBe(true);
    expect(listedUsers.some((u) => u.accountId === "acc-multi")).toBe(true);
  });

  it("handles term categories/REGEX/CSV, manual blocked users, score-only rejudge, adapters + Integration Log", async () => {
    const owner = await signIn("owner-ext", "Owner Ext");
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: CH1, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, now: NOW });
    });

    // Append-only term category
    const catRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/term-categories`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { code: "scam-links", label: "诈骗外链", listKind: "BLACKLIST" },
    });
    expect(catRes.statusCode).toBe(201);

    // Invalid REGEX is rejected with Q12 hint
    const badRegex = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/term-entries`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        entries: [{ id: "t1", listKind: "BLACKLIST", term: "(spam|scam)", categoryCode: "scam-links", matchKind: "REGEX", enabled: true }],
      },
    });
    expect(badRegex.statusCode).toBe(400);

    // Valid CSV import (including UTF-8 BOM and RFC-4180 quoted regex pattern with comma)
    const csvRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/term-entries/import-csv`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        listKind: "BLACKLIST",
        csvText:
          '\uFEFFterm,category,matchKind\nbuy-cheap,scam-links,EXACT\nfree-nitro|airdrop,scam-links,REGEX\n"加微[vV]信?\\d{4,8}",scam-links,REGEX',
      },
    });
    expect(csvRes.statusCode).toBe(200);
    expect((csvRes.json() as { imported: number; errors: unknown[] })).toMatchObject({
      imported: 3,
      errors: [],
    });

    // Unified relational storage, whitelist preview, version rollback, and PUT /rules wordlist preservation
    const dbTermsAfterCsv = db.orm.select().from(ruleTerms).all().filter((r) => r.channelId === CH1 && r.retiredAt === null);
    expect(dbTermsAfterCsv).toHaveLength(3);
    const dbSnapshotsAfterCsv = db.orm.select().from(wordlistSnapshots).all().filter((s) => s.channelId === CH1);
    expect(dbSnapshotsAfterCsv.length).toBeGreaterThanOrEqual(1);

    const putEntries = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/term-entries`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        entries: [
          {
            id: "bl-contains",
            listKind: "BLACKLIST",
            term: "grass",
            categoryCode: "scam-links",
            matchKind: "CONTAINS",
            enabled: true,
            language: "en",
            action: "REVIEW",
          },
          {
            id: "wl-contains",
            listKind: "WHITELIST",
            term: "lemongrass",
            categoryCode: "friendly",
            matchKind: "CONTAINS",
            enabled: true,
            language: "en",
            action: "REVIEW",
          },
        ],
      },
    });
    expect(putEntries.statusCode).toBe(200);
    const vAfterPut = (putEntries.json() as { version: number }).version;
    expect(vAfterPut).toBeGreaterThan(1);

    const previewRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/term-entries/preview`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { text: "drinking lemongrass tea" },
    });
    expect(previewRes.statusCode).toBe(200);
    expect(previewRes.json()).toMatchObject({
      hits: [],
      whitelistMatches: ["wl-contains"],
      action: null,
    });

    const previewHit = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/term-entries/preview`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { text: "green grass" },
    });
    expect(previewHit.statusCode).toBe(200);
    expect(previewHit.json()).toMatchObject({
      hits: ["bl-contains"],
      whitelistMatches: [],
      action: "REVIEW",
    });

    const versionsRes = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/term-entries/versions`,
      headers: { cookie: owner.cookie },
    });
    expect(versionsRes.statusCode).toBe(200);
    const versionsList = (versionsRes.json() as { versions: Array<{ version: number }> }).versions;
    expect(versionsList.length).toBeGreaterThanOrEqual(2);
    const prevVersion = versionsList[1]!.version;

    const rollbackRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/term-entries/rollback`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { version: prevVersion },
    });
    expect(rollbackRes.statusCode).toBe(200);
    const rolledEntries = (rollbackRes.json() as { entries: Array<{ term: string }> }).entries;
    expect(rolledEntries.map((e) => e.term)).toContain("buy-cheap");

    const rulesSave = await app.inject({
      method: "PUT",
      url: `/channels/${CH1}/rules`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        version: "v-custom",
        groups: [{ id: "custom-digits", action: { kind: "REVIEW" }, rules: [{ id: "r-d", kind: "regex", source: "[0-9]{5}" }] }],
      },
    });
    expect(rulesSave.statusCode).toBe(200);
    const latestRuleRow = db.orm.select().from(ruleVersions).all().filter((r) => r.channelId === CH1).pop();
    expect(latestRuleRow?.ruleJson).toContain("custom-digits");
    expect(latestRuleRow?.ruleJson).toContain("admin-wordlist-review");

    // Manual blacklist with YouTube sync banId + unban
    const blkUser = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/blocked-users`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { subjectRef: "yt-viewer-001", nickname: "BadViewer", reason: "恶意刷屏", syncYouTube: true },
    });
    expect(blkUser.statusCode).toBe(201);
    const usersList = (blkUser.json() as { users: Array<{ banId: string | null }> }).users;
    expect(usersList[0]?.banId).toMatch(/^yt-ban-/);

    const unban = await app.inject({
      method: "DELETE",
      url: `/channels/${CH1}/blocked-users/yt-viewer-001?restoreBaseScore=true`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(unban.statusCode).toBe(200);
    expect((unban.json() as { youtubeUnbanned: boolean; restoreBaseScoreApplied: boolean }).youtubeUnbanned).toBe(true);

    // Blocked rejudge: updates verdict/score WITHOUT queueing any PENDING OBS/blivechat delivery
    const rejudge = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/blocked/ev-blk-1/rejudge`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: { classification: "ALLOW_NOISE", operationId: "op-rejudge-1" },
    });
    expect(rejudge.statusCode).toBe(200);
    expect(rejudge.json()).toMatchObject({ scoreOnly: true, downstreamReissued: false });
    const pendingDeliveries = db.orm.select().from(deliveries).all().filter((d) => d.status === "PENDING");
    expect(pendingDeliveries).toHaveLength(0);

    // Adapters + secret redaction + fetch-models + Integration Log with redacted Authorization header & Raw Body
    const adpCreate = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "AI_PROVIDER",
        driverId: "openai-compat",
        displayName: "Primary OpenAI",
        enabled: true,
        config: { baseEndpoint: "https://api.example.test/v1", apiKey: "sk-supersecret1234" },
      },
    });
    expect(adpCreate.statusCode).toBe(201);
    const createdAdapter = (adpCreate.json() as { adapter: { id: string; config: { apiKey: string } } }).adapter;
    expect(createdAdapter.config.apiKey).toContain("••••");
    expect(createdAdapter.config.apiKey).not.toContain("supersecret1234");

    const actionRes = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters/${createdAdapter.id}/actions/fetch-models`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
    });
    expect(actionRes.statusCode).toBe(200);

    const modelRes = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/model-settings`,
      headers: { cookie: owner.cookie },
    });
    expect(modelRes.statusCode).toBe(200);
    expect(JSON.stringify(modelRes.json())).toContain("gpt-4.1-mini");

    const intLogs = await app.inject({
      method: "GET",
      url: `/internal/channels/${CH1}/logs/integration`,
      headers: { cookie: owner.cookie },
    });
    expect(intLogs.statusCode).toBe(200);
    const intItems = (intLogs.json() as { items: Array<{ requestHeaders: Record<string, string>; rawResponseBody: string }> }).items;
    expect(intItems).toHaveLength(1);
    expect(intItems[0]?.requestHeaders.authorization).toBe("[REDACTED]");
    expect(intItems[0]?.rawResponseBody).toContain("modelCount");

    // Catalog includes OUTPUT_TARGET adapters (OBS & native readonly protocol) and creation succeeds
    const catalogRes = await app.inject({
      method: "GET",
      url: `/channels/${CH1}/adapters/catalog`,
      headers: { cookie: owner.cookie },
    });
    expect(catalogRes.statusCode).toBe(200);
    const catalog = (catalogRes.json() as { catalog: Array<{ driverId: string; category: string }> }).catalog;
    expect(catalog.some((c) => c.category === "OUTPUT_TARGET" && c.driverId === "obs-overlay-source")).toBe(true);
    expect(catalog.some((c) => c.category === "OUTPUT_TARGET" && c.driverId === "native-readonly-protocol")).toBe(true);

    const obsCreate = await app.inject({
      method: "POST",
      url: `/channels/${CH1}/adapters`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf },
      payload: {
        category: "OUTPUT_TARGET",
        driverId: "obs-overlay-source",
        displayName: "OBS Main Overlay",
        enabled: true,
        config: { roomId: CH1, showOriginalText: true, showTranslation: true },
      },
    });
    expect(obsCreate.statusCode).toBe(201);
  });
});
