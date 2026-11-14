import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { createVerdict } from "@voxward/contracts";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { buildApp } from "../../../src/app.js";
import { issueNativeGrant } from "../../../src/auth/output-grants.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import { revokeOutputGrant } from "../../../src/db/output-store.js";
import { technicalLogEvidence } from "../../../src/db/schema/index.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { BLIVECHAT_CMD, BLIVECHAT_OUTPUT_PATH, BLIVECHAT_PROTOCOL_VERSION } from "../../../src/modules/output/index.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { T0 } from "../../db/helpers.js";
import { type OpenDatabase, openDecisionDatabase, seedChannel } from "../../decision-service/fixtures.js";
import { addApprovedText, addDeliveryEvent } from "../../output-adapter/delivery/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const FAR_FUTURE = "2099-01-01T00:00:00.000Z";

interface Harness {
  readonly app: FastifyInstance;
  readonly db: OpenDatabase;
  readonly port: number;
  readonly logs: string[];
}

const openSockets: WebSocket[] = [];
let harness: Harness | undefined;

async function startHarness(): Promise<Harness> {
  const db = openDecisionDatabase("blivechat-socket-");
  seedChannel(db.database, "channel-a");
  const logs: string[] = [];
  const app = buildApp({
    modules: buildRegistry(config),
    logger: true,
    logStream: { write: (line) => void logs.push(line) },
    database: db.database,
    nativeOutput: {
      timing: { heartbeatMs: 60, pongTimeoutMs: 500, closeGraceMs: 500 },
      passIntervalMs: 20,
    },
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as AddressInfo).port;
  harness = { app, db, port, logs };
  return harness;
}

afterEach(async () => {
  for (const ws of openSockets.splice(0)) {
    ws.terminate();
  }
  await harness?.app.close();
  harness?.db.close();
  harness = undefined;
});

function connectBlivechat(port: number, credential: string, path: string = BLIVECHAT_OUTPUT_PATH): WebSocket {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, [BLIVECHAT_PROTOCOL_VERSION, `vw-cred.${credential}`]);
  openSockets.push(ws);
  return ws;
}

function opened(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
}

function refusalStatus(ws: WebSocket): Promise<number> {
  return new Promise((resolve, reject) => {
    ws.once("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
    ws.once("open", () => reject(new Error("expected upgrade refusal")));
    ws.once("error", reject);
  });
}

function closeOf(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

async function waitUntil(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("blivechat loopback HTTP+WS endpoint", () => {
  it("coexists with native /output/v1/room and still returns 404 on unknown paths", async () => {
    const h = await startHarness();
    const { credential } = runShortTransaction(h.db.database, (tx) => issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }));

    const unknownWs = connectBlivechat(h.port, credential, "/output/unknown");
    expect(await refusalStatus(unknownWs)).toBe(404);

    const nativeWs = new WebSocket(`ws://127.0.0.1:${h.port}/output/v1/room`, ["vw-output.v1", `vw-cred.${credential}`]);
    openSockets.push(nativeWs);
    await opened(nativeWs);
    expect(nativeWs.protocol).toBe("vw-output.v1");
  });

  it("rejects missing or unknown credentials with 401", async () => {
    const h = await startHarness();
    const noCred = new WebSocket(`ws://127.0.0.1:${h.port}${BLIVECHAT_OUTPUT_PATH}`, [BLIVECHAT_PROTOCOL_VERSION]);
    openSockets.push(noCred);
    expect(await refusalStatus(noCred)).toBe(401);

    const badCred = connectBlivechat(h.port, "vwo_" + "a".repeat(43));
    expect(await refusalStatus(badCred)).toBe(401);
  });

  it("handles JOIN_ROOM, HEARTBEAT, ALLOW DELIVER with translation, WARD_BLOCKED non-leakage, and 4403 revocation", async () => {
    const h = await startHarness();
    const { grantId, credential } = runShortTransaction(h.db.database, (tx) =>
      issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }),
    );

    const ws = connectBlivechat(h.port, credential);
    const frames: Array<{ cmd: number; data: Record<string, unknown> }> = [];
    ws.on("message", (raw) => {
      frames.push(JSON.parse(String(raw)) as { cmd: number; data: Record<string, unknown> });
    });

    await opened(ws);
    expect(ws.protocol).toBe(BLIVECHAT_PROTOCOL_VERSION);

    ws.send(JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: "channel-a" } }));
    ws.send(JSON.stringify({ cmd: BLIVECHAT_CMD.HEARTBEAT }));

    await waitUntil(() => frames.some((f) => f.cmd === BLIVECHAT_CMD.HEARTBEAT_REPLY));
    const hb = frames.find((f) => f.cmd === BLIVECHAT_CMD.HEARTBEAT_REPLY);
    expect(hb?.data.protocol).toBe(BLIVECHAT_PROTOCOL_VERSION);

    // Seed one ALLOW delivery with translation and one BLOCK delivery with sensitive text that must never leak.
    addDeliveryEvent(h.db, {
      deliveryId: "del-allow-1",
      eventId: "ev-allow-1",
      subjectKey: "sub-allow-1",
      verdict: createVerdict("ALLOW_MEANINGFUL"),
      platformOrder: 1,
    });
    addApprovedText(h.db, "ev-allow-1", "Nice stream!");
    runShortTransaction(h.db.database, (tx) => {
      tx.insert(technicalLogEvidence)
        .values({
          id: "ev-allow-1-tr",
          logId: "log-ev-allow-1",
          evidenceKind: "TRANSLATION",
          payload: "直播很棒！",
          payloadBytes: Buffer.byteLength("直播很棒！", "utf8"),
          expiresAt: FAR_FUTURE,
        })
        .run();
    });
    addDeliveryEvent(h.db, {
      deliveryId: "del-block-1",
      eventId: "ev-block-1",
      subjectKey: "sub-block-1",
      verdict: createVerdict("BLOCK"),
      platformOrder: 2,
    });
    addApprovedText(h.db, "ev-block-1", "SECRET_BLOCKED_ORIGINAL_TEXT");
    h.db.database.sqlite.prepare("UPDATE deliveries SET valid_until = ?").run(FAR_FUTURE);
    h.db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);

    await waitUntil(() => frames.some((f) => f.cmd === BLIVECHAT_CMD.ADD_TEXT));
    // Give pump one extra pass to ensure del-block-1 is processed without emitting any frame.
    await new Promise((resolve) => setTimeout(resolve, 60));

    const textFrames = frames.filter((f) => f.cmd === BLIVECHAT_CMD.ADD_TEXT);
    expect(textFrames).toHaveLength(1);
    expect(textFrames[0]?.data).toMatchObject({
      id: "del-allow-1",
      authorName: "",
      content: "Nice stream!",
      translation: "直播很棒！",
      privilegeType: 0,
    });
    const serializedAll = JSON.stringify(frames);
    expect(serializedAll).not.toContain("SECRET_BLOCKED_ORIGINAL_TEXT");
    expect(serializedAll).not.toContain("SECRET_BLOCKED_TRANSLATION");
    expect(serializedAll).not.toContain("corr-allow-1");

    // Revoke grant -> immediate 4403 close, and reconnect is refused with 401.
    const closedPromise = closeOf(ws);
    runShortTransaction(h.db.database, (tx) => revokeOutputGrant(tx, { grantId, channelId: "channel-a", nowIso: T0 }));
    const closed = await closedPromise;
    expect(closed).toEqual({ code: 4403, reason: "GRANT_REVOKED" });

    const retryWs = connectBlivechat(h.port, credential);
    expect(await refusalStatus(retryWs)).toBe(401);

    // Ensure credential never appeared in server logs.
    expect(h.logs.join("\n")).not.toContain(credential);
  });
});
