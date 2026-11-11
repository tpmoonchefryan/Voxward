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
    /** Super Chat comment: a string sets it, null leaves the comment out. Default: a synthetic comment. */
    readonly superChatComment?: string | null;
  } = {},
): Record<string, unknown> {
  const type = options.type ?? "textMessageEvent";
  const item: Record<string, unknown> = {
    kind: options.kind ?? "youtube#liveChatMessage",
    id,
    snippet: {
      type,
      publishedAt: options.publishedAt ?? NOW_ISO,
      ...detailsOf(type, id, options.superChatComment),
    },
  };
  if (options.omitAuthor !== true) {
    item.authorDetails = { channelId: `UC-synthetic-${id}`, displayName: `synthetic viewer ${id}`, ...options.author };
  }
  return item;
}

/**
 * The detail object the platform sends with each type, in the shape of the official resource. A Super Chat carries
 * superChatDetails and no textMessageDetails. Its userComment is present only when the viewer wrote a comment.
 */
function detailsOf(type: string, id: string, superChatComment: string | null | undefined): Record<string, unknown> {
  if (type !== "superChatEvent") return { textMessageDetails: { messageText: `synthetic text ${id}` } };
  const details: Record<string, unknown> = { amountMicros: "2000000", currency: "JPY", amountDisplayString: "¥2,000" };
  const comment = superChatComment === undefined ? `synthetic text ${id}` : superChatComment;
  if (comment !== null) details.userComment = comment;
  return { superChatDetails: details };
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
