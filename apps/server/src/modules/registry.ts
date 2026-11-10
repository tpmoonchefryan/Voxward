import type {
  AuditStore,
  DataLifecycleService,
  DecisionService,
  InferenceProvider,
  ModerationEngine,
  OutputAdapter,
  PlatformSource,
  ScoringEngine,
  TaskCoordinator,
} from "@voxward/contracts";
import { createSyntheticInferenceProvider } from "../adapters/synthetic/inference-provider.js";
import { createSyntheticOutputAdapter } from "../adapters/synthetic/output-adapter.js";
import { createSyntheticPlatformSource } from "../adapters/synthetic/platform-source.js";
import type { ServerConfig } from "../config/schema.js";
import { createAuditStore } from "./audit-store/index.js";
import { createDataLifecycleService } from "./data-lifecycle-service/index.js";
import { createDecisionService } from "./decision-service/index.js";
import { createModerationEngine } from "./moderation-engine/index.js";
import { createScoringEngine } from "./scoring-engine/index.js";
import { createTaskCoordinator } from "./task-coordinator/index.js";

/** The nine module interfaces, each bound to one implementation. */
export interface ModuleRegistry {
  readonly platformSource: PlatformSource;
  readonly moderationEngine: ModerationEngine;
  readonly scoringEngine: ScoringEngine;
  readonly inferenceProvider: InferenceProvider;
  readonly taskCoordinator: TaskCoordinator;
  readonly decisionService: DecisionService;
  readonly outputAdapter: OutputAdapter;
  readonly dataLifecycleService: DataLifecycleService;
  readonly auditStore: AuditStore;
}

/** Bindings that stand in for external systems. Chosen by configuration, or injected by tests. */
export type AdapterBindings = Pick<ModuleRegistry, "platformSource" | "inferenceProvider" | "outputAdapter">;

/** Returns the adapter set named by configuration. S001 provides only the synthetic set. */
export function bindingsFor(config: ServerConfig): AdapterBindings {
  switch (config.adapters) {
    case "synthetic":
      return {
        platformSource: createSyntheticPlatformSource(),
        inferenceProvider: createSyntheticInferenceProvider(),
        outputAdapter: createSyntheticOutputAdapter(),
      };
  }
}

/** Builds the registry. The six modules without an adapter get placeholder implementations. */
export function buildRegistry(config: ServerConfig, overrides: Partial<AdapterBindings> = {}): ModuleRegistry {
  return {
    ...bindingsFor(config),
    ...overrides,
    moderationEngine: createModerationEngine(),
    scoringEngine: createScoringEngine(),
    taskCoordinator: createTaskCoordinator(),
    decisionService: createDecisionService(),
    dataLifecycleService: createDataLifecycleService(),
    auditStore: createAuditStore(),
  };
}
