/**
 * Business events for the moderation pipeline (design.md, section 6). An accepted stream message becomes a versioned
 * ChannelEvent. The platform's raw item never crosses into the pipeline. The composition layer derives the sender
 * reference from the platform channel ID, so the platform ID does not reach the contract.
 */
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { type IdentityObservation, observeIdentity, type IdentityTracker, type PlatformIdentityChange } from "./identity.js";
import { type AcceptedStreamMessage } from "./stream-list.js";

export interface ChannelMessageEvent {
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly kind: "CHANNEL_MESSAGE";
  readonly event: ChannelEvent;
  readonly identity: IdentityObservation;
}

export interface BusinessEventDeps {
  /** Internal channel ID that the event belongs to. Supplied by composition. */
  readonly channelId: string;
  /** Derives the opaque sender reference from the platform channel ID, for example with a keyed hash. Supplied by composition. */
  readonly senderRefOf: (platformChannelId: string) => string;
  /** Correlation ID source. */
  readonly newId: () => string;
  readonly identities: IdentityTracker;
}

export interface BusinessOutput {
  readonly message: ChannelMessageEvent;
  /** Set only when this message shows a certain identity that differs from the last one recorded for the subject. */
  readonly identityChange: PlatformIdentityChange | null;
}

export function toBusinessEvent(accepted: AcceptedStreamMessage, deps: BusinessEventDeps): BusinessOutput {
  const { message } = accepted;
  const senderRef = deps.senderRefOf(message.authorChannelId);
  const identity = observeIdentity(message.authorFlags);
  const event: ChannelEvent = {
    contractVersion: CONTRACT_VERSION,
    platform: "youtube",
    channelId: deps.channelId,
    platformMessageId: message.platformMessageId,
    platformOrder: accepted.order,
    receivedAt: new Date(accepted.receivedAtMs).toISOString(),
    correlationId: deps.newId(),
    body: message.text ?? "",
    sender: { contractVersion: CONTRACT_VERSION, senderRef },
  };
  const identityChange = deps.identities.observe({
    channelId: deps.channelId,
    subjectKey: senderRef,
    observation: identity,
    sourceEventRef: `youtube:${message.platformMessageId}`,
    effectiveFrom: new Date(message.publishedAtMs).toISOString(),
  });
  return {
    message: { contractVersion: CONTRACT_VERSION, kind: "CHANNEL_MESSAGE", event, identity },
    identityChange,
  };
}
