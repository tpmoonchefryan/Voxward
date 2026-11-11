/**
 * Output storage and connection ports as the output module sees them. The module never imports the database or a
 * WebSocket library. A server binding implements each port. Every write method is one short synchronous transaction, and
 * none of them is held across an `await`.
 */

import type { DownstreamVerdict } from "../decisions/verdict.js";
import type { NativeClose, NativeFrame } from "../output/native-v1.js";

/** Delivery status values. They match the `deliveries.status` CHECK in the schema. */
export const DELIVERY_STATUS_VALUES = ["PENDING", "SENT", "FAILED", "EXPIRED", "CANCELLED"] as const;
export type DeliveryStatusValue = (typeof DELIVERY_STATUS_VALUES)[number];

/** A delivery row the output may send: PENDING, not expired, and tied to the current verdict. */
export interface SendableDelivery {
  readonly deliveryId: string;
  readonly channelId: string;
  readonly correlationId: string;
  readonly status: "PENDING";
  readonly verdict: DownstreamVerdict;
  readonly platformOrder: number;
  readonly deliverySequence: number;
  readonly validUntil: string;
}

/** Approved text of one message, read from its evidence. `translation` is null when no translation was stored. */
export interface ApprovedContent {
  readonly text: string;
  readonly translation: string | null;
}

/** The grant a credential opens. The room is the grant's channel, and the client never chooses it. */
export interface GrantFacts {
  readonly grantId: string;
  readonly channelId: string;
}

export interface OutputGrantPort {
  /** The grant a credential opens, or undefined when the credential is unknown, revoked or out of scope. */
  resolveCredential(credential: string): GrantFacts | undefined;
  /** True while the grant and its credential are both unrevoked and in scope. */
  isActive(grantId: string): boolean;
}

/** What a failed send does to its row: retry later, fail for good, or nothing because the row already changed. */
export type SendFailureOutcome = "RETRY" | "FAILED" | "NOT_PENDING";

export interface OutputDeliveryPort {
  /** PENDING rows of one channel that are not expired and belong to the current verdict, in delivery order. */
  readSendable(input: { readonly channelId: string; readonly nowIso: string; readonly limit: number }): readonly SendableDelivery[];
  /** Marks PENDING rows whose `validUntil` has passed as EXPIRED. Returns how many changed. */
  expireDue(input: { readonly nowIso: string; readonly limit: number }): number;
  /** Compare-and-set PENDING to SENT, only while the row is still PENDING and not expired. */
  markSent(input: { readonly deliveryId: string; readonly nowIso: string }): boolean;
  /** Counts one failed send. The row becomes FAILED once `maxAttempts` failures are reached. */
  recordSendFailure(input: { readonly deliveryId: string; readonly nowIso: string; readonly maxAttempts: number }): SendFailureOutcome;
  /**
   * Compare-and-set PENDING to FAILED. Used when an ALLOW row has no approved content to show. The failure is a system
   * failure, not a violation. The schema has no column for the reason, so the status alone records it (来源缺口).
   */
  markFailed(input: { readonly deliveryId: string; readonly nowIso: string }): boolean;
}

export interface ApprovedContentPort {
  /** The approved text and translation of the message with this correlation identifier, while the evidence is unexpired. */
  readApproved(input: { readonly channelId: string; readonly correlationId: string; readonly nowIso: string }): ApprovedContent | undefined;
}

/** One connected consumer. A transport implements it, and the output module only calls these members. */
export interface OutputSubscriber {
  readonly grantId: string;
  readonly channelId: string;
  /** Resolves when the message is handed to the connection. Rejects when the write fails or times out. */
  send(message: NativeFrame): Promise<void>;
  /** Bytes queued and not yet written to the connection. */
  bufferedAmount(): number;
  /** Closes the connection with a fixed close code and reason. */
  close(closing: NativeClose): void;
}

export interface OutputSubscriberRegistry {
  attach(subscriber: OutputSubscriber): void;
  detach(subscriber: OutputSubscriber): void;
  forChannel(channelId: string): readonly OutputSubscriber[];
  /** Channels that have at least one attached subscriber. */
  activeChannelIds(): readonly string[];
  /** Closes every subscriber of the grant with the grant-revoked close code. Returns how many were closed. */
  closeGrant(grantId: string): number;
}
