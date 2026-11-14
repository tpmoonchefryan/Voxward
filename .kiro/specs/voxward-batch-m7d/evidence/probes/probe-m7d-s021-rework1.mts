// Batch m7d supplemental probe (E63): verifies P-S021-fix1 edge cases beyond E60-E62:
//   X1  N3 maxPayload=4096 boundary: 4096-byte client frame -> 4400 CLIENT_DATA_NOT_ACCEPTED;
//       4097-byte single frame and 2500+2500 fragmented text message -> 1009 without crashing server,
//       log line has only WS_ERR_UNSUPPORTED_MESSAGE_LENGTH (no credential/payload), healthy peer still receives DELIVER.
//   X2  B7 multi-row mixed pass: 4 rows in one pass; while row 1 is held in flight, row 2 is overturned to BLOCK,
//       row 3 stays ALLOW, row 4 is CANCELLED (S019 deletion path). Pass 1 sends only row 1 and row 3; pass 2 sends
//       only row 2's WARD_BLOCKED; neither row 2's cleartext nor row 4 is ever sent.
//   X3  B7 in-flight row itself overturned to BLOCK before markSent: markSent refuses (is_current=0), row is not marked
//       SENT, next pass never resends row 1 and instead sends WARD_BLOCKED with matching platformOrder, and explicit
//       resend of superseded row 1 is refused.
//   X4  N1 app.close() while a slow write is mid-flight resolves promptly (< 1000 ms) with zero unhandled rejections.
// Usage: tsx probe-m7d-s021-rework1.mts <checkout>
import { randomBytes } from "node:crypto";
import {
  addRow, check, clientFrame, closeAllSockets, closeCodeOf, consumer, contracts, decision, decisionStoreOf, FAR_FUTURE,
  finish, fx, grant, rawConsumer, rowOf, section, setStatus, setValidity, sleep, startApp, waitUntil,
} from "./lib-m7b.mts";

const QUIET = { heartbeatMs: 60_000, pongTimeoutMs: 60_000, sendTimeoutMs: 5_000, closeGraceMs: 300 };

function maskedFragment(fin: boolean, opcode: number, payload: Buffer): Buffer {
  const mask = randomBytes(4);
  const masked = Buffer.from(payload.map((byte, index) => byte ^ (mask[index % 4] ?? 0)));
  const b0 = (fin ? 0x80 : 0x00) | opcode;
  let header: Buffer;
  if (payload.length < 126) header = Buffer.from([b0, 0x80 | payload.length]);
  else {
    header = Buffer.alloc(4);
    header[0] = b0;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  return Buffer.concat([header, mask, masked]);
}

// =====================================================================================================================
section("X1 N3 maxPayload=4096 exact boundary, fragmented oversize, log hygiene and server survivability");
{
  const h = await startApp(QUIET);
  const healthyCred = grant(h.db).credential;
  const healthy = consumer(h.port, healthyCred);
  await healthy.opened;
  await waitUntil(() => healthy.frames.length >= 1);

  // 1) 4096 bytes -> accepted by ws framing, rejected by protocol handler with 4400.
  const g4096 = grant(h.db);
  const c4096 = await rawConsumer(h.port, g4096.credential);
  c4096.socket.write(clientFrame(0x1, Buffer.alloc(4096, 0x78)));
  await Promise.race([c4096.ended, sleep(3_000)]);
  const code4096 = closeCodeOf(Buffer.concat(c4096.received));

  // 2) 4097 bytes -> rejected at ws framing layer with 1009 before message event.
  const secretPayload = "PAYLOAD_SECRET_" + "z".repeat(4097);
  const g4097 = grant(h.db);
  const c4097 = await rawConsumer(h.port, g4097.credential);
  const t0 = Date.now();
  c4097.socket.write(clientFrame(0x1, Buffer.from(secretPayload, "utf8")));
  const elapsed4097 = await Promise.race([c4097.ended, sleep(3_000).then(() => -1)]);
  const code4097 = closeCodeOf(Buffer.concat(c4097.received));

  // 3) Fragmented 2500 + 2500 bytes -> rejected at second fragment with 1009.
  const gFrag = grant(h.db);
  const cFrag = await rawConsumer(h.port, gFrag.credential);
  cFrag.socket.write(maskedFragment(false, 0x1, Buffer.alloc(2500, 0x61)));
  cFrag.socket.write(maskedFragment(true, 0x0, Buffer.alloc(2500, 0x62)));
  await Promise.race([cFrag.ended, sleep(3_000)]);
  const codeFrag = closeCodeOf(Buffer.concat(cFrag.received));

  // 4) Healthy subscriber still receives subsequent DELIVER frame normally.
  addRow(h.db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "x1-ok", text: "STILL-SERVING" });
  setValidity(h.db, { "x1-ok": FAR_FUTURE });
  await waitUntil(() => healthy.frames.some((f) => f.deliveryId === "x1-ok"), 3_000);

  const allLogs = h.logs.join("");
  check(
    "X1",
    code4096 === 4400 &&
      code4097 === 1009 &&
      elapsed4097 >= 0 &&
      elapsed4097 < 500 &&
      codeFrag === 1009 &&
      healthy.frames.some((f) => f.deliveryId === "x1-ok" && f.display?.text === "STILL-SERVING") &&
      allLogs.includes("WS_ERR_UNSUPPORTED_MESSAGE_LENGTH") &&
      !allLogs.includes(g4097.credential) &&
      !allLogs.includes("PAYLOAD_SECRET_"),
    "4096B frame closes 4400; 4097B and fragmented 5000B frames close 1009 immediately (<500ms) with clean errorCode log and healthy peer unaffected",
    { code4096, code4097, elapsed4097, codeFrag },
  );
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("X2 B7 multi-row mixed pass: row 2 overturned BLOCK, row 3 ALLOW, row 4 CANCELLED while row 1 held");
{
  const h = await startApp(QUIET, 60_000); // manual/long interval so pass timing is controlled via slow socket
  const watcher = consumer(h.port, grant(h.db).credential);
  await watcher.opened;
  const slow = await rawConsumer(h.port, grant(h.db).credential);
  await sleep(50);
  slow.socket.pause();

  addRow(h.db, { channelId: "channel-a", n: 10, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-1", text: "y".repeat(6 * 1024 * 1024) });
  addRow(h.db, { channelId: "channel-a", n: 11, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-2", text: "BLOCKED-ROW-2" });
  addRow(h.db, { channelId: "channel-a", n: 12, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-3", text: "SAFE-ROW-3" });
  addRow(h.db, { channelId: "channel-a", n: 13, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-4", text: "CANCELLED-ROW-4" });
  setValidity(h.db, { "m-1": FAR_FUTURE, "m-2": FAR_FUTURE, "m-3": FAR_FUTURE, "m-4": FAR_FUTURE });

  // Trigger a short-interval app or wait for first tick? Wait: passIntervalMs=60_000 won't fire for 60s. Let's restart with 30ms!
  closeAllSockets();
  await h.stop();
}
{
  const h = await startApp(QUIET, 30);
  const watcher = consumer(h.port, grant(h.db).credential);
  await watcher.opened;
  const slow = await rawConsumer(h.port, grant(h.db).credential);
  await sleep(80);
  slow.socket.pause();

  addRow(h.db, { channelId: "channel-a", n: 10, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-1", text: "y".repeat(6 * 1024 * 1024) });
  addRow(h.db, { channelId: "channel-a", n: 11, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-2", text: "BLOCKED-ROW-2" });
  addRow(h.db, { channelId: "channel-a", n: 12, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-3", text: "SAFE-ROW-3" });
  addRow(h.db, { channelId: "channel-a", n: 13, verdict: "ALLOW_MEANINGFUL", deliveryId: "m-4", text: "CANCELLED-ROW-4" });
  setValidity(h.db, { "m-1": FAR_FUTURE, "m-2": FAR_FUTURE, "m-3": FAR_FUTURE, "m-4": FAR_FUTURE });

  await waitUntil(() => watcher.frames.some((f) => f.deliveryId === "m-1"), 5_000);
  let i = 0;
  const deps = { store: decisionStoreOf(h.db), newId: () => `x2-${++i}`, now: () => new Date(), limits: decision.DEFAULT_DECISION_LIMITS };
  const ov = decision.overturnEvent(deps, {
    eventId: "event-channel-a-11",
    operationId: "op-x2-11",
    verdict: contracts.createVerdict("BLOCK"),
    actor: fx.moderator("mod-1"),
  });
  setStatus(h.db, "m-4", "CANCELLED");

  slow.socket.resume();
  await waitUntil(() => watcher.frames.some((f) => f.deliveryId === "overturn-delivery:channel-a:op-x2-11"), 5_000);
  await sleep(150);

  const gotIds = watcher.frames.filter((f) => f.type !== "HELLO").map((f) => `${f.type}:${f.deliveryId}`);
  const serialized = JSON.stringify(watcher.frames);
  check(
    "X2",
    ov.status === "overturned" &&
      JSON.stringify(gotIds) === '["DELIVER:m-1","DELIVER:m-3","WARD_BLOCKED:overturn-delivery:channel-a:op-x2-11"]' &&
      !serialized.includes("BLOCKED-ROW-2") &&
      !serialized.includes("CANCELLED-ROW-4") &&
      rowOf(h.db, "m-2")?.status === "PENDING" &&
      rowOf(h.db, "m-3")?.status === "SENT" &&
      rowOf(h.db, "m-4")?.status === "CANCELLED",
    "mixed 4-row pass skips overturned m-2 and CANCELLED m-4 while delivering m-1, m-3, and m-2's subsequent WARD_BLOCKED",
    { gotIds, m2: rowOf(h.db, "m-2")?.status, m3: rowOf(h.db, "m-3")?.status, m4: rowOf(h.db, "m-4")?.status },
  );
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("X3 B7 in-flight row itself overturned before markSent: not marked SENT, never re-sent, WARD_BLOCKED carries same platformOrder");
{
  const h = await startApp(QUIET, 30);
  const watcher = consumer(h.port, grant(h.db).credential);
  await watcher.opened;
  const slow = await rawConsumer(h.port, grant(h.db).credential);
  await sleep(80);
  slow.socket.pause();

  addRow(h.db, { channelId: "channel-a", n: 21, platformOrder: 77, verdict: "ALLOW_MEANINGFUL", deliveryId: "inf-1", text: "y".repeat(6 * 1024 * 1024) });
  setValidity(h.db, { "inf-1": FAR_FUTURE });
  await waitUntil(() => watcher.frames.some((f) => f.deliveryId === "inf-1"), 5_000);

  let i = 0;
  const deps = { store: decisionStoreOf(h.db), newId: () => `x3-${++i}`, now: () => new Date(), limits: decision.DEFAULT_DECISION_LIMITS };
  const ov = decision.overturnEvent(deps, {
    eventId: "event-channel-a-21",
    operationId: "op-x3-21",
    verdict: contracts.createVerdict("BLOCK"),
    actor: fx.moderator("mod-1"),
  });
  slow.socket.resume();
  await waitUntil(() => watcher.frames.some((f) => f.deliveryId === "overturn-delivery:channel-a:op-x3-21"), 5_000);
  await sleep(150);

  const inf1Copies = watcher.frames.filter((f) => f.deliveryId === "inf-1").length;
  const blockFrame = watcher.frames.find((f) => f.deliveryId === "overturn-delivery:channel-a:op-x3-21");
  const resendAttempt = decision.resendDelivery(
    { ...deps, now: () => new Date("2100-01-01T00:00:01.000Z") },
    { deliveryId: "inf-1", operationId: "op-x3-resend", actor: fx.moderator("mod-1") },
  );
  check(
    "X3",
    ov.status === "overturned" &&
      rowOf(h.db, "inf-1")?.status === "PENDING" &&
      inf1Copies === 1 &&
      blockFrame?.type === "WARD_BLOCKED" &&
      blockFrame?.platformOrder === 77 &&
      resendAttempt.status === "refused",
    "in-flight row overturned before markSent stays PENDING (not SENT), is never sent a second time, emits WARD_BLOCKED with matching platformOrder=77, and cannot be resent",
    { inf1Status: rowOf(h.db, "inf-1")?.status, inf1Copies, blockPlatformOrder: blockFrame?.platformOrder, resendAttempt },
  );
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("X4 N1 app.close() while a slow write is mid-flight resolves promptly without unhandled rejection");
{
  let unhandled = 0;
  const onUnhandled = () => {
    unhandled += 1;
  };
  process.on("unhandledRejection", onUnhandled);
  const h = await startApp(QUIET, 30);
  const watcher = consumer(h.port, grant(h.db).credential);
  await watcher.opened;
  const slow = await rawConsumer(h.port, grant(h.db).credential);
  await sleep(80);
  slow.socket.pause();
  addRow(h.db, { channelId: "channel-a", n: 31, verdict: "ALLOW_MEANINGFUL", deliveryId: "close-mid", text: "y".repeat(6 * 1024 * 1024) });
  setValidity(h.db, { "close-mid": FAR_FUTURE });
  await waitUntil(() => watcher.frames.some((f) => f.deliveryId === "close-mid"), 5_000);

  const t0 = Date.now();
  await h.app.close();
  const elapsedMs = Date.now() - t0;
  await sleep(100);
  process.off("unhandledRejection", onUnhandled);
  h.db.close();
  closeAllSockets();
  check(
    "X4",
    elapsedMs < 1_000 && unhandled === 0,
    "app.close() during an active stalled WebSocket write finishes in < 1000 ms with 0 unhandled rejections",
    { elapsedMs, unhandled },
  );
}

finish();
process.exit(0);
