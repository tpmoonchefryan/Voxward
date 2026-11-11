import type { BatchValidationError } from "./errors.js";

/**
 * Outcome of the generated text check. `UNVERIFIED` means the check could not finish, for example because no rule set
 * is loaded or the text is above the rule engine's input limit. It fails closed.
 */
export type GeneratedTextVerdict = "CLEAN" | "REJECTED" | "UNVERIFIED";

/**
 * Port to the rule engine of the moderation module. This module may not import that module, so the caller binds it.
 */
export interface GeneratedTextChecker {
  check(text: string): Promise<GeneratedTextVerdict>;
}

/** One generated field of one item. `name` is the field name in the schema. */
export interface GeneratedTextField {
  readonly name: string;
  readonly text: string;
}

/** What the generated text check found for one item. Rule hits and unverified fields are kept apart (Q23). */
export interface GeneratedTextFindings {
  /** Batch errors: fields the check could not verify. These fail the batch, because the check itself did not run. */
  readonly errors: BatchValidationError[];
  /** Names of the fields a rule hit. Only this item's own cue is withheld, so the batch is not failed. */
  readonly rejectedFields: readonly string[];
}

/**
 * Checks the generated text of one item before a viewer can see it. Empty text has nothing to check. Without a checker,
 * every non-empty field is unverified.
 */
export async function checkGeneratedTextFields(
  itemIndex: number,
  itemId: string,
  fields: readonly GeneratedTextField[],
  checker: GeneratedTextChecker | undefined,
): Promise<GeneratedTextFindings> {
  const errors: BatchValidationError[] = [];
  const rejectedFields: string[] = [];
  for (const field of fields) {
    if (field.text === "") continue;
    const verdict: GeneratedTextVerdict = checker === undefined ? "UNVERIFIED" : await checker.check(field.text);
    if (verdict === "CLEAN") continue;
    if (verdict === "REJECTED") {
      rejectedFields.push(field.name);
      continue;
    }
    errors.push({ code: "GENERATED_TEXT_UNVERIFIED", path: `/items/${itemIndex}/${field.name}`, itemId });
  }
  return { errors, rejectedFields };
}
