import { CONTRACT_VERSION, type AuditStore } from "@voxward/contracts";

/** Placeholder entry for audit logs. Every call fails until the audit story lands. */
export function createAuditStore(): AuditStore {
  return {
    moduleName: "AuditStore",
    contractVersion: CONTRACT_VERSION,
    append: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: AuditStore.append")),
    findByCorrelationId: () =>
      Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: AuditStore.findByCorrelationId")),
  };
}
