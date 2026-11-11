/**
 * Removal of one chat message from the platform, as the decision module sees it. A platform binding implements this port.
 * Every answer is a closed value, so an answer nobody expected cannot pass as a success. The port does not throw: an
 * answer it cannot classify is UNKNOWN, and a read-back it cannot make is UNVERIFIABLE.
 */

/**
 * PENDING (waiting) is recorded before a request leaves. SUCCEEDED includes a success confirmed by a read-back. FAILED means
 * the platform refused, a local check stopped the request, or the retry cap was reached with the message still present.
 * UNKNOWN means the answer cannot tell whether the message was removed, and a read-back could not settle it.
 */
export const PLATFORM_DELETE_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "UNKNOWN"] as const;
export type PlatformDeleteStatus = (typeof PLATFORM_DELETE_STATUSES)[number];

/** Why a removal did not succeed, or how a success was confirmed. The set is closed. */
export const PLATFORM_DELETE_REASONS = [
  "NO_WRITE_SCOPE",
  "QUOTA_EXHAUSTED",
  "AUTH_REJECTED",
  "INSUFFICIENT_PERMISSION",
  "NOT_DELETABLE",
  "MESSAGE_NOT_FOUND",
  "RATE_LIMITED",
  "RETRY_LIMIT_REACHED",
  "VERIFICATION_UNAVAILABLE",
  "VERIFIED_BY_READBACK",
] as const;
export type PlatformDeleteReason = (typeof PLATFORM_DELETE_REASONS)[number];

/** Reasons the platform gives for refusing a removal. The message was not removed by that request. */
export type PlatformRefusalReason = Extract<
  PlatformDeleteReason,
  "AUTH_REJECTED" | "INSUFFICIENT_PERMISSION" | "NOT_DELETABLE" | "MESSAGE_NOT_FOUND" | "RATE_LIMITED" | "QUOTA_EXHAUSTED"
>;

/** The local check before a request: write permission and quota. It makes no platform call. */
export type DeletePermission =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "NO_WRITE_SCOPE" | "QUOTA_EXHAUSTED" };

/** The platform's answer to one removal request. */
export type DeleteAnswer =
  | { readonly kind: "SUCCEEDED" }
  | { readonly kind: "REJECTED"; readonly reason: PlatformRefusalReason }
  | { readonly kind: "UNKNOWN" };

export interface DeleteResponse {
  readonly answer: DeleteAnswer;
  /** Quota units the request was charged, whatever the answer. */
  readonly unitsSpent: number;
}

/** Whether a message is still on the platform. UNVERIFIABLE means the platform could not say. */
export type ReadBackAnswer = "PRESENT" | "ABSENT" | "UNVERIFIABLE";

/** One platform status of one operation. It is kept apart from the local block of the same operation. */
export interface PlatformDeleteRecord {
  readonly operationId: string;
  readonly eventId: string;
  readonly channelId: string;
  readonly status: PlatformDeleteStatus;
  readonly reason: PlatformDeleteReason | null;
  /** Removal requests sent in this operation. Zero when the local check stopped it first. */
  readonly attempts: number;
  readonly unitsSpent: number;
}

export interface PlatformDeletePort {
  checkDeletePermission(channelId: string): DeletePermission;
  deleteMessage(channelId: string, platformMessageId: string): Promise<DeleteResponse>;
  readBack(channelId: string, platformMessageId: string): Promise<ReadBackAnswer>;
}
