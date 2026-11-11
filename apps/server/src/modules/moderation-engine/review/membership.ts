/**
 * The batch-level part of a review answer (VW-R-008, proposal section 8.3): every item id of the batch comes back exactly
 * once, and no other id comes back. The inference-provider batch check applies the same rule, but this module cannot
 * import it (check:deps), so the rule is written here. A violation fails the whole batch, and no item of it is settled.
 */
export type BatchMembershipError = "AI_OUTPUT_INVALID" | "AI_OUTPUT_INCOMPLETE";

/**
 * The error that fails the batch, or null when the answer names every item of the batch exactly once. An id outside the
 * batch, or a second answer for one item, is invalid output. An item without an answer makes the output incomplete.
 */
export function batchMembershipErrorOf(outputIds: readonly string[], inputIds: readonly string[]): BatchMembershipError | null {
  const expected = new Set(inputIds);
  const returned = new Set<string>();
  for (const id of outputIds) {
    if (!expected.has(id) || returned.has(id)) return "AI_OUTPUT_INVALID";
    returned.add(id);
  }
  return returned.size === expected.size ? null : "AI_OUTPUT_INCOMPLETE";
}
