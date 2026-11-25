import { randomUUID } from "node:crypto";
import { NATIVE_OUTPUT_KIND, type OutputGrantKind } from "@voxward/contracts";
import { insertOutputGrant } from "../db/output-store.js";
import type { ShortTransaction } from "../db/transaction.js";
import { OUTPUT_TOKEN_PREFIX } from "./downstream-tokens.js";
import { randomSecret } from "./session.js";

export interface IssuedNativeGrant {
  readonly grantId: string;
  readonly outputKind: OutputGrantKind;
  /** The raw credential. It is returned once at issuance, and the table keeps only its digest. */
  readonly credential: string;
}

/** Issues an output grant for one channel inside the caller's short transaction. */
export function issueNativeGrant(
  tx: ShortTransaction,
  input: { readonly channelId: string; readonly nowIso: string; readonly outputKind?: OutputGrantKind },
): IssuedNativeGrant {
  const grantId = randomUUID();
  const outputKind = input.outputKind ?? NATIVE_OUTPUT_KIND;
  const credential = `${OUTPUT_TOKEN_PREFIX}${randomSecret()}`;
  insertOutputGrant(tx, {
    grantId,
    credentialRefId: randomUUID(),
    channelId: input.channelId,
    credential,
    outputKind,
    nowIso: input.nowIso,
  });
  return { grantId, outputKind, credential };
}
