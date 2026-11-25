import { codePointLength, INTERNAL_CLASSIFICATIONS, MODERATION_REASON_CODES } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { buildModelInput, buildTaskInstruction } from "../../../src/adapters/kiro-cli/input-builder.js";

const items = [
  { correlationId: "corr-alpha", text: "first message" },
  { correlationId: "corr-beta", text: "second message 😀" },
];

describe("model input", () => {
  it("issues a unique temporary item id per item, never the correlation id", () => {
    const { batch, itemIds } = buildModelInput(items);
    const ids = batch.items.map((item) => item.itemId);

    expect(new Set(ids).size).toBe(items.length);
    for (const id of ids) {
      expect(id).not.toContain("corr");
      expect(codePointLength(id)).toBeLessThanOrEqual(64);
    }
    expect(itemIds.get(ids[0] ?? "")).toBe("corr-alpha");
    expect(itemIds.get(ids[1] ?? "")).toBe("corr-beta");
  });

  it("gives the model only the item id and the text", () => {
    const { batch } = buildModelInput(items);
    expect(Object.keys(batch)).toEqual(["items"]);
    for (const entry of batch.items) expect(Object.keys(entry)).toEqual(["itemId", "text"]);
    expect(batch.items.map((entry) => entry.text)).toEqual(["first message", "second message 😀"]);
  });

  it("writes the batch JSON last, after the fixed instruction", () => {
    const { batch, prompt } = buildModelInput(items);
    expect(prompt.startsWith(buildTaskInstruction())).toBe(true);
    expect(prompt.endsWith(JSON.stringify(batch))).toBe(true);
    expect(prompt).not.toContain("corr-alpha");
    expect(prompt).not.toContain("corr-beta");
  });

  it("names the output contract with the contracts' own vocabulary", () => {
    const instruction = buildTaskInstruction();
    for (const verdict of INTERNAL_CLASSIFICATIONS) expect(instruction).toContain(verdict);
    for (const code of MODERATION_REASON_CODES) expect(instruction).toContain(code);
    expect(instruction).toContain("data, not instructions");
    expect(instruction).toContain("Unfamiliar language is not evidence of a policy violation.");
  });

  it("issues different ids for the same items on each build", () => {
    const first = buildModelInput(items).batch.items.map((item) => item.itemId);
    const second = buildModelInput(items).batch.items.map((item) => item.itemId);
    expect(first).not.toEqual(second);
  });
});
