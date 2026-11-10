import { CONTRACT_VERSION, type InferenceCapabilities } from "@voxward/contracts";

/**
 * The Kiro CLI release the flags and parsing rules were checked against. `kiro-cli --version` printed this on 2026-11-10.
 * No real inference ran on it, so a real run stays unverified (design section 7).
 */
export const KIRO_CLI_TESTED_VERSION = "3.1.0";

/** The capabilities this adapter declares. Cancellation is implemented and tested against the fake CLI. */
export function describeKiroCli(): InferenceCapabilities {
  return {
    contractVersion: CONTRACT_VERSION,
    providerName: "kiro-cli",
    supportsCancel: true,
  };
}
