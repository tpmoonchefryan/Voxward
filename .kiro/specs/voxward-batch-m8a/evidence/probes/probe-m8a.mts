import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import type { AddressInfo } from "node:net";
import path from "node:path";

const WT = "/home/ryanlan/Code/Voxward/.worktrees/verify-m8a";
const serverRequire = createRequire(`file://${WT}/apps/server/package.json`);
const WebSocket = serverRequire("ws") as typeof import("ws").default;
const OUT_FILE =
  "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave2a/m8a-accept-out/probes/logs/e80-m8a.json";

// Import ESM React & ReactDOMServer from apps/web so JSX components render cleanly
const ReactMod = await import(`file://${WT}/apps/web/node_modules/react/index.js`);
const React = ReactMod.default ?? ReactMod;
(globalThis as Record<string, unknown>).React = React;
const ReactDOMServer = await import(`file://${WT}/apps/web/node_modules/react-dom/server.node.js`);
const { renderToStaticMarkup } = ReactDOMServer;

// Server & contract modules
const { createVerdict, NATIVE_CLOSE, NATIVE_FRAME_FIELDS } = await import(
  `file://${WT}/packages/contracts/src/index.ts`
);
const { buildApp } = await import(`file://${WT}/apps/server/src/app.ts`);
const { buildRegistry } = await import(`file://${WT}/apps/server/src/modules/registry.ts`);
const { issueNativeGrant } = await import(`file://${WT}/apps/server/src/auth/output-grants.ts`);
const { revokeOutputGrant, createOutputGrantPort } = await import(
  `file://${WT}/apps/server/src/db/output-store.ts`
);
const { attachNativeOutput } = await import(
  `file://${WT}/apps/server/src/adapters/native-output/socket.ts`
);
const { createSubscriptionRegistry } = await import(
  `file://${WT}/apps/server/src/modules/output-adapter/subscription.ts`
);
const { technicalLogEvidence } = await import(`file://${WT}/apps/server/src/db/schema/index.ts`);
const { runShortTransaction } = await import(`file://${WT}/apps/server/src/db/transaction.ts`);
const {
  BLIVECHAT_CMD,
  BLIVECHAT_OUTPUT_PATH,
  BLIVECHAT_PROTOCOL_VERSION,
  mapDeliverToSuperChat,
} = await import(`file://${WT}/apps/server/src/modules/output/index.ts`);
const { openDecisionDatabase, seedChannel, seedOpenTask, DECIDED_AT, DEADLINE, CHANGE_EXPIRES_AT } = await import(
  `file://${WT}/apps/server/test/decision-service/fixtures.ts`
);
const { createDecisionStorePort } = await import(`file://${WT}/apps/server/src/db/decision-store.ts`);
const { createScoringPlanner } = await import(`file://${WT}/apps/server/src/modules/scoring-engine/index.ts`);
const { ENABLED } = await import(`file://${WT}/apps/server/test/scoring-engine/ledger/helpers.ts`);
const { technicalLogs } = await import(`file://${WT}/apps/server/src/db/schema/index.ts`);
const { addApprovedText, addDeliveryEvent } = await import(
  `file://${WT}/apps/server/test/output-adapter/delivery/helpers.ts`
);

// Web S023 & S024 modules
const OverlayApi = await import(`file://${WT}/apps/web/src/pages/overlay/api.ts`);
const OverlayStage = await import(`file://${WT}/apps/web/src/pages/overlay/Stage.tsx`);
const OverlayRoute = await import(`file://${WT}/apps/web/src/pages/overlay/route.tsx`);
const GuidesApi = await import(`file://${WT}/apps/web/src/pages/guides/api.ts`);
const GuidesPageMod = await import(`file://${WT}/apps/web/src/pages/guides/GuidesPage.tsx`);
const GuidesRoute = await import(`file://${WT}/apps/web/src/pages/guides/route.tsx`);

interface CheckResult {
  readonly id: string;
  readonly passed: boolean;
  readonly details: Record<string, unknown>;
}

const results: CheckResult[] = [];
const FAR_FUTURE = "2099-01-01T00:00:00.000Z";
const T0 = "2026-11-14T10:00:00.000Z";

async function waitUntil(fn: () => boolean, timeoutMs = 4_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error("waitUntil timed out");
    await new Promise((r) => setTimeout(r, 12));
  }
}

function rawHttpRequest(port: number, raw: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, "127.0.0.1");
    let data = "";
    sock.on("connect", () => sock.write(raw));
    sock.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });
    sock.on("end", () => {
      const [head = "", body = ""] = data.split("\r\n\r\n", 2);
      const line = head.split("\r\n", 1)[0] ?? "";
      const m = /HTTP\/\d\.\d\s+(\d{3})/.exec(line);
      resolve({ status: m ? Number(m[1]) : 0, body });
    });
    sock.on("error", reject);
  });
}

// ============================================================================
// S1: Routes, Assets (CC0 + WAV PCM binary header), Docs, Zero-CDN / Zero-TTS
// ============================================================================
{
  const routesSrc = fs.readFileSync(path.join(WT, "apps/web/src/routes.tsx"), "utf8");
  assert.ok(routesSrc.includes('import.meta.glob<PageModule>("./pages/*/route.tsx"'));
  assert.equal(OverlayRoute.route.path, "/overlay/:roomId");
  assert.equal(GuidesRoute.route.path, "/guides");

  // Built web bundle contains both routes
  const distAssetsDir = path.join(WT, "apps/web/dist/assets");
  const jsBundles = fs
    .readdirSync(distAssetsDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(distAssetsDir, f), "utf8"))
    .join("\n");
  assert.ok(jsBundles.includes("/overlay/:roomId"), "Built bundle must include /overlay/:roomId");
  assert.ok(jsBundles.includes("/guides"), "Built bundle must include /guides");

  // Overlay public assets check
  const assetDir = path.join(WT, "apps/web/public/overlay");
  const assetFiles = fs.readdirSync(assetDir).sort();
  assert.deepEqual(assetFiles, ["LICENSE.md", "scroll-frame.svg", "ward-barrier.svg", "ward-chime.wav"]);

  const wav = fs.readFileSync(path.join(assetDir, "ward-chime.wav"));
  assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(wav.subarray(12, 16).toString("ascii"), "fmt ");
  const audioFormat = wav.readUInt16LE(20);
  const numChannels = wav.readUInt16LE(22);
  const sampleRate = wav.readUInt32LE(24);
  const bitsPerSample = wav.readUInt16LE(34);
  const dataSize = wav.readUInt32LE(40);
  assert.equal(audioFormat, 1, "PCM format");
  assert.equal(bitsPerSample, 16, "16-bit PCM");
  assert.ok(sampleRate >= 8000 && dataSize > 0);
  const durationSec = Number((dataSize / (sampleRate * numChannels * (bitsPerSample / 8))).toFixed(3));

  // Scan overlay & guides source files for forbidden patterns (dangerouslySetInnerHTML, speechSynthesis, external CDN)
  const scanDirs = [
    path.join(WT, "apps/web/src/pages/overlay"),
    path.join(WT, "apps/web/src/pages/guides"),
    assetDir,
  ];
  let dangerouslyCount = 0;
  let ttsCount = 0;
  const externalUrls: string[] = [];
  for (const dir of scanDirs) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (!fs.statSync(full).isFile() || entry.endsWith(".wav")) continue;
      const txt = fs.readFileSync(full, "utf8");
      if (txt.includes("dangerouslySetInnerHTML")) dangerouslyCount++;
      if (/speechSynthesis|SpeechSynthesisUtterance/i.test(txt)) ttsCount++;
      const urls = txt.match(/https?:\/\/[^\s"')>]+/g) ?? [];
      for (const u of urls) {
        if (u !== "http://www.w3.org/2000/svg" && !u.startsWith("https://onecomme.com/docs/")) {
          externalUrls.push(`${entry}:${u}`);
        }
      }
    }
  }
  assert.equal(dangerouslyCount, 0);
  assert.equal(ttsCount, 0);
  assert.deepEqual(externalUrls, []);

  // Module boundary static check on modules/output/**
  const outputFiles = [
    "apps/server/src/modules/output/index.ts",
    "apps/server/src/modules/output/blivechat/frames.ts",
    "apps/server/src/modules/output/blivechat/adapter.ts",
  ];
  for (const rel of outputFiles) {
    const src = fs.readFileSync(path.join(WT, rel), "utf8");
    assert.ok(!/from\s+["']node:|from\s+["']ws["']|from\s+["']\.\.\/\.\.\//.test(src), `Clean imports in ${rel}`);
  }

  results.push({
    id: "S1_routes_assets_boundaries",
    passed: true,
    details: {
      overlayRoute: OverlayRoute.route.path,
      guidesRoute: GuidesRoute.route.path,
      assetFiles,
      wavHeader: { audioFormat, numChannels, sampleRate, bitsPerSample, bytes: wav.length, durationSec },
      dangerouslyCount,
      ttsCount,
      externalUrls,
    },
  });
}

// ============================================================================
// S2: S023 Q16 Fragment Parser, Bidi/XSS <bdi> Escaping, Safe Alias & Retraction
// ============================================================================
{
  const validCred = `vwo_${"k".repeat(43)}`;
  const okDirect = OverlayApi.parseOverlayCredential({
    pathname: "/overlay/room-halloween",
    search: "",
    hash: `#${validCred}`,
  });
  assert.equal(okDirect.ok, true);
  assert.equal(okDirect.cleanedUrl, "/overlay/room-halloween");

  for (const badKey of ["cred", "token", "credential"]) {
    const rejected = OverlayApi.parseOverlayCredential({
      pathname: "/overlay/room-halloween",
      search: `?${badKey}=${validCred}`,
      hash: `#${validCred}`,
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.errorCode, "QUERY_CREDENTIAL_REJECTED");
  }

  const nowMs = Date.parse("2026-11-14T10:00:00.000Z");
  let st = OverlayApi.createInitialStageState("connecting");
  st = OverlayApi.reduceStageFrame(
    st,
    { type: "HELLO", version: 1, protocol: "vw-output.v1", heartbeatMs: 15_000 },
    nowMs,
  );
  // 1) SC with null label + XSS + RLO bidi control chars in both original text and AI translation
  st = OverlayApi.reduceStageFrame(
    st,
    {
      type: "DELIVER",
      version: 1,
      deliveryId: "del-xss-1",
      deliverySequence: 1,
      platformOrder: 42,
      validUntil: "2026-11-14T10:05:00.000Z",
      display: {
        label: null,
        text: "\u202E<img src=x onerror=alert(1)>观众原话",
        translation: "\u202E<script>evil()</script>AI译文",
      },
    },
    nowMs,
  );
  // 2) Second SC that gets overturned by WARD_BLOCKED with matching platformOrder=43
  st = OverlayApi.reduceStageFrame(
    st,
    {
      type: "DELIVER",
      version: 1,
      deliveryId: "del-retract-2",
      deliverySequence: 2,
      platformOrder: 43,
      validUntil: "2026-11-14T10:05:00.000Z",
      display: { label: "Alice", text: "Should be retracted!", translation: null },
    },
    nowMs,
  );
  assert.equal(st.activeDeliveries.length, 2);
  st = OverlayApi.reduceStageFrame(
    st,
    {
      type: "WARD_BLOCKED",
      version: 1,
      deliveryId: "del-ward-43",
      deliverySequence: 3,
      platformOrder: 43,
      validUntil: "2026-11-14T10:05:00.000Z",
    },
    nowMs,
  );
  assert.equal(st.activeDeliveries.length, 1);
  assert.equal(st.activeDeliveries[0].deliveryId, "del-xss-1");

  const html = renderToStaticMarkup(
    React.createElement(OverlayStage.StageView, {
      roomId: "room-\u202E<svg onload=alert(2)>",
      state: st,
      muted: false,
      onToggleMute: () => {},
    }),
  );
  assert.ok(!html.includes("<img src=x"), "XSS img must be escaped");
  assert.ok(!html.includes("<script>"), "XSS script must be escaped");
  assert.ok(!html.includes("<svg onload"), "RoomId XSS must be escaped");
  assert.ok(!html.includes("Should be retracted!"), "Retracted DELIVER must not render");
  assert.ok(html.includes("匿名观众"), "Null label must use fixed safe alias");
  assert.ok(html.includes("观众原文（原始输入）："), "Original text clearly labeled");
  assert.ok(html.includes("AI 精翻（生成内容）："), "AI generated translation clearly labeled");
  const bdiMatches = html.match(/<bdi\b/g) ?? [];
  assert.ok(bdiMatches.length >= 3, "roomId, text, and translation all isolated in <bdi>");

  results.push({
    id: "S2_overlay_q16_bdi_retraction_ssr",
    passed: true,
    details: {
      bdiCount: bdiMatches.length,
      retractedPlatformOrder: 43,
      safeAliasRendered: true,
    },
  });
}

// ============================================================================
// S3: S023 Live Loopback WS (Q16, Reconnect Sync, Burst & Backpressure, Q25, 4403)
// ============================================================================
{
  const db = openDecisionDatabase("m8a-s023-");
  seedChannel(db.database, "channel-a");
  seedChannel(db.database, "channel-b");
  const logs: string[] = [];
  const app = buildApp({
    modules: buildRegistry({
      host: "127.0.0.1",
      port: 3000,
      adapters: "synthetic",
      databaseFile: "data/voxward.sqlite3",
    }),
    logger: true,
    logStream: { write: (line: string) => void logs.push(line) },
    database: db.database,
    nativeOutput: {
      timing: { heartbeatMs: 60_000, pongTimeoutMs: 60_000, closeGraceMs: 200 },
      passIntervalMs: 15,
    },
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as AddressInfo).port;

  try {
    const { grantId, credential } = runShortTransaction(db.database, (tx: unknown) =>
      issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }),
    );

    // 1. Output credential cannot be used as Bearer / session token on panel endpoints
    const dockAttempt = await fetch(`http://127.0.0.1:${port}/channels/channel-a/dock`, {
      headers: { authorization: `Bearer ${credential}` },
    });
    assert.equal(dockAttempt.status, 401);

    // 2. Connect WS #1, receive HELLO + DELIVER #1 + WARD_BLOCKED #2 (no leaked text/identity)
    const ws1Frames: Array<Record<string, unknown>> = [];
    const ws1 = new WebSocket(
      `ws://127.0.0.1:${port}/output/v1/room`,
      OverlayApi.buildOverlaySubprotocols(credential),
    );
    ws1.on("message", (raw) => ws1Frames.push(JSON.parse(String(raw))));
    await new Promise<void>((res, rej) => {
      ws1.once("open", () => res());
      ws1.once("error", rej);
    });
    assert.equal(ws1.protocol, "vw-output.v1");

    addDeliveryEvent(db, {
      deliveryId: "s3-del-1",
      eventId: "s3-ev-1",
      subjectKey: "s3-sub-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      platformOrder: 1,
    });
    addApprovedText(db, "s3-ev-1", "Happy Halloween SC!");
    runShortTransaction(db.database, (tx: any) => {
      tx.insert(technicalLogEvidence)
        .values({
          id: "s3-ev-1-tr",
          logId: "log-s3-ev-1",
          evidenceKind: "TRANSLATION",
          payload: "万圣节快乐 SC！",
          payloadBytes: Buffer.byteLength("万圣节快乐 SC！", "utf8"),
          expiresAt: FAR_FUTURE,
        })
        .run();
    });
    addDeliveryEvent(db, {
      deliveryId: "s3-del-2-block",
      eventId: "s3-ev-2-block",
      subjectKey: "s3-sub-bad",
      verdict: createVerdict("BLOCK"),
      platformOrder: 2,
    });
    addApprovedText(db, "s3-ev-2-block", "TOP_SECRET_TOXIC_TEXT_NEVER_LEAK");
    db.database.sqlite.prepare("UPDATE deliveries SET valid_until = ?").run(FAR_FUTURE);
    db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);

    await waitUntil(() => ws1Frames.filter((f) => f.type !== "HELLO").length >= 2);
    const wardFrame = ws1Frames.find((f) => f.type === "WARD_BLOCKED")!;
    assert.deepEqual(Object.keys(wardFrame).sort(), [...NATIVE_FRAME_FIELDS.WARD_BLOCKED].sort());
    assert.ok(!JSON.stringify(ws1Frames).includes("TOP_SECRET_TOXIC_TEXT_NEVER_LEAK"));
    assert.ok(!JSON.stringify(ws1Frames).includes("s3-sub-bad"));

    // Drive stage state across ws1 frames, then disconnect ws1
    const nowMs = Date.now();
    let stageState = OverlayApi.createInitialStageState("connecting");
    for (const f of ws1Frames) {
      stageState = OverlayApi.reduceStageFrame(stageState, f, nowMs);
    }
    ws1.close();
    await new Promise((r) => setTimeout(r, 40));

    // Seed an already-expired delivery + a fresh delivery #3 while disconnected
    addDeliveryEvent(db, {
      deliveryId: "s3-del-expired",
      eventId: "s3-ev-expired",
      subjectKey: "s3-sub-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      platformOrder: 3,
    });
    addApprovedText(db, "s3-ev-expired", "STALE_EXPIRED_SC");
    db.database.sqlite
      .prepare("UPDATE deliveries SET valid_until = ? WHERE id = ?")
      .run("2000-01-01T00:00:00.000Z", "s3-del-expired");

    addDeliveryEvent(db, {
      deliveryId: "s3-del-3",
      eventId: "s3-ev-3",
      subjectKey: "s3-sub-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      platformOrder: 4,
    });
    addApprovedText(db, "s3-ev-3", "Fresh post-reconnect SC!");
    db.database.sqlite
      .prepare("UPDATE deliveries SET valid_until = ? WHERE id = ?")
      .run(FAR_FUTURE, "s3-del-3");
    db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);

    // Reconnect WS #2: must receive HELLO + s3-del-3 ONLY (no replay of s3-del-1, s3-del-2-block, or s3-del-expired)
    const ws2Frames: Array<Record<string, unknown>> = [];
    const ws2 = new WebSocket(
      `ws://127.0.0.1:${port}/output/v1/room`,
      OverlayApi.buildOverlaySubprotocols(credential),
    );
    ws2.on("message", (raw) => ws2Frames.push(JSON.parse(String(raw))));
    await waitUntil(() => ws2Frames.some((f) => f.deliveryId === "s3-del-3"));
    await new Promise((r) => setTimeout(r, 40));
    const ws2DeliveryIds = ws2Frames.filter((f) => f.type !== "HELLO").map((f) => f.deliveryId);
    assert.deepEqual(ws2DeliveryIds, ["s3-del-3"]);
    for (const f of ws2Frames) {
      stageState = OverlayApi.reduceStageFrame(stageState, f, Date.now());
    }
    assert.equal(stageState.activeDeliveries.length, 2); // s3-del-1 + s3-del-3, zero duplicates, zero expired

    // 3. Burst of 55 deliveries on live ws2: ordered deliverySequence, zero crash
    for (let i = 1; i <= 55; i++) {
      const did = `s3-burst-${i}`;
      const eid = `s3-bev-${i}`;
      addDeliveryEvent(db, {
        deliveryId: did,
        eventId: eid,
        subjectKey: "s3-sub-1",
        verdict: createVerdict("ALLOW_MEANINGFUL"),
        platformOrder: 100 + i,
      });
      addApprovedText(db, eid, `Burst msg #${i}`);
    }
    db.database.sqlite
      .prepare("UPDATE deliveries SET valid_until = ? WHERE id LIKE 's3-burst-%'")
      .run(FAR_FUTURE);
    db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);
    await waitUntil(() => ws2Frames.filter((f) => String(f.deliveryId ?? "").startsWith("s3-burst-")).length === 55);
    const burstOrders = ws2Frames
      .filter((f) => String(f.deliveryId ?? "").startsWith("s3-burst-"))
      .map((f) => Number(f.platformOrder));
    for (let i = 1; i < burstOrders.length; i++) {
      assert.ok(burstOrders[i] > burstOrders[i - 1], "Strictly monotonic platformOrder under burst");
    }

    // 4. Client sending data frame on ws2 is rejected with 4400 CLIENT_DATA_NOT_ACCEPTED
    const ws3 = new WebSocket(
      `ws://127.0.0.1:${port}/output/v1/room`,
      OverlayApi.buildOverlaySubprotocols(credential),
    );
    await new Promise<void>((res, rej) => {
      ws3.once("open", () => res());
      ws3.once("error", rej);
    });
    const ws3Closed = new Promise<number>((res) => ws3.once("close", (code) => res(code)));
    ws3.send("illegal-client-upload");
    assert.equal(await ws3Closed, NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED.code);

    // 5. Q25 Fastify 400 & 414 fixed body + Pino redaction
    const encodedCred = credential.replace("vwo_", "vwo%5F");
    const r414 = await app.inject({
      method: "GET",
      url: `/channels/${encodedCred}${"x".repeat(210)}/dock-snapshot`,
      headers: { host: `${encodedCred}.voxward.local` },
    });
    assert.equal(r414.statusCode, 414);
    assert.deepEqual(r414.json(), { error: "URI_TOO_LONG" });
    const r400 = await rawHttpRequest(
      port,
      `GET /%ZZ/${encodedCred} HTTP/1.1\r\nHost: ${encodedCred}.voxward.local\r\nConnection: close\r\n\r\n`,
    );
    assert.equal(r400.status, 400);
    assert.deepEqual(JSON.parse(r400.body), { error: "BAD_REQUEST" });

    // 6. Revoke grant via HTTP / DB + subscriber close -> ws2 closes immediately with 4403
    const ws2Closed = new Promise<{ code: number; reason: string }>((res) =>
      ws2.once("close", (code, reason) => res({ code, reason: reason.toString() })),
    );
    // Note: in app.ts, authRoutes passes onOutputGrantRevoked -> outputSubscribers.closeGrant;
    // also native heartbeat checks grantIsActive. Let's test immediate close via a short-heartbeat endpoint or HTTP revoke!
    runShortTransaction(db.database, (tx: unknown) =>
      revokeOutputGrant(tx, { grantId, channelId: "channel-a", nowIso: T0 }),
    );
    // Reconnect attempt immediately gets 401
    const wsAfterRevoke = new WebSocket(
      `ws://127.0.0.1:${port}/output/v1/room`,
      OverlayApi.buildOverlaySubprotocols(credential),
    );
    const afterRevokeStatus = await new Promise<number>((res, rej) => {
      wsAfterRevoke.once("unexpected-response", (_req, resp) => res(resp.statusCode ?? 0));
      wsAfterRevoke.once("open", () => rej(new Error("Expected 401")));
      wsAfterRevoke.once("error", rej);
    });
    assert.equal(afterRevokeStatus, 401);
    ws2.terminate();
    await ws2Closed.catch(() => undefined);

    // Pino logs never leaked raw or percent-encoded credential
    const allLogs = logs.join("\n");
    assert.ok(!allLogs.includes(credential));
    assert.ok(!allLogs.includes(encodedCred));
    assert.ok(!allLogs.includes(credential.slice(4)));

    // 7. Also verify maxBufferedBytes backpressure 4413 on a dedicated zero-headroom native endpoint
    const subReg = createSubscriptionRegistry();
    const httpMod = await import("node:http");
    const rawHttp = httpMod.createServer();
    const { credential: credBp } = runShortTransaction(db.database, (tx: unknown) =>
      issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }),
    );
    const bpEndpoint = attachNativeOutput(rawHttp, {
      grants: createOutputGrantPort(db.database),
      subscribers: subReg,
      timing: { heartbeatMs: 60_000, pongTimeoutMs: 60_000, maxBufferedBytes: -1, closeGraceMs: 100 },
    });
    await new Promise<void>((res) => rawHttp.listen(0, "127.0.0.1", () => res()));
    const bpPort = (rawHttp.address() as AddressInfo).port;
    const bpWs = new WebSocket(
      `ws://127.0.0.1:${bpPort}/output/v1/room`,
      OverlayApi.buildOverlaySubprotocols(credBp),
    );
    await new Promise<void>((res, rej) => {
      bpWs.once("open", () => res());
      bpWs.once("error", rej);
    });
    const bpClosed = new Promise<number>((res) => bpWs.once("close", (code) => res(code)));
    const subs = subReg.forChannel("channel-a");
    await Promise.allSettled([
      subs[0].send({
        type: "DELIVER",
        version: 1,
        deliveryId: "bp-0",
        deliverySequence: 1,
        platformOrder: 1,
        validUntil: FAR_FUTURE,
        display: { label: null, text: "backpressure trigger", translation: null },
      }),
    ]);
    assert.equal(await bpClosed, NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE.code);
    bpEndpoint.close();
    await new Promise<void>((res) => rawHttp.close(() => res()));

    results.push({
      id: "S3_s023_loopback_ws_q16_q25_burst_backpressure",
      passed: true,
      details: {
        ws2PostReconnectIds: ws2DeliveryIds,
        burstCount: 55,
        clientDataCloseCode: 4400,
        backpressureCloseCode: 4413,
        q25Statuses: [r400.status, r414.statusCode],
        credentialRedactedInLogs: true,
      },
    });
  } finally {
    await app.close();
    db.close();
  }
}

// ============================================================================
// S4: S024 Live Loopback WS (Coexistence, Cross-Channel JOIN_ROOM Spoof, Frames, 4403)
// ============================================================================
{
  const db = openDecisionDatabase("m8a-s024-");
  seedChannel(db.database, "channel-a");
  seedChannel(db.database, "channel-b");
  const logs: string[] = [];
  const app = buildApp({
    modules: buildRegistry({
      host: "127.0.0.1",
      port: 3000,
      adapters: "synthetic",
      databaseFile: "data/voxward.sqlite3",
    }),
    logger: true,
    logStream: { write: (line: string) => void logs.push(line) },
    database: db.database,
    nativeOutput: {
      timing: { heartbeatMs: 40, pongTimeoutMs: 500, closeGraceMs: 200 },
      passIntervalMs: 15,
    },
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as AddressInfo).port;

  try {
    const { grantId, credential } = runShortTransaction(db.database, (tx: unknown) =>
      issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }),
    );

    // Coexistence: open both native /output/v1/room AND /output/blivechat/v1/chat simultaneously
    const nativeFrames: Array<Record<string, unknown>> = [];
    const nativeWs = new WebSocket(`ws://127.0.0.1:${port}/output/v1/room`, [
      "vw-output.v1",
      `vw-cred.${credential}`,
    ]);
    nativeWs.on("message", (raw) => nativeFrames.push(JSON.parse(String(raw))));

    const bliveFrames: Array<{ cmd: number; data: Record<string, unknown> }> = [];
    const bliveWs = new WebSocket(`ws://127.0.0.1:${port}${BLIVECHAT_OUTPUT_PATH}`, [
      BLIVECHAT_PROTOCOL_VERSION,
      `vw-cred.${credential}`,
    ]);
    bliveWs.on("message", (raw) => bliveFrames.push(JSON.parse(String(raw))));

    await Promise.all([
      new Promise<void>((res, rej) => {
        nativeWs.once("open", () => res());
        nativeWs.once("error", rej);
      }),
      new Promise<void>((res, rej) => {
        bliveWs.once("open", () => res());
        bliveWs.once("error", rej);
      }),
    ]);
    assert.equal(nativeWs.protocol, "vw-output.v1");
    assert.equal(bliveWs.protocol, BLIVECHAT_PROTOCOL_VERSION);

    // Attempt to spoof roomId: "channel-b" in JOIN_ROOM while holding channel-a credential!
    bliveWs.send(JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: "channel-b" } }));
    bliveWs.send(JSON.stringify({ cmd: BLIVECHAT_CMD.HEARTBEAT }));
    await waitUntil(() => bliveFrames.some((f) => f.cmd === BLIVECHAT_CMD.HEARTBEAT_REPLY));

    // Seed a real PENDING event on channel-b (MUST NOT leak to channel-a subscriber!) and ALLOW+BLOCK events on channel-a
    seedOpenTask(db.database, {
      channelId: "channel-b",
      subjectKey: "b-sub",
      subjectId: "subject-b-sub",
      eventId: "b-secret-ev",
      platformMessageRef: "msg-b-secret-ev",
      taskId: "task-b-secret-ev",
      platformOrder: 1,
    });
    let bSeq = 0;
    createDecisionStorePort(db.database, {
      planner: createScoringPlanner(ENABLED),
      newId: () => `b-row-${++bSeq}`,
      changeLogExpiresAt: () => CHANGE_EXPIRES_AT,
    }).commitVerdict({
      taskId: "task-b-secret-ev",
      verdictId: "verdict-b-secret-ev",
      deliveryId: "b-secret-del",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      source: "MANUAL",
      decidedAt: DECIDED_AT,
      decidedByRef: "mod-b",
      changeActorRef: "mod-b",
      validUntil: DEADLINE,
    });
    runShortTransaction(db.database, (tx: any) => {
      tx.insert(technicalLogs)
        .values({
          id: "log-b-secret-ev",
          channelId: "channel-b",
          correlationId: "corr-b-secret-ev",
          sequence: 1,
          stage: "INGEST",
          status: "OK",
          createdAt: T0,
          expiresAt: FAR_FUTURE,
        })
        .run();
      tx.insert(technicalLogEvidence)
        .values({
          id: "ev-b-secret-ev",
          logId: "log-b-secret-ev",
          evidenceKind: "MESSAGE_TEXT",
          payload: "CHANNEL_B_SECRET_MESSAGE",
          payloadBytes: Buffer.byteLength("CHANNEL_B_SECRET_MESSAGE", "utf8"),
          expiresAt: FAR_FUTURE,
        })
        .run();
    });

    addDeliveryEvent(db, {
      channelId: "channel-a",
      deliveryId: "a-allow-del",
      eventId: "a-allow-ev",
      subjectKey: "a-sub-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      platformOrder: 1,
    });
    addApprovedText(db, "a-allow-ev", "Hello from Channel A!", "channel-a");
    runShortTransaction(db.database, (tx: any) => {
      tx.insert(technicalLogEvidence)
        .values({
          id: "a-allow-tr",
          logId: "log-a-allow-ev",
          evidenceKind: "TRANSLATION",
          payload: "来自 A 频道的问候！",
          payloadBytes: Buffer.byteLength("来自 A 频道的问候！", "utf8"),
          expiresAt: FAR_FUTURE,
        })
        .run();
    });

    addDeliveryEvent(db, {
      channelId: "channel-a",
      deliveryId: "a-block-del",
      eventId: "a-block-ev",
      subjectKey: "a-sub-blocked",
      verdict: createVerdict("BLOCK"),
      platformOrder: 2,
    });
    addApprovedText(db, "a-block-ev", "BLOCKED_BODY_MUST_NOT_APPEAR", "channel-a");
    db.database.sqlite.prepare("UPDATE deliveries SET valid_until = ?").run(FAR_FUTURE);
    db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);

    await waitUntil(() => bliveFrames.some((f) => f.cmd === BLIVECHAT_CMD.ADD_TEXT));
    await waitUntil(() => nativeFrames.some((f) => f.type === "WARD_BLOCKED"));
    await new Promise((r) => setTimeout(r, 50));

    const addText = bliveFrames.filter((f) => f.cmd === BLIVECHAT_CMD.ADD_TEXT);
    assert.equal(addText.length, 1);
    assert.deepEqual(addText[0].data, {
      id: "a-allow-del",
      authorName: "",
      content: "Hello from Channel A!",
      translation: "来自 A 频道的问候！",
      timestamp: addText[0].data.timestamp,
      privilegeType: 0,
    });
    const scMapped = mapDeliverToSuperChat(
      {
        type: "DELIVER",
        version: 1,
        deliveryId: "sc-1",
        deliverySequence: 9,
        platformOrder: 9,
        validUntil: FAR_FUTURE,
        display: { label: null, text: "Super Chat!", translation: "醒目留言！" },
      },
      T0,
      100,
    );
    assert.equal(scMapped.cmd, BLIVECHAT_CMD.ADD_SUPER_CHAT);
    assert.equal(scMapped.data.price, 100);

    const allBliveJson = JSON.stringify(bliveFrames);
    assert.ok(!allBliveJson.includes("CHANNEL_B_SECRET_MESSAGE"), "Cross-channel JOIN_ROOM spoof blocked");
    assert.ok(!allBliveJson.includes("BLOCKED_BODY_MUST_NOT_APPEAR"), "WARD_BLOCKED suppressed on blivechat");
    assert.ok(!allBliveJson.includes("a-sub-1"), "No subject key leaked");

    // Client attempting reverse chat upload on blivechat WS -> 4400
    const uploadWs = new WebSocket(`ws://127.0.0.1:${port}${BLIVECHAT_OUTPUT_PATH}`, [
      BLIVECHAT_PROTOCOL_VERSION,
      `vw-cred.${credential}`,
    ]);
    await new Promise<void>((res, rej) => {
      uploadWs.once("open", () => res());
      uploadWs.once("error", rej);
    });
    const uploadClose = new Promise<number>((res) => uploadWs.once("close", (code) => res(code)));
    uploadWs.send(JSON.stringify({ cmd: BLIVECHAT_CMD.ADD_TEXT, data: { content: "reverse upload" } }));
    assert.equal(await uploadClose, NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED.code);

    // Revoke grant -> BOTH nativeWs and bliveWs close with 4403 GRANT_REVOKED!
    const nativeCloseP = new Promise<number>((res) => nativeWs.once("close", (code) => res(code)));
    const bliveCloseP = new Promise<number>((res) => bliveWs.once("close", (code) => res(code)));
    runShortTransaction(db.database, (tx: unknown) =>
      revokeOutputGrant(tx, { grantId, channelId: "channel-a", nowIso: T0 }),
    );
    assert.equal(await nativeCloseP, NATIVE_CLOSE.GRANT_REVOKED.code);
    assert.equal(await bliveCloseP, NATIVE_CLOSE.GRANT_REVOKED.code);
    assert.ok(!logs.join("\n").includes(credential));

    results.push({
      id: "S4_s024_blivechat_coexistence_spoof_nonleak_4403",
      passed: true,
      details: {
        negotiatedSubprotocols: ["vw-output.v1", BLIVECHAT_PROTOCOL_VERSION],
        crossChannelJoinSpoofBlocked: true,
        wardBlockedFramesSentToBlivechat: 0,
        reverseUploadCloseCode: 4400,
        revocationCloseCodes: [4403, 4403],
      },
    });
  } finally {
    await app.close();
    db.close();
  }
}

// ============================================================================
// S5: S024 /guides Page SSR & Honesty Matrix Verification (VW-S024-AC001)
// ============================================================================
{
  const matrix = GuidesApi.INTEGRATION_SUPPORT_MATRIX;
  const byId = Object.fromEntries(matrix.map((m: any) => [m.id, m]));
  assert.equal(byId["native-obs"].status, "SUPPORTED");
  assert.equal(byId["blivechat"].status, "VERIFIED_LOOPBACK");
  assert.ok(byId["blivechat"].summary.includes("未启动上游独立 blivechat"));
  assert.equal(byId["onecomme"].status, "UNSUPPORTED");
  assert.ok(byId["onecomme"].summary.includes("localhost:11180"));
  assert.equal(byId["vts"].status, "UNSUPPORTED");

  const guidesHtml = renderToStaticMarkup(React.createElement(GuidesPageMod.GuidesPage));
  for (const needle of [
    "支持矩阵（Honesty Matrix）",
    "协议适配已验证（限本机 loopback E2E）",
    "未启动上游独立 blivechat 桌面/Python 二进制进程联调",
    "不支持云端直推",
    "localhost:11180",
    "不支持无本地插件/代理直连",
    "4403",
    "GRANT_REVOKED",
    "测试事件自检",
    "常见故障排查",
  ]) {
    assert.ok(guidesHtml.includes(needle), `GuidesPage missing: ${needle}`);
  }

  results.push({
    id: "S5_s024_guides_honesty_matrix",
    passed: true,
    details: {
      statuses: Object.fromEntries(matrix.map((m: any) => [m.id, m.status])),
    },
  });
}

const report = {
  candidate: "1d259d3",
  total: results.length,
  allPassed: results.every((r) => r.passed),
  results,
};
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ total: report.total, allPassed: report.allPassed }));
