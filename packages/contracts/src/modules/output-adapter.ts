import type { DeliveryIntent } from "../delivery/delivery-intent.js";
import type { VersionedModule } from "./module-contract.js";

/** Converts an approved delivery intent into one downstream protocol. Never collects upstream chat. */
export interface OutputAdapter extends VersionedModule<"OutputAdapter"> {
  deliver(intent: DeliveryIntent): Promise<void>;
}
