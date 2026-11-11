/**
 * streamList intake for one live chat (design.md, section 5). Two layers:
 * - reduceStream is a pure state machine. It says what each transport event means: deliver a batch, wait, or stop.
 * - runStreamList performs those decisions. The transport, the sink, the clock and the connect gate are injected.
 * The transport is the only part that talks to the platform. It yields the platform's answers as events, nothing else.
 */
import { type YouTubeStreamConfig } from "./config.js";
import { claimMessageId, type MessageIdStore } from "./dedup.js";
import { classifyReplay } from "./replay-age.js";

/** Reasons a connection can end badly. The set is closed. An answer outside it arrives as "unknown". */
export const STREAM_FAILURE_REASONS = [
  "forbidden",
  "liveChatDisabled",
  "liveChatNotFound",
  "liveChatEnded",
  "pageTokenInvalid",
  "invalidArgument",
  "quotaExceeded",
  "rateLimitExceeded",
  "network",
  "unknown",
] as const;
export type StreamFailureReason = (typeof STREAM_FAILURE_REASONS)[number];

/** One batch from the platform: the chat items, the resume token, and the offline time when the stream has ended. */
export interface StreamResponse {
  readonly nextPageToken?: string;
  readonly offlineAt?: string;
  readonly items: readonly unknown[];
}

export type TransportEvent =
  | { readonly kind: "RESPONSE"; readonly response: StreamResponse }
  | { readonly kind: "FAILED"; readonly reason: StreamFailureReason }
  | { readonly kind: "CLOSED" };

/** Port that opens one streamList connection. The adapter maps the platform's answers to TransportEvent and nothing else. */
export interface StreamListTransport {
  connect(request: { readonly liveChatId: string; readonly pageToken: string | null }): AsyncIterable<TransportEvent>;
}

export interface AuthorFlags {
  readonly isChatOwner?: boolean;
  readonly isChatModerator?: boolean;
  readonly isChatSponsor?: boolean;
  readonly isVerified?: boolean;
}

/** A chat message that passed the official-source checks. Only the fields the intake needs are kept. */
export interface StreamMessage {
  readonly platformMessageId: string;
  /** snippet.type, for example "textMessageEvent". Not interpreted here. */
  readonly type: string;
  readonly publishedAtMs: number;
  readonly text: string | null;
  readonly authorChannelId: string;
  readonly authorFlags: AuthorFlags;
}

const OFFICIAL_MESSAGE_KIND = "youtube#liveChatMessage";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flagOf(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Returns the message, or null when the item is not an official chat message or lacks a field the intake needs. A field
 * that is absent stays absent. It is never filled in with a guess.
 */
export function parseStreamItem(raw: unknown): StreamMessage | null {
  if (!isRecord(raw) || raw.kind !== OFFICIAL_MESSAGE_KIND) return null;
  const { id, snippet, authorDetails } = raw;
  if (typeof id !== "string" || id === "") return null;
  if (!isRecord(snippet) || !isRecord(authorDetails)) return null;
  if (typeof snippet.type !== "string" || snippet.type === "") return null;
  const publishedAtMs = typeof snippet.publishedAt === "string" ? Date.parse(snippet.publishedAt) : Number.NaN;
  if (Number.isNaN(publishedAtMs)) return null;
  const { channelId } = authorDetails;
  if (typeof channelId !== "string" || channelId === "") return null;
  const details = isRecord(snippet.textMessageDetails) ? snippet.textMessageDetails : undefined;
  const text = typeof details?.messageText === "string" ? details.messageText : null;
  return {
    platformMessageId: id,
    type: snippet.type,
    publishedAtMs,
    text,
    authorChannelId: channelId,
    authorFlags: {
      isChatOwner: flagOf(authorDetails.isChatOwner),
      isChatModerator: flagOf(authorDetails.isChatModerator),
      isChatSponsor: flagOf(authorDetails.isChatSponsor),
      isVerified: flagOf(authorDetails.isVerified),
    },
  };
}

export type StreamPhase =
  | "CONNECTING"
  | "STREAMING"
  | "BACKOFF"
  | "ENDED"
  | "CHAT_UNAVAILABLE"
  | "PERMISSION_LOST"
  | "QUOTA_EXHAUSTED"
  | "REQUEST_REJECTED"
  | "GAVE_UP"
  | "STOPPED";

const TERMINAL_PHASES: ReadonlySet<StreamPhase> = new Set<StreamPhase>([
  "ENDED",
  "CHAT_UNAVAILABLE",
  "PERMISSION_LOST",
  "QUOTA_EXHAUSTED",
  "REQUEST_REJECTED",
  "GAVE_UP",
  "STOPPED",
]);

export function isTerminalPhase(phase: StreamPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

export interface StreamState {
  readonly phase: StreamPhase;
  /** Resume cursor: the last nextPageToken received. Null starts an initial connection. */
  readonly pageToken: string | null;
  /** Consecutive connections that ended without a response. A response resets it. */
  readonly failures: number;
  readonly lastFailure: StreamFailureReason | null;
}

export type StreamAction =
  | { readonly kind: "DELIVER"; readonly response: StreamResponse }
  | { readonly kind: "WAIT"; readonly delayMs: number };

export interface StreamStep {
  readonly state: StreamState;
  readonly actions: readonly StreamAction[];
}

/**
 * Reconnect delay after the given number of consecutive failures: initial × factor^(failures − 1), capped at the maximum.
 * A rate-limit answer uses at least the rate-limit floor. The intake never retries at the platform's polling rate.
 */
export function reconnectDelayMs(failures: number, reason: StreamFailureReason, config: YouTubeStreamConfig): number {
  const grown = config.reconnectInitialMs * config.reconnectFactor ** Math.max(0, failures - 1);
  const floor = reason === "rateLimitExceeded" ? config.rateLimitFloorMs : 0;
  return Math.min(config.reconnectMaxMs, Math.max(grown, floor));
}

/** Decides what one transport event means for the stream. It performs no I/O. */
export function reduceStream(state: StreamState, event: TransportEvent, config: YouTubeStreamConfig): StreamStep {
  switch (event.kind) {
    case "RESPONSE":
      return afterResponse(state, event.response);
    case "CLOSED":
      // A stream that closes without a reason is a dropped connection.
      return afterFailure(state, "network", config);
    case "FAILED":
      return afterFailure(state, event.reason, config);
  }
}

function afterResponse(state: StreamState, response: StreamResponse): StreamStep {
  const ended = response.offlineAt !== undefined;
  const pageToken = response.nextPageToken !== undefined && response.nextPageToken !== "" ? response.nextPageToken : state.pageToken;
  return {
    state: { phase: ended ? "ENDED" : "STREAMING", pageToken, failures: 0, lastFailure: null },
    actions: [{ kind: "DELIVER", response }],
  };
}

function stopWith(state: StreamState, phase: StreamPhase, reason: StreamFailureReason): StreamStep {
  return { state: { ...state, phase, lastFailure: reason }, actions: [] };
}

/** Keeps the platform's own reason in lastFailure, while the retry itself is handled under a generic category. */
function recordedAs(step: StreamStep, reason: StreamFailureReason): StreamStep {
  return { ...step, state: { ...step.state, lastFailure: reason } };
}

function afterFailure(state: StreamState, reason: StreamFailureReason, config: YouTubeStreamConfig): StreamStep {
  switch (reason) {
    case "liveChatEnded":
      return stopWith(state, "ENDED", reason);
    case "liveChatDisabled":
    case "liveChatNotFound":
      return stopWith(state, "CHAT_UNAVAILABLE", reason);
    case "forbidden":
      return stopWith(state, "PERMISSION_LOST", reason);
    case "quotaExceeded":
      return stopWith(state, "QUOTA_EXHAUSTED", reason);
    case "invalidArgument":
      return stopWith(state, "REQUEST_REJECTED", reason);
    case "pageTokenInvalid":
      // The cursor is dropped and the next connection is an initial one. Dedupe absorbs what it resends.
      if (state.pageToken === null) return recordedAs(retry(state, "unknown", config), reason);
      return { state: { ...state, phase: "BACKOFF", pageToken: null, lastFailure: reason }, actions: [{ kind: "WAIT", delayMs: 0 }] };
    case "rateLimitExceeded":
    case "network":
    case "unknown":
      return retry(state, reason, config);
  }
}

function retry(state: StreamState, reason: StreamFailureReason, config: YouTubeStreamConfig): StreamStep {
  const failures = state.failures + 1;
  if (failures >= config.maxConsecutiveFailures) {
    return { state: { ...state, phase: "GAVE_UP", failures, lastFailure: reason }, actions: [] };
  }
  const delayMs = reconnectDelayMs(failures, reason, config);
  return {
    state: { ...state, phase: "BACKOFF", failures, lastFailure: reason },
    actions: [{ kind: "WAIT", delayMs }],
  };
}

/** A message that the intake accepted for delivery, with its place in the delivery order. */
export interface AcceptedStreamMessage {
  readonly message: StreamMessage;
  /** Delivery order within this run. Starts at the run's first order and rises by one per accepted message. */
  readonly order: number;
  readonly receivedAtMs: number;
}

export interface MessageSink {
  deliver(accepted: AcceptedStreamMessage): void | Promise<void>;
}

/**
 * Quota gate in front of each connection. The quota monitor implements it. The default gate allows everything, so tests
 * and callers without a budget run the intake unchanged.
 */
export interface ConnectGate {
  /** False when the next connection would exceed the budget. The run then stops without connecting. */
  allowConnect(): boolean;
  /** Called once for each connection attempt that is made. */
  onConnect(): void;
  /** Called when the platform reports the quota as exhausted. */
  onQuotaExceeded(): void;
}

export const UNLIMITED_GATE: ConnectGate = {
  allowConnect: () => true,
  onConnect: () => undefined,
  onQuotaExceeded: () => undefined,
};

export interface StreamStats {
  readonly connections: number;
  readonly delivered: number;
  readonly duplicate: number;
  readonly staleReplay: number;
  readonly malformed: number;
}

export interface RunStreamListOptions {
  readonly liveChatId: string;
  readonly transport: StreamListTransport;
  readonly config: YouTubeStreamConfig;
  readonly dedupe: MessageIdStore;
  readonly sink: MessageSink;
  readonly gate?: ConnectGate;
  /** Cursor to resume from. Omitted or null starts an initial connection. */
  readonly resumeToken?: string | null;
  /** Order number of the first delivered message. Defaults to 1. */
  readonly firstOrder?: number;
  /** Epoch milliseconds. Defaults to the system clock. */
  readonly now?: () => number;
  /** Waits between connections. Defaults to setTimeout. Tests replace it so no time passes. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Checked after each event and before each connection. True stops the run in phase STOPPED. */
  readonly isStopRequested?: () => boolean;
}

export interface StreamRunResult {
  readonly phase: StreamPhase;
  readonly pageToken: string | null;
  readonly lastFailure: StreamFailureReason | null;
  /** The order number the next accepted message would get. Pass it as firstOrder to continue the sequence. */
  readonly nextOrder: number;
  readonly stats: StreamStats;
}

/**
 * Runs the intake until a terminal phase is reached. Inside a connection, each batch is parsed and checked in order: a
 * malformed item is dropped and counted, a repeated ID is a duplicate, a stale replay is not delivered, and every other
 * message goes to the sink once. The ID is claimed before the age check, so a stale message is never looked at again.
 */
export async function runStreamList(options: RunStreamListOptions): Promise<StreamRunResult> {
  const gate = options.gate ?? UNLIMITED_GATE;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const counters = { connections: 0, delivered: 0, duplicate: 0, staleReplay: 0, malformed: 0 };
  let order = options.firstOrder ?? 1;
  let state: StreamState = { phase: "CONNECTING", pageToken: options.resumeToken ?? null, failures: 0, lastFailure: null };
  let waitMs = 0;

  async function deliverBatch(response: StreamResponse): Promise<void> {
    for (const raw of response.items) {
      const message = parseStreamItem(raw);
      if (message === null) {
        counters.malformed += 1;
        continue;
      }
      if (claimMessageId(options.dedupe, message.platformMessageId) === "DUPLICATE") {
        counters.duplicate += 1;
        continue;
      }
      const nowMs = now();
      const replay = classifyReplay({ publishedAtMs: message.publishedAtMs, nowMs, replayMaxAgeMs: options.config.replayMaxAgeMs });
      if (replay === "STALE_REPLAY") {
        counters.staleReplay += 1;
        continue;
      }
      counters.delivered += 1;
      await options.sink.deliver({ message, order, receivedAtMs: nowMs });
      order += 1;
    }
  }

  /** Applies one event. Returns true when the connection must end: a wait is due, or the run is terminal. */
  async function applyEvent(event: TransportEvent): Promise<boolean> {
    if (event.kind === "FAILED" && event.reason === "quotaExceeded") gate.onQuotaExceeded();
    const step = reduceStream(state, event, options.config);
    state = step.state;
    for (const action of step.actions) {
      if (action.kind === "DELIVER") await deliverBatch(action.response);
      else waitMs = action.delayMs;
    }
    if (!isTerminalPhase(state.phase) && state.phase !== "BACKOFF" && options.isStopRequested?.() === true) {
      state = { ...state, phase: "STOPPED" };
    }
    return state.phase === "BACKOFF" || isTerminalPhase(state.phase);
  }

  for (;;) {
    if (options.isStopRequested?.() === true) {
      state = { ...state, phase: "STOPPED" };
      break;
    }
    if (!gate.allowConnect()) {
      state = { ...state, phase: "QUOTA_EXHAUSTED" };
      break;
    }
    gate.onConnect();
    counters.connections += 1;
    state = { ...state, phase: "CONNECTING" };

    let settled = false;
    for await (const event of options.transport.connect({ liveChatId: options.liveChatId, pageToken: state.pageToken })) {
      settled = await applyEvent(event);
      if (settled) break;
    }
    // The connection ended without an event, which is the same as a dropped connection.
    if (!settled) await applyEvent({ kind: "CLOSED" });

    if (state.phase === "BACKOFF") {
      await sleep(waitMs);
      continue;
    }
    break;
  }

  return {
    phase: state.phase,
    pageToken: state.pageToken,
    lastFailure: state.lastFailure,
    nextOrder: order,
    stats: { ...counters },
  };
}
