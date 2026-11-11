import { randomUUID } from "node:crypto";
import { insertOutputGrant } from "../db/output-store.js";
import type { ShortTransaction } from "../db/transaction.js";
import { OUTPUT_TOKEN_PREFIX } from "./downstream-tokens.js";
import { randomSecret } from "./session.js";

export interface IssuedNativeGrant {
  readonly grantId: string;
  /** The raw credential. It is returned once at issuance, and the table keeps only its digest. */
  readonly credential: string;
}

/** Issues a native output grant for one channel inside the caller's short transaction. */
export function issueNativeGrant(tx: ShortTransaction, input: { readonly channelId: string; readonly nowIso: string }): IssuedNativeGrant {
  const grantId = randomUUID();
  const credential = `${OUTPUT_TOKEN_PREFIX}${randomSecret()}`;
  insertOutputGrant(tx, {
    grantId,
    credentialRefId: randomUUID(),
    channelId: input.channelId,
    credential,
    nowIso: input.nowIso,
  });
  return { grantId, credential };
}
