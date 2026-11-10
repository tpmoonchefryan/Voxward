import type { ChannelEvent, ScoreSubjectState } from "@voxward/contracts";

/** Deterministic pseudo-random numbers for synthetic data. The same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export interface EventOptions {
  readonly channelId?: string;
  readonly messageId?: string;
  readonly senderRef?: string;
  readonly receivedAt?: string;
}

/** A synthetic channel event. Nothing here comes from a real platform. */
export function makeEvent(options: EventOptions = {}): ChannelEvent {
  const messageId = options.messageId ?? "msg-1";
  return {
    contractVersion: "1",
    platform: "synthetic",
    channelId: options.channelId ?? "channel-a",
    platformMessageId: messageId,
    platformOrder: 1,
    receivedAt: options.receivedAt ?? "2026-11-10T10:00:00.000Z",
    correlationId: `corr-${messageId}`,
    body: "synthetic message",
    sender: { contractVersion: "1", senderRef: options.senderRef ?? "sender-1" },
  };
}

export function makeState(overrides: Partial<ScoreSubjectState> = {}): ScoreSubjectState {
  return {
    subjectRef: "subject-test",
    identityKind: "UNKNOWN",
    identityBaseScore: 0,
    behaviorAdjustTotal: 0,
    currentScore: 0,
    version: 0,
    lastRewardAt: null,
    exceptionActive: false,
    ...overrides,
  };
}
