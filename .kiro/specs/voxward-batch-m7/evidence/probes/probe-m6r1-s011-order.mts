// Batch m6r1 probe (E62): dispatch order across the two callers of one shared coordinator after the B2 rework.
// The review runner takes BACKGROUND, the Crew executor takes PAID and REALTIME, and both share the slots and the
// background reserve. This replays a backlog in ticks on the real coordinator (fake clock, in-process fact store) and
// compares three call orders: the review runner takes first, the Crew executor takes first, and the S009 single caller
// (takeBatch() without lanes, the batch 6 behavior). Every batch holds its slot for one tick (1 s), then commits.
// Usage: tsx probe-m6r1-s011-order.mts <checkout> <label>
const [C, LABEL = "candidate"] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-m6r1-s011-order.mts <checkout> <label>");
const S = `${C}/apps/server`;
const tch = await import(`${S}/test/task-coordinator/helpers.ts`);

type Order = "review-first" | "crew-first" | "single-caller";
const TICK_MS = 1000;

async function simulate(order: Order, rtDeadlineMs: number, nRealtime = 8, nBackground = 8) {
  const h = tch.harnessWith({ limit: 4, limits: { maxBatchItems: 1 } });
  const at = (ms: number) => new Date(Date.parse(tch.START) + ms).toISOString();
  const rt: string[] = [];
  for (let i = 0; i < nRealtime; i += 1) {
    rt.push((await h.coordinator.enqueueInLane("REALTIME", tch.eventOf({ platformMessageId: `rt-${i}`, platformOrder: 100 + i, senderRef: `rt-viewer-${i}` }), at(rtDeadlineMs))).taskId);
  }
  for (let i = 0; i < nBackground; i += 1) {
    await h.coordinator.enqueueInLane("BACKGROUND", tch.eventOf({ platformMessageId: `bg-${i}`, platformOrder: 200 + i, senderRef: `bg-viewer-${i}` }), at(600_000));
  }
  const perTick: string[] = [];
  for (let tick = 0; tick < 30; tick += 1) {
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
    perTick.push(held.map((b) => (b.lane === "BACKGROUND" ? "B" : "R")).join("") || "-");
    h.clock.advance(TICK_MS);
    for (const batch of held) {
      for (const task of batch.tasks) await h.coordinator.commitResult(task.taskId, tch.resultFor(task.taskId));
      await h.coordinator.finishBatch(batch.batchId);
    }
    await h.coordinator.sweep();
    const statuses = await Promise.all(rt.map((id) => h.coordinator.statusOf(id)));
    if (statuses.every((s: string) => s !== "QUEUED" && s !== "RUNNING") && held.length === 0) break;
  }
  const statuses = await Promise.all(rt.map((id) => h.coordinator.statusOf(id)));
  const done = statuses.filter((s: string) => s === "DONE").length;
  const toManual = statuses.filter((s: string) => s === "PENDING_REVIEW").length;
  return { order, rtDeadlineMs, ticks: perTick.join(" "), realtimeDone: done, realtimeToManualQueue: toManual };
}

const rows = [];
for (const deadline of [2500, 10_000]) {
  for (const order of ["single-caller", "crew-first", "review-first"] as const) rows.push(await simulate(order, deadline));
}
console.log(`## [${LABEL}] limit 4 (background ceiling 3, reserve 1), 8 REALTIME and 8 BACKGROUND tasks queued, one task per batch`);
console.log("ticks: one group per tick, R = a PAID/REALTIME batch started, B = a BACKGROUND batch started");
for (const r of rows) console.log(JSON.stringify(r));
const base = rows.find((r) => r.order === "single-caller" && r.rtDeadlineMs === 2500)!;
const worst = rows.find((r) => r.order === "review-first" && r.rtDeadlineMs === 2500)!;
console.log(`\nNOTE realtime deadline 2.5 s: single caller ${base.realtimeDone}/8 done, review-first ${worst.realtimeDone}/8 done and ${worst.realtimeToManualQueue} to the manual queue`);
