// Batch 6 acceptance probe for the S009 rework (B4 lanes, B5 hung Crew calls, N2 text release).
// Usage: tsx probe-s009-b6.mts <checkout> <work> [label]
// Only synthetic data and in-process replacements: no Kiro Crew, no kiro-cli, no network, no database.
// The script counts checks and never exits non-zero on a failed check; read the last line.
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import fs from "node:fs";
import v8 from "node:v8";

const [C, W, LABEL = "candidate"] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-s009-b6.mts <checkout> <work> [label]");
const tc = await import(`${C}/apps/server/src/modules/task-coordinator/index.ts`);

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
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
async function settle(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await tick();
}
/** Races a call against a real 1 s timer. The coordinator's own clock is fake, so this measures only whether it returns. */
async function timed<T>(work: Promise<T>, ms = 1000): Promise<{ returned: boolean; value: T | null; elapsedMs: number }> {
  const t0 = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"__late__">((resolve) => {
    timer = setTimeout(() => resolve("__late__"), ms);
  });
  const value = await Promise.race([work, late]);
  clearTimeout(timer);
  return { returned: value !== "__late__", value: value === "__late__" ? null : (value as T), elapsedMs: Math.round(performance.now() - t0) };
}

class Clock {
  ms = Date.parse("2026-11-11T12:00:00.000Z");
  now = () => new Date(this.ms);
  at = (offset: number) => new Date(this.ms + offset).toISOString();
  advance = (ms: number) => {
    this.ms += ms;
  };
}
/** Fact store: every commit succeeds unless the event was deleted. apply runs inside the call. */
class Facts {
  deleted = new Set<string>();
  writes = 0;
  key = (k: { channelId: string; platformMessageId: string }) => `${k.channelId}|${k.platformMessageId}`;
  readFacts = (k: any) => ({ eventVersion: 1, processingGeneration: this.deleted.has(this.key(k)) ? 2 : 1, deleted: this.deleted.has(this.key(k)) });
  commitIfCurrent = (k: any, _expected: any, apply: () => void) => {
    if (this.deleted.has(this.key(k))) return { status: "stale" as const, reason: "DATA_DELETED" };
    apply();
    this.writes += 1;
    return { status: "committed" as const };
  };
}
const LOG: any[] = [];
let msg = 0;
function event(over: Partial<{ channelId: string; id: string; order: number; body: string }> = {}): ChannelEvent {
  msg += 1;
  const id = over.id ?? `m${msg}`;
  const channelId = over.channelId ?? "ch-1";
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId,
    platformMessageId: id,
    platformOrder: over.order ?? msg,
    receivedAt: "2026-11-11T12:00:00.000Z",
    correlationId: `corr-${channelId}-${id}`,
    body: over.body ?? "synthetic text",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-1" },
  };
}
const keyOf = (e: { channelId: string; platformMessageId: string }) => ({ channelId: e.channelId, platformMessageId: e.platformMessageId });
function harness(opts: { limit?: number; limits?: Record<string, unknown>; concurrency?: { current(): number } } = {}) {
  const clock = new Clock();
  const facts = new Facts();
  let limit = opts.limit ?? 4;
  let n = 0;
  const coordinator = tc.createTaskCoordinator({
    facts,
    concurrency: opts.concurrency ?? { current: () => limit },
    technicalLog: { record: (entry: any) => LOG.push(entry) },
    clock: clock.now,
    newId: () => `t-${++n}`,
    limits: { maxBatchWaitMs: 0, maxBatchItems: 1, ...(opts.limits ?? {}) },
  });
  return { clock, facts, coordinator, setLimit: (v: number) => (limit = v), limit: () => limit };
}
type H = ReturnType<typeof harness>;
const ok = { apply: () => undefined, evidence: [] };
const commitLogOf = (taskId: string) => LOG.filter((e) => e.taskId === taskId && e.stage === "COMMIT").at(-1)?.data ?? null;

// ======================================================================================
console.log(`\n## [${LABEL}] §A ordering gate by lane (B4)`);
async function laneCase(label: string, setup: (h: H) => Promise<{ commitTaskId: string; others: string[] }>, expected: unknown) {
  const h = harness({ limit: 4 });
  const { commitTaskId, others } = await setup(h);
  const outcome = await h.coordinator.commitResult(commitTaskId, ok);
  const otherStatus = [];
  for (const id of others) otherStatus.push(await h.coordinator.statusOf(id));
  expectEq(label, outcome, expected);
  note(`${label}: other tasks`, otherStatus);
}
const BG = "BACKGROUND";
// A1–A6: earlier task in another lane of the same channel, queued or running, must not hold the commit back.
await laneCase("A1 BACKGROUND queued (order 1) -> REALTIME (order 2) commits", async (h) => {
  const bg = await h.coordinator.enqueueInLane(BG, event({ id: "a1-bg", order: 1 }), h.clock.at(600_000));
  const rt = await h.coordinator.enqueue(event({ id: "a1-rt", order: 2 }), h.clock.at(5000));
  await h.coordinator.takeBatch(); // REALTIME goes first
  return { commitTaskId: rt.taskId, others: [bg.taskId] };
}, { status: "committed" });
await laneCase("A2 BACKGROUND running (order 1) -> REALTIME (order 2) commits", async (h) => {
  const bg = await h.coordinator.enqueueInLane(BG, event({ id: "a2-bg", order: 1 }), h.clock.at(600_000));
  await h.coordinator.takeBatch();
  const rt = await h.coordinator.enqueue(event({ id: "a2-rt", order: 2 }), h.clock.at(5000));
  await h.coordinator.takeBatch();
  return { commitTaskId: rt.taskId, others: [bg.taskId] };
}, { status: "committed" });
await laneCase("A3 BACKGROUND queued (order 1) -> PAID (order 2) commits", async (h) => {
  const bg = await h.coordinator.enqueueInLane(BG, event({ id: "a3-bg", order: 1 }), h.clock.at(600_000));
  const paid = await h.coordinator.enqueueInLane("PAID", event({ id: "a3-sc", order: 2 }), h.clock.at(20_000));
  await h.coordinator.takeBatch();
  return { commitTaskId: paid.taskId, others: [bg.taskId] };
}, { status: "committed" });
await laneCase("A4 BACKGROUND running (order 1) -> PAID (order 2) commits", async (h) => {
  const bg = await h.coordinator.enqueueInLane(BG, event({ id: "a4-bg", order: 1 }), h.clock.at(600_000));
  await h.coordinator.takeBatch();
  const paid = await h.coordinator.enqueueInLane("PAID", event({ id: "a4-sc", order: 2 }), h.clock.at(20_000));
  await h.coordinator.takeBatch();
  return { commitTaskId: paid.taskId, others: [bg.taskId] };
}, { status: "committed" });
await laneCase("A5 REALTIME queued (order 1) -> PAID (order 2, dispatched first) commits", async (h) => {
  const rt = await h.coordinator.enqueue(event({ id: "a5-rt", order: 1 }), h.clock.at(8000));
  const paid = await h.coordinator.enqueueInLane("PAID", event({ id: "a5-sc", order: 2 }), h.clock.at(20_000));
  const first = await h.coordinator.takeBatch();
  note("A5 first batch lane", first?.lane);
  return { commitTaskId: paid.taskId, others: [rt.taskId] };
}, { status: "committed" });
await laneCase("A6 REALTIME running (order 1) -> PAID (order 2) commits", async (h) => {
  const rt = await h.coordinator.enqueue(event({ id: "a6-rt", order: 1 }), h.clock.at(8000));
  await h.coordinator.takeBatch();
  const paid = await h.coordinator.enqueueInLane("PAID", event({ id: "a6-sc", order: 2 }), h.clock.at(20_000));
  await h.coordinator.takeBatch();
  return { commitTaskId: paid.taskId, others: [rt.taskId] };
}, { status: "committed" });
// A7–A9: same channel, same lane: still ordered, and only until the predecessor's deadline.
for (const lane of ["REALTIME", "PAID", BG] as const) {
  const h = harness({ limit: 4 });
  const first = await h.coordinator.enqueueInLane(lane, event({ id: `${lane}-1`, order: 1 }), h.clock.at(2000));
  await h.coordinator.takeBatch();
  const second = await h.coordinator.enqueueInLane(lane, event({ id: `${lane}-2`, order: 2 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq(`A7 ${lane}: a later task of the same lane waits for the earlier one`, await h.coordinator.commitResult(second.taskId, ok), { status: "waiting", waitingOn: first.taskId });
  h.clock.advance(2000);
  expectEq(`A8 ${lane}: once the earlier deadline passes (no sweep yet), the later one commits`, await h.coordinator.commitResult(second.taskId, ok), { status: "committed" });
  expectEq(`A9 ${lane}: and records the unfinished predecessor`, commitLogOf(second.taskId), { orderNote: `PREDECESSOR_UNFINISHED:${first.taskId}` });
}
{
  // A10: an unrelated lane in between does not change which predecessor is awaited.
  const h = harness({ limit: 4 });
  const rt1 = await h.coordinator.enqueue(event({ id: "a10-rt1", order: 1 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  await h.coordinator.enqueueInLane(BG, event({ id: "a10-bg", order: 2 }), h.clock.at(600_000));
  const rt3 = await h.coordinator.enqueue(event({ id: "a10-rt3", order: 3 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq("A10 REALTIME waits only for the earlier REALTIME task, not the BACKGROUND one in between", await h.coordinator.commitResult(rt3.taskId, ok), { status: "waiting", waitingOn: rt1.taskId });
  expectEq("A10 after the earlier REALTIME task commits, the later one commits", [await h.coordinator.commitResult(rt1.taskId, ok), await h.coordinator.commitResult(rt3.taskId, ok)], [{ status: "committed" }, { status: "committed" }]);
}
{
  // A11: reverse direction, BACKGROUND after REALTIME, and other channels.
  const h = harness({ limit: 4 });
  await h.coordinator.enqueue(event({ id: "a11-rt", order: 1 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  const bg = await h.coordinator.enqueueInLane(BG, event({ id: "a11-bg", order: 2 }), h.clock.at(600_000));
  await h.coordinator.takeBatch();
  note("A11 BACKGROUND (order 2) behind a running REALTIME (order 1) of the same channel", await h.coordinator.commitResult(bg.taskId, ok));
  await h.coordinator.enqueue(event({ channelId: "ch-x", id: "a11-x1", order: 1 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  const y = await h.coordinator.enqueue(event({ channelId: "ch-y", id: "a11-y2", order: 2 }), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq("A11 another channel never waits", await h.coordinator.commitResult(y.taskId, ok), { status: "committed" });
}

// ======================================================================================
console.log(`\n## [${LABEL}] §B hung Crew calls (B5)`);
/** Crew replacement. A session is open from the moment its handle is returned until Crew closes it (done or accepted cancel). */
class ModalCrew {
  startHang: (call: number) => boolean = () => false;
  cancelHang: (ref: string) => boolean = () => false;
  doneHang: (ref: string) => boolean = () => false;
  refuseCancelOnce = new Set<string>();
  limitProbe: () => number = () => 0;
  startCalls = 0;
  outstandingStarts = 0;
  hungStarts: Array<() => void> = [];
  open = new Map<string, { settle: (r: unknown) => void; job: any }>();
  maxOpen = 0;
  overLimit: Array<{ how: string; open: number; limit: number }> = [];
  cancelled: string[] = [];
  hungCancels: Array<() => void> = [];
  n = 0;
  async start(job: any) {
    const call = ++this.startCalls;
    this.outstandingStarts += 1;
    if (this.startHang(call)) {
      return new Promise<any>((resolve) => {
        this.hungStarts.push(() => {
          this.outstandingStarts -= 1;
          resolve(this.openSession(job, "late start"));
        });
      });
    }
    this.outstandingStarts -= 1;
    return this.openSession(job, "start");
  }
  openSession(job: any, how: string) {
    const ref = `crew-${++this.n}`;
    let settle!: (r: unknown) => void;
    const done = new Promise((resolve) => (settle = resolve));
    this.open.set(ref, { settle, job });
    this.maxOpen = Math.max(this.maxOpen, this.open.size);
    const limit = this.limitProbe();
    if (this.open.size > limit) this.overLimit.push({ how, open: this.open.size, limit });
    return { crewRef: ref, done };
  }
  close(ref: string, report: unknown) {
    const s = this.open.get(ref);
    if (!s) return;
    this.open.delete(ref);
    if (!this.doneHang(ref)) s.settle(report);
  }
  async cancel(ref: string) {
    this.cancelled.push(ref);
    if (this.refuseCancelOnce.has(ref)) {
      this.refuseCancelOnce.delete(ref);
      throw new Error("synthetic: cancel refused");
    }
    if (this.cancelHang(ref)) {
      await new Promise<void>((resolve) =>
        this.hungCancels.push(() => {
          this.close(ref, { kind: "failed", errorCode: "CANCELLED" });
          resolve();
        }),
      );
      return;
    }
    this.close(ref, { kind: "failed", errorCode: "CANCELLED" });
  }
  complete(ref: string) {
    const s = this.open.get(ref);
    if (!s) return;
    const items = s.job.items.map((it: any) => ({ correlationId: it.correlationId, itemId: `item-${it.taskId}`, classification: "ALLOW_MEANINGFUL", reasonCodes: [] }));
    this.close(ref, { kind: "completed", items });
  }
  completeAll() {
    for (const ref of [...this.open.keys()]) this.complete(ref);
  }
}
function exec(limit: number) {
  const h = harness({ limit });
  const crew = new ModalCrew();
  crew.limitProbe = () => h.limit();
  const writes: string[] = [];
  const executor = tc.createCrewExecutor({ coordinator: h.coordinator, crew, writeVerdict: (taskId: string) => writes.push(taskId) });
  return { ...h, crew, executor, writes };
}
type X = ReturnType<typeof exec>;
async function statuses(x: X, refs: Array<{ taskId: string }>) {
  const out = [];
  for (const r of refs) out.push(await x.coordinator.statusOf(r.taskId));
  return out;
}
{
  // B1: one session's cancel never answers (limit 3). The pump returns and the other channels keep dispatching.
  const x = exec(3);
  x.crew.cancelHang = (ref) => ref === "crew-1";
  const a = await x.coordinator.enqueue(event({ channelId: "ch-a" }), x.clock.at(2000));
  expectEq("B1 first pump starts ch-a", (await timed(x.executor.pump())).value, 1);
  x.clock.advance(2000);
  const p1 = await timed(x.executor.pump());
  expectEq("B1 pump after ch-a's deadline returns in time; ch-a to human review; one cancel sent", [p1.returned, await x.coordinator.statusOf(a.taskId), await x.coordinator.reasonOf(a.taskId), x.crew.cancelled], [true, "PENDING_REVIEW", "DEADLINE_EXCEEDED", ["crew-1"]]);
  const others = [];
  for (const ch of ["ch-b", "ch-c", "ch-d"]) others.push(await x.coordinator.enqueue(event({ channelId: ch }), x.clock.at(60_000)));
  const p2 = await timed(x.executor.pump());
  expectEq("B1 next pump returns and starts the 2 free slots (ch-a's slot stays held)", [p2.returned, p2.value, await statuses(x, others)], [true, 2, ["RUNNING", "RUNNING", "QUEUED"]]);
  x.crew.complete("crew-2");
  x.crew.complete("crew-3");
  await settle();
  const p3 = await timed(x.executor.pump());
  // Complete every session except crew-1, whose cancel is still hanging; crew-1 stays open on the Crew side.
  for (const ref of [...x.crew.open.keys()]) if (ref !== "crew-1") x.crew.complete(ref);
  await settle();
  expectEq("B1 other channels finish normally (DONE) while the cancel still hangs", [p3.returned, p3.value, await statuses(x, others)], [true, 1, ["DONE", "DONE", "DONE"]]);
  expectEq("B1 open sessions never above the limit", [x.crew.maxOpen <= 3, x.crew.overLimit], [true, []]);
  expectEq("B1 crew-1 is still open on the Crew side and its cancel still pending", [x.crew.open.has("crew-1"), x.crew.hungCancels.length], [true, 1]);
  const p4 = await timed(x.executor.cancelEvent(keyOf(event({ channelId: "ch-a", id: "unrelated" }))));
  expectEq("B1 executor.cancelEvent returns in time while the cancel hangs", p4.returned, true);
  x.crew.hungCancels.splice(0).forEach((answer) => answer());
  await settle();
  const more = [];
  for (const ch of ["ch-e", "ch-f", "ch-g"]) more.push(await x.coordinator.enqueue(event({ channelId: ch }), x.clock.at(60_000)));
  expectEq("B1 once Crew answers the hung cancel late, ch-a's slot comes back (3 start)", (await timed(x.executor.pump())).value, 3);
}
{
  // B2: executor.cancelEvent on a running event whose cancel never answers (limit 2).
  const x = exec(2);
  x.crew.cancelHang = (ref) => ref === "crew-1";
  const e = event({ channelId: "ch-a" });
  const a = await x.coordinator.enqueue(e, x.clock.at(60_000));
  await x.executor.pump();
  const c1 = await timed(x.executor.cancelEvent(keyOf(e)));
  expectEq("B2 cancelEvent returns in time; task DISCARDED CANCELLED; Crew asked once", [c1.returned, await x.coordinator.statusOf(a.taskId), await x.coordinator.reasonOf(a.taskId), x.crew.cancelled], [true, "DISCARDED", "CANCELLED", ["crew-1"]]);
  const b = await x.coordinator.enqueue(event({ channelId: "ch-b" }), x.clock.at(60_000));
  const p = await timed(x.executor.pump());
  x.crew.completeAll();
  await settle();
  expectEq("B2 another channel dispatches and commits; nothing written for the cancelled task", [p.returned, p.value, await x.coordinator.statusOf(b.taskId), x.writes.includes(a.taskId)], [true, 1, "DONE", false]);
  expectEq("B2 open sessions never above the limit", x.crew.overLimit, []);
}
{
  // B3: Crew answers no cancel at all (limit 3). A driver awaits every pump, one per 500 ms of fake time.
  const x = exec(3);
  x.crew.cancelHang = () => true;
  const refs: Array<{ taskId: string }> = [];
  const started: number[] = [];
  let late = 0;
  for (let step = 0; step < 24; step += 1) {
    if (step % 2 === 0) refs.push(await x.coordinator.enqueue(event({ channelId: `b3-${step}` }), x.clock.at(1500)));
    const p = await timed(x.executor.pump());
    if (!p.returned) late += 1;
    started.push(p.value ?? -1);
    x.clock.advance(500);
  }
  // Let the last task's deadline pass too, then one more awaited pump.
  x.clock.advance(1500);
  if (!(await timed(x.executor.pump())).returned) late += 1;
  const final = await statuses(x, refs);
  note("B3 sessions started per pump", started);
  expectEq("B3 every awaited pump returned in time", late, 0);
  expectEq("B3 each task reaches an explicit outcome (no QUEUED or RUNNING left)", final.filter((s) => s === "QUEUED" || s === "RUNNING").length, 0);
  note("B3 final statuses", final.reduce((m: Record<string, number>, s: string) => ((m[s] = (m[s] ?? 0) + 1), m), {}));
  note("B3 slots held by hung cancels / sessions Crew still has open / cancels sent", [x.crew.hungCancels.length, x.crew.open.size, x.crew.cancelled.length]);
  expectEq("B3 open sessions never above the limit", [x.crew.maxOpen <= 3, x.crew.overLimit], [true, []]);
}
{
  // B4: the first start never answers until released late (limit 2).
  const x = exec(2);
  x.crew.startHang = (call) => call === 1;
  const a = await x.coordinator.enqueue(event({ channelId: "ch-a" }), x.clock.at(1000));
  const p1 = await timed(x.executor.pump());
  const b = await x.coordinator.enqueue(event({ channelId: "ch-b" }), x.clock.at(60_000));
  const p2 = await timed(x.executor.pump());
  expectEq("B4 pumps return while start #1 hangs; ch-b dispatches", [p1.returned, p1.value, p2.returned, p2.value, await x.coordinator.statusOf(b.taskId)], [true, 1, true, 1, "RUNNING"]);
  x.clock.advance(1000);
  const c = await x.coordinator.enqueue(event({ channelId: "ch-c" }), x.clock.at(60_000));
  const p3 = await timed(x.executor.pump());
  expectEq("B4 at ch-a's deadline its task goes to human review and its slot is freed for ch-c", [p3.returned, await x.coordinator.statusOf(a.taskId), await x.coordinator.reasonOf(a.taskId), p3.value, await x.coordinator.statusOf(c.taskId)], [true, "PENDING_REVIEW", "DEADLINE_EXCEEDED", 1, "RUNNING"]);
  expectEq("B4 open sessions within the limit while start #1 is outstanding", [x.crew.open.size, x.crew.outstandingStarts, x.crew.overLimit], [2, 1, []]);
  x.crew.hungStarts.splice(0).forEach((release) => release());
  await settle();
  note("B4 start #1 returns late: Crew-side open sessions at that moment vs limit (residual 2 of the rework)", x.crew.overLimit);
  expectEq("B4 the late session is cancelled at once and closed", [x.crew.cancelled, x.crew.open.size], [["crew-3"], 2]);
  x.crew.completeAll();
  await settle();
  expectEq("B4 the other channels commit", await statuses(x, [b, c]), ["DONE", "DONE"]);
}
{
  // B5: no start ever answers (limit 2). Tasks expire to human review; outstanding start calls are counted.
  const x = exec(2);
  x.crew.startHang = () => true;
  const refs: Array<{ taskId: string }> = [];
  let late = 0;
  for (let cycle = 0; cycle < 10; cycle += 1) {
    for (let i = 0; i < 2; i += 1) refs.push(await x.coordinator.enqueue(event({ channelId: `b5-${cycle}-${i}` }), x.clock.at(1000)));
    if (!(await timed(x.executor.pump())).returned) late += 1;
    x.clock.advance(1000);
    if (!(await timed(x.executor.pump())).returned) late += 1;
  }
  const final = await statuses(x, refs);
  expectEq("B5 every pump returned in time; every task ended in human review", [late, final.every((s) => s === "PENDING_REVIEW")], [0, true]);
  note("B5 start calls made / still outstanding after 10 deadline cycles", [x.crew.startCalls, x.crew.outstandingStarts]);
}
{
  // B6: the first session never reports (done hangs) but accepts the cancel (limit 1).
  const x = exec(1);
  x.crew.doneHang = (ref) => ref === "crew-1";
  const a = await x.coordinator.enqueue(event({ channelId: "ch-a" }), x.clock.at(1000));
  await x.executor.pump();
  x.clock.advance(1000);
  const p1 = await timed(x.executor.pump());
  await settle();
  const b = await x.coordinator.enqueue(event({ channelId: "ch-b" }), x.clock.at(60_000));
  const p2 = await timed(x.executor.pump());
  x.crew.completeAll();
  await settle();
  expectEq("B6 done hangs: pump returns, ch-a to human review, cancel accepted, slot reused by ch-b which commits", [p1.returned, await x.coordinator.statusOf(a.taskId), x.crew.cancelled, p2.returned, p2.value, await x.coordinator.statusOf(b.taskId)], [true, "PENDING_REVIEW", ["crew-1"], true, 1, "DONE"]);
  expectEq("B6 open sessions never above the limit", [x.crew.maxOpen, x.crew.overLimit], [1, []]);
  const e = event({ channelId: "ch-c" });
  await x.coordinator.enqueue(e, x.clock.at(60_000));
  x.crew.doneHang = () => true;
  await x.executor.pump();
  const c1 = await timed(x.executor.cancelEvent(keyOf(e)));
  expectEq("B6 cancelEvent returns in time when done hangs", c1.returned, true);
}
{
  // B7: a refused cancel keeps the slot and is sent again by the next pump (limit 1).
  const x = exec(1);
  x.crew.refuseCancelOnce.add("crew-1");
  const e = event({ channelId: "ch-a" });
  await x.coordinator.enqueue(e, x.clock.at(60_000));
  await x.executor.pump();
  await timed(x.executor.cancelEvent(keyOf(e)));
  await settle();
  const b = await x.coordinator.enqueue(event({ channelId: "ch-b" }), x.clock.at(60_000));
  const p1 = await timed(x.executor.pump());
  await settle();
  const p2 = await timed(x.executor.pump());
  x.crew.completeAll();
  await settle();
  expectEq("B7 refused cancel: resent, then the slot is released and ch-b commits", [x.crew.cancelled, p1.returned, p2.returned, await x.coordinator.statusOf(b.taskId), x.crew.overLimit], [["crew-1", "crew-1"], true, true, "DONE", []]);
  note("B7 sessions started by the two pumps after the refusal", [p1.value, p2.value]);
}

// ======================================================================================
console.log(`\n## [${LABEL}] §C settled tasks release their text (N2)`);
{
  const h = harness({ limit: 8, limits: { maxBatchItems: 8, maxQueued: { PAID: 50, REALTIME: 600, BACKGROUND: 500 } } });
  const pad = "x".repeat(200);
  // Buffer round trip gives a flat string, so the heap snapshot holds each text as one searchable string.
  const body = (tag: string, i: number) => Buffer.from(`N2MARK-${tag}-${String(i).padStart(4, "0")}-${pad}`, "utf8").toString("utf8");
  const per = 50;
  async function run(tag: string, settleOne: (taskId: string, key: { channelId: string; platformMessageId: string }) => Promise<void>) {
    for (let i = 0; i < per; i += 1) {
      const e = event({ channelId: `n2-${tag}`, id: `${tag}-${i}`, body: body(tag, i) });
      const key = keyOf(e);
      const ref = await h.coordinator.enqueue(e, h.clock.at(60_000));
      await settleOne(ref.taskId, key);
    }
  }
  await run("done", async (taskId) => {
    const batch = await h.coordinator.takeBatch();
    await h.coordinator.commitResult(taskId, ok);
    await h.coordinator.finishBatch(batch.batchId);
  });
  await run("cancelq", async (_taskId, key) => {
    await h.coordinator.cancelEvent(key);
  });
  await run("cancelr", async (_taskId, key) => {
    const batch = await h.coordinator.takeBatch();
    await h.coordinator.cancelEvent(key);
    await h.coordinator.finishBatch(batch.batchId);
  });
  await run("stale", async (taskId, key) => {
    const batch = await h.coordinator.takeBatch();
    h.facts.deleted.add(h.facts.key(key));
    await h.coordinator.commitResult(taskId, ok);
    await h.coordinator.finishBatch(batch.batchId);
  });
  await run("fail", async (taskId) => {
    const batch = await h.coordinator.takeBatch();
    await h.coordinator.reportFailure(taskId, "INVALID_OUTPUT");
    await h.coordinator.finishBatch(batch.batchId);
  });
  // expiry: enqueue with a short deadline, sweep after it
  for (let i = 0; i < per; i += 1) await h.coordinator.enqueue(event({ channelId: "n2-exp", id: `exp-${i}`, body: body("expired", i) }), h.clock.at(1000));
  h.clock.advance(1000);
  await h.coordinator.sweep();
  // late result after the deadline (N1 path); inside a function, so the probe itself holds no batch afterwards
  for (let i = 0; i < per; i += 1) {
    await (async () => {
      const ref = await h.coordinator.enqueue(event({ channelId: "n2-late", id: `late-${i}`, body: body("late", i) }), h.clock.at(1000));
      const batch = await h.coordinator.takeBatch();
      h.clock.advance(1000);
      await h.coordinator.commitResult(ref.taskId, ok);
      await h.coordinator.finishBatch(batch.batchId);
    })();
  }
  // refused at intake: lane full (PAID cap 50, filled by open tasks kept below)
  for (let i = 0; i < per; i += 1) await h.coordinator.enqueueInLane("PAID", event({ channelId: "n2-open", id: `open-${i}`, body: body("open", i) }), h.clock.at(600_000));
  for (let i = 0; i < per; i += 1) await h.coordinator.enqueueInLane("PAID", event({ channelId: "n2-full", id: `full-${i}`, body: body("full", i) }), h.clock.at(600_000));
  (globalThis as any).gc?.();
  await settle();
  (globalThis as any).gc?.();
  const file = `${W}/logs/e34-${LABEL}.heapsnapshot`;
  v8.writeHeapSnapshot(file);
  const text = fs.readFileSync(file, "utf8");
  const counts: Record<string, number> = {};
  for (const m of text.matchAll(/N2MARK-([a-z]+)-\d{4}-/g)) counts[m[1]!] = (counts[m[1]!] ?? 0) + 1;
  fs.unlinkSync(file);
  note("N2 text strings still on the heap, by how the task ended (50 per kind; 'open' are still queued)", counts);
  expectEq("N2 queued tasks keep their text (the search finds what is there)", counts.open ?? 0, per);
  expectEq("N2 settled tasks keep no text: done, cancelled (queued/running), stale, failed, expired, late, refused", ["done", "cancelq", "cancelr", "stale", "fail", "expired", "late", "full"].map((k) => counts[k] ?? 0), [0, 0, 0, 0, 0, 0, 0, 0]);
}
{
  // Growth of the light records that stay after settling (N2 residual), with short bodies.
  const h = harness({ limit: 4, limits: { maxBatchItems: 8 } });
  const gc = (globalThis as any).gc as (() => void) | undefined;
  const samples: Array<{ settled: number; heapMB: number }> = [];
  let settled = 0;
  const bodyText = "これは合成のメッセージです。".repeat(4);
  for (const target of [0, 20_000, 60_000]) {
    while (settled < target) {
      for (let i = 0; i < 8; i += 1) await h.coordinator.enqueue(event({ channelId: `g${settled % 50}`, body: bodyText }), h.clock.at(60_000));
      const batch = await h.coordinator.takeBatch();
      for (const t of batch.tasks) await h.coordinator.commitResult(t.taskId, ok);
      await h.coordinator.finishBatch(batch.batchId);
      settled += 8;
    }
    LOG.length = 0;
    gc?.();
    samples.push({ settled, heapMB: Math.round((process.memoryUsage().heapUsed / 1048576) * 10) / 10 });
  }
  note("N2 heap while settled light records accumulate", samples);
  const first = samples[0]!;
  const last = samples.at(-1)!;
  note("N2 heap per settled task (bytes)", Math.round(((last.heapMB - first.heapMB) * 1048576) / (last.settled - first.settled)));
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
if (failed.length) console.log(`failed: ${failed.join(" | ")}`);
process.exit(0);
