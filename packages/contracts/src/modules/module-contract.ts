import type { Versioned } from "../version.js";

export const MODULE_NAMES = [
  "PlatformSource",
  "ModerationEngine",
  "ScoringEngine",
  "InferenceProvider",
  "TaskCoordinator",
  "DecisionService",
  "OutputAdapter",
  "DataLifecycleService",
  "AuditStore",
] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];

/** Every module interface exposes its name and the contract version it implements. */
export interface VersionedModule<Name extends ModuleName> extends Versioned {
  readonly moduleName: Name;
}
