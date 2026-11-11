import type { DeliveryStatusValue } from "@voxward/contracts";

/**
 * Output-side resend rules. A resend is an explicit operator action in the decision service. It creates a new delivery row
 * with its own validity window. The output never sends a row again on its own.
 */
export const RESEND_CONTRACT = {
  /** An expired row is not sent by the output. Only an explicit resend creates a new row. */
  automaticReplayOfExpired: false,
  /** A row already marked SENT is never sent again, so the consumer does not receive it twice on reconnect. */
  replayOfSentRows: false,
  /** The decision service refuses a resend of a SENT row (ALREADY_SENT), of an unexpired row (NOT_EXPIRED) and of an old row. */
  explicitResendOwner: "decision-service",
} as const;

export type SendDecision = "SEND" | "SKIP_NOT_PENDING" | "SKIP_EXPIRED";

/**
 * The output's send rule for one row. The SQL filter in the delivery port applies the same rule, and the pump checks it again
 * before a send. Timestamps are ISO 8601 UTC strings, so they compare as text.
 */
export function decideSend(row: { readonly status: DeliveryStatusValue; readonly validUntil: string }, nowIso: string): SendDecision {
  if (row.status !== "PENDING") return "SKIP_NOT_PENDING";
  if (row.validUntil <= nowIso) return "SKIP_EXPIRED";
  return "SEND";
}
