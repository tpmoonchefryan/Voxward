import type { Versioned } from "../version.js";
import type { ScPayment } from "./sc-payment.js";

/** Opaque sender reference. Platform profile data never crosses the contract. */
export interface SenderRef extends Versioned {
  readonly senderRef: string;
}

/** Stable reference to one channel event. */
export interface EventRef extends Versioned {
  readonly channelId: string;
  readonly platformMessageId: string;
  readonly correlationId: string;
}

/** Normalized channel event. `receivedAt` is an ISO 8601 UTC timestamp. */
export interface ChannelEvent extends Versioned {
  readonly platform: string;
  readonly channelId: string;
  readonly platformMessageId: string;
  readonly platformOrder: number;
  readonly receivedAt: string;
  readonly correlationId: string;
  readonly body: string;
  readonly language?: string;
  readonly scPayment?: ScPayment;
  readonly sender: SenderRef;
}
