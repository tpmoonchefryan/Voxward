import { expect, it } from "vitest";
import { readTermCsv } from "../../src/auth/term-csv.js";

it("recognizes a headerless semicolon CSV whose first term contains commas", () => {
  expect(readTermCsv("alpha,beta,gamma,delta,epsilon;spam;NORMALIZED;fr\nsecond;spam;EXACT;en")).toEqual([
    { line: 1, fields: ["alpha,beta,gamma,delta,epsilon", "spam", "NORMALIZED", "fr"], invalid: false },
    { line: 2, fields: ["second", "spam", "EXACT", "en"], invalid: false },
  ]);
});
