/** Input that cannot be scored. Thrown before any port call, so a failed input never changes a score. */
export class ScoringInputError extends Error {
  readonly code = "SCORING_INPUT_INVALID";
  readonly reason: string;

  constructor(reason: string) {
    super(`scoring input rejected: ${reason}`);
    this.name = "ScoringInputError";
    this.reason = reason;
  }
}

/** Configuration that fails validation. The message names the key, never the value. */
export class ScoringConfigError extends Error {
  readonly code = "SCORING_CONFIG_INVALID";
  readonly key: string;

  constructor(key: string) {
    super(`scoring configuration invalid: ${key}`);
    this.name = "ScoringConfigError";
    this.key = key;
  }
}

/** A scoring request refused because the subject is on the scoring-exception list. Nothing is written. */
export class ScoringRefusedError extends Error {
  readonly code = "SCORING_REFUSED";
  readonly reason: "EXCEPTION_ACTIVE";

  constructor(reason: "EXCEPTION_ACTIVE") {
    super(`scoring refused: ${reason}`);
    this.name = "ScoringRefusedError";
    this.reason = reason;
  }
}
