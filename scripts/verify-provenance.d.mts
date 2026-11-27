export function verifySlsaAttestationBundle(
  bundleResponse: unknown,
  provenance: unknown,
):
  | {
      readonly ok: true;
      readonly subject: string;
      readonly predicateType: string;
      readonly sourceCommit: string;
      readonly workflow: string;
    }
  | { readonly ok: false; readonly reason: string };
