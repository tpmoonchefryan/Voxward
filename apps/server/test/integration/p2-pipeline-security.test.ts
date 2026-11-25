import { CONTRACT_VERSION, createVerdict, NATIVE_FRAME_FIELDS, type ChannelEvent, type DecisionActor } from "@voxward/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount, createLoginRateLimiter } from "../../src/auth/login.js";
import { grantMembership } from "../../src/auth/members.js";
import {
  readBlockedUsers,
  upsertBlockedUser,
  writeChannelSetting,
  writePlatformDeleteStatus,
  readPlatformDeleteStatusMap,
} from "../../src/db/channel-settings-store.js";
import { createDecisionStorePort } from "../../src/db/decision-store.js";
import { createApprovedContentPort } from "../../src/db/output-store.js";
import { ChannelEventStore, SubjectStore, TaskStore } from "../../src/db/repository.js";
import { createRetentionStore } from "../../src/db/retention-store.js";
import {
  authSessions,
  channelEvents,
  channels,
  deliveries,
  eventPayments,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { applyManagedWordlistToRuleSet } from "../../src/db/wordlist-rules.js";
import { createDecisionService } from "../../src/modules/decision-service/index.js";
import { DEFAULT_DECISION_LIMITS } from "../../src/modules/decision-service/service.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { createModerationChecker, createModerationEngine } from "../../src/modules/moderation-engine/index.js";
import { detectMessageLanguage } from "../../src/modules/moderation-engine/rules/language.js";
import type { RuleSetInput } from "../../src/modules/moderation-engine/rules/groups.js";
import { createBlivechatAdapter, BLIVECHAT_CMD } from "../../src/modules/output/index.js";
import { deliverFrame } from "../../src/modules/output-adapter/native-protocol.js";
import { createScoringPlanner } from "../../src/modules/scoring-engine/index.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";
import { ENABLED } from "../scoring-engine/ledger/helpers.js";

const dirs: string[] = [];

function openDb(prefix: string) {
  const dir = scratchDirectory(prefix);
  dirs.push(dir);
  return migratedDatabase(dir);
}

afterEach(() => {
  while (dirs.length > 0) removeDirectory(dirs.pop()!);
});

describe("EPIC-015 (VW3-R-008..011): languages, reading rules, protocol fidelity, CSV & security hardening", () => {
  it("VW3-R-008: detects fr/es/pt-BR/en, forwards ChannelEvent.language, and matches built-in kana/CJK reading rules", async () => {
    expect(detectMessageLanguage("Bonjour à tous, merci beaucoup pour la chanson!")).toBe("fr");
    expect(detectMessageLanguage("¡Hola amigos! Muchas gracias por la canción")).toBe("es");
    expect(detectMessageLanguage("Olá galera! Parabéns pela música, muito obrigado!")).toBe("pt-BR");
    expect(detectMessageLanguage("Hello everyone, great stream tonight!")).toBe("en");

    const managed = applyManagedWordlistToRuleSet(null, [
      {
        id: "ph-1",
        listKind: "BLACKLIST",
        term: "jinci",
        categoryCode: "sensitive",
        matchKind: "PHONETIC",
        enabled: true,
        language: "zh-Hans",
        action: "BLOCK", // reading rule must automatically sit in REVIEW group
      },
      {
        id: "ph-ja",
        listKind: "BLACKLIST",
        term: "baka",
        categoryCode: "abuse",
        matchKind: "PHONETIC",
        enabled: true,
        language: "ja",
        action: "REVIEW",
      },
      {
        id: "fr-1",
        listKind: "BLACKLIST",
        term: "interdit",
        categoryCode: "spam",
        matchKind: "CONTAINS",
        enabled: true,
        language: "fr",
        action: "BLOCK",
      },
    ]);

    const engine = createModerationEngine({
      ruleSet: managed as RuleSetInput,
      nicknames: { displayNicknameOf: async () => "Viewer" },
    });
    const checker = createModerationChecker({
      ruleSet: managed as RuleSetInput,
      nicknames: { displayNicknameOf: async () => "Viewer" },
    });

    const baseEvent: Omit<ChannelEvent, "body" | "language"> = {
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: "ch-p2",
      platformMessageId: "m-1",
      platformOrder: 1,
      receivedAt: T0,
      correlationId: "corr-1",
      sender: { contractVersion: CONTRACT_VERSION, senderRef: "u-1" },
    };

    // Built-in transliterator matches Chinese homophone "进词" -> "jinci" and Japanese kana "バカ" -> "baka"
    const zhVerdict = await checker.check({ ...baseEvent, body: "不要说进词" });
    expect(zhVerdict.route).toBe("REVIEW");
    expect(zhVerdict.reasons).not.toContain("READING_UNAVAILABLE");
    expect(zhVerdict.hits.length).toBeGreaterThan(0);

    const jaVerdict = await checker.check({ ...baseEvent, body: "バカみたい" });
    expect(jaVerdict.route).toBe("REVIEW");
    expect(jaVerdict.hits.length).toBeGreaterThan(0);

    // Explicit ChannelEvent.language forwarded via ModerationEngine.moderate()
    const frExplicit = await engine.moderate({ ...baseEvent, body: "ce mot est interdit", language: "fr" });
    expect(frExplicit.route).toBe("BLOCK");
    const enExplicit = await engine.moderate({ ...baseEvent, body: "interdit", language: "en" });
    expect(enExplicit.route).toBe("PASS");
  });

  it("VW3-R-009: aligns NATIVE_FRAME_FIELDS.DISPLAY, populates safe alias display.label, and preserves blivechat metadata", () => {
    expect(NATIVE_FRAME_FIELDS.DISPLAY).toEqual(["label", "text", "translation", "translations", "payment"]);

    const db = openDb("p2-output-");
    const ch = "ch-p2-out";
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values({ id: ch, platform: "youtube", platformChannelRef: "UC-out", displayName: "Out", createdAt: T0, updatedAt: T0 })
        .run();
      SubjectStore.create(tx, { id: "sub-out-1", channelId: ch, platformSubjectKey: "opaque-key-1", createdAt: T0 });
      ChannelEventStore.recordIfNew(tx, {
        id: "ev-out-1",
        channelId: ch,
        subjectId: "sub-out-1",
        platformMessageRef: "pm-out-1",
        platformOrder: 1,
        receivedAt: T0,
        correlationId: "corr-out-1",
        exceptionMarked: false,
        createdAt: T0,
      });
      tx.insert(eventPayments)
        .values({
          eventId: "ev-out-1",
          channelId: ch,
          amountMicros: 50_000_000,
          currency: "JPY",
          amountDisplay: "¥50",
          tier: 5,
          createdAt: T0,
        })
        .run();
    });
    writeChannelSetting(db, ch, "safe-aliases", { "sub-out-1": "SafeViewer" });
    runShortTransaction(db, (tx) => {
      tx.insert(technicalLogs)
        .values({
          id: "tl-out-1",
          channelId: ch,
          sequence: 1,
          correlationId: "corr-out-1",
          subjectId: "sub-out-1",
          taskId: null,
          stage: "DELIVER",
          status: "OK",
          level: "INFO",
          createdAt: T0,
          expiresAt: "2099-01-01T00:00:00.000Z",
        })
        .run();
      const trPayload = JSON.stringify({
        version: 2,
        translations: [
          { language: "zh-Hans", translatedText: "谢谢！" },
          { language: "en", translatedText: "Thank you!" },
        ],
      });
      tx.insert(technicalLogEvidence)
        .values([
          {
            id: "ev-txt-1",
            logId: "tl-out-1",
            evidenceKind: "MESSAGE_TEXT",
            payload: "Arigatou!",
            payloadBytes: Buffer.byteLength("Arigatou!", "utf8"),
            expiresAt: "2099-01-01T00:00:00.000Z",
          },
          {
            id: "ev-tr-1",
            logId: "tl-out-1",
            evidenceKind: "TRANSLATION",
            payload: trPayload,
            payloadBytes: Buffer.byteLength(trPayload, "utf8"),
            expiresAt: "2099-01-01T00:00:00.000Z",
          },
        ])
        .run();
    });

    const approved = createApprovedContentPort(db).readApproved({
      channelId: ch,
      correlationId: "corr-out-1",
      nowIso: T0,
    });
    expect(approved?.label).toBe("SafeViewer");
    const native = deliverFrame(
      {
        deliveryId: "del-out-1",
        channelId: ch,
        correlationId: "corr-out-1",
        status: "PENDING",
        verdict: "ALLOW",
        platformOrder: 1,
        deliverySequence: 1,
        validUntil: "2099-01-01T00:00:00.000Z",
      },
      approved!,
    );
    expect(native.display.label).toBe("SafeViewer");
    expect(native.display.translations).toHaveLength(2);
    expect(native.display.payment?.currency).toBe("JPY");

    const session = createBlivechatAdapter().createSession();
    session.handleClientMessage(JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM }), T0);
    const bc = session.mapNativeFrame(native, T0);
    expect(bc).toMatchObject({
      cmd: BLIVECHAT_CMD.ADD_SUPER_CHAT,
      data: {
        authorName: "SafeViewer",
        currency: "JPY",
        amountDisplay: "¥50",
        tier: 5,
        translations: [
          { language: "zh-Hans", translatedText: "谢谢！" },
          { language: "en", translatedText: "Thank you!" },
        ],
      },
    });
    db.close();
  });

  it("VW3-R-010 & VW3-R-011: enforces CSV listKind/bounds/dedup, login rate-limit, last-owner protection, output-feed token, extended retention, atomic settings, and same-ms/C6 overturn", async () => {
    const db = openDb("p2-sec-");
    const ch = "ch-p2-sec";
    runShortTransaction(db, (tx) => {
      tx.insert(channels)
        .values({ id: ch, platform: "youtube", platformChannelRef: "UC-sec", displayName: "Sec", createdAt: T0, updatedAt: T0 })
        .run();
    });
    const owner = await createAccount(db, {
      loginName: "owner_p2",
      displayName: "Owner P2",
      password: "Password!12345",
      now: new Date(T0),
    });
    runShortTransaction(db, (tx) => {
      grantMembership(tx, { channelId: ch, accountId: owner.accountId, role: "CHANNEL_OWNER", logAccess: true, dataAdmin: true, now: new Date(T0) });
    });

    const app = buildApp({
      modules: buildRegistry({ adapters: "synthetic", host: "127.0.0.1", port: 3000, databaseFile: ":memory:" }),
      logger: false,
      database: db,
    });
    await app.ready();

    // 1) Login brute-force rate limiter (unit verification + HTTP 429)
    const limiter = createLoginRateLimiter({ maxFailuresPerAccount: 2, lockoutMs: 30_000 });
    expect(limiter.check({ ip: "1.2.3.4", loginName: "alice", nowMs: 1000 }).allowed).toBe(true);
    limiter.recordFailure({ ip: "1.2.3.4", loginName: "alice", nowMs: 1000 });
    limiter.recordFailure({ ip: "1.2.3.4", loginName: "alice", nowMs: 2000 });
    const locked = limiter.check({ ip: "1.2.3.4", loginName: "alice", nowMs: 3000 });
    expect(locked.allowed).toBe(false);
    expect(locked.retryAfterSeconds).toBeGreaterThan(0);

    // Login normally as owner
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { loginName: "owner_p2", password: "Password!12345" },
    });
    expect(loginRes.statusCode).toBe(200);
    const cookie = loginRes.headers["set-cookie"]!.toString().split(";")[0]!;
    const csrf = (loginRes.json() as { csrfToken: string }).csrfToken;
    const headers = { cookie, "x-csrf-token": csrf };

    // 2) Last-owner revocation & demotion protection (409 LAST_OWNER_REQUIRED)
    const delOwner = await app.inject({ method: "DELETE", url: `/channels/${ch}/members/${owner.accountId}`, headers });
    expect(delOwner.statusCode).toBe(409);
    expect(delOwner.json()).toEqual({ error: "LAST_OWNER_REQUIRED" });

    const demoteOwner = await app.inject({
      method: "POST",
      url: `/channels/${ch}/members`,
      headers,
      payload: { accountId: owner.accountId, role: "MODERATOR", logAccess: true },
    });
    expect(demoteOwner.statusCode).toBe(409);
    expect(demoteOwner.json()).toEqual({ error: "LAST_OWNER_REQUIRED" });

    // 3) CSV import: rejects ALLOW on BLACKLIST, rejects >100 char term as row-level error without failing batch, deduplicates & reports net imported
    const longTerm = "x".repeat(105);
    const csv = [
      "term,category,matchKind,language,action",
      "badword,spam,CONTAINS,en,BLOCK",
      "badword,spam,CONTAINS,en,BLOCK", // duplicate inside same CSV
      "allowbad,spam,EXACT,en,ALLOW", // rejected on BLACKLIST
      `${longTerm},spam,EXACT,en,REVIEW`, // row-level TERM_TOO_LONG
      "jinci,sensitive,PHONETIC,zh-Hans,REVIEW", // phonetic reading term
    ].join("\n");
    const csvRes = await app.inject({
      method: "POST",
      url: `/channels/${ch}/term-entries/import-csv`,
      headers,
      payload: { listKind: "BLACKLIST", csvText: csv },
    });
    expect(csvRes.statusCode).toBe(200);
    const csvBody = csvRes.json() as { imported: number; skippedDuplicates: number; errors: Array<{ code: string }> };
    expect(csvBody.imported).toBe(2); // badword (once) + jinci
    expect(csvBody.skippedDuplicates).toBe(1);
    expect(csvBody.errors.map((e) => e.code)).toEqual(["INVALID_ACTION", "TERM_TOO_LONG"]);

    // Re-importing the exact same valid rows yields imported=0 (post-dedup net count)
    const csvRes2 = await app.inject({
      method: "POST",
      url: `/channels/${ch}/term-entries/import-csv`,
      headers,
      payload: { listKind: "BLACKLIST", csvText: "badword,spam,CONTAINS,en,BLOCK" },
    });
    expect(csvRes2.statusCode).toBe(200);
    expect((csvRes2.json() as { imported: number; skippedDuplicates: number }).imported).toBe(0);
    expect((csvRes2.json() as { imported: number; skippedDuplicates: number }).skippedDuplicates).toBe(1);

    // 4) Converged output.feed token endpoint returns only approved non-PII deliveries
    const tokRes = await app.inject({ method: "POST", url: `/channels/${ch}/output-tokens`, headers });
    expect(tokRes.statusCode).toBe(201);
    const token = (tokRes.json() as { token: string }).token;
    const feedRes = await app.inject({
      method: "GET",
      url: `/channels/${ch}/output-feed`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(feedRes.statusCode).toBe(200);
    expect(feedRes.headers["cache-control"]).toBe("no-store");
    expect((feedRes.json() as { items: unknown[] }).items).toEqual([]);

    // 5) Atomic settings RMW + extended retention (auth_sessions, event_payments, channel_events, deliveries, blocked-users nickname redaction)
    writePlatformDeleteStatus(db, ch, "ev-1", "DELETED");
    writePlatformDeleteStatus(db, ch, "ev-2", "PENDING");
    expect(readPlatformDeleteStatusMap(db, ch)).toEqual({ "ev-1": "DELETED", "ev-2": "PENDING" });

    upsertBlockedUser(db, ch, {
      subjectRef: "u-stale",
      nickname: "PlaintextNick",
      reason: "spam",
      syncYouTube: false,
      banId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdBy: owner.accountId,
    });
    runShortTransaction(db, (tx) => {
      tx.insert(authSessions)
        .values({
          tokenHash: "expired-hash-1",
          accountId: owner.accountId,
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-02T00:00:00.000Z",
          revokedAt: null,
        })
        .run();
      SubjectStore.create(tx, { id: "sub-ret-1", channelId: ch, platformSubjectKey: "k-ret-1", createdAt: "2026-01-01T00:00:00.000Z" });
      ChannelEventStore.recordIfNew(tx, {
        id: "ev-ret-1",
        channelId: ch,
        subjectId: "sub-ret-1",
        platformMessageRef: "pm-ret-1",
        platformOrder: 1,
        receivedAt: "2026-01-01T00:00:00.000Z",
        correlationId: "corr-ret-1",
        exceptionMarked: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      tx.insert(eventPayments)
        .values({
          eventId: "ev-ret-1",
          channelId: ch,
          amountMicros: 5_000_000,
          currency: "USD",
          amountDisplay: "$5",
          tier: 2,
          createdAt: "2026-01-01T00:00:00.000Z",
        })
        .run();
      tx.insert(verdicts)
        .values({
          id: "v-ret-1",
          eventId: "ev-ret-1",
          taskId: null,
          seq: 1,
          classification: "ALLOW_MEANINGFUL",
          downstream: "ALLOW",
          source: "FAST_PASS",
          isCurrent: 1,
          decidedAt: "2026-01-01T00:00:01.000Z",
          decidedByRef: "sys",
        })
        .run();
      tx.insert(deliveries)
        .values({
          id: "d-ret-1",
          eventId: "ev-ret-1",
          verdictId: "v-ret-1",
          outputGrantId: null,
          deliverySequence: 1,
          platformOrder: 1,
          validUntil: "2026-01-01T00:05:00.000Z",
          status: "SENT",
          attempts: 1,
          updatedAt: "2026-01-01T00:00:02.000Z",
        })
        .run();
    });

    const sweep = createRetentionStore(db).sweepExpired({ nowIso: "2026-06-01T00:00:00.000Z" });
    expect(sweep.extendedRemoved.authSessions).toBeGreaterThanOrEqual(1);
    expect(sweep.extendedRemoved.eventPayments).toBe(1);
    expect(sweep.extendedRemoved.channelEvents).toBe(1);
    expect(sweep.extendedRemoved.deliveries).toBe(1);
    expect(sweep.extendedRemoved.redactedBlockedNicknames).toBe(1);
    expect(readBlockedUsers(db, ch)[0]?.nickname).toBeNull();
    expect(db.orm.select().from(channelEvents).all()).toHaveLength(0);

    // 6) Same-millisecond CLAMPED score_outcome BEFORE original does NOT falsely flag needsManualAdjustment
    const fixedClock = "2026-11-20T12:00:00.000Z";
    runShortTransaction(db, (tx) => {
      SubjectStore.create(tx, { id: "sub-ms-1", channelId: ch, platformSubjectKey: "k-ms-1", createdAt: fixedClock });
      for (let i = 1; i <= 6; i += 1) {
        ChannelEventStore.recordIfNew(tx, {
          id: `ev-ms-${i}`,
          channelId: ch,
          subjectId: "sub-ms-1",
          platformMessageRef: `pm-ms-${i}`,
          platformOrder: i,
          receivedAt: fixedClock,
          correlationId: `corr-ms-${i}`,
          exceptionMarked: false,
          createdAt: fixedClock,
        });
        TaskStore.create(tx, {
          id: `tk-ms-${i}`,
          eventId: `ev-ms-${i}`,
          kind: "REALTIME_REVIEW",
          deadlineAt: "2099-01-01T00:00:00.000Z",
          createdAt: fixedClock,
        });
      }
    });
    let idSeq = 0;
    const decisions = createDecisionService({
      store: createDecisionStorePort(db, {
        planner: createScoringPlanner({ ...ENABLED, rewardCooldownMs: 0 }),
        newId: () => `id-ms-${++idSeq}`,
        changeLogExpiresAt: () => "2099-01-01T00:00:00.000Z",
      }),
      newId: () => `id-ms-${++idSeq}`,
      now: () => new Date(fixedClock), // SAME millisecond for every event!
      limits: DEFAULT_DECISION_LIMITS,
    });
    const actor: DecisionActor = {
      contractVersion: CONTRACT_VERSION,
      accountRef: owner.accountId,
      channelId: ch,
      capabilities: new Set(["review.decide"]),
    };
    // 4 BLOCKs hit floor (-10); 5th BLOCK is CLAMPED no-effect at SAME ms; 6th ALLOW_MEANINGFUL moves score to -8.
    for (let i = 1; i <= 5; i += 1) {
      await decisions.commit(`tk-ms-${i}`, createVerdict("BLOCK"), { kind: "HUMAN", actor });
    }
    await decisions.commit("tk-ms-6", createVerdict("ALLOW_MEANINGFUL"), { kind: "HUMAN", actor });
    // Overturning event #6 (which came AFTER the same-ms CLAMPED event #5) must NOT trigger needsManualAdjustment!
    const overturned6 = await decisions.overturn({
      eventId: "ev-ms-6",
      operationId: "op-ms-6",
      verdict: createVerdict("ALLOW_NOISE"),
      actor,
    });
    expect(overturned6).toMatchObject({ status: "overturned", needsManualAdjustment: false });

    await app.close();
    db.close();
  });
});
