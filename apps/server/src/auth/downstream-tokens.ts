import { randomUUID } from "node:crypto";
import type { OutputGrantPort } from "@voxward/contracts";
import { and, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "../db/client.js";
import { authOutputTokens } from "../db/schema/index.js";
import type { ShortTransaction } from "../db/transaction.js";
import { digestSecret, randomSecret } from "./session.js";

export const OUTPUT_TOKEN_PREFIX = "vwo_";
export const OUTPUT_SCOPE = "ROOM_READ_ONLY" as const;

export interface IssuedOutputToken {
  readonly id: string;
  /** The raw token. It is returned once at issuance and never stored. */
  readonly token: string;
}

export interface ResolvedOutputToken {
  readonly id: string;
  readonly channelId: string;
  readonly scope: typeof OUTPUT_SCOPE;
}

export function issueOutputToken(
  tx: ShortTransaction,
  input: { readonly channelId: string; readonly createdByAccountId: string; readonly now: Date },
): IssuedOutputToken {
  const id = randomUUID();
  const token = `${OUTPUT_TOKEN_PREFIX}${randomSecret()}`;
  tx.insert(authOutputTokens)
    .values({
      id,
      channelId: input.channelId,
      scope: OUTPUT_SCOPE,
      tokenHash: digestSecret(token),
      createdByAccountId: input.createdByAccountId,
      createdAt: input.now.toISOString(),
    })
    .run();
  return { id, token };
}

/** Revokes one token. The channel must match, so a token cannot be revoked from another channel's page. */
export function revokeOutputToken(
  tx: ShortTransaction,
  input: { readonly id: string; readonly channelId: string; readonly now: Date },
): boolean {
  const result = tx
    .update(authOutputTokens)
    .set({ revokedAt: input.now.toISOString() })
    .where(
      and(
        eq(authOutputTokens.id, input.id),
        eq(authOutputTokens.channelId, input.channelId),
        isNull(authOutputTokens.revokedAt),
      ),
    )
    .run();
  return result.changes > 0;
}

export function resolveOutputToken(database: VoxwardDatabase, token: string): ResolvedOutputToken | undefined {
  const row = database.orm
    .select({ id: authOutputTokens.id, channelId: authOutputTokens.channelId, scope: authOutputTokens.scope })
    .from(authOutputTokens)
    .where(and(eq(authOutputTokens.tokenHash, digestSecret(token)), isNull(authOutputTokens.revokedAt)))
    .get();
  if (row === undefined || row.scope !== OUTPUT_SCOPE) return undefined;
  return { id: row.id, channelId: row.channelId, scope: OUTPUT_SCOPE };
}

export function withObsOutputTokens(database: VoxwardDatabase, grants: OutputGrantPort): OutputGrantPort {
  const tokenPrefix = "obs-token:";
  return {
    resolveCredential(credential) {
      const grant = grants.resolveCredential(credential);
      if (grant !== undefined) return grant;
      const token = resolveOutputToken(database, credential);
      return token === undefined ? undefined : { grantId: `${tokenPrefix}${token.id}`, channelId: token.channelId };
    },
    isActive(grantId) {
      if (!grantId.startsWith(tokenPrefix)) return grants.isActive(grantId);
      return database.orm
        .select({ id: authOutputTokens.id })
        .from(authOutputTokens)
        .where(and(
          eq(authOutputTokens.id, grantId.slice(tokenPrefix.length)),
          eq(authOutputTokens.scope, OUTPUT_SCOPE),
          isNull(authOutputTokens.revokedAt),
        ))
        .get() !== undefined;
    },
  };
}
