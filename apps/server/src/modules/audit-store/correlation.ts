import { AuditInputError } from "./errors.js";

/** Letters, digits and `._:-`, 1 to 128 characters. A chain id is not an access credential (proposal §12.2). */
const CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function assertCorrelationId(value: string): string {
  if (typeof value !== "string" || !CORRELATION_ID.test(value)) throw new AuditInputError("correlationId");
  return value;
}

/**
 * A new chain id for an operation that has none yet. It comes from the injected generator and never contains a
 * platform user id, a nickname or a long-lived viewer identifier.
 */
export function newCorrelationId(newId: () => string): string {
  return assertCorrelationId(`corr-${newId()}`);
}
