import { codePointLength } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { isSpanWithinText } from "../../../src/modules/inference-provider/validation/unicode-span.js";
import { checkGeneratedTextFields } from "../../../src/modules/inference-provider/validation/output-text-check.js";
import { EXPLICIT_RULES, ruleEngineTextChecker } from "./rule-engine-port.js";

describe("code point length", () => {
  it("counts each emoji as one code point, where JavaScript length counts two units", () => {
    expect(codePointLength("😀a")).toBe(2);
    expect("😀a".length).toBe(3);
  });
});

describe("isSpanWithinText", () => {
  const text = "😀😀a";

  it.each([
    [0, 1, true],
    [1, 2, true],
    [2, 3, true],
    [0, 3, true],
    [0, 4, false],
    [3, 3, false],
    [-1, 1, false],
  ])("span [%i, %i) inside the three-code-point text is valid: %s", (start, end, expected) => {
    expect(isSpanWithinText({ start, end }, text)).toBe(expected);
  });

  it("is false for any span in an empty text", () => {
    expect(isSpanWithinText({ start: 0, end: 1 }, "")).toBe(false);
  });
});

describe("rule engine port", () => {
  it("is CLEAN for text without a rule hit", async () => {
    expect(await ruleEngineTextChecker(EXPLICIT_RULES).check("hello there")).toBe("CLEAN");
  });

  it("is REJECTED for text with a rule hit", async () => {
    expect(await ruleEngineTextChecker(EXPLICIT_RULES).check("a badword here")).toBe("REJECTED");
  });

  it("is UNVERIFIED when no rule set is loaded", async () => {
    expect(await ruleEngineTextChecker(undefined).check("hello there")).toBe("UNVERIFIED");
  });

  it("is UNVERIFIED above the rule engine's input limit", async () => {
    expect(await ruleEngineTextChecker(EXPLICIT_RULES).check("😀".repeat(260))).toBe("UNVERIFIED");
  });
});

describe("generated text fields", () => {
  it("skips empty text and lists each rejected field by name, with no batch error (Q23)", async () => {
    const findings = await checkGeneratedTextFields(
      2,
      "b-3",
      [
        { name: "translatedText", text: "" },
        { name: "slangNote", text: "a badword" },
        { name: "replyCue", text: "hello" },
      ],
      ruleEngineTextChecker(EXPLICIT_RULES),
    );
    expect(findings).toEqual({ errors: [], rejectedFields: ["slangNote"] });
  });

  it("marks every non-empty field unverified when no checker is bound", async () => {
    const findings = await checkGeneratedTextFields(
      0,
      "b-1",
      [
        { name: "translatedText", text: "hello" },
        { name: "slangNote", text: "" },
      ],
      undefined,
    );
    expect(findings).toEqual({
      errors: [{ code: "GENERATED_TEXT_UNVERIFIED", path: "/items/0/translatedText", itemId: "b-1" }],
      rejectedFields: [],
    });
  });
});
