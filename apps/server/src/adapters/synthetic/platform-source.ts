import {
  CONTRACT_VERSION,
  type ChannelEvent,
  type PlatformSource,
  type SourceBatch,
} from "@voxward/contracts";

const SYNTHETIC_EVENT: ChannelEvent = {
  contractVersion: CONTRACT_VERSION,
  platform: "synthetic",
  channelId: "synthetic-channel",
  platformMessageId: "synthetic-message-1",
  platformOrder: 1,
  receivedAt: "2026-01-01T00:00:00.000Z",
  correlationId: "synthetic-correlation-1",
  body: "synthetic message body",
  sender: { contractVersion: CONTRACT_VERSION, senderRef: "synthetic-sender-1" },
};

/** Emits one fixed event for a fresh cursor. Cursor "1" marks it consumed, so later calls return nothing. */
export function createSyntheticPlatformSource(): PlatformSource {
  return {
    moduleName: "PlatformSource",
    contractVersion: CONTRACT_VERSION,
    async fetchAfter(cursor: string | null, limit: number): Promise<SourceBatch> {
      const events = cursor === null && limit > 0 ? [SYNTHETIC_EVENT] : [];
      return { contractVersion: CONTRACT_VERSION, events, nextCursor: "1" };
    },
  };
}
