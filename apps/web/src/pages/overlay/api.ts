import {
  NATIVE_CLOSE,
  NATIVE_OUTPUT_CREDENTIAL_PREFIX,
  NATIVE_OUTPUT_PATH,
  NATIVE_OUTPUT_PROTOCOL,
  type DeliverFrame,
  type NativeFrame,
  type WardBlockedFrame,
} from "@voxward/contracts";

export const SAFE_ANONYMOUS_ALIAS = "匿名观众";

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
export function parseOverlayCredential(loc: LocationLike): CredentialParseResult {
  const params = new URLSearchParams(loc.search.startsWith("?") ? loc.search.slice(1) : loc.search);
  for (const key of FORBIDDEN_QUERY_KEYS) {
    if (params.has(key)) {
      return {
        ok: false,
        errorCode: "QUERY_CREDENTIAL_REJECTED",
        message: "安全策略拒绝（Q16）：禁止通过 URL 查询参数（?cred= / ?token=）传递凭据，请使用 URL Fragment（#vwo_...）。",
      };
    }
  }

  const rawHash = loc.hash.startsWith("#") ? loc.hash.slice(1).trim() : loc.hash.trim();
  if (rawHash === "") {
    return {
      ok: false,
      errorCode: "MISSING_CREDENTIAL",
      message: "未在 URL Fragment 中检测到只读输出凭据（#vwo_... 或 #cred=vwo_...）。",
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
      message: "URL Fragment 中的输出凭据格式无效，已拒绝连接。",
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

export function reduceStageFrame(state: StageState, frame: NativeFrame, nowMs = Date.now()): StageState {
  const pruned = pruneExpiredStageItems(state, nowMs);

  if (frame.type === "HELLO") {
    return {
      ...pruned,
      connectionStatus: "connected",
      heartbeatMs: frame.heartbeatMs,
      reconnectAttempt: 0,
      statusMessage: "已连接只读输出通道（vw-output.v1）",
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

export function closeMessageFor(code: number): string {
  switch (code) {
    case NATIVE_CLOSE.GRANT_REVOKED.code:
      return "输出凭据已被撤销（4403），已停止重连。请在管理后台重新签发凭据。";
    case NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED.code:
      return "连接因协议错误关闭（4400：只读端不可发送数据帧），已停止重连。";
    case NATIVE_CLOSE.HEARTBEAT_TIMEOUT.code:
      return "心跳超时（4408），正在尝试指数退避重连…";
    case NATIVE_CLOSE.SUBSCRIBER_BACKPRESSURE.code:
      return "消费端背压超时（4413），正在尝试指数退避重连…";
    default:
      return "连接已断开，正在尝试指数退避重连…";
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
