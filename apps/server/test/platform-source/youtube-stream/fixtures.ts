/**
 * Synthetic helpers for the streamList tests. Every value is made up. No test here reaches the network or a platform.
 */
import {
  type AcceptedStreamMessage,
  type MessageSink,
  type StreamFailureReason,
  type StreamListTransport,
  type TransportEvent,
} from "../../../src/modules/platform-source/youtube/stream-list.js";

export const NOW_ISO = "2026-11-10T12:00:00.000Z";
export const NOW_MS = Date.parse(NOW_ISO);
export const LIVE_CHAT_ID = "synthetic-live-chat-0001";

/** An official-shaped liveChatMessage item. The options replace the defaults for one test. */
export function chatItem(
  id: string,
  options: {
    readonly publishedAt?: string;
    readonly type?: string;
    readonly kind?: string;
    readonly author?: Readonly<Record<string, unknown>>;
    readonly omitAuthor?: boolean;
  } = {},
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    kind: options.kind ?? "youtube#liveChatMessage",
    id,
    snippet: {
      type: options.type ?? "textMessageEvent",
      publishedAt: options.publishedAt ?? NOW_ISO,
      textMessageDetails: { messageText: `synthetic text ${id}` },
    },
  };
  if (options.omitAuthor !== true) {
    item.authorDetails = { channelId: `UC-synthetic-${id}`, displayName: `synthetic viewer ${id}`, ...options.author };
  }
  return item;
}

export function minutesBefore(minutes: number): string {
  return new Date(NOW_MS - minutes * 60_000).toISOString();
}

export function response(items: readonly unknown[], extra: { readonly nextPageToken?: string; readonly offlineAt?: string } = {}): TransportEvent {
  return { kind: "RESPONSE", response: { items, ...extra } };
}

export function failed(reason: StreamFailureReason): TransportEvent {
  return { kind: "FAILED", reason };
}

export interface ScriptedTransport extends StreamListTransport {
  /** The page token each connection was opened with, in order. Null means an initial connection. */
  readonly requests: (string | null)[];
}

/** One array of events per connection. A connection with no events ends without a reason. */
export function scriptedTransport(connections: readonly (readonly TransportEvent[])[]): ScriptedTransport {
  const requests: (string | null)[] = [];
  let index = 0;
  return {
    requests,
    connect(request) {
      requests.push(request.pageToken);
      const events = connections[index] ?? [];
      index += 1;
      return (async function* scripted() {
        for (const event of events) yield event;
      })();
    },
  };
}

export function recordingSink(): { readonly sink: MessageSink; readonly accepted: AcceptedStreamMessage[] } {
  const accepted: AcceptedStreamMessage[] = [];
  return {
    sink: {
      deliver(message) {
        accepted.push(message);
      },
    },
    accepted,
  };
}

export function recordingSleep(): { readonly sleep: (ms: number) => Promise<void>; readonly delays: number[] } {
  const delays: number[] = [];
  return {
    sleep: async (ms) => {
      delays.push(ms);
    },
    delays,
  };
}

export const idsOf = (accepted: readonly AcceptedStreamMessage[]): string[] => accepted.map((entry) => entry.message.platformMessageId);
