import type { EvidenceRow, LogViewerEvidence } from "@voxward/contracts";
import { EVIDENCE_CAPABILITIES } from "../content-policy.js";

/**
 * The content items one reader may see. A kind the reader lacks the capability for is left out entirely, so the reader
 * cannot tell that it exists. A kind the reader may see whose retention has ended stays in the list as `EXPIRED`
 * with no payload, so the viewer can say the content is gone.
 */
export function evidenceViewFor(
  rows: readonly EvidenceRow[],
  capabilities: ReadonlySet<string>,
  now: Date,
): LogViewerEvidence[] {
  return rows.flatMap((row): LogViewerEvidence[] => {
    if (!capabilities.has(EVIDENCE_CAPABILITIES[row.kind])) return [];
    if (Date.parse(row.expiresAt) <= now.getTime()) return [{ kind: row.kind, state: "EXPIRED", payload: null }];
    return [{ kind: row.kind, state: "AVAILABLE", payload: row.payload }];
  });
}
