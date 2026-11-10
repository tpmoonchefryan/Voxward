import { CONTRACT_VERSION, type DeliveryIntent, type OutputAdapter } from "@voxward/contracts";

/** Test handle: an output adapter that also exposes what it recorded. */
export interface SyntheticOutputAdapter extends OutputAdapter {
  delivered(): readonly DeliveryIntent[];
}

/** Records delivery intents in memory, in arrival order. */
export function createSyntheticOutputAdapter(): SyntheticOutputAdapter {
  const recorded: DeliveryIntent[] = [];
  return {
    moduleName: "OutputAdapter",
    contractVersion: CONTRACT_VERSION,
    async deliver(intent: DeliveryIntent): Promise<void> {
      recorded.push(intent);
    },
    delivered: () => [...recorded],
  };
}
