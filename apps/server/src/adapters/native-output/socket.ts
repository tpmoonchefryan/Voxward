import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import {
  NATIVE_CLOSE,
  NATIVE_OUTPUT_CREDENTIAL_PREFIX,
  NATIVE_OUTPUT_HEARTBEAT_MS,
  NATIVE_OUTPUT_PATH,
  NATIVE_OUTPUT_PONG_TIMEOUT_MS,
  NATIVE_OUTPUT_PROTOCOL,
  NATIVE_OUTPUT_VERSION,
  type GrantFacts,
  type HelloFrame,
  type NativeClose,
  type NativeFrame,
  type OutputGrantPort,
  type OutputSubscriber,
  type OutputSubscriberRegistry,
} from "@voxward/contracts";
import { WebSocket, WebSocketServer } from "ws";

/**
 * Timing and limits of the native output endpoint. The heartbeat values belong to the protocol and come from the contract.
 * The other values are this endpoint's own choices (自定) and have not been measured under load.
 */
export interface NativeOutputTiming {
  readonly heartbeatMs: number;
  readonly pongTimeoutMs: number;
  /** Bytes a consumer's socket may hold unsent before the next frame is refused (自定). */
  readonly maxBufferedBytes: number;
  /** Longest wait for one frame to be written to the socket before the consumer is closed as backlogged (自定). */
  readonly sendTimeoutMs: number;
  /** Time a closing connection gets to finish the close handshake before the socket is dropped (自定). */
  readonly closeGraceMs: number;
}

export const DEFAULT_NATIVE_OUTPUT_TIMING: NativeOutputTiming = {
  heartbeatMs: NATIVE_OUTPUT_HEARTBEAT_MS,
  pongTimeoutMs: NATIVE_OUTPUT_PONG_TIMEOUT_MS,
  maxBufferedBytes: 1024 * 1024,
  sendTimeoutMs: 5_000,
  closeGraceMs: 1_000,
};

/** A connection the endpoint closed on purpose, with the close code it sent. Carries no credential and no frame content. */
export interface ClosedConnection {
  readonly grantId: string;
  readonly code: number;
}

export interface NativeOutputOptions {
  readonly grants: OutputGrantPort;
  readonly subscribers: OutputSubscriberRegistry;
  readonly timing?: Partial<NativeOutputTiming>;
  /** Upgrade paths handled by sibling endpoints on the same HTTP server; skipped without 404. */
  readonly ignoredPaths?: ReadonlySet<string>;
  /** Receives refusals and connection errors. A line carries a reason code, never the URL, a header or a credential. */
  readonly log?: { warn(fields: Record<string, unknown>, message: string): void };
  readonly onClosed?: (closed: ClosedConnection) => void;
}

export interface NativeOutputEndpoint {
  /** Stops accepting upgrades and drops every open connection. */
  close(): void;
}

/** A credential is the `vwo_` prefix and 32 random bytes in base64url, which is 43 characters. */
const CREDENTIAL_SHAPE = /^vwo_[A-Za-z0-9_-]{43}$/;

const REFUSAL_STATUS_TEXT = { 401: "Unauthorized", 404: "Not Found", 500: "Internal Server Error" } as const;

/**
 * Serves the native output room on an HTTP server. A consumer proves its grant in the WebSocket subprotocol list as
 * `vw-cred.<credential>`, because a browser cannot set an Authorization header on a WebSocket, and a query string is logged.
 * The server selects only `vw-output.v1` in reply, so the credential is never echoed. A refused upgrade gets a bare HTTP
 * status line and no body.
 */
export function attachNativeOutput(server: Server, options: NativeOutputOptions): NativeOutputEndpoint {
  const timing: NativeOutputTiming = { ...DEFAULT_NATIVE_OUTPUT_TIMING, ...options.timing };
  const socketServer = new WebSocketServer({ noServer: true, maxPayload: 4096, handleProtocols: () => NATIVE_OUTPUT_PROTOCOL });

  function refuse(socket: Duplex, status: 401 | 404 | 500, reason: string): void {
    // A client may drop the connection while the refusal is being written. That is not a server failure.
    socket.on("error", () => undefined);
    socket.end(`HTTP/1.1 ${status} ${REFUSAL_STATUS_TEXT[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    options.log?.warn({ status, reason }, "native output upgrade refused");
  }

  /**
   * Re-reads a grant. A read that fails counts as revoked, so a consumer is kept only while its grant is confirmed. An
   * exception here would otherwise escape a timer or an event listener and stop the process.
   */
  function grantIsActive(grantId: string): boolean {
    try {
      return options.grants.isActive(grantId);
    } catch (error) {
      options.log?.warn({ errorCode: errorCodeOf(error) }, "native output grant check failed");
      return false;
    }
  }

  function onUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const path = pathOf(request.url);
    if (options.ignoredPaths?.has(path)) {
      return;
    }
    if (path !== NATIVE_OUTPUT_PATH) {
      refuse(socket, 404, "PATH_NOT_FOUND");
      return;
    }
    const offered = offeredProtocols(request.headers["sec-websocket-protocol"]);
    const credential = credentialFrom(offered);
    if (credential === undefined || !offered.includes(NATIVE_OUTPUT_PROTOCOL)) {
      refuse(socket, 401, "NO_CREDENTIAL");
      return;
    }
    let grant: GrantFacts | undefined;
    try {
      grant = options.grants.resolveCredential(credential);
    } catch (error) {
      options.log?.warn({ errorCode: errorCodeOf(error) }, "native output credential lookup failed");
      refuse(socket, 500, "LOOKUP_FAILED");
      return;
    }
    if (grant === undefined) {
      refuse(socket, 401, "CREDENTIAL_REJECTED");
      return;
    }
    socketServer.handleUpgrade(request, socket, head, (ws) => openConnection(ws, grant));
  }

  function openConnection(ws: WebSocket, grant: GrantFacts): void {
    let closing = false;
    let heartbeat: NodeJS.Timeout | undefined;
    let pongTimer: NodeJS.Timeout | undefined;
    let graceTimer: NodeJS.Timeout | undefined;

    const subscriber: OutputSubscriber = {
      grantId: grant.grantId,
      channelId: grant.channelId,
      send: (message) => sendFrame(message),
      bufferedAmount: () => ws.bufferedAmount,
      close: (reason) => shutDown(reason),
    };

    function stopTimers(): void {
      clearInterval(heartbeat);
      clearTimeout(pongTimer);
      pongTimer = undefined;
    }

    /** Takes the consumer out of the delivery pass at once, then closes the socket with the reason's code. */
    function shutDown(reason: NativeClose): void {
      if (closing) return;
      closing = true;
      options.subscribers.detach(subscriber);
      stopTimers();
      options.onClosed?.({ grantId: grant.grantId, code: reason.code });
      if (ws.readyState === WebSocket.CLOSED) return;
      ws.close(reason.code, reason.reason);
      graceTimer = setTimeout(() => ws.terminate(), timing.closeGraceMs);
    }

    /** Resolves once the frame is written to the socket. Rejects when the socket is closed, backlogged or times out. */
    function sendFrame(message: NativeFrame): Promise<void> {
      if (ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("CONNECTION_NOT_OPEN"));
      if (ws.bufferedAmount > timing.maxBufferedBytes) {
        shutDown(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE);
        return Promise.reject(new Error("SUBSCRIBER_BACKPRESSURE"));
      }
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          shutDown(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE);
          reject(new Error("SEND_TIMEOUT"));
        }, timing.sendTimeoutMs);
        ws.send(JSON.stringify(message), (error) => {
          clearTimeout(timer);
          // The write callback passes null on success, so a failure is a truthy error.
          if (error) reject(error);
          else resolve();
        });
      });
    }

    // The consumer sends no content. Only control pong frames are accepted, and any data frame closes the connection.
    ws.on("message", () => shutDown(NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED));
    ws.on("pong", () => {
      clearTimeout(pongTimer);
      pongTimer = undefined;
    });
    ws.on("error", (error) => options.log?.warn({ errorCode: errorCodeOf(error) }, "native output connection failed"));
    ws.on("close", () => {
      closing = true;
      options.subscribers.detach(subscriber);
      stopTimers();
      clearTimeout(graceTimer);
    });

    // HELLO is written before the consumer is attached, so no delivery frame can come before it.
    const hello: HelloFrame = {
      type: "HELLO",
      version: NATIVE_OUTPUT_VERSION,
      protocol: NATIVE_OUTPUT_PROTOCOL,
      heartbeatMs: timing.heartbeatMs,
    };
    ws.send(JSON.stringify(hello));

    heartbeat = setInterval(() => {
      // Every tick reads the grant again, so a revocation made anywhere else still closes the connection.
      if (!grantIsActive(grant.grantId)) {
        shutDown(NATIVE_CLOSE.GRANT_REVOKED);
        return;
      }
      // While a ping is unanswered its own timer decides the outcome, so a second ping is not sent.
      if (pongTimer !== undefined || ws.readyState !== WebSocket.OPEN) return;
      ws.ping();
      pongTimer = setTimeout(() => {
        pongTimer = undefined;
        shutDown(NATIVE_CLOSE.HEARTBEAT_TIMEOUT);
      }, timing.pongTimeoutMs);
    }, timing.heartbeatMs);

    // A revocation that landed between the credential lookup and the handshake must not leave a live consumer.
    if (!grantIsActive(grant.grantId)) {
      shutDown(NATIVE_CLOSE.GRANT_REVOKED);
      return;
    }
    options.subscribers.attach(subscriber);
  }

  server.on("upgrade", onUpgrade);

  return {
    close() {
      server.off("upgrade", onUpgrade);
      for (const client of socketServer.clients) client.terminate();
      socketServer.close();
    },
  };
}

function pathOf(url: string | undefined): string {
  return (url ?? "").split("?", 1)[0] ?? "";
}

/** The subprotocol entries the client offered, in order. Duplicate header lines are joined by Node. */
function offeredProtocols(header: string | string[] | undefined): string[] {
  const joined = Array.isArray(header) ? header.join(",") : (header ?? "");
  return joined
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/** The single credential entry of the offer. Undefined when there is none, when there are several, or when the shape is wrong. */
function credentialFrom(offered: readonly string[]): string | undefined {
  const entries = offered.filter((entry) => entry.startsWith(NATIVE_OUTPUT_CREDENTIAL_PREFIX));
  if (entries.length !== 1) return undefined;
  const credential = (entries[0] ?? "").slice(NATIVE_OUTPUT_CREDENTIAL_PREFIX.length);
  return CREDENTIAL_SHAPE.test(credential) ? credential : undefined;
}

function errorCodeOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}
