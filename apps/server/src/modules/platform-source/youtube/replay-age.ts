/**
 * Replay classification (design.md, section 5). The platform resends recent chat history on connect and on resume. A
 * message the intake has not seen before is still a stale replay when it was published further back than the replay
 * limit, so an old card is never delivered again. The same rule applies on every connection. A message inside the
 * limit is live and is delivered once.
 */
export type ReplayClass = "LIVE" | "STALE_REPLAY";

export interface ReplayInput {
  readonly publishedAtMs: number;
  readonly nowMs: number;
  readonly replayMaxAgeMs: number;
}

/** A message whose age equals the limit is still live. Only an older one is stale. A future timestamp is live. */
export function classifyReplay(input: ReplayInput): ReplayClass {
  return input.nowMs - input.publishedAtMs > input.replayMaxAgeMs ? "STALE_REPLAY" : "LIVE";
}
