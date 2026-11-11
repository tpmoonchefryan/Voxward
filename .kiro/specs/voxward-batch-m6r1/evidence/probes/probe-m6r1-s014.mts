// Batch m6 round 2 (m6r1) acceptance probe for STORY-014 (DecisionService, overturn, resend, lists and terms, Q19, Q21,
// Q27, Q29, migration 0005). Copied from probe-m6-s014.mts: §L, §A, §B, §F, §G, §H, §M unchanged. §D is expected to pass
// (B5) and adds D2–D4; §C5 checks the Q49 mark and adds C5b and the C6 observation; §E3 checks ALREADY_SENT.
// Real migrated SQLite under <scratch>; synthetic data only; no network.
// Usage: tsx probe-m6r1-s014.mts <checkout> <scratch> <label> [all|ledger]
// "ledger" runs only the scoring-ledger checks (Q19 ①②, Q21), which also exist on the 40223e2 control copy.
import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [C, SCRATCH, LABEL = "candidate", PART = "all"] = process.argv.slice(2);
if (!C || !SCRATCH) throw new Error("usage: probe-m6-s014.mts <checkout> <scratch> <label> [all|ledger]");
const S = `${C}/apps/server`;
const HERE = new URL(".", import.meta.url).pathname;

const dbh = await import(`${S}/test/db/helpers.ts`);
const lh = await import(`${S}/test/scoring-engine/ledger/helpers.ts`);
const repo = await import(`${S}/src/db/repository.js`);
const tx = await import(`${S}/src/db/transaction.js`);
const ledgerMod = await import(`${S}/src/db/scoring-ledger.js`);
const scoringMod = await import(`${S}/src/modules/scoring-engine/index.js`);
const contracts = await import(`${S}/node_modules/@voxward/contracts/src/index.ts`);

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail: unknown = ""): void {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail === "" ? "" : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
}
function note(name: string, detail: unknown): void {
  console.log(`NOTE ${name} :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}
function section(title: string): void {
  console.log(`\n## [${LABEL}] ${title}`);
}
const q = (db: any, sql: string, ...p: unknown[]) => db.sqlite.prepare(sql).all(...p);
const n = (db: any, sql: string, ...p: unknown[]) => (db.sqlite.prepare(sql).get(...p) as { n: number }).n;
const T0 = "2026-11-10T10:00:00.000Z";
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();

function freshDb(prefix: string) {
  const dir = dbh.scratchDirectory(prefix);
  const database = dbh.migratedDatabase(dir);
  return { database, dir, close: () => (database.close(), rmSync(dir, { recursive: true, force: true })) };
}
function eventOf(channelId: string, messageId: string, senderRef: string, receivedAt = T0) {
  return {
    contractVersion: contracts.CONTRACT_VERSION,
    platform: "synthetic",
    channelId,
    platformMessageId: messageId,
    platformOrder: 1,
    receivedAt,
    correlationId: `corr-${channelId}-${messageId}`,
    body: "synthetic text",
    sender: { contractVersion: contracts.CONTRACT_VERSION, senderRef },
  };
}

// ------------------------------------------------------------------ L. scoring ledger (runs on candidate and control)
section("L scoring ledger: Q19 ① no-effect record, Q19 ② keys per channel and subject, Q21 port refusal");
{
  const f = freshDb("m6-s014-l-");
  const db = f.database;
  lh.seedChannels(db, ["channel-a", "channel-b"]);
  let clock = T0;
  const port = ledgerMod.createScoringLedgerPort(db);
  const engine = scoringMod.createScoringEngine({ ledger: port, clock: () => new Date(clock), config: { ...lh.ENABLED, rewardCooldownMs: 60_000 } });
  const allow = contracts.createVerdict("ALLOW_MEANINGFUL", []);
  // Q19 ①: the second message inside the cooldown has no effect; a replay of it after the cooldown must not score.
  await engine.applyVerdict(eventOf("channel-a", "m1", "viewer-1", T0), allow);
  clock = at(10_000);
  const second = await engine.applyVerdict(eventOf("channel-a", "m2", "viewer-1", at(10_000)), allow);
  clock = at(120_000);
  const replay = await engine.applyVerdict(eventOf("channel-a", "m2", "viewer-1", at(120_000)), allow);
  const scoreA = lh.scoreOf(db, "channel-a", "viewer-1")?.current;
  check("L1 Q19 ① a no-effect verdict replayed after the cooldown does not score", second.delta === 0 && scoreA === 2, { second: second.delta, replay: replay.delta, score: scoreA, ledger: q(db, "select idempotency_key k, actual_delta d from score_ledger order by rowid") });
  let outcomesTable = true;
  try {
    note("L1 score_outcomes rows", q(db, "select idempotency_key k, outcome o, reason_code r from score_outcomes"));
  } catch {
    outcomesTable = false;
    note("L1 score_outcomes", "table absent");
  }
  // Q19 ②: the same operation id in another channel, or for another subject, is a separate correction.
  const corr = (channelId: string, subjectKey: string) => engine.applyManualCorrection({ channelId, subjectKey, operationId: "op-1", delta: 1, operatorRef: "mod-1" });
  const c1 = await corr("channel-a", "viewer-2");
  const c2 = await corr("channel-b", "viewer-2");
  const c3 = await corr("channel-a", "viewer-3");
  const scoresL2 = [lh.scoreOf(db, "channel-a", "viewer-2")?.current ?? null, lh.scoreOf(db, "channel-b", "viewer-2")?.current ?? null, lh.scoreOf(db, "channel-a", "viewer-3")?.current ?? null];
  const manualRows = n(db, "select count(*) n from score_ledger where reason_code = 'MANUAL_CORRECTION'");
  check("L2 Q19 ② manual correction op-1 applies once per channel and subject (each subject +1, three ledger rows)", scoresL2.every((s) => s === 1) && manualRows === 3, { scores: scoresL2, manualRows, keys: [c1.idempotencyKey, c2.idempotencyKey, c3.idempotencyKey] });
  const up = (channelId: string, subjectKey: string) =>
    engine.applyIdentityTransition({ channelId, subjectKey, sourceEventRef: "youtube:evt-1", effectiveFrom: T0, nextKind: "PAID_MEMBER" });
  let i1: any;
  let i2: any;
  try {
    i1 = await up("channel-a", "viewer-4");
    i2 = await up("channel-b", "viewer-4");
  } catch (error) {
    i2 = { threw: (error as Error).message.slice(0, 120) };
  }
  const scoresL3 = [lh.scoreOf(db, "channel-a", "viewer-4")?.current ?? null, lh.scoreOf(db, "channel-b", "viewer-4")?.current ?? null];
  check("L3 Q19 ② one platform identity reference applies in each channel (both subjects at the member base 10)", scoresL3[0] === 10 && scoresL3[1] === 10, { scores: scoresL3, first: i1?.delta, second: i2?.delta ?? i2 });
  // Q21: a caller that skips the module guard still cannot score an exception subject.
  lh.seedException(db, "channel-a", "viewer-x");
  const raw = port.commitScoreDecision({
    subject: { channelId: "channel-a", subjectKey: "viewer-x" },
    idempotencyKey: "event:channel-a:mx",
    committedAt: T0,
    decide: (state: any) => ({ kind: "write", write: { reasonCode: "MANUAL_CORRECTION", requestedDelta: 5, actualDelta: 5, nextIdentityBaseScore: state.identityBaseScore, nextBehaviorAdjustTotal: state.behaviorAdjustTotal + 5, nextCurrentScore: state.currentScore + 5, lastRewardAt: state.lastRewardAt, ruleVersion: null, verdictRef: null, correlationId: "probe" } }),
  });
  const scoreX = lh.scoreOf(db, "channel-a", "viewer-x")?.current ?? null;
  check("L4 Q21 the port refuses a write for an exception subject when the module guard is bypassed", raw.status === "refused" && (scoreX === 0 || scoreX === null), { result: raw, score: scoreX, outcomesTable });
  f.close();
}

if (PART === "ledger") {
  console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
  process.exit(0);
}

const fx = await import(`${S}/test/decision-service/fixtures.ts`);
const dsMod = await import(`${S}/src/modules/decision-service/index.js`);
const svcMod = await import(`${S}/src/modules/decision-service/service.js`);
const storeMod = await import(`${S}/src/db/decision-store.js`);
const permMod = await import(`${S}/src/auth/permissions.js`);
const listMod = await import(`${S}/src/modules/decision-service/list-permissions.js`);
const routesMod = await import(`${S}/src/modules/decision-service/routes.js`);

let globalSeq = 0;
function depsAt(db: any, nowIso: string, planner = scoringMod.createScoringPlanner(lh.ENABLED)) {
  const newId = () => `id-${++globalSeq}`;
  return {
    store: storeMod.createDecisionStorePort(db, { planner, newId, changeLogExpiresAt: () => fx.CHANGE_EXPIRES_AT }),
    newId,
    now: () => new Date(nowIso),
    limits: svcMod.DEFAULT_DECISION_LIMITS,
  };
}
const svcAt = (db: any, nowIso: string) => dsMod.createDecisionService(depsAt(db, nowIso));
const roleActor = (role: string, accountRef: string, channelId = "channel-a") => ({ contractVersion: contracts.CONTRACT_VERSION, accountRef, channelId, capabilities: new Set(permMod.capabilitiesOfMembership({ role, logAccess: false })) });
const seedTask = (db: any, i: number, subjectKey = "viewer-1", taskId = `task-${i}`) =>
  fx.seedOpenTask(db, { channelId: "channel-a", subjectKey, subjectId: `subject-${subjectKey}`, eventId: `event-${i}`, platformMessageRef: `msg-${i}`, taskId });
const BLOCK = contracts.createVerdict("BLOCK");
const ALLOW = contracts.createVerdict("ALLOW_MEANINGFUL");

// ------------------------------------------------------------------ A. takeover, late AI, retry, guards
section("A human takeover, late AI result, timeout retry, version and generation guards (SUB-026, Q27 second half)");
{
  const f = freshDb("m6-s014-a-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const s = svcAt(db, fx.DECIDED_AT);
  const human = await s.commit("task-1", BLOCK, { kind: "HUMAN", actor: roleActor("MODERATOR", "mod-1") });
  const late = await s.commit("task-1", ALLOW, { kind: "SYSTEM", source: "MODEL" });
  check("A1 a late AI result after a human takeover is a conflict with the current result; one verdict, one delivery, score -3", human.status === "committed" && late.status === "conflict" && (late as any).reason === "TASK_NOT_OPEN" && (late as any).current?.source === "MANUAL" && n(db, "select count(*) n from verdicts") === 1 && n(db, "select count(*) n from deliveries") === 1 && fx.scoreOf(db, "channel-a", "viewer-1") === -3, { human: human.status, late });
  // A second task for the same event (another kind: the review's settlement task), after the human verdict.
  tx.runShortTransaction(db, (t: any) => repo.TaskStore.create(t, { id: "task-1b", eventId: "event-1", kind: "SETTLEMENT_REVIEW", deadlineAt: fx.DEADLINE, createdAt: T0 }));
  const retry = await s.commit("task-1b", ALLOW, { kind: "SYSTEM", source: "MODEL" });
  check("A2 a second task for an event that already has a final verdict is ALREADY_FINAL with the current result; nothing written", retry.status === "conflict" && (retry as any).reason === "ALREADY_FINAL" && (retry as any).current?.source === "MANUAL" && n(db, "select count(*) n from verdicts") === 1 && n(db, "select count(*) n from score_ledger") === 1, retry);
  // Guards.
  seedTask(db, 2, "viewer-2");
  tx.runShortTransaction(db, (t: any) => repo.SubjectStore.bumpGeneration(t, "subject-viewer-2"));
  const staleGen = await s.commit("task-2", BLOCK, { kind: "SYSTEM", source: "MODEL" });
  seedTask(db, 3, "viewer-3");
  db.sqlite.prepare("update channel_events set event_version = event_version + 1 where id = 'event-3'").run();
  const staleVer = await s.commit("task-3", BLOCK, { kind: "SYSTEM", source: "MODEL" });
  check("A3 generation and event version guards refuse the commit and write nothing", (staleGen as any).reason === "STALE_GENERATION" && (staleVer as any).reason === "STALE_EVENT_VERSION" && n(db, "select count(*) n from verdicts where event_id in ('event-2','event-3')") === 0 && n(db, "select count(*) n from score_ledger") === 1, { staleGen, staleVer });
  const denied = await s.commit("task-2", BLOCK, { kind: "HUMAN", actor: roleActor("DATA_ADMIN", "admin-1") });
  check("A4 a data admin (real role matrix) cannot decide", denied.status === "denied", denied);
  f.close();
}

// ------------------------------------------------------------------ B. concurrent moderators, separate processes
section("B moderators racing from separate processes on one database file");
{
  const f = freshDb("m6-s014-b-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const file = join(f.dir, "voxward.sqlite3");
  db.close();
  const startAt = Date.now() + 2500;
  const tsx = `${S}/node_modules/.bin/tsx`;
  const runChild = (i: number) =>
    new Promise<string>((resolve) => {
      const child = spawn(tsx, [join(HERE, "probe-m6r1-s014-race-child.mts"), C, file, "task-1", `mod-${i}`, i % 2 === 0 ? "BLOCK" : "ALLOW_MEANINGFUL", String(startAt)], { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      child.on("close", () => resolve(out.trim()));
    });
  const outs = await Promise.all([0, 1, 2, 3, 4, 5].map(runChild));
  const results = outs.map((o) => {
    try {
      return JSON.parse(o.split("\n").at(-1) ?? "{}");
    } catch {
      return { raw: o.slice(0, 300) };
    }
  });
  const committed = results.filter((r: any) => r.result?.status === "committed");
  const conflicts = results.filter((r: any) => r.result?.status === "conflict");
  const db2 = dbh.migratedDatabase(f.dir);
  const counts = { verdicts: n(db2, "select count(*) n from verdicts"), deliveries: n(db2, "select count(*) n from deliveries"), ledger: n(db2, "select count(*) n from score_ledger"), changeLogs: n(db2, "select count(*) n from change_logs") };
  check("B1 six concurrent commits: exactly one committed, five conflicts", committed.length === 1 && conflicts.length === 5, { committed: committed.map((r: any) => r.actor), conflictReasons: conflicts.map((r: any) => r.result.reason), others: results.filter((r: any) => !r.result || (r.result.status !== "committed" && r.result.status !== "conflict")) });
  const winnerVerdict = q(db2, "select id, classification, decided_by_ref by from verdicts")[0];
  check("B2 the conflicts all show the stored verdict; one verdict, one delivery, one ledger row, one Change Log row", conflicts.every((r: any) => r.result.current?.verdictId === winnerVerdict.id) && counts.verdicts === 1 && counts.deliveries === 1 && counts.ledger === 1 && counts.changeLogs === 1, { winnerVerdict, counts });
  db2.close();
  rmSync(f.dir, { recursive: true, force: true });
}

// ------------------------------------------------------------------ C. overturn by the ledger's actual change
section("C overturn corrects by the ledger's actual change, once (SUB-027)");
{
  const f = freshDb("m6-s014-c-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  for (const i of [1, 2, 3, 4, 5]) seedTask(db, i);
  const s = svcAt(db, fx.DECIDED_AT);
  const mod = roleActor("MODERATOR", "mod-1");
  for (const i of [1, 2, 3, 4]) await s.commit(`task-${i}`, BLOCK, { kind: "HUMAN", actor: mod });
  const before = fx.scoreOf(db, "channel-a", "viewer-1");
  const o4 = await s.overturn({ eventId: "event-4", operationId: "op-4", verdict: ALLOW, actor: mod });
  check("C1 the clamped fourth BLOCK (-1 at the floor -10) is corrected by +1, not by the configured 3", before === -10 && (o4 as any).compensationDelta === 1 && fx.scoreOf(db, "channel-a", "viewer-1") === -9, { before, o4: { status: o4.status, compensation: (o4 as any).compensation, delta: (o4 as any).compensationDelta }, after: fx.scoreOf(db, "channel-a", "viewer-1") });
  const again = await s.overturn({ eventId: "event-4", operationId: "op-4b", verdict: BLOCK, actor: mod });
  check("C2 a second overturn of the same event changes the verdict but not the score again", again.status === "overturned" && (again as any).compensation === "duplicate" && fx.scoreOf(db, "channel-a", "viewer-1") === -9, { again: { status: again.status, compensation: (again as any).compensation } });
  const dup = await s.overturn({ eventId: "event-4", operationId: "op-4b", verdict: BLOCK, actor: mod });
  check("C3 a repeated operation id is a duplicate", dup.status === "duplicate", dup);
  const denied = await s.overturn({ eventId: "event-1", operationId: "op-x", verdict: ALLOW, actor: roleActor("DATA_ADMIN", "admin-1") });
  check("C4 a data admin cannot overturn", denied.status === "denied", denied);
  f.close();
}
{
  // Later entries that hit the floor: the proposal (7.1) asks to recompute the affected part within the retained ledger.
  const f = freshDb("m6-s014-c2-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  for (const i of [1, 2, 3, 4, 5]) seedTask(db, i);
  const s = svcAt(db, fx.DECIDED_AT);
  const mod = roleActor("MODERATOR", "mod-1");
  for (const i of [1, 2, 3, 4, 5]) await s.commit(`task-${i}`, BLOCK, { kind: "HUMAN", actor: mod });
  const ledger = q(db, "select idempotency_key k, actual_delta d from score_ledger order by rowid");
  const before = fx.scoreOf(db, "channel-a", "viewer-1");
  const o1 = await s.overturn({ eventId: "event-1", operationId: "op-1", verdict: ALLOW, actor: mod });
  const after = fx.scoreOf(db, "channel-a", "viewer-1");
  // Replaying the retained ledger without event-1's change: 0 -> -3 -> -6 -> -9 -> -10 (event-5 clamped to -1).
  note("C5 five BLOCKs (-3 each, floor -10), then overturn of the first", { ledger, before, overturn: { compensation: (o1 as any).compensation, delta: (o1 as any).compensationDelta, needsManualAdjustment: (o1 as any).needsManualAdjustment }, after, replayWithoutFirst: -10 });
  const markLog = q(db, "select change_kind k, summary s, correlation_id c from change_logs where summary like '%人工调整%'");
  check("C5 (Q49/N4) a later entry at the floor: the correction keeps the ledger amount (+3, -7) and is marked needsManualAdjustment, with one Change Log row without digits", (o1 as any).compensationDelta === 3 && after === -7 && (o1 as any).needsManualAdjustment === true && markLog.length === 1 && !/\d/.test(markLog[0].s), { markLog });
  f.close();
}
{
  // C5b: no later entry at a limit: no mark.
  const f = freshDb("m6-s014-c3-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  for (const i of [1, 2]) seedTask(db, i);
  const s = svcAt(db, fx.DECIDED_AT);
  const mod = roleActor("MODERATOR", "mod-1");
  for (const i of [1, 2]) await s.commit(`task-${i}`, BLOCK, { kind: "HUMAN", actor: mod });
  const o1 = await s.overturn({ eventId: "event-1", operationId: "op-1", verdict: ALLOW, actor: mod });
  check("C5b no later entry at a limit: corrected by +3 (-6 -> -3) and not marked", (o1 as any).compensationDelta === 3 && (o1 as any).needsManualAdjustment === false && fx.scoreOf(db, "channel-a", "viewer-1") === -3, { o1: { delta: (o1 as any).compensationDelta, mark: (o1 as any).needsManualAdjustment }, score: fx.scoreOf(db, "channel-a", "viewer-1") });
  f.close();
}
{
  // C6 observation (the gap S014 design §7 registers): a later entry that reaches a limit only in the replay is not
  // marked. BLOCK -3 first, then six ALLOW +2 (-3 -> 9, none clamped), then BLOCK -3 (9 -> 6). Overturn the first BLOCK.
  const f = freshDb("m6-s014-c4-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  for (const i of [1, 2, 3, 4, 5, 6, 7, 8]) seedTask(db, i);
  const s = svcAt(db, fx.DECIDED_AT);
  const mod = roleActor("MODERATOR", "mod-1");
  await s.commit("task-1", BLOCK, { kind: "HUMAN", actor: mod });
  for (const i of [2, 3, 4, 5, 6, 7]) await s.commit(`task-${i}`, ALLOW, { kind: "HUMAN", actor: mod });
  await s.commit("task-8", BLOCK, { kind: "HUMAN", actor: mod });
  const ledger = q(db, "select idempotency_key k, requested_delta r, actual_delta d from score_ledger order by rowid");
  const before = fx.scoreOf(db, "channel-a", "viewer-1");
  const o1 = await s.overturn({ eventId: "event-1", operationId: "op-1", verdict: ALLOW, actor: mod });
  const after = fx.scoreOf(db, "channel-a", "viewer-1");
  // Replay without event-1: 0 -> 2,4,6,8,10, then +2 clamped to 0 at the ceiling, then -3 -> 7.
  note("C6 replay-only limit: BLOCK, six ALLOW, BLOCK; overturn of the first BLOCK", { clampedInLedger: ledger.filter((r: any) => r.r !== r.d).length, before, overturn: { delta: (o1 as any).compensationDelta, needsManualAdjustment: (o1 as any).needsManualAdjustment }, after, replayWithoutFirst: 7 });
  f.close();
}

// ------------------------------------------------------------------ D. overturn and delivery
section("D overturn of an old BLOCK and downstream delivery (补发必须明确且受有效期限制; proposal 7.1, 6.3)");
{
  const f = freshDb("m6-s014-d-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const mod = roleActor("MODERATOR", "mod-1");
  await svcAt(db, fx.DECIDED_AT).commit("task-1", BLOCK, { kind: "HUMAN", actor: mod });
  const twoHours = at(2 * 3600_000);
  const o = await svcAt(db, twoHours).overturn({ eventId: "event-1", operationId: "op-late", verdict: ALLOW, actor: mod });
  const rows = q(db, "select d.id, d.status, d.valid_until v, d.delivery_sequence s, x.downstream from deliveries d join verdicts x on x.id = d.verdict_id order by d.delivery_sequence");
  const deliverable = rows.filter((r: any) => r.status === "PENDING" && r.v > twoHours && r.downstream === "ALLOW");
  const newRow = rows.at(-1);
  check("D1 overturning a 2-hour-old BLOCK to ALLOW leaves no deliverable ALLOW intent (intent null, the new delivery row EXPIRED at the overturn time); delivery needs the separate resend action — B5 recheck, expected to pass", deliverable.length === 0 && (o as any).intent == null && (o as any).downstream === "ALLOW" && newRow.status === "EXPIRED" && newRow.v === twoHours && newRow.downstream === "ALLOW", { outcome: { status: o.status, intent: (o as any).intent, downstream: (o as any).downstream }, deliveries: rows });
  const route = routesMod.overturnResponse(o);
  note("D1 route body for this overturn", route);
  const original = rows[0].id;
  const resendOriginal = await svcAt(db, at(2 * 3600_000 + 1000)).resend({ deliveryId: original, operationId: "rs-1", actor: mod });
  const overturnDelivery = rows.at(-1).id;
  const resendOverturn = await svcAt(db, at(2 * 3600_000 + 6 * 60_000)).resend({ deliveryId: overturnDelivery, operationId: "rs-2", actor: mod });
  check("D2 the explicit resend of that 2-hour-old message is refused by the age limit (WINDOW_CLOSED) for both delivery rows", (resendOriginal as any).reason === "WINDOW_CLOSED" && (resendOverturn as any).reason === "WINDOW_CLOSED" && n(db, "select count(*) n from deliveries where id like 'resend:%'") === 0, { resendOriginal, resendOverturn, resendMaxAgeMs: svcMod.DEFAULT_DECISION_LIMITS.resendMaxAgeMs });
  f.close();
}
{
  // D3: a recent BLOCK overturned to ALLOW: no automatic delivery; an explicit resend inside the 10 min age limit works,
  // once, with a 60 s window; after the limit it is refused.
  const f = freshDb("m6-s014-d3-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const mod = roleActor("MODERATOR", "mod-1");
  await svcAt(db, fx.DECIDED_AT).commit("task-1", BLOCK, { kind: "HUMAN", actor: mod });
  const o = await svcAt(db, at(60_000)).overturn({ eventId: "event-1", operationId: "op-r", verdict: ALLOW, actor: mod });
  const row = q(db, "select id, status, valid_until v from deliveries order by delivery_sequence").at(-1);
  const resent = await svcAt(db, at(90_000)).resend({ deliveryId: row.id, operationId: "rs-r", actor: mod });
  const again = await svcAt(db, at(95_000)).resend({ deliveryId: row.id, operationId: "rs-r", actor: mod });
  const lateR = await svcAt(db, at(11 * 60_000)).resend({ deliveryId: row.id, operationId: "rs-late", actor: mod });
  check("D3 a 1-minute-old BLOCK overturned to ALLOW: intent null, row EXPIRED; explicit resend at 90 s works with a 60 s window; same op duplicate; after 10 min WINDOW_CLOSED", (o as any).intent == null && row.status === "EXPIRED" && resent.status === "resent" && (resent as any).intent?.verdict === "ALLOW" && (resent as any).intent?.validUntil === at(150_000) && again.status === "duplicate" && (lateR as any).reason === "WINDOW_CLOSED", { o: (o as any).intent, row, resent, again: again.status, lateR });
  f.close();
}
{
  // D4: ALLOW overturned to BLOCK keeps an immediate BLOCK delivery (the implementer's choice, so the output can take the
  // old content off; proposal 13.1 decides about a separate block event). Nothing deliverable says ALLOW.
  const f = freshDb("m6-s014-d4-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const mod = roleActor("MODERATOR", "mod-1");
  await svcAt(db, fx.DECIDED_AT).commit("task-1", ALLOW, { kind: "HUMAN", actor: mod });
  const twoHours = at(2 * 3600_000);
  const o = await svcAt(db, twoHours).overturn({ eventId: "event-1", operationId: "op-b", verdict: BLOCK, actor: mod });
  const rows = q(db, "select d.status, d.valid_until v, x.downstream from deliveries d join verdicts x on x.id = d.verdict_id order by d.delivery_sequence");
  note("D4 ALLOW -> BLOCK overturn of a 2-hour-old message", { intent: (o as any).intent, rows });
  check("D4 no deliverable ALLOW row exists after an ALLOW -> BLOCK overturn; the new row is a BLOCK", rows.filter((r: any) => r.status === "PENDING" && r.v > twoHours && r.downstream === "ALLOW").length === 0 && rows.at(-1).downstream === "BLOCK" && (o as any).intent?.verdict === "BLOCK", rows);
  f.close();
}

// ------------------------------------------------------------------ E. resend
section("E explicit resend of an expired delivery (SUB-027)");
{
  const f = freshDb("m6-s014-e-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const mod = roleActor("MODERATOR", "mod-1");
  const committed: any = await svcAt(db, fx.DECIDED_AT).commit("task-1", ALLOW, { kind: "HUMAN", actor: mod });
  const delivery = q(db, "select id, valid_until v from deliveries")[0];
  const early = await svcAt(db, at(60_000)).resend({ deliveryId: delivery.id, operationId: "r0", actor: mod });
  const ok = await svcAt(db, at(6 * 60_000)).resend({ deliveryId: delivery.id, operationId: "r1", actor: mod });
  const dup = await svcAt(db, at(6 * 60_000 + 1000)).resend({ deliveryId: delivery.id, operationId: "r1", actor: mod });
  const late = await svcAt(db, at(11 * 60_000)).resend({ deliveryId: delivery.id, operationId: "r2", actor: mod });
  const admin = await svcAt(db, at(6 * 60_000)).resend({ deliveryId: delivery.id, operationId: "r3", actor: roleActor("DATA_ADMIN", "admin-1") });
  const resentRow = q(db, "select id, valid_until v, status from deliveries where id like 'resend:%'");
  check("E1 not expired -> NOT_EXPIRED; expired within 10 min -> resent with a 60 s window; same op -> duplicate; after 10 min -> WINDOW_CLOSED; data admin -> denied", (early as any).reason === "NOT_EXPIRED" && ok.status === "resent" && (ok as any).intent.validUntil === at(6 * 60_000 + 60_000) && dup.status === "duplicate" && (late as any).reason === "WINDOW_CLOSED" && admin.status === "denied" && resentRow.length === 1, { committedValidUntil: committed.intent?.validUntil, early, ok: ok.status, okValid: (ok as any).intent?.validUntil, dup: dup.status, late, admin: admin.status, resentRow });
  tx.runShortTransaction(db, (t: any) => repo.SubjectStore.bumpGeneration(t, "subject-viewer-1"));
  const stale = await svcAt(db, at(7 * 60_000)).resend({ deliveryId: delivery.id, operationId: "r4", actor: mod });
  check("E2 after a deletion crossing (generation raised) a resend is refused", (stale as any).reason === "STALE_GENERATION", stale);
  db.sqlite.prepare("update deliveries set status = 'SENT'").run();
  note("E3 (5482e5d observation) the resend did not read deliveries.status", "m6r1 checks the refusal in E3 below");
  f.close();
}
{
  const f = freshDb("m6-s014-e3-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const mod = roleActor("MODERATOR", "mod-1");
  await svcAt(db, fx.DECIDED_AT).commit("task-1", ALLOW, { kind: "HUMAN", actor: mod });
  db.sqlite.prepare("update deliveries set status = 'SENT'").run();
  const sentId = q(db, "select id from deliveries")[0].id;
  const r = await svcAt(db, at(6 * 60_000)).resend({ deliveryId: sentId, operationId: "rs-sent", actor: mod });
  check("E3 a delivery the output marked SENT is not resent after its window (ALREADY_SENT), and no row is added", r.status === "refused" && (r as any).reason === "ALREADY_SENT" && n(db, "select count(*) n from deliveries") === 1, r);
  f.close();
}

// ------------------------------------------------------------------ F. lists and terms
section("F blacklist, whitelist and terms by permission; Change Log rows (Q29 writer side)");
{
  const f = freshDb("m6-s014-f-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const deps = depsAt(db, fx.DECIDED_AT);
  const admin = listMod.createListAdministration(deps);
  const asAdmin = admin.editSubjectList(roleActor("DATA_ADMIN", "admin-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" });
  const termAdmin = admin.editTerm(roleActor("DATA_ADMIN", "admin-1"), { action: "ADD", term: "synthword", matchKind: "EXACT", language: "zh", groupCode: "G1" });
  check("F1 DATA_ADMIN (real role matrix) is refused for list and term edits; nothing written", asAdmin.status === "denied" && termAdmin.status === "denied" && n(db, "select count(*) n from list_entries") === 0 && n(db, "select count(*) n from rule_terms") === 0 && n(db, "select count(*) n from change_logs") === 0, { asAdmin, termAdmin });
  const asMod = admin.editSubjectList(roleActor("MODERATOR", "mod-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" });
  const white = admin.editSubjectList(roleActor("CHANNEL_OWNER", "owner-1"), { subjectKey: "viewer-1", listKind: "WHITELIST" });
  const termMod = admin.editTerm(roleActor("MODERATOR", "mod-1"), { action: "ADD", term: "synthword", matchKind: "EXACT", language: "zh", groupCode: "G1" });
  check("F2 a moderator blacklists and adds a term; a whitelist while blacklisted is a conflict", asMod.status === "applied" && white.status === "conflict" && termMod.status === "applied", { asMod, white, termMod });
  await svcAt(db, fx.DECIDED_AT).commit("task-1", BLOCK, { kind: "HUMAN", actor: roleActor("MODERATOR", "mod-1") });
  await svcAt(db, at(30_000)).overturn({ eventId: "event-1", operationId: "op-1", verdict: ALLOW, actor: roleActor("MODERATOR", "mod-1") });
  const logs = q(db, "select change_kind k, summary s, correlation_id c from change_logs order by rowid");
  const subjectId = q(db, "select id from subjects where platform_subject_key = 'viewer-1'")[0].id;
  check("F3 Change Log summaries carry no score digits and no message text; list rows carry subject:<id>; verdict rows the event correlation", logs.every((r: any) => !/\d/.test(r.s) && !r.s.includes("synthetic text")) && logs.filter((r: any) => r.k === "LIST_CHANGED").every((r: any) => r.c === `subject:${subjectId}`) && logs.filter((r: any) => r.k === "MANUAL_VERDICT" || r.k === "SCORE_CHANGED").every((r: any) => r.c === "corr-event-1"), logs);
  f.close();
}

// ------------------------------------------------------------------ G. Q19 ③ one transaction
section("G Q19 ③ verdict, delivery, score and Change Log in one transaction");
{
  const f = freshDb("m6-s014-g-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  seedTask(db, 1);
  const real = scoringMod.createScoringPlanner(lh.ENABLED);
  const failing = { planVerdict: () => () => { throw new Error("synthetic scoring failure"); }, planCorrection: real.planCorrection };
  const s = dsMod.createDecisionService(depsAt(db, fx.DECIDED_AT, failing));
  let threw = "";
  try {
    await s.commit("task-1", BLOCK, { kind: "HUMAN", actor: roleActor("MODERATOR", "mod-1") });
  } catch (error) {
    threw = (error as Error).message;
  }
  const counts = { verdicts: n(db, "select count(*) n from verdicts"), deliveries: n(db, "select count(*) n from deliveries"), changeLogs: n(db, "select count(*) n from change_logs"), taskStatus: q(db, "select status from tasks where id = 'task-1'")[0].status };
  check("G1 a scoring failure rolls back the verdict, the delivery and the Change Log; the task stays open", threw !== "" && counts.verdicts === 0 && counts.deliveries === 0 && counts.changeLogs === 0 && counts.taskStatus !== "DONE", { threw, counts });
  f.close();
}

// ------------------------------------------------------------------ H. exception subject through the decision path
section("H a human verdict on an exception subject (Q21 through DecisionService)");
{
  const f = freshDb("m6-s014-h-");
  const db = f.database;
  fx.seedChannel(db, "channel-a");
  lh.seedException(db, "channel-a", "viewer-x");
  fx.seedOpenTask(db, { channelId: "channel-a", subjectKey: "viewer-x", subjectId: "unused", eventId: "event-x", platformMessageRef: "msg-x", taskId: "task-x" });
  const out: any = await svcAt(db, fx.DECIDED_AT).commit("task-x", BLOCK, { kind: "HUMAN", actor: roleActor("MODERATOR", "mod-1") });
  check("H1 the verdict is kept, the score is refused and not written", out.status === "committed" && out.scoring === "refused" && n(db, "select count(*) n from score_ledger") === 0 && n(db, "select count(*) n from score_outcomes where outcome = 'REFUSED'") === 1, { status: out.status, scoring: out.scoring });
  f.close();
}

// ------------------------------------------------------------------ M. migration 0005 against the data dictionary
section("M migration 0005 and docs/data-dictionary.md");
{
  const f = freshDb("m6-s014-m-");
  const db = f.database;
  const cols = q(db, "pragma table_info(score_outcomes)").map((c: any) => ({ name: c.name, type: c.type, notnull: c.notnull, pk: c.pk }));
  const fks = q(db, "pragma foreign_key_list(score_outcomes)").map((k: any) => `${k.from}->${k.table}.${k.to}`);
  const ddl = q(db, "select sql from sqlite_master where name = 'score_outcomes'")[0]?.sql ?? "";
  const tables = q(db, "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name <> '__drizzle_migrations' order by name").map((t: any) => t.name);
  const dict = readFileSync(`${C}/docs/data-dictionary.md`, "utf8");
  const sectionText = dict.split("### `score_outcomes`")[1]?.split("\n### ")[0] ?? "";
  const dictCols = [...sectionText.matchAll(/^\| `([a-z_]+)` \| (TEXT|INTEGER) \| (否|是) \|/gm)].map((m) => ({ name: m[1], type: m[2], notnull: m[3] === "否" ? 1 : 0 }));
  const sameCols = JSON.stringify(cols.map((c: any) => [c.name, String(c.type).toUpperCase(), c.notnull])) === JSON.stringify(dictCols.map((c) => [c.name, c.type, c.notnull]));
  const scope = /范围：`apps\/server\/src\/db\/schema\/` 中的 (\d+) 张表/.exec(dict)?.[1];
  check("M1 score_outcomes columns, types and nullability match the dictionary; PK idempotency_key; FK subject_id -> subjects.id; CHECK name present", sameCols && cols.find((c: any) => c.pk === 1)?.name === "idempotency_key" && fks.join() === "subject_id->subjects.id" && ddl.includes("ck_score_outcomes_kind") && sectionText.includes("ck_score_outcomes_kind"), { cols, dictCols, fks, ddl });
  check("M2 the dictionary's table count equals the migrated database", Number(scope) === tables.length, { dictionary: scope, migrated: tables.length });
  const journal = JSON.parse(readFileSync(`${S}/src/db/migrations/meta/_journal.json`, "utf8"));
  note("M3 journal tags", journal.entries.map((e: any) => e.tag));
  f.close();
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
