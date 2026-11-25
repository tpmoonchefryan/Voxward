import { createHash } from "node:crypto";
import {
  NATIVE_OUTPUT_KIND,
  NATIVE_OUTPUT_SCOPE,
  type ApprovedContentPort,
  type DownstreamVerdict,
  type OutputDeliveryPort,
  type OutputGrantPort,
  type SendableDelivery,
  type SendFailureOutcome,
} from "@voxward/contracts";
import { and, asc, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { parseScTranslationPayload } from "./sc-translation-payload.js";
import {
  channelEvents,
  credentialRefs,
  deliveries,
  outputGrants,
  technicalLogEvidence,
  technicalLogs,
  verdicts,
} from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

/**
 * The value stored in credential_refs.secret_ref for an output credential: `secretref:` and the SHA-256 digest of the
 * credential. That is 74 characters, the limit of the CHECK constraint. The digest is a lookup key. It is not the credential.
 */
export function outputSecretRef(credential: string): string {
  return `secretref:${createHash("sha256").update(credential, "utf8").digest("hex")}`;
}

export interface NewOutputGrant {
  readonly grantId: string;
  readonly credentialRefId: string;
  readonly channelId: string;
  readonly credential: string;
  readonly nowIso: string;
}

/** Writes the credential reference and the grant inside the caller's short transaction. The credential is not stored. */
export function insertOutputGrant(tx: ShortTransaction, input: NewOutputGrant): void {
  tx.insert(credentialRefs)
    .values({
      id: input.credentialRefId,
      channelId: input.channelId,
      purpose: "OUTPUT_GRANT",
      secretRef: outputSecretRef(input.credential),
      createdAt: input.nowIso,
    })
    .run();
  tx.insert(outputGrants)
    .values({
      id: input.grantId,
      channelId: input.channelId,
      outputKind: NATIVE_OUTPUT_KIND,
      credentialRefId: input.credentialRefId,
      scope: NATIVE_OUTPUT_SCOPE,
      createdAt: input.nowIso,
    })
    .run();
}

/**
 * Revokes a grant and its credential reference in one transaction. Returns false when the grant is unknown, belongs to
 * another channel, or was already revoked.
 */
export function revokeOutputGrant(
  tx: ShortTransaction,
  input: { readonly grantId: string; readonly channelId: string; readonly nowIso: string },
): boolean {
  const grant = tx
    .select({ credentialRefId: outputGrants.credentialRefId })
    .from(outputGrants)
    .where(and(eq(outputGrants.id, input.grantId), eq(outputGrants.channelId, input.channelId), isNull(outputGrants.revokedAt)))
    .get();
  if (grant === undefined) return false;

  tx.update(outputGrants).set({ revokedAt: input.nowIso }).where(eq(outputGrants.id, input.grantId)).run();
  tx.update(credentialRefs)
    .set({ revokedAt: input.nowIso })
    .where(and(eq(credentialRefs.id, grant.credentialRefId), isNull(credentialRefs.revokedAt)))
    .run();
  return true;
}

/**
 * The rule every output grant must meet to open the room. It is shared by credential resolution and by the periodic check,
 * so a grant that stops meeting it stops serving.
 */
function openableGrant() {
  return and(
    eq(credentialRefs.purpose, "OUTPUT_GRANT"),
    isNull(credentialRefs.revokedAt),
    eq(outputGrants.outputKind, NATIVE_OUTPUT_KIND),
    eq(outputGrants.scope, NATIVE_OUTPUT_SCOPE),
    isNull(outputGrants.revokedAt),
    eq(outputGrants.channelId, credentialRefs.channelId),
  );
}

/** Output grant port over the credential reference and grant tables. Each call is one read. */
export function createOutputGrantPort(database: VoxwardDatabase): OutputGrantPort {
  return {
    resolveCredential(credential) {
      const row = database.orm
        .select({ grantId: outputGrants.id, channelId: outputGrants.channelId })
        .from(credentialRefs)
        .innerJoin(outputGrants, eq(outputGrants.credentialRefId, credentialRefs.id))
        .where(and(eq(credentialRefs.secretRef, outputSecretRef(credential)), openableGrant()))
        .get();
      return row === undefined ? undefined : { grantId: row.grantId, channelId: row.channelId };
    },

    isActive(grantId) {
      const row = database.orm
        .select({ grantId: outputGrants.id })
        .from(credentialRefs)
        .innerJoin(outputGrants, eq(outputGrants.credentialRefId, credentialRefs.id))
        .where(and(eq(outputGrants.id, grantId), openableGrant()))
        .get();
      return row !== undefined;
    },
  };
}

/**
 * Approved text of a message, read from its Technical Log evidence. Only unexpired evidence counts, because the text has
 * its own retention. A message with no MESSAGE_TEXT evidence has no approved text.
 */
export function createApprovedContentPort(database: VoxwardDatabase): ApprovedContentPort {
  return {
    readApproved({ channelId, correlationId, nowIso }) {
      const rows = database.orm
        .select({ kind: technicalLogEvidence.evidenceKind, payload: technicalLogEvidence.payload })
        .from(technicalLogEvidence)
        .innerJoin(technicalLogs, eq(technicalLogs.id, technicalLogEvidence.logId))
        .where(
          and(
            eq(technicalLogs.channelId, channelId),
            eq(technicalLogs.correlationId, correlationId),
            inArray(technicalLogEvidence.evidenceKind, ["MESSAGE_TEXT", "TRANSLATION"]),
            gt(technicalLogEvidence.expiresAt, nowIso),
          ),
        )
        .orderBy(desc(technicalLogs.sequence), desc(technicalLogEvidence.id))
        .all();

      const text = rows.find((row) => row.kind === "MESSAGE_TEXT");
      if (text === undefined) return undefined;
      const translation = rows.find((row) => row.kind === "TRANSLATION");
      return { text: text.payload, translation: parseScTranslationPayload(translation?.payload ?? null).translation };
    },
  };
}

/**
 * Delivery status port over `deliveries`. Each call is one short synchronous transaction. Every status change is a
 * compare-and-set on the status the row must still have, so a row that changed meanwhile is left alone.
 */
export function createOutputDeliveryPort(database: VoxwardDatabase): OutputDeliveryPort {
  const sendableSelection = {
    deliveryId: deliveries.id,
    channelId: channelEvents.channelId,
    correlationId: channelEvents.correlationId,
    downstream: verdicts.downstream,
    platformOrder: deliveries.platformOrder,
    deliverySequence: deliveries.deliverySequence,
    validUntil: deliveries.validUntil,
  };

  function toSendableDelivery(row: {
    deliveryId: string;
    channelId: string;
    correlationId: string;
    downstream: string;
    platformOrder: number;
    deliverySequence: number;
    validUntil: string;
  }): SendableDelivery {
    // The verdict column has a CHECK that admits only ALLOW and BLOCK, so the cast cannot produce another value.
    return {
      deliveryId: row.deliveryId,
      channelId: row.channelId,
      correlationId: row.correlationId,
      status: "PENDING",
      verdict: row.downstream as DownstreamVerdict,
      platformOrder: row.platformOrder,
      deliverySequence: row.deliverySequence,
      validUntil: row.validUntil,
    };
  }

  return {
    readSendable({ channelId, nowIso, limit }) {
      const rows = database.orm
        .select(sendableSelection)
        .from(deliveries)
        .innerJoin(channelEvents, eq(channelEvents.id, deliveries.eventId))
        .innerJoin(verdicts, eq(verdicts.id, deliveries.verdictId))
        .where(
          and(
            eq(channelEvents.channelId, channelId),
            eq(deliveries.status, "PENDING"),
            gt(deliveries.validUntil, nowIso),
            eq(verdicts.isCurrent, 1),
          ),
        )
        .orderBy(asc(deliveries.platformOrder), asc(deliveries.deliverySequence), asc(deliveries.id))
        .limit(limit)
        .all();
      return rows.map(toSendableDelivery);
    },

    readSendableRow({ deliveryId, nowIso }) {
      const row = database.orm
        .select(sendableSelection)
        .from(deliveries)
        .innerJoin(channelEvents, eq(channelEvents.id, deliveries.eventId))
        .innerJoin(verdicts, eq(verdicts.id, deliveries.verdictId))
        .where(
          and(
            eq(deliveries.id, deliveryId),
            eq(deliveries.status, "PENDING"),
            gt(deliveries.validUntil, nowIso),
            eq(verdicts.isCurrent, 1),
          ),
        )
        .get();
      return row === undefined ? undefined : toSendableDelivery(row);
    },

    expireDue({ nowIso, limit }) {
      return runShortTransaction(database, (tx) => {
        const due = tx
          .select({ id: deliveries.id })
          .from(deliveries)
          .where(and(eq(deliveries.status, "PENDING"), lte(deliveries.validUntil, nowIso)))
          .limit(limit)
          .all();
        let changed = 0;
        for (const row of due) {
          changed += tx
            .update(deliveries)
            .set({ status: "EXPIRED", updatedAt: nowIso })
            .where(and(eq(deliveries.id, row.id), eq(deliveries.status, "PENDING")))
            .run().changes;
        }
        return changed;
      });
    },

    markSent({ deliveryId, nowIso }) {
      // Runs after every consumer accepted the frame. Only a PENDING, unexpired row on a current verdict becomes SENT.
      return runShortTransaction(database, (tx) => {
        const current = tx
          .select({ id: deliveries.id })
          .from(deliveries)
          .innerJoin(verdicts, eq(verdicts.id, deliveries.verdictId))
          .where(
            and(
              eq(deliveries.id, deliveryId),
              eq(deliveries.status, "PENDING"),
              gt(deliveries.validUntil, nowIso),
              eq(verdicts.isCurrent, 1),
            ),
          )
          .get();
        if (current === undefined) return false;
        return (
          tx
            .update(deliveries)
            .set({ status: "SENT", updatedAt: nowIso })
            .where(and(eq(deliveries.id, deliveryId), eq(deliveries.status, "PENDING"), gt(deliveries.validUntil, nowIso)))
            .run().changes === 1
        );
      });
    },

    recordSendFailure({ deliveryId, nowIso, maxAttempts }) {
      return runShortTransaction(database, (tx): SendFailureOutcome => {
        const row = tx
          .select({ attempts: deliveries.attempts })
          .from(deliveries)
          .where(and(eq(deliveries.id, deliveryId), eq(deliveries.status, "PENDING")))
          .get();
        if (row === undefined) return "NOT_PENDING";
        const attempts = row.attempts + 1;
        const status = attempts >= maxAttempts ? "FAILED" : "PENDING";
        const changed = tx
          .update(deliveries)
          .set({ attempts, status, updatedAt: nowIso })
          .where(and(eq(deliveries.id, deliveryId), eq(deliveries.status, "PENDING")))
          .run().changes;
        if (changed !== 1) return "NOT_PENDING";
        return status === "FAILED" ? "FAILED" : "RETRY";
      });
    },

    markFailed({ deliveryId, nowIso }) {
      return runShortTransaction(
        database,
        (tx) =>
          tx
            .update(deliveries)
            .set({ status: "FAILED", updatedAt: nowIso })
            .where(and(eq(deliveries.id, deliveryId), eq(deliveries.status, "PENDING")))
            .run().changes === 1,
      );
    },
  };
}
