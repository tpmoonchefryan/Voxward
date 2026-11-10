import { describe, expect, expectTypeOf, it } from "vitest";
import {
  AI_ITEM_ID_MAX_LENGTH,
  type AiBatchInput,
  type AiBatchItemInput,
  type AiItemIdMap,
  type AiItemIdMapping,
} from "../../src/index.js";

describe("AI batch identifiers (Q3)", () => {
  it("gives the model only a temporary item id and the text", () => {
    expectTypeOf<AiBatchItemInput>().toEqualTypeOf<{ readonly itemId: string; readonly text: string }>();
    expectTypeOf<AiBatchInput>().toEqualTypeOf<{ readonly items: readonly AiBatchItemInput[] }>();
  });

  it("keeps the internal correlation id out of the model input", () => {
    expectTypeOf<AiBatchItemInput>().not.toHaveProperty("correlationId");
  });

  it("maps each item id to its internal correlation id on the server side", () => {
    expectTypeOf<AiItemIdMapping>().toEqualTypeOf<{ readonly itemId: string; readonly correlationId: string }>();
    expectTypeOf<AiItemIdMap>().toEqualTypeOf<ReadonlyMap<string, string>>();
  });

  it("caps item ids at 64 code points", () => {
    expect(AI_ITEM_ID_MAX_LENGTH).toBe(64);
  });
});
