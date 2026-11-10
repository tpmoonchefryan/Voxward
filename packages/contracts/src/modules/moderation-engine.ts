import type { ChannelEvent } from "../events/channel-event.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export const MODERATION_ROUTES = ["PASS", "BLOCK", "REVIEW"] as const;
export type ModerationRoute = (typeof MODERATION_ROUTES)[number];

export interface ModerationResult extends Versioned {
  readonly correlationId: string;
  readonly route: ModerationRoute;
}

/** Basic rules, review routing and final content policy. Carries no model SDK or CLI format. */
export interface ModerationEngine extends VersionedModule<"ModerationEngine"> {
  moderate(event: ChannelEvent): Promise<ModerationResult>;
}
