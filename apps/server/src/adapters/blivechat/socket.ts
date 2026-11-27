import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import {
  NATIVE_CLOSE,
  NATIVE_OUTPUT_CREDENTIAL_PREFIX,
  type GrantFacts,
  type NativeClose,
  type NativeFrame,
  type OutputGrantPort,
  type OutputSubscriber,
  type OutputSubscriberRegistry,
} from "@voxward/contracts";
import { WebSocket, WebSocketServer } from "ws";
import {
  createWsUpgradeRateLimiter,
  DEFAULT_NATIVE_OUTPUT_TIMING,
  type ClosedConnection,
  type NativeOutputEndpoint,
  type NativeOutputTiming,
  type QuotaRegistryLike,
  type WsUpgradeRateLimiter,
} from "../native-output/socket.js";

/** Minimal structural protocol interface injected by composition (`app.ts`) from `modules/output`. */
export type BlivechatClientAction =
  | { readonly kind: "joined" }
  | { readonly kind: "reply"; readonly frame: unknown }
  | { readonly kind: "reject"; readonly close: NativeClose };

export interface BlivechatSocketSession {
  isJoined(): boolean;
  handleClientMessage(raw: string, nowIso: string): BlivechatClientAction;
  mapNativeFrame(frame: NativeFrame, nowIso: string): unknown | null;
}

export interface BlivechatSocketProtocol {
  createSession(): BlivechatSocketSession;
}

export interface BlivechatOutputOptions {
  readonly path: string;
  readonly protocolVersion: string;
  readonly grants: OutputGrantPort;
  readonly subscribers: QuotaRegistryLike;
  readonly protocol: BlivechatSocketProtocol;
  readonly timing?: Partial<NativeOutputTiming>;
  readonly log?: { warn(fields: Record<string, unknown>, message: string): void };
  readonly onClosed?: (closed: ClosedConnection) => void;
  readonly authLimiter?: WsUpgradeRateLimiter;
}

const CREDENTIAL_SHAPE = /^vwo_[A-Za-z0-9_-]{43}$/;
const REFUSAL_STATUS_TEXT = { 401: "Unauthorized", 429: "Too Many Requests", 500: "Internal Server Error" } as const;

export function attachBlivechatOutput(server: Server, options: BlivechatOutputOptions): NativeOutputEndpoint {
  const timing: NativeOutputTiming = { ...DEFAULT_NATIVE_OUTPUT_TIMING, ...options.timing };
  const authLimiter = options.authLimiter ?? createWsUpgradeRateLimiter();
  const socketServer = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    handleProtocols: (protocols) => (protocols.has(options.protocolVersion) ? options.protocolVersion : false),
  });

  function refuse(socket: Duplex, status: 401 | 429 | 500, reason: string): void {
    socket.on("error", () => undefined);
    const retryHeader = status === 429 ? "Retry-After: 60\r\n" : "";
    socket.end(
      `HTTP/1.1 ${status} ${REFUSAL_STATUS_TEXT[status]}\r\n${retryHeader}Connection: close\r\nContent-Length: 0\r\n\r\n`,
    );
    options.log?.warn({ status, reason }, "blivechat output upgrade refused");
  }

  function grantIsActive(grantId: string): boolean {
    try {
      return options.grants.isActive(grantId);
    } catch (error) {
      options.log?.warn({ errorCode: errorCodeOf(error) }, "blivechat output grant check failed");
      return false;
    }
  }

  function onUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (pathOf(request.url) !== options.path) {
      return;
    }
    const clientIp = request.socket.remoteAddress ?? "unknown";
    if (!authLimiter.allow(clientIp)) {
      refuse(socket, 429, "AUTH_RATE_LIMITED");
      return;
    }
    const offered = offeredProtocols(request.headers["sec-websocket-protocol"]);
    const credential = credentialFrom(offered);
    if (credential === undefined) {
      refuse(socket, 401, "NO_CREDENTIAL");
      return;
    }
    let grant: GrantFacts | undefined;
    try {
      grant = options.grants.resolveCredential(credential);
    } catch (error) {
      options.log?.warn({ errorCode: errorCodeOf(error) }, "blivechat output credential lookup failed");
      refuse(socket, 500, "LOOKUP_FAILED");
      return;
    }
    if (grant === undefined) {
      refuse(socket, 401, "CREDENTIAL_REJECTED");
      return;
    }
    const quota = options.subscribers.canAttach?.(grant);
    if (quota !== undefined && !quota.ok) {
      refuse(socket, 429, quota.reason ?? "QUOTA_EXCEEDED");
      return;
    }
    socketServer.handleUpgrade(request, socket, head, (ws) => openConnection(ws, grant));
  }

  function openConnection(ws: WebSocket, grant: GrantFacts): void {
    let closing = false;
    let attached = false;
    let heartbeat: NodeJS.Timeout | undefined;
    let pongTimer: NodeJS.Timeout | undefined;
    let graceTimer: NodeJS.Timeout | undefined;
    const session = options.protocol.createSession();

    const subscriber: OutputSubscriber = {
      grantId: grant.grantId,
      channelId: grant.channelId,
      send: (message) => sendNativeFrame(message),
      bufferedAmount: () => ws.bufferedAmount,
      close: (reason) => shutDown(reason),
    };

    function stopTimers(): void {
      clearInterval(heartbeat);
      clearTimeout(pongTimer);
      pongTimer = undefined;
    }

    function shutDown(reason: NativeClose): void {
      if (closing) return;
      closing = true;
      if (attached) {
        options.subscribers.detach(subscriber);
        attached = false;
      }
      stopTimers();
      options.onClosed?.({ grantId: grant.grantId, code: reason.code });
      if (ws.readyState === WebSocket.CLOSED) return;
      ws.close(reason.code, reason.reason);
      graceTimer = setTimeout(() => ws.terminate(), timing.closeGraceMs);
    }

    function sendJson(payload: unknown): Promise<void> {
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
        ws.send(JSON.stringify(payload), (error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      });
    }

    function sendNativeFrame(message: NativeFrame): Promise<void> {
      const mapped = session.mapNativeFrame(message, new Date().toISOString());
      if (mapped === null) {
        return Promise.resolve();
      }
      return sendJson(mapped);
    }

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        shutDown(NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED);
        return;
      }
      const action = session.handleClientMessage(String(data), new Date().toISOString());
      if (action.kind === "reject") {
        shutDown(action.close);
        return;
      }
      if (action.kind === "joined") {
        if (!grantIsActive(grant.grantId)) {
          shutDown(NATIVE_CLOSE.GRANT_REVOKED);
          return;
        }
        if (!attached) {
          if (options.subscribers.tryAttach !== undefined) {
            const verdict = options.subscribers.tryAttach(subscriber);
            if (!verdict.ok) {
              shutDown(NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE);
              return;
            }
          } else {
            options.subscribers.attach(subscriber);
          }
          attached = true;
        }
        return;
      }
      if (action.kind === "reply") {
        void sendJson(action.frame).catch(() => undefined);
      }
    });

    ws.on("pong", () => {
      clearTimeout(pongTimer);
      pongTimer = undefined;
    });
    ws.on("error", (error) => options.log?.warn({ errorCode: errorCodeOf(error) }, "blivechat output connection failed"));
    ws.on("close", () => {
      closing = true;
      if (attached) {
        options.subscribers.detach(subscriber);
        attached = false;
      }
      stopTimers();
      clearTimeout(graceTimer);
    });

    heartbeat = setInterval(() => {
      if (!grantIsActive(grant.grantId)) {
        shutDown(NATIVE_CLOSE.GRANT_REVOKED);
        return;
      }
      if (pongTimer !== undefined || ws.readyState !== WebSocket.OPEN) return;
      ws.ping();
      pongTimer = setTimeout(() => {
        pongTimer = undefined;
        shutDown(NATIVE_CLOSE.HEARTBEAT_TIMEOUT);
      }, timing.pongTimeoutMs);
    }, timing.heartbeatMs);

    if (!grantIsActive(grant.grantId)) {
      shutDown(NATIVE_CLOSE.GRANT_REVOKED);
    }
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

function offeredProtocols(header: string | string[] | undefined): string[] {
  const joined = Array.isArray(header) ? header.join(",") : (header ?? "");
  return joined
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

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
