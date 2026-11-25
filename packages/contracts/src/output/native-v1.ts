import type { ScPayment } from "../events/sc-payment.js";

/**
 * Native read-only output protocol, version 1. A downstream consumer subscribes to one room with a revocable credential
 * and receives approved display events as JSON text messages. The consumer sends no content. Its only client messages are
 * WebSocket control messages (pong).
 */

/** Subprotocol the client offers and the server selects. The server never echoes the credential entry. */
export const NATIVE_OUTPUT_PROTOCOL = "vw-output.v1";

/** Version carried by every message. */
export const NATIVE_OUTPUT_VERSION = 1 as const;

/**
 * Prefix of the subprotocol entry that carries the credential, for example `vw-cred.vwo_...`. The credential never
 * travels in the URL query, and not in an Authorization header either, because browser WebSocket clients cannot set it.
 */
export const NATIVE_OUTPUT_CREDENTIAL_PREFIX = "vw-cred.";

/** The only WebSocket path. The room comes from the grant, so the client names no room. */
export const NATIVE_OUTPUT_PATH = "/output/v1/room";

/** Values an output grant must carry. They match the scope CHECK in the schema. The kind names this protocol. */
export const NATIVE_OUTPUT_KIND = "NATIVE_V1";
export const NATIVE_OUTPUT_SCOPE = "ROOM_READ_ONLY";

/** Heartbeat settings in milliseconds (自定, not measured). */
export const NATIVE_OUTPUT_HEARTBEAT_MS = 15_000;
export const NATIVE_OUTPUT_PONG_TIMEOUT_MS = 10_000;

/** Close codes in the application range. Each code has one fixed reason text, and no other text is ever sent. */
export const NATIVE_CLOSE = {
  CLIENT_DATA_NOT_ACCEPTED: { code: 4400, reason: "CLIENT_DATA_NOT_ACCEPTED" },
  GRANT_REVOKED: { code: 4403, reason: "GRANT_REVOKED" },
  HEARTBEAT_TIMEOUT: { code: 4408, reason: "HEARTBEAT_TIMEOUT" },
  SUBSCRIBER_BACKPRESSURE: { code: 4413, reason: "SUBSCRIBER_BACKPRESSURE" },
} as const;

export type NativeClose = (typeof NATIVE_CLOSE)[keyof typeof NATIVE_CLOSE];

export interface HelloFrame {
  readonly type: "HELLO";
  readonly version: typeof NATIVE_OUTPUT_VERSION;
  readonly protocol: typeof NATIVE_OUTPUT_PROTOCOL;
  readonly heartbeatMs: number;
}

/**
 * Display content of an ALLOW delivery. The output does not guess a subject alias.
 */
export interface DisplayPayload {
  readonly label: string | null;
  readonly text: string;
  readonly translation: string | null;
  readonly payment?: ScPayment;
  readonly amountDisplay?: string;
}

interface DeliveryFields {
  readonly version: typeof NATIVE_OUTPUT_VERSION;
  /** Stable identifier of one delivery row. Consumers deduplicate by it. */
  readonly deliveryId: string;
  readonly deliverySequence: number;
  readonly platformOrder: number;
  readonly validUntil: string;
}

/** ALLOW: the approved text, shown until `validUntil`. */
export interface DeliverFrame extends DeliveryFields {
  readonly type: "DELIVER";
  readonly display: DisplayPayload;
}

/** BLOCK: a stage event with no original text, no translation and no identity. */
export interface WardBlockedFrame extends DeliveryFields {
  readonly type: "WARD_BLOCKED";
}

export type NativeFrame = HelloFrame | DeliverFrame | WardBlockedFrame;

/** Required keys. DISPLAY may additionally carry payment and amountDisplay. */
export const NATIVE_FRAME_FIELDS = {
  HELLO: ["type", "version", "protocol", "heartbeatMs"],
  DELIVER: ["type", "version", "deliveryId", "deliverySequence", "platformOrder", "validUntil", "display"],
  WARD_BLOCKED: ["type", "version", "deliveryId", "deliverySequence", "platformOrder", "validUntil"],
  DISPLAY: ["label", "text", "translation"],
} as const;
