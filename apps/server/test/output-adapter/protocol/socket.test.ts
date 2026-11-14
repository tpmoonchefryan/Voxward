import { randomBytes } from "node:crypto";
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { createVerdict, NATIVE_FRAME_FIELDS, type OutputGrantPort } from "@voxward/contracts";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { attachNativeOutput, type NativeOutputTiming } from "../../../src/adapters/native-output/socket.js";
import { buildApp } from "../../../src/app.js";
import { createAccount } from "../../../src/auth/login.js";
import { grantMembership } from "../../../src/auth/members.js";
import { issueNativeGrant } from "../../../src/auth/output-grants.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import { revokeOutputGrant } from "../../../src/db/output-store.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { createSubscriptionRegistry } from "../../../src/modules/output-adapter/subscription.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { T0 } from "../../db/helpers.js";
import { type OpenDatabase, openDecisionDatabase, seedChannel } from "../../decision-service/fixtures.js";
import { addApprovedText, addDeliveryEvent, statusOf } from "../delivery/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "correct horse battery";
const ROOM_PATH = "/output/v1/room";
const FAR_FUTURE = "2099-01-01T00:00:00.000Z";
const LONG_AGO = "2000-01-01T00:00:00.000Z";
/** Short timings, so that a heartbeat, a pong timeout and a send timeout each fit in one test. Tests only (自定). */
const FAST: Partial<NativeOutputTiming> = { heartbeatMs: 60, pongTimeoutMs: 150, sendTimeoutMs: 300, closeGraceMs: 500 };
/** Heartbeats that never fire within a test, so that only the behavior under test can close a connection. */
const QUIET: Partial<NativeOutputTiming> = { heartbeatMs: 60_000, pongTimeoutMs: 60_000 };

interface Harness {
  readonly app: FastifyInstance;
  readonly db: OpenDatabase;
  readonly port: number;
  /** Every connection the endpoint closed on purpose, with its close code. */
  readonly closed: Array<{ grantId: string; code: number }>;
  /** Every log line the app wrote. The credential must never appear in one. */
  readonly logs: string[];
}

interface WireFrame {
  readonly opcode: number;
  readonly payload: Buffer;
}

const openSockets: Array<WebSocket | net.Socket> = [];
let harness: Harness | undefined;

async function startHarness(timing: Partial<NativeOutputTiming> = {}): Promise<Harness> {
  const db = openDecisionDatabase("native-socket-");
  seedChannel(db.database, "channel-a");
  const closed: Array<{ grantId: string; code: number }> = [];
  const logs: string[] = [];
  const app = buildApp({
    modules: buildRegistry(config),
    logger: true,
    logStream: { write: (line) => void logs.push(line) },
    database: db.database,
    nativeOutput: {
      timing: { ...FAST, ...timing },
      passIntervalMs: 20,
      onClosed: (entry) => void closed.push(entry),
    },
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as AddressInfo).port;
  harness = { app, db, port, closed, logs };
  return harness;
}

afterEach(async () => {
  for (const socket of openSockets.splice(0)) {
    if (socket instanceof WebSocket) socket.terminate();
    else socket.destroy();
  }
  await harness?.app.close();
  harness?.db.close();
  harness = undefined;
});

function issueGrant(db: OpenDatabase, channelId = "channel-a"): { grantId: string; credential: string } {
  return runShortTransaction(db.database, (tx) => issueNativeGrant(tx, { channelId, nowIso: T0 }));
}

function revoke(db: OpenDatabase, grantId: string): void {
  runShortTransaction(db.database, (tx) => revokeOutputGrant(tx, { grantId, channelId: "channel-a", nowIso: T0 }));
}

/** Moves the validity of rows. The real clock is later than the synthetic times that the delivery fixtures use. */
function setValidity(db: OpenDatabase, validUntil: Record<string, string>): void {
  for (const [deliveryId, until] of Object.entries(validUntil)) {
    db.database.sqlite.prepare("UPDATE deliveries SET valid_until = ? WHERE id = ?").run(until, deliveryId);
  }
  db.database.sqlite.prepare("UPDATE technical_log_evidence SET expires_at = ?").run(FAR_FUTURE);
}

/** A consumer that presents the credential in the subprotocol list, as the sample consumer does. */
function consumer(port: number, credential: string): WebSocket {
  const ws = new WebSocket(roomUrl(port), ["vw-output.v1", `vw-cred.${credential}`]);
  openSockets.push(ws);
  return ws;
}

function roomUrl(port: number, path = ROOM_PATH): string {
  return `ws://127.0.0.1:${port}${path}`;
}

function opened(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
}

/** Resolves with the HTTP status of a refused upgrade. The client never gets a WebSocket. */
function refusalStatus(ws: WebSocket): Promise<number> {
  openSockets.push(ws);
  return new Promise((resolve, reject) => {
    ws.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
    ws.once("open", () => reject(new Error("the upgrade was accepted")));
    ws.once("error", reject);
  });
}

function closeOf(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

/** Parsed JSON frames that a consumer receives, in arrival order. */
function collect(ws: WebSocket): Array<{ type: string; [key: string]: unknown }> {
  const frames: Array<{ type: string; [key: string]: unknown }> = [];
  ws.on("message", (data) => {
    frames.push(JSON.parse(String(data)) as { type: string; [key: string]: unknown });
  });
  return frames;
}

async function waitUntil(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for the condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

interface RawConsumer {
  readonly socket: net.Socket;
  /** Bytes the server sent after the handshake, in order. */
  readonly received: Buffer[];
}

/** Performs the WebSocket handshake by hand, so the test decides when the consumer reads and whether it answers pings. */
function rawConsumer(port: number, credential: string): Promise<RawConsumer> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    openSockets.push(socket);
    const key = randomBytes(16).toString("base64");
    socket.write(
      `GET ${ROOM_PATH} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Protocol: vw-output.v1, vw-cred.${credential}\r\n\r\n`,
    );
    let head = Buffer.alloc(0);
    const received: Buffer[] = [];
    let handshaken = false;
    socket.on("data", (chunk: Buffer) => {
      if (handshaken) {
        received.push(chunk);
        return;
      }
      head = Buffer.concat([head, chunk]);
      const end = head.indexOf("\r\n\r\n");
      if (end === -1) return;
      handshaken = true;
      const statusLine = head.subarray(0, head.indexOf("\r\n")).toString("latin1");
      if (!statusLine.startsWith("HTTP/1.1 101")) {
        socket.destroy();
        reject(new Error(`handshake refused: ${statusLine}`));
        return;
      }
      received.push(head.subarray(end + 4));
      resolve({ socket, received });
    });
    socket.on("error", reject);
  });
}

/** Splits server-to-client frames. The server never masks its frames, so no mask key is read. */
function wireFrames(bytes: Buffer): WireFrame[] {
  const frames: WireFrame[] = [];
  let offset = 0;
  while (offset + 2 <= bytes.length) {
    const opcode = (bytes[offset] ?? 0) & 0x0f;
    let length = (bytes[offset + 1] ?? 0) & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > bytes.length) break;
      length = bytes.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > bytes.length) break;
      length = Number(bytes.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }
    if (offset + headerLength + length > bytes.length) break;
    frames.push({ opcode, payload: bytes.subarray(offset + headerLength, offset + headerLength + length) });
    offset += headerLength + length;
  }
  return frames;
}

function closeCodeOf(bytes: Buffer): number | undefined {
  const close = wireFrames(bytes).find((frame) => frame.opcode === 0x8);
  return close === undefined || close.payload.length < 2 ? undefined : close.payload.readUInt16BE(0);
}

async function signIn(app: FastifyInstance, loginName: string): Promise<{ cookie: string; csrf: string }> {
  const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
  const body = response.json() as { csrfToken: string };
  return { cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
}

describe("native output endpoint (VW-SUB039-AC001, Q16, Q18)", () => {
  it("accepts a credential in the subprotocol list, selects vw-output.v1, and sends HELLO first", async () => {
    const h = await startHarness();
    const { credential } = issueGrant(h.db);
    const ws = consumer(h.port, credential);
    const frames = collect(ws);

    await opened(ws);
    await waitUntil(() => frames.length >= 1);

    expect(ws.protocol).toBe("vw-output.v1");
    expect(Object.keys(frames[0] ?? {})).toEqual([...NATIVE_FRAME_FIELDS.HELLO]);
    expect(frames[0]).toEqual({ type: "HELLO", version: 1, protocol: "vw-output.v1", heartbeatMs: FAST.heartbeatMs });
  });

  it("answers 401 to a credential in the query string or in an Authorization header, and logs no credential", async () => {
    const h = await startHarness();
    const { credential } = issueGrant(h.db);

    const inQuery = new WebSocket(`${roomUrl(h.port)}?credential=${credential}`, ["vw-output.v1"]);
    expect(await refusalStatus(inQuery)).toBe(401);

    const inHeader = new WebSocket(roomUrl(h.port), ["vw-output.v1"], { headers: { Authorization: `Bearer ${credential}` } });
    expect(await refusalStatus(inHeader)).toBe(401);

    expect(h.logs.join("")).not.toContain(credential);
  });

  it("answers 401 to an unknown, malformed or revoked credential, and 404 to another path", async () => {
    const h = await startHarness();
    const unknown = `vwo_${"A".repeat(43)}`;
    expect(await refusalStatus(consumer(h.port, unknown))).toBe(401);
    expect(await refusalStatus(consumer(h.port, "vwo_short"))).toBe(401);

    const { grantId, credential } = issueGrant(h.db);
    revoke(h.db, grantId);
    expect(await refusalStatus(consumer(h.port, credential))).toBe(401);

    const other = new WebSocket(roomUrl(h.port, "/output/v1/other"), ["vw-output.v1", `vw-cred.${credential}`]);
    expect(await refusalStatus(other)).toBe(404);
  });

  it("closes with 4400 when the consumer sends a data frame", async () => {
    const h = await startHarness(QUIET);
    const { grantId, credential } = issueGrant(h.db);
    const ws = consumer(h.port, credential);
    await opened(ws);
    const closing = closeOf(ws);

    ws.send(JSON.stringify({ type: "ACK" }));

    expect(await closing).toEqual({ code: 4400, reason: "CLIENT_DATA_NOT_ACCEPTED" });
    expect(h.closed).toEqual([{ grantId, code: 4400 }]);
  });

  it("keeps a consumer that answers each ping connected across heartbeats", async () => {
    const h = await startHarness();
    const { credential } = issueGrant(h.db);
    const ws = consumer(h.port, credential);
    let pings = 0;
    ws.on("ping", () => {
      pings += 1;
    });
    await opened(ws);

    await waitUntil(() => pings >= 3);

    expect(ws.readyState).toBe(WebSocket.OPEN);
    expect(h.closed).toEqual([]);
  });

  it("closes with 4408 when the consumer does not answer a ping in time", async () => {
    const h = await startHarness();
    const { grantId, credential } = issueGrant(h.db);
    const raw = await rawConsumer(h.port, credential);
    const dropped = new Promise<void>((resolve) => raw.socket.once("close", () => resolve()));

    await dropped;

    const bytes = Buffer.concat(raw.received);
    expect(wireFrames(bytes).some((frame) => frame.opcode === 0x9)).toBe(true);
    expect(closeCodeOf(bytes)).toBe(4408);
    expect(h.closed).toEqual([{ grantId, code: 4408 }]);
  });

  it("closes with 4413 when a consumer does not take a frame within the send timeout, and drops it", async () => {
    const h = await startHarness({ ...QUIET, sendTimeoutMs: 300 });
    const { grantId, credential } = issueGrant(h.db);
    const raw = await rawConsumer(h.port, credential);
    // The consumer stops reading, so its socket cannot take a frame this large.
    raw.socket.pause();
    addDeliveryEvent(h.db, { eventId: "event-big", subjectKey: "viewer-big", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-big" });
    addApprovedText(h.db, "event-big", "x".repeat(32 * 1024 * 1024));
    setValidity(h.db, { "d-big": FAR_FUTURE });

    await waitUntil(() => h.closed.some((entry) => entry.code === 4413), 15_000);
    const dropped = new Promise<void>((resolve) => raw.socket.once("close", () => resolve()));
    raw.socket.resume();
    await dropped;

    expect(h.closed).toEqual([{ grantId, code: 4413 }]);
  });

  it("closes with 4403 at once when the owner revokes the grant, and a reconnect with the credential is refused", async () => {
    const h = await startHarness(QUIET);
    const ownerId = (
      await createAccount(h.db.database, { loginName: "owner", displayName: "Owner", password: PASSWORD, now: new Date(T0) })
    ).accountId;
    runShortTransaction(h.db.database, (tx) =>
      grantMembership(tx, { channelId: "channel-a", accountId: ownerId, role: "CHANNEL_OWNER", logAccess: false, now: new Date(T0) }),
    );
    const owner = await signIn(h.app, "owner");
    const headers = { cookie: owner.cookie, "x-csrf-token": owner.csrf };
    const issued = await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers });
    const { grantId, credential } = issued.json() as { grantId: string; credential: string };
    const ws = consumer(h.port, credential);
    await opened(ws);
    const closing = closeOf(ws);

    const revoked = await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${grantId}`, headers });

    expect(revoked.statusCode).toBe(204);
    expect(await closing).toEqual({ code: 4403, reason: "GRANT_REVOKED" });
    expect(h.closed).toEqual([{ grantId, code: 4403 }]);
    expect(await refusalStatus(consumer(h.port, credential))).toBe(401);
  });

  it("closes with 4403 within one heartbeat when the grant is revoked without the route", async () => {
    const h = await startHarness();
    const { grantId, credential } = issueGrant(h.db);
    const ws = consumer(h.port, credential);
    await opened(ws);
    const closing = closeOf(ws);

    revoke(h.db, grantId);

    expect(await closing).toEqual({ code: 4403, reason: "GRANT_REVOKED" });
  });

  it("sends each approved row once in platform order, never sends an expired row, and does not resend a SENT row on reconnect", async () => {
    const h = await startHarness();
    addDeliveryEvent(h.db, { eventId: "event-1", subjectKey: "viewer-1", platformOrder: 1, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-1" });
    addDeliveryEvent(h.db, { eventId: "event-2", subjectKey: "viewer-2", platformOrder: 2, verdict: createVerdict("BLOCK"), deliveryId: "d-2" });
    addDeliveryEvent(h.db, { eventId: "event-3", subjectKey: "viewer-3", platformOrder: 3, verdict: createVerdict("ALLOW_MEANINGFUL"), deliveryId: "d-3" });
    addApprovedText(h.db, "event-1", "approved text");
    addApprovedText(h.db, "event-2", "blocked wording");
    addApprovedText(h.db, "event-3", "too late");
    setValidity(h.db, { "d-1": FAR_FUTURE, "d-2": FAR_FUTURE, "d-3": LONG_AGO });
    const { credential } = issueGrant(h.db);

    const first = consumer(h.port, credential);
    const firstFrames = collect(first);
    await opened(first);
    await waitUntil(() => firstFrames.length >= 3);
    await waitUntil(() => statusOf(h.db, "d-1") === "SENT" && statusOf(h.db, "d-2") === "SENT" && statusOf(h.db, "d-3") === "EXPIRED");

    expect(firstFrames.map((frame) => frame.type)).toEqual(["HELLO", "DELIVER", "WARD_BLOCKED"]);
    expect(Object.keys(firstFrames[1] ?? {})).toEqual([...NATIVE_FRAME_FIELDS.DELIVER]);
    expect(firstFrames[1]).toMatchObject({ deliveryId: "d-1", display: { label: null, text: "approved text", translation: null } });
    expect(Object.keys(firstFrames[2] ?? {})).toEqual([...NATIVE_FRAME_FIELDS.WARD_BLOCKED]);
    expect(firstFrames[2]).toMatchObject({ deliveryId: "d-2" });
    expect(JSON.stringify(firstFrames)).not.toContain("blocked wording");
    expect(JSON.stringify(firstFrames)).not.toContain("too late");

    const second = consumer(h.port, credential);
    const secondFrames = collect(second);
    await opened(second);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(secondFrames.map((frame) => frame.type)).toEqual(["HELLO"]);
    expect(statusOf(h.db, "d-1")).toBe("SENT");
    expect(statusOf(h.db, "d-3")).toBe("EXPIRED");
  });
});

describe("native output endpoint with a failing grant store", () => {
  it("refuses an upgrade with 500 when the credential lookup throws, and closes a consumer as revoked when its grant cannot be re-read", async () => {
    let lookupFails = true;
    let checkFails = false;
    const closed: Array<{ grantId: string; code: number }> = [];
    const grants: OutputGrantPort = {
      resolveCredential() {
        if (lookupFails) throw new Error("database is busy");
        return { grantId: "grant-f", channelId: "channel-a" };
      },
      isActive() {
        if (checkFails) throw new Error("database is busy");
        return true;
      },
    };
    const server = http.createServer();
    const endpoint = attachNativeOutput(server, {
      grants,
      subscribers: createSubscriptionRegistry(),
      timing: FAST,
      onClosed: (entry) => void closed.push(entry),
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
      const credential = `vwo_${"B".repeat(43)}`;
      expect(await refusalStatus(consumer(port, credential))).toBe(500);

      lookupFails = false;
      checkFails = true;
      const admitted = consumer(port, credential);
      const closing = closeOf(admitted);
      expect(await closing).toEqual({ code: 4403, reason: "GRANT_REVOKED" });
      expect(closed).toEqual([{ grantId: "grant-f", code: 4403 }]);
    } finally {
      endpoint.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("N1: app.close() resolves promptly while a WebSocket consumer is still connected", async () => {
    const h = await startHarness(QUIET);
    const { credential } = issueGrant(h.db);
    const ws = consumer(h.port, credential);
    await opened(ws);
    const closed = closeOf(ws);

    const startedAt = Date.now();
    await h.app.close();
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(2000);
    await closed;
  });
});
