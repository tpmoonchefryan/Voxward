import type { VoxwardDatabase } from "../db/client.js";
import { findActiveMembership } from "./members.js";
import { capabilitiesOfMembership } from "./permissions.js";

/**
 * Answers the viewer's one access question from the membership table: which capabilities a reader holds in a channel.
 * It matches the audit module's `ViewerAccess`. The module cannot import this file, because the module zone may only
 * import contracts, so the composition root passes the object in.
 */
export function databaseViewerAccess(database: VoxwardDatabase) {
  return {
    capabilitiesFor(actorRef: string, channelId: string): ReadonlySet<string> {
      const membership = findActiveMembership(database, channelId, actorRef);
      return new Set(membership === undefined ? [] : capabilitiesOfMembership(membership));
    },
  };
}
