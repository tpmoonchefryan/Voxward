import type { Versioned } from "../version.js";

export const VOXWARD_ERROR_CODES = [
  "CONFIG_INVALID",
  "CONFIG_UNKNOWN_KEY",
  "STALE_GENERATION",
  "PERMISSION_DENIED",
  "ADAPTER_UNAVAILABLE",
] as const;
export type VoxwardErrorCode = (typeof VOXWARD_ERROR_CODES)[number];

/** Typed failure. Payloads name keys and ids only, never configuration values. */
export type VoxwardError = Versioned &
  (
    | { readonly code: "CONFIG_INVALID"; readonly key: string; readonly reason: string }
    | { readonly code: "CONFIG_UNKNOWN_KEY"; readonly key: string }
    | {
        readonly code: "STALE_GENERATION";
        readonly taskId: string;
        readonly expected: number;
        readonly actual: number;
      }
    | { readonly code: "PERMISSION_DENIED"; readonly action: string }
    | { readonly code: "ADAPTER_UNAVAILABLE"; readonly adapter: string }
  );
