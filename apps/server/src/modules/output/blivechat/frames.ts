import type { DeliverFrame, WardBlockedFrame } from "@voxward/contracts";

/** Versioned blivechat-compatible JSON WebSocket protocol identifier. */
export const BLIVECHAT_PROTOCOL_VERSION = "blivechat-v1.x-json-ws" as const;

/** WebSocket upgrade path for the blivechat-compatible read-only output endpoint. */
export const BLIVECHAT_OUTPUT_PATH = "/output/blivechat/v1/chat" as const;

/** Numeric command codes for the blivechat-v1.x-json-ws JSON command frames. */
export const BLIVECHAT_CMD = {
  JOIN_ROOM: 1,
  HEARTBEAT: 2,
  HEARTBEAT_REPLY: 3,
  ADD_TEXT: 10,
  ADD_SUPER_CHAT: 12,
} as const;

export interface BlivechatJoinRoomFrame {
  readonly cmd: typeof BLIVECHAT_CMD.JOIN_ROOM;
  readonly data?: {
    readonly roomId?: string | number;
  };
}

export interface BlivechatHeartbeatFrame {
  readonly cmd: typeof BLIVECHAT_CMD.HEARTBEAT;
}

export interface BlivechatHeartbeatReplyFrame {
  readonly cmd: typeof BLIVECHAT_CMD.HEARTBEAT_REPLY;
  readonly data: {
    readonly protocol: typeof BLIVECHAT_PROTOCOL_VERSION;
    readonly timestamp: string;
  };
}

export interface BlivechatAddTextFrame {
  readonly cmd: typeof BLIVECHAT_CMD.ADD_TEXT;
  readonly data: {
    readonly id: string;
    readonly authorName: string;
    readonly content: string;
    readonly translation: string | null;
    readonly timestamp: string;
    readonly privilegeType: 0;
  };
}

export interface BlivechatAddSuperChatFrame {
  readonly cmd: typeof BLIVECHAT_CMD.ADD_SUPER_CHAT;
  readonly data: {
    readonly id: string;
    readonly authorName: string;
    readonly content: string;
    readonly translation: string | null;
    readonly price: number;
    readonly timestamp: string;
  };
}

export type BlivechatServerFrame =
  | BlivechatHeartbeatReplyFrame
  | BlivechatAddTextFrame
  | BlivechatAddSuperChatFrame;

export function heartbeatReplyFrame(timestamp: string): BlivechatHeartbeatReplyFrame {
  return {
    cmd: BLIVECHAT_CMD.HEARTBEAT_REPLY,
    data: {
      protocol: BLIVECHAT_PROTOCOL_VERSION,
      timestamp,
    },
  };
}

/**
 * Maps an approved VoxWard DeliverFrame into a blivechat ADD_TEXT frame.
 * Never exposes stable user IDs, internal scores, audit metadata, or moderation reasons.
 */
export function mapDeliverToAddText(frame: DeliverFrame, timestamp: string): BlivechatAddTextFrame {
  return {
    cmd: BLIVECHAT_CMD.ADD_TEXT,
    data: {
      id: frame.deliveryId,
      authorName: frame.display.label ?? "",
      content: frame.display.text,
      translation: frame.display.translation,
      timestamp,
      privilegeType: 0,
    },
  };
}

/**
 * Maps an approved VoxWard DeliverFrame into a blivechat ADD_SUPER_CHAT frame.
 * Never exposes stable user IDs, internal scores, audit metadata, or moderation reasons.
 */
export function mapDeliverToSuperChat(
  frame: DeliverFrame,
  timestamp: string,
  price = 0,
): BlivechatAddSuperChatFrame {
  return {
    cmd: BLIVECHAT_CMD.ADD_SUPER_CHAT,
    data: {
      id: frame.deliveryId,
      authorName: frame.display.label ?? "",
      content: frame.display.text,
      translation: frame.display.translation,
      price,
      timestamp,
    },
  };
}

/**
 * WARD_BLOCKED carries no original text or identity. Because blivechat overlays have no native
 * non-leaking blocked-stage frame, WARD_BLOCKED is safely ignored (returns null).
 */
export function mapWardBlockedToBlivechat(_frame: WardBlockedFrame): null {
  return null;
}
