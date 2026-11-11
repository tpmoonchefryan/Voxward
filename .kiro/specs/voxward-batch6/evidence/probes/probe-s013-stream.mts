// Batch 6 acceptance probe for S013 (SUB-024 streamList intake, SUB-025 identity, quota, business events).
// Usage: tsx probe-s013-stream.mts <checkout> <scratchDir> [label]
// A scripted transport stands in for streamList. No network, no real YouTube. Synthetic data only.
import fs from "node:fs";
import path from "node:path";

const [C, S, LABEL = "candidate"] = process.argv.slice(2);
if (!C || !S) throw new Error("usage: probe-s013-stream.mts <checkout> <scratchDir> [label]");
const yt = await import(`${C}/apps/server/src/modules/platform-source/index.ts`);
const contracts = await import("@voxward/contracts");

let checks = 0;
let failures = 0;
const failed: string[] = [];
function expectEq(label: string, actual: unknown, expected: unknown): boolean {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    failed.push(label);
  }
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  return ok;
}
function note(label: string, value: unknown): void {
  console.log(`NOTE ${label}: ${JSON.stringify(value)}`);
}

const NOW = Date.parse("2026-11-11T12:00:00.000Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
/** An item shaped like the official liveChatMessage resource. */
function item(id: string, o: { type?: string; at?: string; author?: Record<string, unknown>; text?: string | null; extra?: Record<string, unknown>; kind?: string } = {}) {
  const type = o.type ?? "textMessageEvent";
  const snippet: Record<string, unknown> = { type, publishedAt: o.at ?? ago(0), hasDisplayContent: true, displayMessage: o.text ?? `synthetic ${id}` };
  if (type === "textMessageEvent" && o.text !== null) snippet.textMessageDetails = { messageText: o.text ?? `synthetic ${id}` };
  Object.assign(snippet, o.extra ?? {});
  return {
    kind: o.kind ?? "youtube#liveChatMessage",
    etag: `etag-${id}`,
    id,
    snippet,
    authorDetails: { channelId: `UC-probe-${id}`, displayName: `viewer ${id}`, isVerified: false, isChatOwner: false, isChatSponsor: false, isChatModerator: false, ...(o.author ?? {}) },
  };
}
/** A super chat as the resource describes it: the comment sits in superChatDetails, there is no textMessageDetails. */
function superChat(id: string, at: string, comment = `thank you ${id}`) {
  return item(id, { type: "superChatEvent", at, text: null, extra: { displayMessage: comment, superChatDetails: { amountMicros: "5000000", currency: "JPY", amountDisplayString: "¥500", userComment: comment, tier: 2 } } });
}
const resp = (items: unknown[], extra: Record<string, unknown> = {}) => ({ kind: "RESPONSE", response: { items, ...extra } });
const fail = (reason: string) => ({ kind: "FAILED", reason });
function transport(connections: unknown[][]) {
  const requests: Array<string | null> = [];
  let i = 0;
  return {
    requests,
    connect(request: { pageToken: string | null }) {
      requests.push(request.pageToken);
      const events = connections[i] ?? [];
      i += 1;
      return (async function* () {
        for (const e of events) yield e;
      })();
    },
  };
}
const config = yt.resolveYouTubeStreamConfig();
async function run(connections: unknown[][], o: { store?: any; gate?: any; sink?: any; resumeToken?: string | null; cfg?: any } = {}) {
  const t = transport(connections);
  const delivered: any[] = [];
  const delays: number[] = [];
  const store = o.store ?? yt.createInMemoryMessageIdStore(config.dedupeCapacity);
  let result: any;
  let threw: string | null = null;
  try {
    result = await yt.runStreamList({
      liveChatId: "probe-live-chat",
      transport: t,
      config: o.cfg ?? config,
      dedupe: store,
      sink: o.sink ?? { deliver: (a: any) => void delivered.push(a) },
      gate: o.gate,
      resumeToken: o.resumeToken,
      now: () => NOW,
      sleep: async (ms: number) => void delays.push(ms),
    });
  } catch (error) {
    threw = (error as Error).message;
  }
  return { result, threw, delivered, ids: delivered.map((d) => d.message.platformMessageId), delays, requests: t.requests, store };
}

console.log(`\n## [${LABEL}] S1 platform message ID dedupe: duplicate frames and replay on reconnect`);
{
  const r = await run([
    [resp([superChat("sc1", ago(1)), item("t1"), item("t1")], { nextPageToken: "tok-1" }), fail("network")],
    [resp([superChat("sc1", ago(1)), item("t1"), item("t2")], { nextPageToken: "tok-2" })],
    [resp([item("t2"), item("t3")], { offlineAt: ago(0) })],
  ]);
  expectEq("each message is delivered once; replays and duplicate frames are counted as duplicates", [r.ids, r.result.stats.duplicate], [["sc1", "t1", "t2", "t3"], 4]);
  expectEq("resume cursors: initial, tok-1, tok-2", r.requests, [null, "tok-1", "tok-2"]);
  expectEq("the offline time ends the run in ENDED after the last batch", r.result.phase, "ENDED");
}

console.log(`\n## [${LABEL}] S2 initial connection replays recent history`);
{
  const store = yt.createInMemoryMessageIdStore(config.dedupeCapacity);
  const first = await run([[resp([superChat("old-sc", ago(10)), superChat("recent-sc", ago(2)), item("t-now")], { nextPageToken: "tok-1" })], [fail("liveChatEnded")]], { store });
  expectEq("initial connection: an SC older than the replay limit (5 min) is not delivered; a recent one is delivered once", [first.ids, first.result.stats.staleReplay], [["recent-sc", "t-now"], 1]);
  const second = await run([[resp([superChat("old-sc", ago(10)), superChat("recent-sc", ago(2)), item("t-now"), item("t-new")])], [fail("liveChatEnded")]], { store });
  expectEq("a second initial connection with the same store delivers only the new message", second.ids, ["t-new"]);
  const restarted = await run([[resp([superChat("old-sc", ago(10)), superChat("recent-sc", ago(2)), item("t-now")])], [fail("liveChatEnded")]]);
  note("after a process restart (fresh in-memory store), the recent replays are delivered again", restarted.ids);
}

console.log(`\n## [${LABEL}] S3 restart replay reaching the scoring ledger (real SQLite, real scoring engine)`);
{
  const client = await import(`${C}/apps/server/src/db/client.ts`);
  const migrate = await import(`${C}/apps/server/src/db/migrate.ts`);
  const tx = await import(`${C}/apps/server/src/db/transaction.ts`);
  const schema = await import(`${C}/apps/server/src/db/schema/index.ts`);
  const ledgerMod = await import(`${C}/apps/server/src/db/scoring-ledger.ts`);
  const scoring = await import(`${C}/apps/server/src/modules/scoring-engine/index.ts`);
  const dir = fs.mkdtempSync(path.join(S, `s013-${LABEL}-`));
  const db = client.openDatabase({ filePath: path.join(dir, "probe.sqlite3") });
  migrate.runMigrations(db);
  tx.runShortTransaction(db, (t: any) => t.insert(schema.channels).values({ id: "ch-s3", platform: "youtube", platformChannelRef: "UC-ch-s3", displayName: "ch-s3", createdAt: ago(0), updatedAt: ago(0) }).run());
  const engine = scoring.createScoringEngine({
    ledger: ledgerMod.createScoringLedgerPort(db),
    config: { enabled: true, minScore: -100, maxScore: 100, complianceReward: 1, violationPenalty: 5, rewardCooldownMs: 0, identityBaseScores: { CHANNEL_OWNER: 0, MODERATOR: 0, PAID_MEMBER: 10, VERIFIED_ACCOUNT: 0, UNKNOWN: 0 } },
    clock: () => new Date(NOW),
  });
  let n = 0;
  async function pipeline(store: any, identities: any) {
    const outputs: any[] = [];
    const sink = { deliver: (a: any) => void outputs.push(yt.toBusinessEvent(a, { channelId: "ch-s3", senderRefOf: (uc: string) => `ref-${uc}`, newId: () => `corr-${++n}`, identities })) };
    await run([[resp([superChat("sc-a", ago(2), "nice"), item("m-b", { author: { isChatSponsor: true } })])], [fail("liveChatEnded")]], { store, sink });
    for (const o of outputs) {
      await engine.applyVerdict(o.message.event, contracts.createVerdict("ALLOW_MEANINGFUL"));
      if (o.identityChange) await engine.applyIdentityTransition(o.identityChange);
    }
    return outputs.length;
  }
  const firstDelivered = await pipeline(yt.createInMemoryMessageIdStore(100), yt.createIdentityTracker({ capacity: 100 }));
  const secondDelivered = await pipeline(yt.createInMemoryMessageIdStore(100), yt.createIdentityTracker({ capacity: 100 })); // restart
  const rows = db.sqlite.prepare("select reason_code as reason, idempotency_key as key from score_ledger order by rowid").all();
  note("messages delivered by the first run / by the restarted run", [firstDelivered, secondDelivered]);
  expectEq("score ledger after both runs: one reward per platform message and one identity change (idempotency keys hold across the restart)", rows.map((r: any) => r.reason).sort(), ["COMPLIANT_REWARD", "COMPLIANT_REWARD", "IDENTITY_BASE_CHANGE"]);
  const scores = db.sqlite.prepare("select j.platform_subject_key as subject, s.current_score as current from subject_scores s join subjects j on j.id = s.subject_id order by 1").all();
  expectEq("scores did not move on the replay", scores, [{ subject: "ref-UC-probe-m-b", current: 11 }, { subject: "ref-UC-probe-sc-a", current: 1 }]);
  // S3b: a verdict that had no effect leaves no idempotency record (batch 3 Q19-1). With a 60 s reward cooldown, the
  // second message of the same viewer earns nothing at first; after a restart 61 s later the replay carries a new
  // receivedAt (the intake stamps processing time), so the same message can now earn the reward.
  {
    const cooled = scoring.createScoringEngine({
      ledger: ledgerMod.createScoringLedgerPort(db),
      config: { enabled: true, minScore: -100, maxScore: 100, complianceReward: 1, violationPenalty: 5, rewardCooldownMs: 60_000, identityBaseScores: { CHANNEL_OWNER: 0, MODERATOR: 0, PAID_MEMBER: 10, VERIFIED_ACCOUNT: 0, UNKNOWN: 0 } },
      clock: () => new Date(NOW),
    });
    const viewer = { channelId: "UC-probe-cool" };
    const msg = (id: string) => item(id, { author: viewer });
    async function once(nowMs: number) {
      const outs: any[] = [];
      const t = transport([[resp([msg("cool-1"), msg("cool-2")])], [fail("liveChatEnded")]]);
      await yt.runStreamList({ liveChatId: "probe", transport: t, config, dedupe: yt.createInMemoryMessageIdStore(100), sink: { deliver: (a: any) => void outs.push(yt.toBusinessEvent(a, { channelId: "ch-s3", senderRefOf: (uc: string) => `ref-${uc}`, newId: () => `corr-cool-${++n}`, identities: yt.createIdentityTracker({ capacity: 10 }) })) }, now: () => nowMs, sleep: async () => undefined });
      const deltas = [];
      for (const o of outs) deltas.push((await cooled.applyVerdict(o.message.event, contracts.createVerdict("ALLOW_MEANINGFUL"))).delta);
      return deltas;
    }
    const firstRun = await once(NOW);
    const afterRestart = await once(NOW + 61_000);
    note("S3b reward deltas for cool-1, cool-2: first run / replay after a restart 61 s later", [firstRun, afterRestart]);
    note("S3b ledger rows of that viewer (idempotency key, actual)", db.sqlite.prepare("select l.idempotency_key as key, l.actual_delta as actual from score_ledger l join subjects j on j.id = l.subject_id where j.platform_subject_key = ? order by l.rowid").all("ref-UC-probe-cool"));
  }
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n## [${LABEL}] S4 identity: missing markers are not fabricated, unknown is not a "no"`);
{
  const obs = (flags: Record<string, unknown>) => yt.observeIdentity(flags);
  expectEq("sponsor flag true -> PAID_MEMBER, certain, evidence isChatSponsor", obs({ isChatSponsor: true, isChatOwner: false, isChatModerator: false, isVerified: false }), { kind: "PAID_MEMBER", certain: true, evidence: "isChatSponsor", subscription: "NOT_PROVIDED" });
  expectEq("flags missing -> UNKNOWN, not certain (never a downgrade)", obs({ isChatSponsor: undefined }), { kind: "UNKNOWN", certain: false, evidence: null, subscription: "NOT_PROVIDED" });
  expectEq("all four flags false -> UNKNOWN, certain", obs({ isChatSponsor: false, isChatOwner: false, isChatModerator: false, isVerified: false }), { kind: "UNKNOWN", certain: true, evidence: null, subscription: "NOT_PROVIDED" });
  const parsed = yt.parseStreamItem(item("x", { author: { isChatSponsor: "true", isVerified: 1 } }));
  expectEq("a non-boolean flag is dropped, not read as true", [parsed.authorFlags.isChatSponsor, parsed.authorFlags.isVerified, yt.observeIdentity(parsed.authorFlags).kind], [undefined, undefined, "UNKNOWN"]);
  expectEq("verified alone -> VERIFIED_ACCOUNT (no subscription meaning)", obs({ isVerified: true }).kind, "VERIFIED_ACCOUNT");
  expectEq("the contract has no subscriber identity kind", contracts.IDENTITY_KINDS, ["CHANNEL_OWNER", "MODERATOR", "PAID_MEMBER", "VERIFIED_ACCOUNT", "UNKNOWN"]);
  const tracker = yt.createIdentityTracker({ capacity: 10 });
  const base = { channelId: "ch", subjectKey: "s1", effectiveFrom: ago(0) };
  const seq = [
    tracker.observe({ ...base, sourceEventRef: "youtube:1", observation: obs({ isChatSponsor: true }) }),
    tracker.observe({ ...base, sourceEventRef: "youtube:2", observation: obs({ isChatSponsor: true }) }),
    tracker.observe({ ...base, sourceEventRef: "youtube:3", observation: obs({}) }),
    tracker.observe({ ...base, sourceEventRef: "youtube:4", observation: obs({ isChatSponsor: false, isChatOwner: false, isChatModerator: false, isVerified: false }) }),
  ].map((c: any) => (c === null ? null : c.nextKind));
  expectEq("tracker: member, repeat (none), missing flags (none), explicit all-false (to UNKNOWN)", seq, ["PAID_MEMBER", null, null, "UNKNOWN"]);
}

console.log(`\n## [${LABEL}] S5 explicit states: ended, quota, permission, unavailable, rejected, give-up`);
{
  const cases: Array<[string, unknown[][], string]> = [
    ["offlineAt in a response", [[resp([item("e1")], { offlineAt: ago(0) })]], "ENDED"],
    ["liveChatEnded", [[fail("liveChatEnded")]], "ENDED"],
    ["forbidden (credential or permission lost)", [[fail("forbidden")]], "PERMISSION_LOST"],
    ["quotaExceeded from the platform", [[fail("quotaExceeded")]], "QUOTA_EXHAUSTED"],
    ["liveChatDisabled", [[fail("liveChatDisabled")]], "CHAT_UNAVAILABLE"],
    ["liveChatNotFound", [[fail("liveChatNotFound")]], "CHAT_UNAVAILABLE"],
    ["invalidArgument", [[fail("invalidArgument")]], "REQUEST_REJECTED"],
  ];
  for (const [label, conns, phase] of cases) {
    const r = await run(conns);
    expectEq(`${label} -> ${phase}, no further connection`, [r.result.phase, r.requests.length], [phase, 1]);
  }
  const giveUp = await run(Array.from({ length: 12 }, () => [fail("network")]));
  expectEq("8 consecutive failures -> GAVE_UP; delays 1 s doubling to the 60 s cap", [giveUp.result.phase, giveUp.requests.length, giveUp.delays], ["GAVE_UP", 8, [1000, 2000, 4000, 8000, 16000, 32000, 60000]]);
  const limited = await run([[fail("rateLimitExceeded")], [fail("liveChatEnded")]]);
  expectEq("rateLimitExceeded waits at least 30 s", limited.delays, [30000]);
  const quota = yt.createQuotaMonitor({ config: yt.resolveYouTubeQuotaConfig({ dailyBudgetUnits: 12, warnRatio: 0.5 }), now: () => NOW });
  const budget = await run([[resp([item("q1")]), fail("network")], [resp([item("q2")]), fail("network")], [resp([item("q3")])]], { gate: quota });
  expectEq("local budget of 12 units pays two 5-unit connections; the third is refused without connecting", [budget.result.phase, budget.requests.length, quota.snapshot().state, quota.snapshot().usedUnits], ["QUOTA_EXHAUSTED", 2, "EXHAUSTED", 10]);
  const quota2 = yt.createQuotaMonitor({ config: yt.resolveYouTubeQuotaConfig(), now: () => NOW });
  const told = await run([[fail("quotaExceeded")]], { gate: quota2 });
  expectEq("platform quotaExceeded marks the monitor exhausted and visible", [told.result.phase, quota2.snapshot().state, quota2.snapshot().serverReportedExhausted, quota2.allowConnect()], ["QUOTA_EXHAUSTED", "EXHAUSTED", true, false]);
  const warn = yt.createQuotaMonitor({ config: yt.resolveYouTubeQuotaConfig({ dailyBudgetUnits: 100, warnRatio: 0.8 }), now: () => NOW });
  for (let i = 0; i < 16; i += 1) warn.onConnect();
  expectEq("80 of 100 units used -> WARNING", warn.snapshot().state, "WARNING");
}

console.log(`\n## [${LABEL}] S6 only the official upstream; no unconditional polling`);
{
  const r = await run([[resp([
    item("ok1"),
    { ...item("bad-kind"), kind: "youtube#liveChatMessageListResponse" },
    { id: "no-kind", snippet: { type: "textMessageEvent", publishedAt: ago(0) }, authorDetails: { channelId: "UC-x" } },
    { ...item("no-time"), snippet: { type: "textMessageEvent", textMessageDetails: { messageText: "x" } } },
    { ...item("no-author"), authorDetails: undefined },
    "not-an-object",
    item("ok2"),
  ])], [fail("liveChatEnded")]]);
  expectEq("only well-formed liveChatMessage items pass; the rest are dropped and counted", [r.ids, r.result.stats.malformed], [["ok1", "ok2"], 5]);
  const churn = await run([...Array.from({ length: 5 }, (_v, i) => [resp([item(`c${i}`)]), { kind: "CLOSED" }]), [fail("liveChatEnded")]]);
  note("a stream that closes after every batch reconnects with these delays (ms)", churn.delays);
  const tokens = await run([[fail("pageTokenInvalid")], [fail("pageTokenInvalid")], [fail("liveChatEnded")]], { resumeToken: "stale" });
  expectEq("pageTokenInvalid: the cursor is dropped and one immediate initial reconnect, then backoff", [tokens.requests, tokens.delays], [["stale", null, null], [0, 1000]]);
}

console.log(`\n## [${LABEL}] S7 business event for the pipeline: versioned, no raw platform response`);
{
  const tracker = yt.createIdentityTracker({ capacity: 10 });
  const out: any[] = [];
  let n = 0;
  await run([[resp([item("m1", { author: { isChatSponsor: true } }), superChat("sc1", ago(1), "SC comment text")])], [fail("liveChatEnded")]], {
    sink: { deliver: (a: any) => void out.push(yt.toBusinessEvent(a, { channelId: "ch-int", senderRefOf: (uc: string) => `hmac(${uc.length})`, newId: () => `corr-${++n}`, identities: tracker })) },
  });
  const first = out[0];
  expectEq("event keys follow the versioned ChannelEvent contract", Object.keys(first.message.event).sort(), ["body", "channelId", "contractVersion", "correlationId", "platform", "platformMessageId", "platformOrder", "receivedAt", "sender"]);
  expectEq("wrapper is versioned and typed", [first.message.contractVersion === contracts.CONTRACT_VERSION, first.message.kind], [true, "CHANNEL_MESSAGE"]);
  const json = JSON.stringify(out);
  expectEq("no raw response fields or platform author IDs leave the module", [json.includes("UC-probe"), json.includes("authorDetails"), json.includes("snippet"), json.includes("etag")], [false, false, false, false]);
  expectEq("identity change carries the message reference as its idempotent source", first.identityChange, { channelId: "ch-int", subjectKey: first.message.event.sender.senderRef, sourceEventRef: "youtube:m1", effectiveFrom: ago(0), nextKind: "PAID_MEMBER" });
  note("text message body", first.message.event.body);
  note("super chat as the resource shapes it (comment in superChatDetails.userComment, no textMessageDetails): event body", out[1].message.event.body);
}

console.log(`\n## [${LABEL}] S8 residuals named by the implementer`);
{
  const store = yt.createInMemoryMessageIdStore(100);
  const got: string[] = [];
  const sink = { deliver: (a: any) => { if (a.message.platformMessageId === "r2") throw new Error("synthetic sink failure"); got.push(a.message.platformMessageId); } };
  const first = await run([[resp([item("r1"), item("r2"), item("r3")], { nextPageToken: "tok-r" })]], { store, sink });
  note("sink throws on r2: run outcome", { threw: first.threw, result: first.result ?? null, deliveredBeforeThrow: got.slice() });
  const again = await run([[resp([item("r1"), item("r2"), item("r3")])], [fail("liveChatEnded")]], { store, sink: { deliver: (a: any) => void got.push(a.message.platformMessageId) } });
  note("same store, platform resends r1..r3: all deliveries so far (first run, then the resend)", { delivered: got.slice(), duplicatesOnResend: again.result.stats.duplicate, phase: again.result.phase });
  expectEq("at most once: r2's ID was taken before the failed delivery, so r2 is never delivered; r3 still arrives", [got.includes("r2"), got.includes("r3")], [false, true]);
  const small = yt.createInMemoryMessageIdStore(2);
  const evict = await run([[resp([item("e1"), item("e2"), item("e3")])], [resp([item("e1")])], [fail("liveChatEnded")]], { store: small });
  note("in-memory store of capacity 2: e1 forgotten after e3, and redelivered on replay (within the 5 min replay age)", evict.ids);
}

console.log(`\n## [${LABEL}] S9 replay-age rule inside one live connection (design 5 says INITIAL or RESUME only)`);
{
  const live = await run([[resp([item("l1")], { nextPageToken: "tok-l" }), resp([item("late-in-stream", { at: ago(6) }), item("l2")])], [fail("liveChatEnded")]]);
  note("second batch of the same connection: a message published 6 min ago is", live.ids.includes("late-in-stream") ? "delivered" : "dropped as STALE_REPLAY");
  const t = transport([[resp([item("s1"), item("s2")])], [fail("liveChatEnded")]]);
  const got: string[] = [];
  const skew = await yt.runStreamList({ liveChatId: "probe", transport: t, config, dedupe: yt.createInMemoryMessageIdStore(100), sink: { deliver: (a: any) => void got.push(a.message.platformMessageId) }, now: () => NOW + 6 * 60_000, sleep: async () => undefined });
  note("server clock 6 min ahead of the platform: delivered / staleReplay counter / phase", [got, skew.stats.staleReplay, skew.phase]);
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
if (failed.length) console.log(`failed: ${failed.join(" | ")}`);
process.exit(0);
