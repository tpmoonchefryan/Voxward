import type { Verdict } from "../decisions/verdict.js";
import type { DeliveryIntent } from "../delivery/delivery-intent.js";
import type { TaskRef } from "../tasks/task-ref.js";
import type { VersionedModule } from "./module-contract.js";

/**
 * Manual operations, version checks, transactions and delivery intents.
 * The actor reference is checked for permission; a stale generation is rejected.
 */
export interface DecisionService extends VersionedModule<"DecisionService"> {
  commit(task: TaskRef, verdict: Verdict, actorRef: string): Promise<DeliveryIntent>;
}
