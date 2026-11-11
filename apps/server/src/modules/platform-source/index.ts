import { CONTRACT_VERSION, type PlatformSource } from "@voxward/contracts";

/** Placeholder entry for platform intake. S001 binds the synthetic adapter instead. */
export function createPlatformSource(): PlatformSource {
  return {
    moduleName: "PlatformSource",
    contractVersion: CONTRACT_VERSION,
    fetchAfter: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: PlatformSource.fetchAfter")),
  };
}

export * from "./youtube/credentials.js";
export * from "./youtube/oauth.js";
export * from "./youtube/auth-status.js";
export * from "./youtube/routes.js";
export * from "./youtube/config.js";
export * from "./youtube/dedup.js";
export * from "./youtube/replay-age.js";
export * from "./youtube/stream-list.js";
export * from "./youtube/identity.js";
export * from "./youtube/quota.js";
export * from "./youtube/to-business-event.js";
export * from "./youtube/delete-message.js";
