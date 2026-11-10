import type { Verdict } from "../decisions/verdict.js";
import type { ChannelEvent } from "../events/channel-event.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface ScoreChange extends Versioned {
  readonly subjectRef: string;
  readonly delta: number;
  readonly idempotencyKey: string;
}

/**
 * Base score, cooldown, clamping, idempotency and manual correction.
 * Input is a verdict, never a score written by a model. Does not share subjects across channels.
 */
export interface ScoringEngine extends VersionedModule<"ScoringEngine"> {
  applyVerdict(event: ChannelEvent, verdict: Verdict): Promise<ScoreChange>;
}
