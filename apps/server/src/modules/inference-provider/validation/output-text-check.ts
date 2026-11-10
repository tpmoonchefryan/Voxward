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

/**
 * Checks the generated text of one item before a viewer can see it. Empty text has nothing to check. Without a checker,
 * every non-empty field is unverified.
 */
export async function checkGeneratedTextFields(
  itemIndex: number,
  itemId: string,
  fields: readonly GeneratedTextField[],
  checker: GeneratedTextChecker | undefined,
): Promise<BatchValidationError[]> {
  const errors: BatchValidationError[] = [];
  for (const field of fields) {
    if (field.text === "") continue;
    const verdict: GeneratedTextVerdict = checker === undefined ? "UNVERIFIED" : await checker.check(field.text);
    if (verdict === "CLEAN") continue;
    errors.push({
      code: verdict === "REJECTED" ? "GENERATED_TEXT_REJECTED" : "GENERATED_TEXT_UNVERIFIED",
      path: `/items/${itemIndex}/${field.name}`,
      itemId,
    });
  }
  return errors;
}
