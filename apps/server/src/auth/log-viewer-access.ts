import type { VoxwardDatabase } from "../db/client.js";
import { resolveChannelCapabilities } from "./rbac-enforce.js";

/**
 * Answers the viewer's one access question from active memberships and channel tri-state RBAC assignments.
 * It matches the audit module's `ViewerAccess`. The module cannot import this file, because the module zone may only
 * import contracts, so the composition root passes the object in.
 */
export function databaseViewerAccess(database: VoxwardDatabase) {
  return {
    capabilitiesFor(actorRef: string, channelId: string): ReadonlySet<string> {
      return resolveChannelCapabilities(database, channelId, actorRef) ?? new Set<string>();
    },
  };
}
