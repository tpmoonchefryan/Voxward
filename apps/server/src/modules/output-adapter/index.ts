import { CONTRACT_VERSION, type OutputAdapter } from "@voxward/contracts";

export interface OutputAdapterOptions {
  /** Wakes the sender for one channel. The server binding sets it. */
  readonly wake?: (channelId: string) => void;
}

/**
 * The OutputAdapter contract. DecisionService writes the verdict and its PENDING delivery row in one transaction, so the
 * delivery table is the queue. `deliver` does not write a second copy of the intent. It wakes the sender for the intent's
 * channel.
 */
export function createOutputAdapter(options: OutputAdapterOptions = {}): OutputAdapter {
  return {
    moduleName: "OutputAdapter",
    contractVersion: CONTRACT_VERSION,
    async deliver(intent) {
      options.wake?.(intent.eventRef.channelId);
    },
  };
}

export { blockedFrame, deliverFrame, frameFor, helloFrame } from "./native-protocol.js";
export { createDeliveryPump, type DeliveryPump, type DeliveryPumpOptions, type PassReport } from "./delivery.js";
export { RESEND_CONTRACT, decideSend, type SendDecision } from "./resend.js";
export { createSubscriptionRegistry } from "./subscription.js";
