import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createVerdict, NATIVE_CLOSE, NATIVE_OUTPUT_PATH, NATIVE_OUTPUT_PROTOCOL } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { attachBlivechatOutput } from "../../src/adapters/blivechat/socket.js";
import { attachNativeOutput, createWsUpgradeRateLimiter } from "../../src/adapters/native-output/socket.js";
import { createOutputGrantPort, insertOutputGrant } from "../../src/db/output-store.js";
import { BLIVECHAT_CMD, BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION, createBlivechatAdapter } from "../../src/modules/output/index.js";
import { createSubscriptionRegistry } from "../../src/modules/output-adapter/subscription.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { addApprovedText, addDeliveryEvent, attemptsOf, fakeConsumer, idsOf, pumpFor, statusOf } from "../output-adapter/delivery/helpers.js";
import { DECIDED_AT, openDecisionDatabase, seedChannel, type OpenDatabase } from "../decision-service/fixtures.js";

function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once("close", (code, reason) => resolve({ code, reason: reason.toString("utf8") }));
  });
}

function connectRawUpgrade(
  port: number,
  path: string,
  protocols: readonly string[],
): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, [...protocols]);
    ws.once("unexpected-response", (_req, res) => {
      resolve(res.statusCode ?? 0);
    });
    ws.once("open", () => {
      ws.close();
      resolve(101);
    });
    ws.once("error", () => {
      // ignore close errors after unexpected-response
    });
    setTimeout(() => reject(new Error("upgrade timeout")), 5000).unref();
  });
}

describe("INIT-006 Output WS Quotas, Per-Subscriber Delivery Isolation (STORY-059..060)", () => {
  let db: OpenDatabase;
  let server: ReturnType<typeof createServer> | undefined;

  beforeEach(() => {
    db = openDecisionDatabase("init006-");
    seedChannel(db.database, "channel-a");
    seedChannel(db.database, "channel-b");
  });

  afterEach(async () => {
    if (server !== undefined) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = undefined;
    }
    db.close();
  });

  it("STORY-059: enforces per-IP WS upgrade rate limit before credential lookup and per-grant/channel/total connection quotas", async () => {
    const credA1 = `vwo_${"a".repeat(43)}`;
    const credA2 = `vwo_${"b".repeat(43)}`;
    const credB1 = `vwo_${"c".repeat(43)}`;

    runShortTransaction(db.database, (tx) => {
      insertOutputGrant(tx, { grantId: "grant-a1", credentialRefId: "cref-a1", channelId: "channel-a", credential: credA1, nowIso: DECIDED_AT });
      insertOutputGrant(tx, { grantId: "grant-a2", credentialRefId: "cref-a2", channelId: "channel-a", credential: credA2, nowIso: DECIDED_AT });
      insertOutputGrant(tx, { grantId: "grant-b1", credentialRefId: "cref-b1", channelId: "channel-b", credential: credB1, nowIso: DECIDED_AT });
    });

    const registry = createSubscriptionRegistry({
      maxConnectionsPerGrant: 1,
      maxConnectionsPerChannel: 2,
      maxTotalConnections: 2,
    });
    let resolveCount = 0;
    const baseGrants = createOutputGrantPort(db.database, ["NATIVE_V1", "OBS_OVERLAY", "BLIVECHAT"]);
    const countedGrants = {
      resolveCredential(credential: string) {
        resolveCount += 1;
        return baseGrants.resolveCredential(credential);
      },
      isActive: (grantId: string) => baseGrants.isActive(grantId),
    };

    const authLimiter = createWsUpgradeRateLimiter({ maxAttempts: 10, windowMs: 60_000 });
    server = createServer();
    const nativeEp = attachNativeOutput(server, {
      grants: countedGrants,
      subscribers: registry,
      ignoredPaths: new Set([BLIVECHAT_OUTPUT_PATH]),
      authLimiter,
    });
    const bliveEp = attachBlivechatOutput(server, {
      path: BLIVECHAT_OUTPUT_PATH,
      protocolVersion: BLIVECHAT_PROTOCOL_VERSION,
      grants: countedGrants,
      subscribers: registry,
      protocol: createBlivechatAdapter(),
      authLimiter,
    });

    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as AddressInfo).port;

    try {
      // 0) Pre-join blivechat connection immediately consumes grant/total quota before JOIN_ROOM and frees on close/revocation
      const preJoinBlive = new WebSocket(`ws://127.0.0.1:${port}${BLIVECHAT_OUTPUT_PATH}`, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${credA1}`]);
      await new Promise<void>((resolve, reject) => {
        preJoinBlive.once("open", () => resolve());
        preJoinBlive.once("error", reject);
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(1);
      // Sending a second pre-join connection on same grant-a1 hits maxConnectionsPerGrant=1 (HTTP 429) even before JOIN_ROOM
      const preJoinOverGrant = await connectRawUpgrade(port, BLIVECHAT_OUTPUT_PATH, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${credA1}`]);
      expect(preJoinOverGrant).toBe(429);
      // JOIN_ROOM promotes existing reserved connection without consuming a second slot
      preJoinBlive.send(JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: "channel-a" } }));
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(1);
      expect(registry.forChannel("channel-a")).toHaveLength(1);
      const preJoinClosed = waitForClose(preJoinBlive);
      preJoinBlive.close();
      await preJoinClosed;
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(0);

      // 0b) Pre-join blivechat socket is also closed on grant revocation (4403)
      const preJoinRevoked = new WebSocket(`ws://127.0.0.1:${port}${BLIVECHAT_OUTPUT_PATH}`, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${credA1}`]);
      await new Promise<void>((resolve, reject) => {
        preJoinRevoked.once("open", () => resolve());
        preJoinRevoked.once("error", reject);
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(1);
      const revokedClosePromise = waitForClose(preJoinRevoked);
      expect(registry.closeGrant("grant-a1")).toBe(1);
      expect((await revokedClosePromise).code).toBe(NATIVE_CLOSE.GRANT_REVOKED.code);
      expect(registry.size()).toBe(0);

      // 1) First native connection on grant-a1 succeeds
      const ws1 = new WebSocket(`ws://127.0.0.1:${port}${NATIVE_OUTPUT_PATH}`, [NATIVE_OUTPUT_PROTOCOL, `vw-cred.${credA1}`]);
      await new Promise<void>((resolve, reject) => {
        ws1.once("open", () => resolve());
        ws1.once("error", reject);
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(1);

      // 2) Second connection on SAME grant-a1 hits maxConnectionsPerGrant=1 (HTTP 429) without expanding registry
      const overGrantStatus = await connectRawUpgrade(port, NATIVE_OUTPUT_PATH, [NATIVE_OUTPUT_PROTOCOL, `vw-cred.${credA1}`]);
      expect(overGrantStatus).toBe(429);
      expect(registry.size()).toBe(1);

      // 3) Second connection on channel-b (grant-b1) succeeds (now total = 2)
      const ws2 = new WebSocket(`ws://127.0.0.1:${port}${NATIVE_OUTPUT_PATH}`, [NATIVE_OUTPUT_PROTOCOL, `vw-cred.${credB1}`]);
      await new Promise<void>((resolve, reject) => {
        ws2.once("open", () => resolve());
        ws2.once("error", reject);
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(2);

      // 4) Third connection hits maxTotalConnections=2 (HTTP 429) across blivechat too
      const overTotalStatus = await connectRawUpgrade(port, BLIVECHAT_OUTPUT_PATH, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${credA2}`]);
      expect(overTotalStatus).toBe(429);

      // 5) Closing ws1 + ws2 leaves quota clean, and an excessive burst triggers IP rate limit before credential lookup
      const closed1 = waitForClose(ws1);
      const closed2 = waitForClose(ws2);
      ws1.close();
      ws2.close();
      await Promise.all([closed1, closed2]);
      await new Promise((r) => setTimeout(r, 20));
      expect(registry.size()).toBe(0);

      const rateLimitLimiter = createWsUpgradeRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
      expect(rateLimitLimiter.allow("127.0.0.1")).toBe(true);
      expect(rateLimitLimiter.allow("127.0.0.1")).toBe(false);
    } finally {
      nativeEp.close();
      bliveEp.close();
    }
  });

  it("STORY-060 (sole failing recipient isolation): exhausting sole subscriber does not burn shared retry budget; late healthy subscriber still receives message", async () => {
    addDeliveryEvent(db, { eventId: "ev-sole-1", subjectKey: "v-sole", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-sole-1" });
    addApprovedText(db, "ev-sole-1", "sole survivor message");

    const registry = createSubscriptionRegistry();
    const soleFlaky = fakeConsumer("grant-sole-flaky");
    soleFlaky.state.reject = true;
    let closedCode: number | undefined;
    soleFlaky.subscriber.close = (reason) => {
      closedCode = reason.code;
    };
    registry.attach(soleFlaky.subscriber);

    const clock = { now: new Date(DECIDED_AT) };
    const pump = pumpFor(db, registry, clock, 2);

    // Attempt 1 & Attempt 2 on sole failing subscriber
    const r1 = await pump.runPass();
    expect(r1).toMatchObject({ retried: 1, failed: 0, sent: 0 });
    expect(attemptsOf(db, "d-sole-1")).toBe(0);
    expect(statusOf(db, "d-sole-1")).toBe("PENDING");

    const r2 = await pump.runPass();
    expect(r2).toMatchObject({ retried: 1, failed: 0, sent: 0 });
    expect(closedCode).toBe(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE.code);
    expect(registry.size()).toBe(0);
    expect(attemptsOf(db, "d-sole-1")).toBe(0);
    expect(statusOf(db, "d-sole-1")).toBe("PENDING");

    // Late healthy subscriber joins and still receives the pending message intact
    const lateHealthy = fakeConsumer("grant-late-healthy");
    registry.attach(lateHealthy.subscriber);
    const r3 = await pump.runPass();
    expect(r3).toMatchObject({ sent: 1, failed: 0 });
    expect(idsOf(lateHealthy.frames)).toEqual(["d-sole-1"]);
    expect(statusOf(db, "d-sole-1")).toBe("SENT");
  });

  it("STORY-060 (pump integration): healthy subscriber receives both rows while flaky subscriber retries cleanly and closes at maxAttempts", async () => {
    addDeliveryEvent(db, { eventId: "ev-p-1", subjectKey: "v1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-p-1" });
    addDeliveryEvent(db, { eventId: "ev-p-2", subjectKey: "v2", platformOrder: 2, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-p-2" });
    addApprovedText(db, "ev-p-1", "msg 1");
    addApprovedText(db, "ev-p-2", "msg 2");

    const registry = createSubscriptionRegistry();
    const healthy = fakeConsumer("grant-healthy");
    const flaky = fakeConsumer("grant-flaky");
    flaky.state.reject = true;
    let flakyClosedCode: number | undefined;
    const origClose = flaky.subscriber.close;
    flaky.subscriber.close = (reason) => {
      flakyClosedCode = reason.code;
      registry.detach(flaky.subscriber);
      origClose(reason);
    };

    registry.attach(healthy.subscriber);
    registry.attach(flaky.subscriber);
    const clock = { now: new Date(DECIDED_AT) };
    const pump = pumpFor(db, registry, clock, 2);

    // Pass 1: healthy receives BOTH d-p-1 and d-p-2 immediately; flaky rejects d-p-1 (attempt 1); shared rows NOT marked FAILED
    const p1 = await pump.runPass();
    expect(p1.retried).toBeGreaterThanOrEqual(1);
    expect(idsOf(healthy.frames)).toEqual(["d-p-1", "d-p-2"]);
    expect(flaky.frames).toEqual([]);
    expect(statusOf(db, "d-p-1")).toBe("PENDING");
    expect(attemptsOf(db, "d-p-1")).toBe(0);

    // Pass 2: flaky fails attempt 2 (= maxAttempts) -> flaky is evicted with 4413, healthy is NOT resent duplicates, both rows mark SENT
    const p2 = await pump.runPass();
    expect(p2.sent).toBe(2);
    expect(flakyClosedCode).toBe(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE.code);
    expect(idsOf(healthy.frames)).toEqual(["d-p-1", "d-p-2"]);
    expect(statusOf(db, "d-p-1")).toBe("SENT");
    expect(statusOf(db, "d-p-2")).toBe("SENT");
  });
});
