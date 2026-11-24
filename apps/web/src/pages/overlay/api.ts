import {
  NATIVE_CLOSE,
  NATIVE_OUTPUT_CREDENTIAL_PREFIX,
  NATIVE_OUTPUT_PATH,
  NATIVE_OUTPUT_PROTOCOL,
  type DeliverFrame,
  type NativeFrame,
  type WardBlockedFrame,
} from "@voxward/contracts";
import { DEFAULT_VOXWARD_LOCALE, OVERLAY_COPY, pickLocale, type VoxWardLocale } from "../../i18n";

export function safeAnonymousAliasFor(locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE): string {
  return pickLocale(
    {
      en: "Viewer",
      "zh-CN": "匿名观众",
      ja: "匿名視聴者",
      ko: "익명 시청자",
      fr: "Spectateur",
    },
    locale,
  );
}

export const SAFE_ANONYMOUS_ALIAS = safeAnonymousAliasFor(DEFAULT_VOXWARD_LOCALE);

const CREDENTIAL_PATTERN = /^vwo_[A-Za-z0-9_-]{8,}$/;
const FORBIDDEN_QUERY_KEYS = ["cred", "token", "credential"] as const;

export type CredentialParseResult =
  | {
      readonly ok: true;
      readonly credential: string;
      readonly cleanedUrl: string;
    }
  | {
      readonly ok: false;
      readonly errorCode: "QUERY_CREDENTIAL_REJECTED" | "MISSING_CREDENTIAL" | "INVALID_CREDENTIAL";
      readonly message: string;
    };

export interface LocationLike {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

/**
 * Extracts the read-only output credential strictly from the URL fragment (`#vwo_...` or `#cred=vwo_...`).
 * Query parameters (`?cred=`, `?token=`, `?credential=`) are explicitly rejected per Q16 so credentials never
 * travel in HTTP request lines or server access logs.
 */
export function parseOverlayCredential(
  loc: LocationLike,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): CredentialParseResult {
  const copy = pickLocale(OVERLAY_COPY, locale).parseErrors;
  const params = new URLSearchParams(loc.search.startsWith("?") ? loc.search.slice(1) : loc.search);
  for (const key of FORBIDDEN_QUERY_KEYS) {
    if (params.has(key)) {
      return {
        ok: false,
        errorCode: "QUERY_CREDENTIAL_REJECTED",
        message: copy.queryRejected,
      };
    }
  }

  const rawHash = loc.hash.startsWith("#") ? loc.hash.slice(1).trim() : loc.hash.trim();
  if (rawHash === "") {
    return {
      ok: false,
      errorCode: "MISSING_CREDENTIAL",
      message: copy.missing,
    };
  }

  let candidate = rawHash;
  if (rawHash.includes("=")) {
    const hashParams = new URLSearchParams(rawHash);
    candidate = hashParams.get("cred") ?? "";
  }

  if (!CREDENTIAL_PATTERN.test(candidate)) {
    return {
      ok: false,
      errorCode: "INVALID_CREDENTIAL",
      message: copy.invalid,
    };
  }

  return {
    ok: true,
    credential: candidate,
    cleanedUrl: `${loc.pathname}${loc.search}`,
  };
}

export function buildOverlayWsUrl(loc: { readonly protocol: string; readonly host: string }): string {
  const wsProtocol = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${loc.host}${NATIVE_OUTPUT_PATH}`;
}

export function buildOverlaySubprotocols(credential: string): [string, string] {
  return [NATIVE_OUTPUT_PROTOCOL, `${NATIVE_OUTPUT_CREDENTIAL_PREFIX}${credential}`];
}

export interface ActiveDeliverItem {
  readonly deliveryId: string;
  readonly deliverySequence: number;
  readonly platformOrder: number;
  readonly validUntil: string;
  readonly validUntilMs: number;
  readonly label: string | null;
  readonly text: string;
  readonly translation: string | null;
}

export interface WardBlockedEvent {
  readonly deliveryId: string;
  readonly deliverySequence: number;
  readonly platformOrder: number;
  readonly validUntil: string;
  readonly validUntilMs: number;
}

export type OverlayConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "revoked"
  | "rejected"
  | "closed";

export interface StageState {
  readonly connectionStatus: OverlayConnectionStatus;
  readonly heartbeatMs: number | null;
  readonly reconnectAttempt: number;
  readonly statusMessage: string | null;
  readonly seenDeliveryIds: ReadonlySet<string>;
  readonly activeDeliveries: readonly ActiveDeliverItem[];
  readonly activeWard: WardBlockedEvent | null;
  readonly wardTriggerCount: number;
}

export function createInitialStageState(status: OverlayConnectionStatus = "idle", statusMessage: string | null = null): StageState {
  return {
    connectionStatus: status,
    heartbeatMs: null,
    reconnectAttempt: 0,
    statusMessage,
    seenDeliveryIds: new Set(),
    activeDeliveries: [],
    activeWard: null,
    wardTriggerCount: 0,
  };
}

export function pruneExpiredStageItems(state: StageState, nowMs = Date.now()): StageState {
  const nextDeliveries = state.activeDeliveries.filter((item) => item.validUntilMs > nowMs);
  const nextWard = state.activeWard !== null && state.activeWard.validUntilMs > nowMs ? state.activeWard : null;
  if (nextDeliveries.length === state.activeDeliveries.length && nextWard === state.activeWard) {
    return state;
  }
  return {
    ...state,
    activeDeliveries: nextDeliveries,
    activeWard: nextWard,
  };
}

function toDeliverItem(frame: DeliverFrame, validUntilMs: number): ActiveDeliverItem {
  return {
    deliveryId: frame.deliveryId,
    deliverySequence: frame.deliverySequence,
    platformOrder: frame.platformOrder,
    validUntil: frame.validUntil,
    validUntilMs,
    label: frame.display.label,
    text: frame.display.text,
    translation: frame.display.translation,
  };
}

function toWardEvent(frame: WardBlockedFrame, validUntilMs: number): WardBlockedEvent {
  return {
    deliveryId: frame.deliveryId,
    deliverySequence: frame.deliverySequence,
    platformOrder: frame.platformOrder,
    validUntil: frame.validUntil,
    validUntilMs,
  };
}

export function reduceStageFrame(
  state: StageState,
  frame: NativeFrame,
  nowMs = Date.now(),
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): StageState {
  const pruned = pruneExpiredStageItems(state, nowMs);

  if (frame.type === "HELLO") {
    return {
      ...pruned,
      connectionStatus: "connected",
      heartbeatMs: frame.heartbeatMs,
      reconnectAttempt: 0,
      statusMessage: pickLocale(OVERLAY_COPY, locale).connectedStatus,
    };
  }

  const validUntilMs = Date.parse(frame.validUntil);
  if (Number.isNaN(validUntilMs) || validUntilMs <= nowMs) {
    return pruned;
  }
  if (pruned.seenDeliveryIds.has(frame.deliveryId)) {
    return pruned;
  }

  const nextSeen = new Set(pruned.seenDeliveryIds);
  nextSeen.add(frame.deliveryId);

  if (frame.type === "DELIVER") {
    return {
      ...pruned,
      seenDeliveryIds: nextSeen,
      activeDeliveries: [...pruned.activeDeliveries, toDeliverItem(frame, validUntilMs)],
    };
  }

  // WARD_BLOCKED: retract any active DELIVER sharing the same platformOrder and never store text or identity.
  return {
    ...pruned,
    seenDeliveryIds: nextSeen,
    activeDeliveries: pruned.activeDeliveries.filter((item) => item.platformOrder !== frame.platformOrder),
    activeWard: toWardEvent(frame, validUntilMs),
    wardTriggerCount: pruned.wardTriggerCount + 1,
  };
}

export function isTerminalCloseCode(code: number): boolean {
  return code === NATIVE_CLOSE.GRANT_REVOKED.code || code === NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED.code;
}

export function reconnectDelayMs(attempt: number, baseMs = 1_000, maxMs = 30_000): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
}

export function closeMessageFor(code: number, locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE): string {
  const msgs = pickLocale(OVERLAY_COPY, locale).closeMessages;
  switch (code) {
    case NATIVE_CLOSE.GRANT_REVOKED.code:
      return msgs["4403"]!;
    case NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED.code:
      return msgs["4400"]!;
    case NATIVE_CLOSE.HEARTBEAT_TIMEOUT.code:
      return msgs["4408"]!;
    case NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE.code:
      return msgs["4413"]!;
    default:
      return msgs.default!;
  }
}

export function parseNativeFrameJson(raw: string): NativeFrame | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return null;
    const candidate = parsed as { type?: unknown };
    if (candidate.type === "HELLO" || candidate.type === "DELIVER" || candidate.type === "WARD_BLOCKED") {
      return parsed as NativeFrame;
    }
    return null;
  } catch {
    return null;
  }
}
