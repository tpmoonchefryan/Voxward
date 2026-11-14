import net from "node:net";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { buildApp } from "../../../src/app.js";
import { issueNativeGrant } from "../../../src/auth/output-grants.js";
import type { ServerConfig } from "../../../src/config/schema.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { buildRegistry } from "../../../src/modules/registry.js";
import { T0 } from "../../db/helpers.js";
import { type OpenDatabase, openDecisionDatabase, seedChannel } from "../../decision-service/fixtures.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

interface AppHarness {
  readonly app: FastifyInstance;
  readonly db: OpenDatabase;
  readonly port: number;
  readonly logs: string[];
}

const openSockets: WebSocket[] = [];
let harness: AppHarness | undefined;

async function startApp(): Promise<AppHarness> {
  const db = openDecisionDatabase("s023-q16-q25-");
  seedChannel(db.database, "channel-a");
  const logs: string[] = [];
  const app = buildApp({
    modules: buildRegistry(config),
    logger: true,
    logStream: { write: (line) => void logs.push(line) },
    database: db.database,
    nativeOutput: {
      timing: { heartbeatMs: 60_000, pongTimeoutMs: 60_000 },
      passIntervalMs: 50,
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

function refusalStatus(ws: WebSocket): Promise<number> {
  openSockets.push(ws);
  return new Promise((resolve, reject) => {
    ws.once("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
    ws.once("open", () => reject(new Error("expected upgrade refusal")));
    ws.once("error", reject);
  });
}

function rawHttpRequest(port: number, raw: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let data = "";
    socket.on("connect", () => {
      socket.write(raw);
    });
    socket.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });
    socket.on("end", () => {
      const [head = "", body = ""] = data.split("\r\n\r\n", 2);
      const statusLine = head.split("\r\n", 1)[0] ?? "";
      const match = /HTTP\/\d\.\d\s+(\d{3})/.exec(statusLine);
      resolve({ status: match ? Number(match[1]) : 0, body });
    });
    socket.on("error", reject);
  });
}

describe("S023 Q16 & Q25 server guarantees", () => {
  it("Q16: authenticates WS via vw-cred. subprotocol, refuses ?cred=/?token= query credentials, and never logs the credential", async () => {
    const h = await startApp();
    const { credential } = runShortTransaction(h.db.database, (tx) =>
      issueNativeGrant(tx, { channelId: "channel-a", nowIso: T0 }),
    );

    // Refuses query-string credential forms without echoing or logging
    for (const param of ["cred", "token", "credential"]) {
      const ws = new WebSocket(`ws://127.0.0.1:${h.port}/output/v1/room?${param}=${credential}`, ["vw-output.v1"]);
      expect(await refusalStatus(ws)).toBe(401);
    }
    expect(h.logs.join("")).not.toContain(credential);

    // Accepts subprotocol vw-cred.<credential> and echoes only vw-output.v1
    const valid = new WebSocket(`ws://127.0.0.1:${h.port}/output/v1/room`, ["vw-output.v1", `vw-cred.${credential}`]);
    openSockets.push(valid);
    await new Promise<void>((resolve, reject) => {
      valid.once("open", () => resolve());
      valid.once("error", reject);
    });
    expect(valid.protocol).toBe("vw-output.v1");
    expect(h.logs.join("")).not.toContain(credential);
  });

  it("Q25: Fastify 400/414 framework errors return fixed { error } without echoing URL, and Pino redacts percent-encoded credentials in URL and Host header", async () => {
    const h = await startApp();
    const secretTail = "Z".repeat(43);
    const credential = `vwo_${secretTail}`;
    const percentEncodedCred = `vwo%5F${secretTail}`;

    // 1. Trigger Fastify 400 via invalid/percent-encoded request or malformed JSON/header, and 414 via long param
    // Long route param -> 414 URI_TOO_LONG with fixed { error } body (no URL echo)
    const longRes = await h.app.inject({
      method: "GET",
      url: `/channels/${percentEncodedCred}${"a".repeat(200)}/dock`,
      headers: { host: `${percentEncodedCred}.example` },
    });
    expect(longRes.statusCode).toBe(414);
    expect(longRes.json()).toEqual({ error: "URI_TOO_LONG" });
    expect(longRes.body).not.toContain(secretTail);

    // Malformed HTTP request line / bad path -> 400 BAD_REQUEST with fixed { error } body
    const badReq = await rawHttpRequest(
      h.port,
      `GET /%ZZ/${percentEncodedCred} HTTP/1.1\r\nHost: ${percentEncodedCred}.example\r\nConnection: close\r\n\r\n`,
    );
    expect(badReq.status).toBe(400);
    expect(badReq.body).not.toContain(secretTail);
    expect(JSON.parse(badReq.body)).toEqual({ error: "BAD_REQUEST" });

    // Pino logs must redact percent-encoded credentials in both URL and Host header
    const combinedLogs = h.logs.join("\n");
    expect(combinedLogs).not.toContain(credential);
    expect(combinedLogs).not.toContain(percentEncodedCred);
    expect(combinedLogs).not.toContain(secretTail);
    expect(combinedLogs).toContain("[REDACTED]");
  });
});
