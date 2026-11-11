// Batch m7b, S021 probe E61: does the delivery pump honour a verdict or status change that lands while it is still in a
// pass? The pump reads a channel's sendable rows once per pass (readSendable) and then sends them one after another,
// awaiting each send. A send completes asynchronously when a consumer is slow. This probe changes a later row of the
// same pass while an earlier row is still being written, and looks at what the consumers receive.
//   R1  real app (buildApp, real pump and real clock), a reading consumer and a slow raw consumer; the moderator's
//       overturn (S014 decision service, real store) of row 2 lands while row 1 is still being written to the slow one.
//   R2  controlled harness, a fake subscriber whose first send is held: overturn of row 2 while row 1 is held.
//   R3  same as R2, but row 2 is marked CANCELLED instead of overturned.
//   R4  same as R2, but the clock passes row 2's validity: the pump's own time check must skip it (control).
// Usage: tsx probe-m7b-s021-race.mts <checkout>
import http from "node:http";
import type net from "node:net";
import {
  addRow, all, attachNativeOutput, check, closeAllSockets, consumer, contracts, createDeliveryPump, createSubscriptionRegistry,
  decision, decisionStoreOf, FAR_FUTURE, finish, fx, grant, note, rawConsumer, rowOf, section, setStatus, setValidity, sleep,
  startApp, store, textFramesOf, waitUntil,
} from "./lib-m7b.mts";

const QUIET = { heartbeatMs: 60_000, pongTimeoutMs: 60_000, sendTimeoutMs: 5_000, closeGraceMs: 500 };
const LEAK = "TEXT-THAT-THE-MODERATOR-BLOCKED";
const currentVerdictOf = (db: any, eventId: string) =>
  all(db, "SELECT id, downstream, is_current FROM verdicts WHERE event_id = ? ORDER BY seq", eventId);

// =====================================================================================================================
section("R1 real app: overturn of row 2 while row 1 is written to a slow consumer");
{
  const h = await startApp(QUIET);
  const watcher = consumer(h.port, grant(h.db).credential);
  await watcher.opened;
  const slow = await rawConsumer(h.port, grant(h.db).credential);
  await sleep(100);
  slow.socket.pause();
  addRow(h.db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "row-1", text: "y".repeat(8 * 1024 * 1024) });
  addRow(h.db, { channelId: "channel-a", n: 2, verdict: "ALLOW_MEANINGFUL", deliveryId: "row-2", text: LEAK });
  setValidity(h.db, { "row-1": FAR_FUTURE, "row-2": FAR_FUTURE });
  // Row 1 reaches the reading consumer; the slow consumer holds the pass.
  await waitUntil(() => watcher.frames.some((frame) => frame.deliveryId === "row-1"), 5_000);
  await sleep(300);
  const heldBefore = { row1: rowOf(h.db, "row-1")?.status, row2: rowOf(h.db, "row-2")?.status, watcherHasRow2: watcher.frames.some((frame) => frame.deliveryId === "row-2") };
  const deps = { store: decisionStoreOf(h.db), newId: (() => { let i = 0; return () => `r1-${++i}`; })(), now: () => new Date(), limits: decision.DEFAULT_DECISION_LIMITS };
  const overturnedAt = Date.now();
  const outcome = decision.overturnEvent(deps, { eventId: "event-channel-a-2", operationId: "op-block-2", verdict: contracts.createVerdict("BLOCK"), actor: fx.moderator("mod-1") });
  const verdictsAfterOverturn = currentVerdictOf(h.db, "event-channel-a-2");
  let row2ReceivedAt = -1;
  watcher.ws.on("message", (data: Buffer) => {
    if (String(data).includes('"row-2"') && row2ReceivedAt < 0) row2ReceivedAt = Date.now();
  });
  slow.socket.resume();
  await waitUntil(() => watcher.frames.some((frame) => frame.deliveryId === "overturn-delivery:channel-a:op-block-2"), 8_000);
  await sleep(200);
  const delivered2 = watcher.frames.find((frame) => frame.deliveryId === "row-2");
  const types = watcher.frames.map((frame) => (frame.type === "HELLO" ? "HELLO" : `${frame.type}:${frame.deliveryId}`));
  check("R1", outcome.status === "overturned" && delivered2 === undefined,
    "after the overturn to BLOCK is committed, the pump does not send row 2's approved text (design §6 and protocol §6: only rows of the current verdict; VW-R-018: a block yields only WARD_BLOCKED)",
    { heldBefore, overturn: outcome.status, verdictsAfterOverturn, receivedRow2: delivered2 === undefined ? null : { type: delivered2.type, text: delivered2.display?.text, msAfterOverturn: row2ReceivedAt - overturnedAt }, row2Status: rowOf(h.db, "row-2")?.status, frames: types });
  note("R1b", "the slow consumer also received row 2's text after the overturn", textFramesOf(Buffer.concat(slow.received)).some((frame) => frame.deliveryId === "row-2" && frame.display?.text === LEAK));
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
async function controlledRace(mutate: "overturn" | "cancel" | "expire") {
  const db = fx.openDecisionDatabase("probe-m7b-race-");
  fx.seedChannel(db.database, "channel-a");
  const server = http.createServer();
  const registry = createSubscriptionRegistry();
  const endpoint = attachNativeOutput(server, { grants: store.createOutputGrantPort(db.database), subscribers: registry, timing: QUIET });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as net.AddressInfo).port;
  const clock = { now: new Date(fx.DECIDED_AT) };
  const pump = createDeliveryPump({ delivery: store.createOutputDeliveryPort(db.database), content: store.createApprovedContentPort(db.database), subscribers: registry, now: () => clock.now, batchLimit: 50, expireLimit: 500, maxAttempts: 3 });
  const watcher = consumer(port, grant(db).credential);
  await watcher.opened;
  await waitUntil(() => watcher.frames.length >= 1);
  // A subscriber whose first send is held until the probe releases it, as a slow connection holds a write.
  let release: () => void = () => undefined;
  let held = false;
  const slowFrames: any[] = [];
  const slow = {
    grantId: "slow-grant",
    channelId: "channel-a",
    send(frame: any) {
      slowFrames.push(frame);
      if (held) return Promise.resolve();
      held = true;
      return new Promise<void>((resolve) => (release = resolve));
    },
    bufferedAmount: () => 0,
    close: () => undefined,
  };
  registry.attach(slow);
  addRow(db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "row-1", text: "T-ROW-1" });
  addRow(db, { channelId: "channel-a", n: 2, verdict: "ALLOW_MEANINGFUL", deliveryId: "row-2", text: LEAK });
  const pass = pump.runPass();
  await waitUntil(() => held, 2_000);
  let change: unknown;
  if (mutate === "overturn") {
    let i = 0;
    const deps = { store: decisionStoreOf(db), newId: () => `rc-${++i}`, now: () => clock.now, limits: decision.DEFAULT_DECISION_LIMITS };
    change = decision.overturnEvent(deps, { eventId: "event-channel-a-2", operationId: "op-block-2", verdict: contracts.createVerdict("BLOCK"), actor: fx.moderator("mod-1") }).status;
  } else if (mutate === "cancel") {
    setStatus(db, "row-2", "CANCELLED");
    change = rowOf(db, "row-2")?.status;
  } else {
    clock.now = new Date("2026-11-10T10:06:00.000Z");
    change = clock.now.toISOString();
  }
  release();
  const report = await pass;
  await sleep(100);
  const result = {
    change,
    report,
    watcherGotRow2: watcher.frames.filter((frame) => frame.deliveryId === "row-2").map((frame) => frame.display?.text ?? frame.type),
    slowGotRow2: slowFrames.some((frame) => frame.deliveryId === "row-2"),
    row2: rowOf(db, "row-2"),
    verdicts: currentVerdictOf(db, "event-channel-a-2"),
  };
  closeAllSockets();
  endpoint.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
  return result;
}

section("R2-R4 controlled pass: a change to row 2 while row 1 is held");
const r2 = await controlledRace("overturn");
check("R2", r2.watcherGotRow2.length === 0 && !r2.slowGotRow2, "overturn of row 2 to BLOCK while row 1 is held: row 2's text is not sent", r2);
const r3 = await controlledRace("cancel");
check("R3", r3.watcherGotRow2.length === 0 && !r3.slowGotRow2, "row 2 marked CANCELLED while row 1 is held: row 2 is not sent", r3);
const r4 = await controlledRace("expire");
check("R4", r4.watcherGotRow2.length === 0 && !r4.slowGotRow2 && r4.row2?.status === "PENDING", "control: the clock passes row 2's validity while row 1 is held: the pump's own time check skips row 2", r4);

finish();
process.exit(0);
