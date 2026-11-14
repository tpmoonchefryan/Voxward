// Shared helpers for the batch m7b S021 probes. Every source module is imported from the checkout given as the first
// argument, by absolute path, so the same probe can run against a copy. Synthetic data only. Loopback only.
import { createHash, randomBytes } from "node:crypto";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CHECKOUT = process.argv[2] ?? "";
if (CHECKOUT === "") throw new Error("usage: tsx <probe> <checkout>");

export const imp = (rel: string) => import(pathToFileURL(join(CHECKOUT, rel)).href);

export const contracts = await imp("packages/contracts/src/index.ts");
export const { WebSocket } = await imp("apps/server/node_modules/ws/wrapper.mjs");
export const { buildApp } = await imp("apps/server/src/app.ts");
export const { buildRegistry } = await imp("apps/server/src/modules/registry.ts");
export const { createAccount } = await imp("apps/server/src/auth/login.ts");
export const { grantMembership } = await imp("apps/server/src/auth/members.ts");
export const { issueNativeGrant } = await imp("apps/server/src/auth/output-grants.ts");
export const { issueOutputToken } = await imp("apps/server/src/auth/downstream-tokens.ts");
export const store = await imp("apps/server/src/db/output-store.ts");
export const { runShortTransaction } = await imp("apps/server/src/db/transaction.ts");
export const { createDecisionStorePort } = await imp("apps/server/src/db/decision-store.ts");
export const schema = await imp("apps/server/src/db/schema/index.ts");
export const { createScoringPlanner } = await imp("apps/server/src/modules/scoring-engine/index.ts");
export const decision = await imp("apps/server/src/modules/decision-service/index.ts");
export const { attachNativeOutput } = await imp("apps/server/src/adapters/native-output/socket.ts");
export const { createDeliveryPump } = await imp("apps/server/src/modules/output-adapter/delivery.ts");
export const { createSubscriptionRegistry } = await imp("apps/server/src/modules/output-adapter/subscription.ts");
export const fx = await imp("apps/server/test/decision-service/fixtures.ts");
export const { ENABLED } = await imp("apps/server/test/scoring-engine/ledger/helpers.ts");
export const { T0 } = await imp("apps/server/test/db/helpers.ts");

export const FAR_FUTURE = "2099-01-01T00:00:00.000Z";
export const LONG_AGO = "2000-01-01T00:00:00.000Z";
export const PASSWORD = "correct horse battery";
export const CONFIG = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

// ------------------------------------------------------------------ check bookkeeping
let checks = 0;
let failures = 0;
export function check(id: string, condition: boolean, contract: string, detail?: unknown): boolean {
  checks += 1;
  if (!condition) failures += 1;
  const suffix = detail === undefined ? "" : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
  console.log(`${condition ? "OK  " : "FAIL"} ${id} ${contract}${suffix}`);
  return condition;
}
export function note(id: string, text: string, detail?: unknown): void {
  const suffix = detail === undefined ? "" : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
  console.log(`NOTE ${id} ${text}${suffix}`);
}
export function section(title: string): void {
  console.log(`\n## ${title}`);
}
export function finish(): void {
  console.log(`\nchecks ${checks}, failures ${failures}`);
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function waitUntil(condition: () => boolean, timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) return false;
    await sleep(10);
  }
  return true;
}

// ------------------------------------------------------------------ data
let seq = 0;
export function decisionStoreOf(db: { database: unknown }) {
  return createDecisionStorePort(db.database, {
    planner: createScoringPlanner(ENABLED),
    newId: () => `probe-row-${++seq}`,
    changeLogExpiresAt: () => fx.CHANGE_EXPIRES_AT,
  });
}

/** One event with an open task in any channel, then its verdict and delivery row through the real decision store. */
export function addRow(
  db: { database: any },
  input: { channelId: string; n: number; verdict: string; deliveryId: string; text?: string; platformOrder?: number; subjectKey?: string },
): void {
  const eventId = `event-${input.channelId}-${input.n}`;
  const subjectKey = input.subjectKey ?? `UCviewerSTABLEID${input.n}`;
  fx.seedOpenTask(db.database, {
    channelId: input.channelId,
    subjectKey,
    subjectId: `subject-${input.channelId}-${subjectKey}`,
    eventId,
    platformMessageRef: `msgrefSECRET-${input.channelId}-${input.n}`,
    taskId: `task-${eventId}`,
    platformOrder: input.platformOrder ?? input.n,
  });
  const result = decisionStoreOf(db).commitVerdict({
    taskId: `task-${eventId}`,
    verdictId: `verdict-${eventId}`,
    deliveryId: input.deliveryId,
    verdict: contracts.createVerdict(input.verdict),
    source: "MANUAL",
    decidedAt: fx.DECIDED_AT,
    decidedByRef: "mod-1",
    changeActorRef: "mod-1",
    validUntil: fx.DEADLINE,
  });
  if (result.status !== "committed") throw new Error(`commit failed: ${JSON.stringify(result)}`);
  if (input.text !== undefined) addText(db, input.channelId, eventId, input.text);
}

export function addText(db: { database: any }, channelId: string, eventId: string, text: string, kind = "MESSAGE_TEXT"): void {
  runShortTransaction(db.database, (tx: any) => {
    const logId = `log-${eventId}-${kind}`;
    const sequence = kind === "MESSAGE_TEXT" ? 1 : 2;
    tx.insert(schema.technicalLogs)
      .values({ id: logId, channelId, correlationId: `corr-${eventId}`, sequence, stage: "INGEST", status: "OK", createdAt: T0, expiresAt: FAR_FUTURE })
      .run();
    tx.insert(schema.technicalLogEvidence)
      .values({ id: `ev-${eventId}-${kind}`, logId, evidenceKind: kind, payload: text, payloadBytes: Buffer.byteLength(text, "utf8"), expiresAt: FAR_FUTURE })
      .run();
  });
}

export function setValidity(db: { database: any }, map: Record<string, string>): void {
  for (const [id, until] of Object.entries(map)) db.database.sqlite.prepare("UPDATE deliveries SET valid_until = ? WHERE id = ?").run(until, id);
}
export function setStatus(db: { database: any }, id: string, status: string): void {
  db.database.sqlite.prepare("UPDATE deliveries SET status = ? WHERE id = ?").run(status, id);
}
export function rowOf(db: { database: any }, id: string): { status: string; attempts: number; valid_until: string } | undefined {
  return db.database.sqlite.prepare("SELECT status, attempts, valid_until FROM deliveries WHERE id = ?").get(id);
}
export function sql(db: { database: any }, text: string, ...params: unknown[]): any {
  return db.database.sqlite.prepare(text).run(...params);
}
export function all(db: { database: any }, text: string, ...params: unknown[]): any[] {
  return db.database.sqlite.prepare(text).all(...params);
}

/** Every text cell of every table, so a probe can say a value is stored nowhere. */
export function databaseContains(db: { database: any }, needle: string): string[] {
  const hits: string[] = [];
  const tables = all(db, "SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name as string);
  for (const table of tables) {
    for (const row of all(db, `SELECT * FROM "${table}"`)) {
      for (const [column, value] of Object.entries(row)) {
        if (typeof value === "string" && value.includes(needle)) hits.push(`${table}.${column}`);
      }
    }
  }
  return hits;
}

// ------------------------------------------------------------------ accounts and sessions
export async function account(app: any, db: { database: any }, loginName: string, channelId: string, role: string) {
  const { accountId } = await createAccount(db.database, { loginName, displayName: loginName, password: PASSWORD, now: new Date(T0) });
  runShortTransaction(db.database, (tx: any) => grantMembership(tx, { channelId, accountId, role, logAccess: false, now: new Date(T0) }));
  const response = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
  const body = response.json() as { csrfToken: string };
  return { accountId, cookie: String(response.headers["set-cookie"]).split(";")[0] ?? "", csrf: body.csrfToken };
}

// ------------------------------------------------------------------ app harness
export interface Harness {
  app: any;
  db: any;
  port: number;
  logs: string[];
  closed: Array<{ grantId: string; code: number }>;
  stop(): Promise<void>;
}

export async function startApp(timing: Record<string, number>, passIntervalMs = 20): Promise<Harness> {
  const db = fx.openDecisionDatabase("probe-m7b-");
  fx.seedChannel(db.database, "channel-a");
  fx.seedChannel(db.database, "channel-b");
  const logs: string[] = [];
  const closed: Array<{ grantId: string; code: number }> = [];
  const app = buildApp({
    modules: buildRegistry(CONFIG),
    logger: true,
    logStream: { write: (line: string) => void logs.push(line) },
    database: db.database,
    nativeOutput: { timing, passIntervalMs, onClosed: (entry: { grantId: string; code: number }) => void closed.push(entry) },
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as net.AddressInfo).port;
  return {
    app,
    db,
    port,
    logs,
    closed,
    async stop() {
      await app.close();
      db.close();
    },
  };
}

export function grant(db: { database: any }, channelId = "channel-a"): { grantId: string; credential: string } {
  return runShortTransaction(db.database, (tx: any) => issueNativeGrant(tx, { channelId, nowIso: T0 }));
}

// ------------------------------------------------------------------ WebSocket clients
export interface Client {
  ws: any;
  frames: any[];
  opened: Promise<boolean>;
  closed: Promise<{ code: number; reason: string }>;
}
export const openSockets: any[] = [];

export function client(port: number, protocols: string[], options: Record<string, unknown> = {}, path = "/output/v1/room"): Client {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, protocols, options);
  openSockets.push(ws);
  const frames: any[] = [];
  ws.on("message", (data: Buffer) => frames.push(JSON.parse(String(data))));
  const opened = new Promise<boolean>((resolve) => {
    ws.once("open", () => resolve(true));
    ws.once("unexpected-response", () => resolve(false));
    ws.once("error", () => resolve(false));
  });
  const closed = new Promise<{ code: number; reason: string }>((resolve) => {
    ws.once("close", (code: number, reason: Buffer) => resolve({ code, reason: reason.toString() }));
  });
  return { ws, frames, opened, closed };
}

export function consumer(port: number, credential: string): Client {
  return client(port, ["vw-output.v1", `vw-cred.${credential}`]);
}

/** Sends raw bytes, returns everything the server wrote until it closed or the timeout passed. */
export function rawExchange(port: number, request: string | Buffer, timeoutMs = 2000): Promise<{ text: string; closedByServer: boolean }> {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    openSockets.push(socket);
    const chunks: Buffer[] = [];
    let done = false;
    const finish = (closedByServer: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ text: Buffer.concat(chunks).toString("latin1"), closedByServer });
    };
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("end", () => finish(true));
    socket.on("close", () => finish(true));
    socket.on("error", () => finish(true));
    socket.write(request);
    setTimeout(() => finish(false), timeoutMs);
  });
}

export function upgradeRequest(port: number, options: { path?: string; protocol?: string | null; extra?: string } = {}): string {
  const key = randomBytes(16).toString("base64");
  const protocolLine = options.protocol === null || options.protocol === undefined ? "" : `Sec-WebSocket-Protocol: ${options.protocol}\r\n`;
  return (
    `GET ${options.path ?? "/output/v1/room"} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${protocolLine}${options.extra ?? ""}\r\n`
  );
}

export interface RawConsumer {
  socket: net.Socket;
  head: string;
  received: Buffer[];
  ended: Promise<number>;
}

/** Handshake by hand: the probe decides whether the consumer reads, answers pings or answers the close frame. */
export function rawConsumer(port: number, credential: string): Promise<RawConsumer> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    openSockets.push(socket);
    const started = Date.now();
    const ended = new Promise<number>((done) => socket.once("close", () => done(Date.now() - started)));
    socket.write(upgradeRequest(port, { protocol: `vw-output.v1, vw-cred.${credential}` }));
    let head = Buffer.alloc(0);
    const received: Buffer[] = [];
    let shaken = false;
    socket.on("data", (chunk: Buffer) => {
      if (shaken) {
        received.push(chunk);
        return;
      }
      head = Buffer.concat([head, chunk]);
      const end = head.indexOf("\r\n\r\n");
      if (end === -1) return;
      shaken = true;
      const headText = head.subarray(0, end).toString("latin1");
      if (!headText.startsWith("HTTP/1.1 101")) {
        reject(new Error(`refused: ${headText.split("\r\n")[0]}`));
        return;
      }
      received.push(head.subarray(end + 4));
      resolve({ socket, head: headText, received, ended });
    });
    socket.on("error", () => undefined);
  });
}

export function wireFrames(bytes: Buffer): Array<{ opcode: number; payload: Buffer }> {
  const frames: Array<{ opcode: number; payload: Buffer }> = [];
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
export function closeCodeOf(bytes: Buffer): number | undefined {
  const close = wireFrames(bytes).find((frame) => frame.opcode === 0x8);
  return close === undefined || close.payload.length < 2 ? undefined : close.payload.readUInt16BE(0);
}
export function textFramesOf(bytes: Buffer): any[] {
  return wireFrames(bytes)
    .filter((frame) => frame.opcode === 0x1)
    .map((frame) => JSON.parse(frame.payload.toString("utf8")));
}

/** A masked client frame (opcode 1 text, 2 binary, 0xA pong), as a browser would send it. */
export function clientFrame(opcode: number, payload: Buffer): Buffer {
  const mask = randomBytes(4);
  const masked = Buffer.from(payload.map((byte, index) => byte ^ (mask[index % 4] ?? 0)));
  let header: Buffer;
  if (payload.length < 126) header = Buffer.from([0x80 | opcode, 0x80 | payload.length]);
  else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, mask, masked]);
}

export function closeAllSockets(): void {
  for (const socket of openSockets.splice(0)) {
    try {
      if (typeof socket.terminate === "function") socket.terminate();
      else socket.destroy();
    } catch {
      // already gone
    }
  }
}

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
