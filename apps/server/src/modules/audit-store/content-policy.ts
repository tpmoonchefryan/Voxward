import { EVIDENCE_MAX_BYTES, type EvidenceKind } from "@voxward/contracts";
import { AuditInputError } from "./errors.js";

/**
 * Retention in days. Proposal §12.3 gives these as initial suggestions, so they are configuration defaults, not
 * measured values. Evidence expires first, so content goes before its metadata.
 */
export const RETENTION_DAYS = { evidence: 7, metadata: 30 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

/** Refuses a payload above its bound. Nothing is truncated: a cut-off record is not the record that was received. */
export function assertEvidenceWithinLimit(kind: EvidenceKind, payload: string): void {
  if (utf8Bytes(payload) > EVIDENCE_MAX_BYTES[kind]) throw new AuditInputError(`evidence.${kind}.size`);
}

export function assertValidatedJson(payload: string): void {
  try {
    JSON.parse(payload);
  } catch {
    throw new AuditInputError("evidence.VALIDATED_JSON.format");
  }
}

export function expiryAfter(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}
