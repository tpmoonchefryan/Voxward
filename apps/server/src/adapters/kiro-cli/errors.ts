/**
 * Failure codes of the Kiro CLI adapter. A code names the kind of failure. Errors never carry model output, viewer
 * text or stderr, so a failure can be logged as it is.
 */
export const KIRO_ERROR_CODES = [
  "REQUEST_INVALID",
  "SELECTION_UNSUPPORTED",
  "SESSION_UNAVAILABLE",
  "RUN_SPAWN_FAILED",
  "RUN_FAILED",
  "RUN_TIMEOUT",
  "RUN_CANCELLED",
  "RUN_OUTPUT_TOO_LARGE",
  "RUN_OUTPUT_MISSING",
  "RUN_OUTPUT_NOT_JSON",
  "RUN_OUTPUT_INVALID",
] as const;

export type KiroErrorCode = (typeof KIRO_ERROR_CODES)[number];

export interface KiroErrorDetails {
  /** Exit code of the CLI process, when it exited on its own. */
  readonly exitCode?: number;
  /** Codes of the rules the batch validator reported. Names only, never the value that failed. */
  readonly validationCodes?: readonly string[];
}

export class KiroInferenceError extends Error {
  readonly code: KiroErrorCode;
  readonly batchId: string;
  readonly exitCode: number | undefined;
  readonly validationCodes: readonly string[];

  constructor(code: KiroErrorCode, batchId: string, details: KiroErrorDetails = {}) {
    super(code);
    this.name = "KiroInferenceError";
    this.code = code;
    this.batchId = batchId;
    this.exitCode = details.exitCode;
    this.validationCodes = details.validationCodes ?? [];
  }
}
