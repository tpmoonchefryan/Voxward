import type { ChannelEvent } from "../events/channel-event.js";
import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export interface SourceBatch extends Versioned {
  readonly events: readonly ChannelEvent[];
  readonly nextCursor: string;
}

/** Official platform intake: cursors and dedupe basis. Does not score credit or read downstream software. */
export interface PlatformSource extends VersionedModule<"PlatformSource"> {
  fetchAfter(cursor: string | null, limit: number): Promise<SourceBatch>;
}
