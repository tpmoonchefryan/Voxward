import type { EventRef } from "../events/channel-event.js";
import type { DownstreamVerdict } from "../decisions/verdict.js";
import type { Versioned } from "../version.js";

/** Instruction to deliver one event verdict downstream, in order, until `validUntil`. */
export interface DeliveryIntent extends Versioned {
  readonly eventRef: EventRef;
  readonly verdict: DownstreamVerdict;
  readonly platformOrder: number;
  readonly deliverySequence: number;
  readonly validUntil: string;
}
