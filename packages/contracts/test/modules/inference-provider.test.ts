import { describe, expectTypeOf, it } from "vitest";
import type { MatchedSpan, ModerationReasonCode } from "../../src/ai/moderation-result.js";
import type { InternalClassification } from "../../src/decisions/verdict.js";
import type {
  InferenceProvider,
  InferenceRequest,
  InferenceRequestItem,
  InferenceResult,
} from "../../src/index.js";

describe("inference batch shape (Q3)", () => {
  it("carries only the internal correlation id and the text per item", () => {
    expectTypeOf<InferenceRequestItem>().toEqualTypeOf<{ readonly correlationId: string; readonly text: string }>();
    expectTypeOf<InferenceRequestItem>().not.toHaveProperty("userId");
    expectTypeOf<InferenceRequestItem>().not.toHaveProperty("nickname");
  });

  it("groups the items under one batch id", () => {
    expectTypeOf<InferenceRequest>().toHaveProperty("batchId");
    expectTypeOf<InferenceRequest["items"]>().toEqualTypeOf<readonly InferenceRequestItem[]>();
  });

  it("returns one classification per item, with the item id and the evidence the caller stores", () => {
    expectTypeOf<InferenceResult["items"][number]>().toEqualTypeOf<{
      readonly correlationId: string;
      readonly itemId: string;
      readonly classification: InternalClassification;
      readonly reasonCodes: readonly ModerationReasonCode[];
      readonly matchedSpan?: MatchedSpan;
    }>();
    expectTypeOf<InferenceResult>().toHaveProperty("batchId");
  });

  it("cancels and releases by batch id, not by correlation id", () => {
    expectTypeOf<InferenceProvider["cancel"]>().parameters.toEqualTypeOf<[string]>();
    expectTypeOf<InferenceProvider["releaseSession"]>().parameters.toEqualTypeOf<[string]>();
  });
});
