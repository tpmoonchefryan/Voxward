// Batch m7 part 1 probe (E63, new): dispatch order across the two callers of one shared coordinator, beyond the single
// backlog shape of E62. Real coordinator from the checkout (test harness: fake clock, in-process fact store). Three call
// orders per tick: the review runner's lane first (BACKGROUND, then PAID+REALTIME), the Crew executor's lanes first, and
// the S009 single caller (takeBatch() without lanes). Each caller takes until it gets null, as runBatch() and pump() do.
// Every batch holds its slot for one tick (1 s), then commits. Synthetic data only; no network, no model.
//   S1  one REALTIME batch ready and 8 BACKGROUND tasks: who gets the slots the realtime batch leaves.
//   S2  a REALTIME trickle (one new task per tick for 10 ticks) with 8 BACKGROUND tasks queued.
//   P   seeded random arrivals (300 scenarios): a PAID or REALTIME task never starts later, and never goes to the manual
//       queue, in a two-caller order than with the single caller (contract: 付费优先、复盘让出实时容量). BACKGROUND
//       delays are only read.
// Usage: tsx probe-m7-s011-order2.mts <checkout> <label>
const [C, LABEL = "candidate"] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-m7-s011-order2.mts <checkout> <label>");
const S = `${C}/apps/server`;
const tch = await import(`${S}/test/task-coordinator/helpers.ts`);

type Order = "single-caller" | "crew-first" | "review-first";
const ORDERS: readonly Order[] = ["single-caller", "crew-first", "review-first"];
const TICK_MS = 1000;

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail: unknown = ""): void {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail === "" ? "" : ` :: ${JSON.stringify(detail)}`}`);
}
function note(name: string, detail: unknown): void {
  console.log(`NOTE ${name} :: ${JSON.stringify(detail)}`);
}

interface Arrival {
  readonly tick: number;
  readonly lane: "PAID" | "REALTIME" | "BACKGROUND";
  readonly deadlineAfterMs: number;
}

/** Keyed by arrival index, not by task id: the harness draws task and batch ids from one sequence, so task ids differ between runs. */
interface Run {
  readonly ticks: string;
  readonly startTick: Map<number, number>;
  readonly status: Map<number, string>;
  readonly laneOf: Map<number, string>;
}

async function simulate(order: Order, arrivals: readonly Arrival[], options: { limit: number; maxBatchItems: number; maxBatchWaitMs: number; maxTicks: number }): Promise<Run> {
  const h = tch.harnessWith({ limit: options.limit, limits: { maxBatchItems: options.maxBatchItems, maxBatchWaitMs: options.maxBatchWaitMs } });
  const startMs = Date.parse(tch.START);
  const ids: string[] = [];
  const indexOf = new Map<string, number>();
  const laneOf = new Map<number, string>();
  const startTick = new Map<number, number>();
  const perTick: string[] = [];
  let enqueued = 0;
  for (let tick = 0; tick < options.maxTicks; tick += 1) {
    const nowMs = startMs + tick * TICK_MS;
    for (const [index, arrival] of arrivals.entries()) {
      if (arrival.tick !== tick) continue;
      const event = tch.eventOf({ platformMessageId: `m-${index}`, platformOrder: 1000 + index, senderRef: `viewer-${index}` });
      const ref = await h.coordinator.enqueueInLane(arrival.lane, event, new Date(nowMs + arrival.deadlineAfterMs).toISOString());
      ids.push(ref.taskId);
      indexOf.set(ref.taskId, index);
      laneOf.set(index, arrival.lane);
      enqueued += 1;
    }
    const held: any[] = [];
    const takeAll = async (lanes?: string[]) => {
      for (;;) {
        const batch = await h.coordinator.takeBatch(lanes === undefined ? undefined : { lanes });
        if (batch === null) return;
        held.push(batch);
      }
    };
    if (order === "review-first") {
      await takeAll(["BACKGROUND"]);
      await takeAll(["PAID", "REALTIME"]);
    } else if (order === "crew-first") {
      await takeAll(["PAID", "REALTIME"]);
      await takeAll(["BACKGROUND"]);
    } else {
      await takeAll();
    }
    for (const batch of held) {
      for (const task of batch.tasks) {
        const index = indexOf.get(task.taskId)!;
        if (!startTick.has(index)) startTick.set(index, tick);
      }
    }
    perTick.push(held.map((b) => (b.lane === "BACKGROUND" ? "B" : "R")).join("") || "-");
    h.clock.advance(TICK_MS);
    for (const batch of held) {
      for (const task of batch.tasks) await h.coordinator.commitResult(task.taskId, tch.resultFor(task.taskId));
      await h.coordinator.finishBatch(batch.batchId);
    }
    await h.coordinator.sweep();
    const lastArrival = Math.max(...arrivals.map((a) => a.tick));
    if (tick >= lastArrival && enqueued === arrivals.length) {
      const statuses = await Promise.all(ids.map((id) => h.coordinator.statusOf(id)));
      if (statuses.every((s: string) => s !== "QUEUED" && s !== "RUNNING")) break;
    }
  }
  const status = new Map<number, string>();
  for (const id of ids) status.set(indexOf.get(id)!, await h.coordinator.statusOf(id));
  return { ticks: perTick.join(" "), startTick, status, laneOf };
}

function summary(run: Run) {
  const of = (lane: string, s: string) => [...run.status].filter(([id, st]) => run.laneOf.get(id) === lane && st === s).length;
  const bgStarts = [...run.startTick].filter(([id]) => run.laneOf.get(id) === "BACKGROUND").map(([, t]) => t);
  return {
    ticks: run.ticks,
    realtimeDone: of("REALTIME", "DONE"),
    realtimeToManualQueue: of("REALTIME", "PENDING_REVIEW"),
    backgroundDone: of("BACKGROUND", "DONE"),
    lastBackgroundStartTick: bgStarts.length ? Math.max(...bgStarts) : null,
  };
}

console.log(`## [${LABEL}] S1 limit 4, one REALTIME task and 8 BACKGROUND tasks queued, one task per batch`);
{
  const arrivals: Arrival[] = [{ tick: 0, lane: "REALTIME", deadlineAfterMs: 2500 }];
  for (let i = 0; i < 8; i += 1) arrivals.push({ tick: 0, lane: "BACKGROUND", deadlineAfterMs: 600_000 });
  const rows: Record<string, unknown> = {};
  for (const order of ORDERS) rows[order] = summary(await simulate(order, arrivals, { limit: 4, maxBatchItems: 1, maxBatchWaitMs: 0, maxTicks: 30 }));
  for (const order of ORDERS) console.log(JSON.stringify({ order, ...(rows[order] as object) }));
  note("S1 reading: with the review runner taking first, background starts one tick later than with the single caller", { single: (rows["single-caller"] as any).ticks, reviewFirst: (rows["review-first"] as any).ticks });
}

console.log(`\n## [${LABEL}] S2 limit 4, a REALTIME trickle (one task per tick for 10 ticks, due in 2.5 s) and 8 BACKGROUND tasks queued at tick 0`);
{
  const arrivals: Arrival[] = [];
  for (let i = 0; i < 8; i += 1) arrivals.push({ tick: 0, lane: "BACKGROUND", deadlineAfterMs: 600_000 });
  for (let t = 0; t < 10; t += 1) arrivals.push({ tick: t, lane: "REALTIME", deadlineAfterMs: 2500 });
  const rows: Record<string, any> = {};
  for (const order of ORDERS) rows[order] = summary(await simulate(order, arrivals, { limit: 4, maxBatchItems: 1, maxBatchWaitMs: 0, maxTicks: 40 }));
  for (const order of ORDERS) console.log(JSON.stringify({ order, ...rows[order] }));
  check("S2 every REALTIME task of the trickle is done in all three orders (realtime is not delayed by background)", ORDERS.every((o) => rows[o].realtimeDone === 10 && rows[o].realtimeToManualQueue === 0), Object.fromEntries(ORDERS.map((o) => [o, [rows[o].realtimeDone, rows[o].realtimeToManualQueue]])));
  note("S2 reading: last tick a BACKGROUND batch starts (the trickle lasts ticks 0-9)", Object.fromEntries(ORDERS.map((o) => [o, rows[o].lastBackgroundStartTick])));
}

console.log(`\n## [${LABEL}] P seeded random arrivals, 300 scenarios`);
{
  let seed = 0x6d375eed;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(rand() * values.length)];
  const later: Record<string, number> = { "crew-first": 0, "review-first": 0 };
  const lostToManual: Record<string, number> = { "crew-first": 0, "review-first": 0 };
  const bgLater: Record<string, number> = { "crew-first": 0, "review-first": 0 };
  const bgEarlier: Record<string, number> = { "crew-first": 0, "review-first": 0 };
  let interactiveTasks = 0;
  let backgroundTasks = 0;
  const examples: unknown[] = [];
  for (let scenario = 0; scenario < 300; scenario += 1) {
    const options = { limit: pick([2, 3, 4, 6]), maxBatchItems: pick([1, 2]), maxBatchWaitMs: pick([0, 500]), maxTicks: 40 };
    const arrivals: Arrival[] = [];
    for (let tick = 0; tick < 12; tick += 1) {
      for (let k = pick([0, 0, 0, 1]); k > 0; k -= 1) arrivals.push({ tick, lane: "PAID", deadlineAfterMs: 3000 });
      for (let k = pick([0, 1, 1, 2, 3]); k > 0; k -= 1) arrivals.push({ tick, lane: "REALTIME", deadlineAfterMs: 3000 });
      for (let k = pick([0, 0, 1, 3]); k > 0; k -= 1) arrivals.push({ tick, lane: "BACKGROUND", deadlineAfterMs: 600_000 });
    }
    if (arrivals.length === 0) continue;
    const base = await simulate("single-caller", arrivals, options);
    for (const order of ["crew-first", "review-first"] as const) {
      const run = await simulate(order, arrivals, options);
      for (const [id, lane] of base.laneOf) {
        const b = base.startTick.get(id);
        const o = run.startTick.get(id);
        if (lane === "BACKGROUND") {
          if (order === "review-first") backgroundTasks += 1;
          if (b !== undefined && (o === undefined || o > b)) bgLater[order] += 1;
          if (b !== undefined && o !== undefined && o < b) bgEarlier[order] += 1;
          continue;
        }
        if (order === "review-first") interactiveTasks += 1;
        if (b !== undefined && (o === undefined || o > b)) {
          later[order] += 1;
          if (examples.length < 3) examples.push({ scenario, order, options, arrival: id, lane, single: b, other: o ?? null });
        }
        if (base.status.get(id) === "DONE" && run.status.get(id) === "PENDING_REVIEW") lostToManual[order] += 1;
      }
    }
  }
  note("P scenarios and tasks compared", { interactiveTasks, backgroundTasks });
  check("P1 the Crew executor first: no PAID or REALTIME task starts later than with the single caller", later["crew-first"] === 0, { later: later["crew-first"], examples });
  check("P2 the review runner first: no PAID or REALTIME task starts later than with the single caller", later["review-first"] === 0, { later: later["review-first"], examples });
  check("P3 neither order sends a PAID or REALTIME task to the manual queue that the single caller completes", lostToManual["crew-first"] === 0 && lostToManual["review-first"] === 0, lostToManual);
  note("P reading: BACKGROUND tasks starting later / earlier than with the single caller", { later: bgLater, earlier: bgEarlier });
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
