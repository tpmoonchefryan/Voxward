// Batch m6 acceptance probe for STORY-011 (review lane, aliases, unified settlement, Q27 front half, Q38, candidate cards,
// review output contract). Imports checkout sources by absolute path; synthetic data only; no network, no real model.
// Usage: tsx probe-m6-s011.mts <checkout> <scratch> <label>
// A check line states the contract it encodes; "FAIL" means the candidate does not meet it. The script only counts.
import { rmSync } from "node:fs";
import { join } from "node:path";

const [C, SCRATCH, LABEL = "candidate"] = process.argv.slice(2);
if (!C || !SCRATCH) throw new Error("usage: probe-m6-s011.mts <checkout> <scratch> <label>");
const S = `${C}/apps/server`;

const runnerMod = await import(`${S}/src/modules/moderation-engine/review/runner.js`);
const storeMod = await import(`${S}/src/modules/moderation-engine/candidates/store.js`);
const routesMod = await import(`${S}/src/modules/moderation-engine/candidates/routes.js`);
const tcMod = await import(`${S}/src/modules/task-coordinator/index.js`);
const scoringMod = await import(`${S}/src/modules/scoring-engine/index.js`);
const ledgerMod = await import(`${S}/src/db/scoring-ledger.js`);
const permMod = await import(`${S}/src/auth/permissions.js`);
const ipMod = await import(`${S}/src/modules/inference-provider/index.js`);
const fx = await import(`${S}/test/moderation-engine/review/fixtures.ts`);
const tch = await import(`${S}/test/task-coordinator/helpers.ts`);
const crewFx = await import(`${S}/test/task-coordinator/crew/fake-crew.ts`);
const dbh = await import(`${S}/test/db/helpers.ts`);
const lh = await import(`${S}/test/scoring-engine/ledger/helpers.ts`);

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

const POLICY = { periodMs: 60_000, countThreshold: 50, maxPerCycle: 50 };
const CH = "ch-1";

/** A runner over a given coordinator, with a recording wrapper so the lane of every enqueue is visible. */
function runnerOn(coordinator: any, opts: { scoring?: any; store?: any; model?: any; newNonce?: () => string } = {}) {
  const lanes: string[] = [];
  const spy = {
    enqueueInLane: (lane: string, event: any, deadline: string) => {
      lanes.push(lane);
      return coordinator.enqueueInLane(lane, event, deadline);
    },
    takeBatch: () => coordinator.takeBatch(),
    commitResult: (id: string, r: any) => coordinator.commitResult(id, r),
    reportFailure: (id: string, code: string) => coordinator.reportFailure(id, code),
    statusOf: (id: string) => coordinator.statusOf(id),
    finishBatch: (id: string) => coordinator.finishBatch(id),
  };
  const store = opts.store ?? new fx.MemoryReviewStore();
  const reviewQueue = new fx.MemoryReviewQueue();
  const candidates = new fx.MemoryCandidates();
  const model = opts.model ?? new fx.ScriptedModel();
  const ledger = new (await_fakeLedger())();
  const scoring = opts.scoring ?? scoringMod.createScoringEngine({ ledger, clock: () => new Date(tch.START) });
  const runner = runnerMod.createReviewRunner({
    store,
    coordinator: spy,
    model,
    scoring,
    reviewQueue,
    candidates,
    now: () => new Date(Date.parse(tch.START)),
    newId: tch.sequentialIds("rec"),
    newNonce: opts.newNonce ?? tch.sequentialIds("nonce"),
    policy: POLICY,
  });
  return { runner, store, reviewQueue, candidates, model, lanes, ledger };
}
let FakeLedgerClass: any = null;
function await_fakeLedger() {
  return FakeLedgerClass;
}
FakeLedgerClass = (await import(`${S}/test/scoring-engine/fake-ledger.ts`)).FakeLedger;

const deadline = new Date(Date.parse(tch.START) + 10 * 60_000).toISOString();

// ------------------------------------------------------------------ A. lane and the realtime path
section("A review lane, and a coordinator shared with the realtime path");
{
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator);
  r.store.seed({ eventId: "ev-b1", event: fx.messageOf("b1", { order: 1 }) });
  r.store.seed({ eventId: "ev-b2", event: fx.messageOf("b2", { order: 2, senderRef: "viewer-2" }) });
  const cycle = await r.runner.runCycle({ channelId: CH, streamEnded: true });
  check("A1 every review enqueue uses the BACKGROUND lane", r.lanes.length === 2 && r.lanes.every((l) => l === "BACKGROUND"), { lanes: r.lanes, trigger: cycle.trigger });
}
{
  // One coordinator for every lane, as the S009 design lays it out (one capacity limit, lanes PAID > REALTIME > BACKGROUND).
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator);
  const rt = tch.eventOf({ channelId: CH, platformMessageId: "rt-1", platformOrder: 10, senderRef: "viewer-9" });
  const rtRef = await h.coordinator.enqueueInLane("REALTIME", rt, deadline);
  r.store.seed({ eventId: "ev-b3", event: fx.messageOf("b3", { order: 3 }) });
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  const first = await r.runner.runBatch();
  const rtStatus = await h.coordinator.statusOf(rtRef.taskId);
  const rtLog = h.log.forTask(rtRef.taskId).map((e: any) => `${e.stage}/${e.status}/${e.errorCode ?? ""}`);
  note("A2 first runBatch() items", first?.items);
  check(
    "A2 runBatch() on a shared coordinator leaves the queued REALTIME task to its own path (contract: 复盘只走 BACKGROUND、让出实时容量)",
    rtStatus === "QUEUED" || rtStatus === "RUNNING",
    { realtimeStatus: rtStatus, realtimeLog: rtLog },
  );
  const second = await r.runner.runBatch();
  note("A2 second runBatch() items", second?.items);
}
{
  // The S009 Crew executor drains the same coordinator. A review task it takes is settled through writeVerdict.
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator);
  const crew = new crewFx.FakeCrew();
  const written: string[] = [];
  const executor = tcMod.createCrewExecutor({ coordinator: h.coordinator, crew, writeVerdict: (taskId: string) => written.push(taskId) });
  r.store.seed({ eventId: "ev-b4", event: fx.messageOf("b4", { order: 4 }) });
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  const started = await executor.pump();
  const job = crew.started[0];
  if (job !== undefined) crew.finish(crew.refFor(job.batchId), crewFx.completedFor(job, "ALLOW_MEANINGFUL"));
  await crewFx.flush();
  await executor.drain();
  const after = await r.runner.runBatch();
  check(
    "A3 a review task is settled by the review runner, not by the realtime Crew executor sharing the coordinator",
    started === 0 && written.length === 0,
    { executorStarted: started, crewJobs: crew.started.map((j: any) => j.items.map((i: any) => i.correlationId)), verdictsWrittenByExecutor: written, storeState: r.store.stateOf("ev-b4"), reviewRunnerAfter: after },
  );
}

// ------------------------------------------------------------------ B. aliases
section("B task-local author aliases");
{
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator, { newNonce: tch.sequentialIds("n") });
  r.store.seed({ eventId: "ev-c1", event: fx.messageOf("c1", { order: 1, senderRef: "viewer-secret-A", body: "hello one" }) });
  r.store.seed({ eventId: "ev-c2", event: fx.messageOf("c2", { order: 2, senderRef: "viewer-secret-A", body: "hello two" }) });
  r.store.seed({ eventId: "ev-c3", event: fx.messageOf("c3", { order: 3, senderRef: "viewer-secret-B", body: "hello three" }) });
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  await r.runner.runBatch();
  const input1 = r.model.inputs[0];
  const sent1 = JSON.stringify(input1);
  check("B1 model input carries no sender reference, channel id or platform message id", !/viewer-secret|ch-1|"c1"|"c2"|"c3"|corr-/.test(sent1), sent1);
  const aliasOf = (t: string) => /^\[([^\]]+)\]/.exec(t)?.[1];
  const a = input1.items.map((i: any) => aliasOf(i.text));
  check("B2 within one task the same author has one alias, another author a different one", a[0] === a[1] && a[0] !== a[2], a);
  check("B3 model items have only itemId and text", input1.items.every((i: any) => Object.keys(i).sort().join(",") === "itemId,text"));
  r.store.seed({ eventId: "ev-c4", event: fx.messageOf("c4", { order: 4, senderRef: "viewer-secret-A", body: "hello four" }) });
  h.clock.advance(61_000);
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  await r.runner.runBatch();
  const a2 = aliasOf(r.model.inputs[1].items[0].text);
  check("B4 the same author gets a different alias in the next task", a2 !== a[0], { first: a[0], next: a2 });
}

// ------------------------------------------------------------------ C. unified settlement over the real SQLite ledger
section("C unified settlement, real scoring engine and SQLite ledger port");
const dir = dbh.scratchDirectory("m6-s011-");
try {
  const database = dbh.migratedDatabase(dir);
  lh.seedChannels(database, [CH]);
  const port = ledgerMod.createScoringLedgerPort(database);
  const scoring = scoringMod.createScoringEngine({ ledger: port, clock: () => new Date(tch.START), config: lh.ENABLED });
  const ledgerRows = () => database.sqlite.prepare("select idempotency_key k, actual_delta d from score_ledger order by created_at, rowid").all();
  const outcomes = () => database.sqlite.prepare("select idempotency_key k, outcome o, reason_code r from score_outcomes order by rowid").all();

  // C1 one review settles once and scores once; the realtime path then scoring the same event is a duplicate.
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator, { scoring });
  r.store.seed({ eventId: "ev-d1", event: fx.messageOf("d1", { order: 1, senderRef: "viewer-d" }) });
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  const b = await r.runner.runBatch();
  const again = await scoring.applyVerdict(fx.messageOf("d1", { order: 1, senderRef: "viewer-d" }), (await import(`${C}/packages/contracts/src/index.ts`)).createVerdict("ALLOW_MEANINGFUL", []));
  const resumed = await r.runner.resumePendingScoring();
  const scoreD = lh.scoreOf(database, CH, "viewer-d");
  check("C1 settled once, one ledger row and score +2; a later applyVerdict for the same event writes nothing (the port returns the first change)", b?.items.length === 1 && b.items[0].status === "SETTLED" && ledgerRows().length === 1 && scoreD?.current === 2 && resumed === 0, { batch: b?.items, rows: ledgerRows(), again, score: scoreD, resumed });

  // C2 two writers of one message (shared store): one settlement, one score.
  const shared = new fx.MemoryReviewStore();
  shared.seed({ eventId: "ev-d2", event: fx.messageOf("d2", { order: 2, senderRef: "viewer-e" }) });
  const h1 = tch.harnessWith({ limit: 4 });
  const h2 = tch.harnessWith({ limit: 4 });
  const w1 = runnerOn(h1.coordinator, { scoring, store: shared });
  const w2 = runnerOn(h2.coordinator, { scoring, store: shared });
  await w1.runner.runCycle({ channelId: CH, streamEnded: true });
  await w2.runner.runCycle({ channelId: CH, streamEnded: true });
  const o1 = await w1.runner.runBatch();
  const o2 = await w2.runner.runBatch();
  const rowsE = ledgerRows().filter((x: any) => x.k.includes("d2"));
  check("C2 two writers: one SETTLED, the other NOT_ELIGIBLE, one ledger row", o1?.items[0].status === "SETTLED" && o2?.items[0].status === "NOT_ELIGIBLE" && rowsE.length === 1, { o1: o1?.items, o2: o2?.items, rowsE });

  // C3 a person decides first / a deletion starts between selection and commit: nothing settles, nothing scores.
  const h3 = tch.harnessWith({ limit: 4 });
  const r3 = runnerOn(h3.coordinator, { scoring });
  r3.store.seed({ eventId: "ev-d3", event: fx.messageOf("d3", { order: 3, senderRef: "viewer-f" }) });
  r3.store.seed({ eventId: "ev-d4", event: fx.messageOf("d4", { order: 4, senderRef: "viewer-g" }) });
  await r3.runner.runCycle({ channelId: CH, streamEnded: true });
  r3.store.decideManually("ev-d3");
  r3.store.markDeletionInProgress("ev-d4");
  const o3 = await r3.runner.runBatch();
  const rows3 = ledgerRows().filter((x: any) => /d3|d4/.test(x.k));
  check("C3 manual decision and deletion in between: NOT_ELIGIBLE, no ledger row", o3?.items.every((i: any) => i.status === "NOT_ELIGIBLE") === true && rows3.length === 0, { items: o3?.items, rows3 });

  // C4 expired evidence: marked UNSETTLED_EXPIRED, never sent to the model, no score.
  const h4 = tch.harnessWith({ limit: 4 });
  const r4 = runnerOn(h4.coordinator, { scoring });
  r4.store.seed({ eventId: "ev-d5", event: fx.messageOf("d5", { order: 5, senderRef: "viewer-h" }), evidenceExpiresAt: tch.START });
  const c4 = await r4.runner.runCycle({ channelId: CH, streamEnded: true });
  const o4 = await r4.runner.runBatch();
  check("C4 expired evidence: UNSETTLED_EXPIRED, model not called, no score", r4.store.stateOf("ev-d5") === "UNSETTLED_EXPIRED" && r4.model.inputs.length === 0 && o4 === null && ledgerRows().every((x: any) => !x.k.includes("d5")), { cycle: c4, state: r4.store.stateOf("ev-d5") });

  // C5 a subject that the exception list covers in the database: the port refuses, the item is REFUSED, a retry is a no-op.
  lh.seedException(database, CH, "viewer-x");
  const h5 = tch.harnessWith({ limit: 4 });
  const r5 = runnerOn(h5.coordinator, { scoring });
  r5.store.seed({ eventId: "ev-d6", event: fx.messageOf("d6", { order: 6, senderRef: "viewer-x" }) });
  await r5.runner.runCycle({ channelId: CH, streamEnded: true });
  const o5 = await r5.runner.runBatch();
  let retry: unknown;
  try {
    retry = await scoring.applyVerdict(fx.messageOf("d6", { order: 6, senderRef: "viewer-x" }), (await import(`${C}/packages/contracts/src/index.ts`)).createVerdict("ALLOW_MEANINGFUL", []));
  } catch (error) {
    retry = { threw: (error as any).code };
  }
  check("C5 exception subject: scoring REFUSED by the port, no ledger row, outcome recorded", o5?.items[0].status === "SETTLED" && (o5.items[0] as any).scoring === "REFUSED" && ledgerRows().every((x: any) => !x.k.includes("d6")) && outcomes().some((x: any) => x.k.includes("d6") && x.o === "REFUSED"), { item: o5?.items[0], outcomes: outcomes(), retry });
  database.close();
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------------ D. Q27 front half
section("D BLOCK settlement writes a review record (Q27 front half)");
{
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator);
  r.store.seed({ eventId: "ev-e1", event: fx.messageOf("e1", { order: 1, body: "synthetic text with a word" }) });
  r.store.seed({ eventId: "ev-e2", event: fx.messageOf("e2", { order: 2, senderRef: "viewer-2" }) });
  r.model.respondWith((input: any) => ({
    items: input.items.map((item: any, i: number) => (i === 0 ? { itemId: item.itemId, verdict: "BLOCK", reasonCodes: ["HARASSMENT"], candidateTerms: [] } : { itemId: item.itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] })),
  }));
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  await r.runner.runBatch();
  const rec = r.reviewQueue.records;
  check("D1 one review record for the BLOCK item, none for the ALLOW item, no text in it", rec.length === 1 && rec[0].eventId === "ev-e1" && rec[0].humanState === "OPEN" && !JSON.stringify(rec).includes("synthetic text"), rec);
}

// ------------------------------------------------------------------ E. Q38 settled-record window
section("E task-coordinator settled-record window (Q38)");
{
  const h = tch.harnessWith({ limit: 4, limits: { maxSettledRecords: 10, maxBatchItems: 1 } });
  const open: string[] = [];
  for (let i = 0; i < 3; i += 1) open.push((await h.coordinator.enqueueInLane("BACKGROUND", tch.eventOf({ platformMessageId: `open-${i}`, platformOrder: 1000 + i }), deadline)).taskId);
  const settledIds: string[] = [];
  for (let i = 0; i < 50; i += 1) {
    const ref = await h.coordinator.enqueueInLane("REALTIME", tch.eventOf({ platformMessageId: `s-${i}`, platformOrder: i + 1 }), deadline);
    const batch = await h.coordinator.takeBatch();
    if (batch !== null) {
      for (const t of batch.tasks) await h.coordinator.commitResult(t.taskId, tch.resultFor(t.taskId));
      await h.coordinator.finishBatch(batch.batchId);
    }
    settledIds.push(ref.taskId);
  }
  const retained = h.coordinator.retainedRecords();
  check("E1 records held stay within the window plus open tasks (10 + 3)", retained <= 13, { retained });
  const openStatus = await Promise.all(open.map((id) => h.coordinator.statusOf(id)));
  check("E2 open tasks are never evicted", openStatus.every((s: string) => s === "QUEUED"), openStatus);
  const late = await h.coordinator.commitResult(settledIds[0], tch.resultFor(settledIds[0]));
  const lateFail = await h.coordinator.reportFailure(settledIds[0], "TRANSIENT_FAILURE");
  check("E3 a late result for an evicted record is discarded, a late failure is ignored", late.status === "discarded" && lateFail.status === "ignored", { late, lateFail });
  let threw = "";
  try {
    await h.coordinator.statusOf(settledIds[0]);
  } catch (error) {
    threw = (error as Error).name;
  }
  note("E4 statusOf for an evicted record", threw || "returned");
}

// ------------------------------------------------------------------ F. candidate cards
section("F candidate cards and confirmation");
{
  const published: unknown[] = [];
  const rules = { publishConfirmedTerm: (input: unknown) => (published.push(input), published.length + 1) };
  const store = storeMod.createCandidateStore({ newId: tch.sequentialIds("card"), now: () => new Date(tch.START), rules });
  const routes = routesMod.createCandidateRoutes(store);
  // Proposals come from a review settlement; check that the runner only proposes.
  const h = tch.harnessWith({ limit: 4 });
  const fstore = new fx.MemoryReviewStore();
  fstore.seed({ eventId: "ev-f1", event: fx.messageOf("f1", { order: 1 }) });
  const model = new fx.ScriptedModel();
  model.respondWith((input: any) => ({ items: input.items.map((it: any) => ({ itemId: it.itemId, verdict: "BLOCK", reasonCodes: ["PHONETIC_EVASION"], candidateTerms: [{ term: "synth-term", note: "synthetic" }] })) }));
  const runner = runnerMod.createReviewRunner({ store: fstore, coordinator: h.coordinator, model, scoring: scoringMod.createScoringEngine({ ledger: new FakeLedgerClass(), clock: () => new Date(tch.START) }), reviewQueue: new fx.MemoryReviewQueue(), candidates: store, now: () => new Date(tch.START), newId: tch.sequentialIds("r"), newNonce: tch.sequentialIds("n"), policy: POLICY });
  await runner.runCycle({ channelId: CH, streamEnded: true });
  await runner.runBatch();
  const cards = store.listCards(CH);
  check("F1 a review proposal becomes a PENDING_CONFIRMATION card with its source, and publishes nothing", cards.length === 1 && cards[0].status === "PENDING_CONFIRMATION" && cards[0].sourceCorrelationId.length > 0 && cards[0].sourceTaskId.length > 0 && published.length === 0, { cards, published });
  const role = (r: string) => new Set(permMod.capabilitiesOfMembership({ role: r, logAccess: false }));
  const actorOf = (r: string, channelId = CH) => ({ accountId: `acct-${r}`, channelId, capabilities: role(r) });
  const asAdmin = routes.confirm(actorOf("DATA_ADMIN"), cards[0].id);
  check("F2 DATA_ADMIN (real role matrix) cannot confirm: 403, nothing published", asAdmin.status === 403 && published.length === 0, asAdmin);
  const otherChannel = routes.confirm(actorOf("MODERATOR", "ch-2"), cards[0].id);
  check("F3 a moderator of another channel gets 404, nothing published", otherChannel.status === 404 && published.length === 0, otherChannel);
  const asMod = routes.confirm(actorOf("MODERATOR"), cards[0].id);
  check("F4 a moderator confirms: 200, one publish, card keeps source and gets the rule version", asMod.status === 200 && published.length === 1 && (asMod.body as any).card.ruleVersion === 2 && (asMod.body as any).card.sourceCorrelationId === cards[0].sourceCorrelationId, asMod);
  const twice = routes.confirm(actorOf("CHANNEL_OWNER"), cards[0].id);
  check("F5 a second confirmation is 409 and publishes nothing", twice.status === 409 && published.length === 1, twice);
  note("F6 card states available", storeMod.CANDIDATE_STATUSES);
  note("F7 routes exposed", Object.keys(routes));
}

// ------------------------------------------------------------------ G. review output contract (VW-R-008)
section("G review output contract: batch item ids complete and unique, whole batch fails (VW-R-008, proposal 8.3)");
const gdir = dbh.scratchDirectory("m6-s011g-");
const gdb = dbh.migratedDatabase(gdir);
lh.seedChannels(gdb, [CH]);
const gScoring = scoringMod.createScoringEngine({ ledger: ledgerMod.createScoringLedgerPort(gdb), clock: () => new Date(tch.START), config: lh.ENABLED });
let gRun = 0;
async function reviewWithOutput(answer: (input: any) => unknown) {
  gRun += 1;
  const h = tch.harnessWith({ limit: 4 });
  const r = runnerOn(h.coordinator, { scoring: gScoring });
  const v1 = `g${gRun}-viewer-1`;
  const v2 = `g${gRun}-viewer-2`;
  r.store.seed({ eventId: `ev-g${gRun}a`, event: fx.messageOf(`g${gRun}a`, { order: 1, senderRef: v1 }) });
  r.store.seed({ eventId: `ev-g${gRun}b`, event: fx.messageOf(`g${gRun}b`, { order: 2, senderRef: v2 }) });
  r.model.respondWith(answer);
  await r.runner.runCycle({ channelId: CH, streamEnded: true });
  const out = await r.runner.runBatch();
  const input = r.model.inputs[0];
  const contract = await ipMod.validateReviewBatch(answer(input), input, { maxItems: 10 });
  const scores = [lh.scoreOf(gdb, CH, v1)?.current ?? null, lh.scoreOf(gdb, CH, v2)?.current ?? null];
  return { out, r, input, contract, scores };
}
const item = (itemId: string, verdict: string) => ({ itemId, verdict, reasonCodes: [verdict === "BLOCK" ? "HARASSMENT" : verdict === "ALLOW_NOISE" ? "NOISE" : "NONE"], candidateTerms: [] });
const fails = (out: any) => out?.items.every((i: any) => i.status === "FAILED") === true;
{
  const g1 = await reviewWithOutput((input: any) => ({ items: [item(input.items[0].itemId, "BLOCK"), item(input.items[0].itemId, "ALLOW_MEANINGFUL")] }));
  note("G1 contract validator (inference-provider validateReviewBatch) on the same output", g1.contract.ok ? "ok" : g1.contract.errors.map((e: any) => e.code));
  check("G1 [i0 BLOCK, i0 ALLOW_MEANINGFUL] for items i0,i1: the whole batch fails, i0's BLOCK is not replaced", fails(g1.out), { items: g1.out?.items, reviewRecords: g1.r.reviewQueue.records.length, scores: g1.scores });
  const g2 = await reviewWithOutput((input: any) => ({ items: [item(input.items[0].itemId, "ALLOW_MEANINGFUL")] }));
  note("G2 contract validator on the same output", g2.contract.ok ? "ok" : g2.contract.errors.map((e: any) => e.code));
  check("G2 [i0 ALLOW] for items i0,i1: the whole batch fails, not only the missing item", fails(g2.out), { items: g2.out?.items, scores: g2.scores });
  const g3 = await reviewWithOutput((input: any) => ({ items: [item(input.items[0].itemId, "ALLOW_MEANINGFUL"), item("i99", "BLOCK")] }));
  note("G3 contract validator on the same output", g3.contract.ok ? "ok" : g3.contract.errors.map((e: any) => e.code));
  check("G3 [i0 ALLOW, i99 BLOCK] for items i0,i1: an id outside the batch fails the whole batch", fails(g3.out), { items: g3.out?.items, scores: g3.scores });
  const g4 = await reviewWithOutput((input: any) => ({ items: [item(input.items[0].itemId, "BLOCK"), item(input.items[1].itemId, "ALLOW_MEANINGFUL"), item(input.items[0].itemId, "ALLOW_MEANINGFUL")] }));
  note("G4 contract validator on the same output", g4.contract.ok ? "ok" : g4.contract.errors.map((e: any) => e.code));
  check("G4 [i0 BLOCK, i1 ALLOW, i0 ALLOW] for items i0,i1: the whole batch fails", fails(g4.out), { items: g4.out?.items, reviewRecords: g4.r.reviewQueue.records.length, scores: g4.scores });
  const g5 = await reviewWithOutput((input: any) => ({ items: [item(input.items[0].itemId, "BLOCK"), item(input.items[1].itemId, "ALLOW_MEANINGFUL")] }));
  check("G5 control: a valid output settles both, BLOCK writes a review record, scores -3 and +2", g5.contract.ok && g5.out?.items.every((i: any) => i.status === "SETTLED") === true && g5.r.reviewQueue.records.length === 1 && g5.scores[0] === -3 && g5.scores[1] === 2, { items: g5.out?.items, scores: g5.scores });
}
gdb.close();
rmSync(gdir, { recursive: true, force: true });

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
