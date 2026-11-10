import { describe, expectTypeOf, it } from "vitest";
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

  it("returns one classification per item, keyed by correlation id", () => {
    expectTypeOf<InferenceResult["items"][number]>().toEqualTypeOf<{
      readonly correlationId: string;
      readonly classification: InternalClassification;
    }>();
    expectTypeOf<InferenceResult>().toHaveProperty("batchId");
  });

  it("cancels and releases by batch id, not by correlation id", () => {
    expectTypeOf<InferenceProvider["cancel"]>().parameters.toEqualTypeOf<[string]>();
    expectTypeOf<InferenceProvider["releaseSession"]>().parameters.toEqualTypeOf<[string]>();
  });
});
