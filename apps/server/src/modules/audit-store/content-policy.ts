import { EVIDENCE_MAX_BYTES, type EvidenceKind, type EvidenceRow } from "@voxward/contracts";
import { AuditInputError } from "./errors.js";

/**
 * Retention in days. Proposal §12.3 gives these as initial suggestions, so they are configuration defaults, not
 * measured values. Evidence expires first, so content goes before its metadata.
 */
export const RETENTION_DAYS = { evidence: 7, metadata: 30 } as const;

/** The capability that lets a person open the viewer for a channel at all (proposal §12.2, S003 capability `logs.view`). */
export const VIEWER_CAPABILITY = "logs.view";

/**
 * The capability a reader needs before a payload of each evidence kind is returned. The proposal says "必要消息证据按
 * 内容权限访问" without naming the capability, so this mapping follows the S003 capability matrix (implementation choice,
 * see the S016 design, section 5).
 */
export const EVIDENCE_CAPABILITIES: Readonly<Record<EvidenceKind, string>> = {
  MESSAGE_TEXT: "message.original",
  TRANSLATION: "message.original",
  ITEM_ID_MAP: "subject.evidence",
  VALIDATED_JSON: "subject.evidence",
};

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

/**
 * The payload a reader may see. It is the stored content only when the reader holds the capability for that kind and
 * the content has not expired. Otherwise it is null. Metadata is not affected: this function decides the content only.
 */
export function visiblePayload(item: EvidenceRow, capabilities: ReadonlySet<string>, now: Date): string | null {
  if (!capabilities.has(EVIDENCE_CAPABILITIES[item.kind])) return null;
  if (Date.parse(item.expiresAt) <= now.getTime()) return null;
  return item.payload;
}
