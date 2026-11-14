import { NATIVE_CLOSE, type NativeClose, type NativeFrame } from "@voxward/contracts";
import {
  BLIVECHAT_CMD,
  heartbeatReplyFrame,
  mapDeliverToAddText,
  mapWardBlockedToBlivechat,
  type BlivechatServerFrame,
} from "./frames.js";

export type BlivechatClientAction =
  | { readonly kind: "joined" }
  | { readonly kind: "reply"; readonly frame: BlivechatServerFrame }
  | { readonly kind: "reject"; readonly close: NativeClose };

export interface BlivechatSession {
  isJoined(): boolean;
  handleClientMessage(raw: string, nowIso: string): BlivechatClientAction;
  mapNativeFrame(frame: NativeFrame, nowIso: string): BlivechatServerFrame | null;
}

export interface BlivechatProtocolAdapter {
  createSession(): BlivechatSession;
}

/**
 * Pure protocol state machine for a single blivechat-v1.x-json-ws connection.
 * Read-only: only JOIN_ROOM and HEARTBEAT control commands are accepted from the client.
 */
export function createBlivechatAdapter(): BlivechatProtocolAdapter {
  return {
    createSession(): BlivechatSession {
      let joined = false;

      return {
        isJoined() {
          return joined;
        },

        handleClientMessage(raw: string, nowIso: string): BlivechatClientAction {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return { kind: "reject", close: NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED };
          }
          if (typeof parsed !== "object" || parsed === null || !("cmd" in parsed)) {
            return { kind: "reject", close: NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED };
          }
          const cmd = (parsed as { cmd: unknown }).cmd;
          if (cmd === BLIVECHAT_CMD.JOIN_ROOM) {
            joined = true;
            return { kind: "joined" };
          }
          if (cmd === BLIVECHAT_CMD.HEARTBEAT) {
            return { kind: "reply", frame: heartbeatReplyFrame(nowIso) };
          }
          return { kind: "reject", close: NATIVE_CLOSE.CLIENT_DATA_NOT_ACCEPTED };
        },

        mapNativeFrame(frame: NativeFrame, nowIso: string): BlivechatServerFrame | null {
          if (!joined) return null;
          if (frame.type === "DELIVER") {
            return mapDeliverToAddText(frame, nowIso);
          }
          if (frame.type === "WARD_BLOCKED") {
            return mapWardBlockedToBlivechat(frame);
          }
          return null;
        },
      };
    },
  };
}
