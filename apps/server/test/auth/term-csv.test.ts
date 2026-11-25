import { expect, it } from "vitest";
import { readTermCsv } from "../../src/auth/term-csv.js";

it("recognizes a headerless semicolon CSV whose first term contains commas", () => {
  expect(readTermCsv("alpha,beta,gamma,delta,epsilon;spam;NORMALIZED;fr\nsecond;spam;EXACT;en")).toEqual([
    { line: 1, fields: ["alpha,beta,gamma,delta,epsilon", "spam", "NORMALIZED", "fr"], invalid: false },
    { line: 2, fields: ["second", "spam", "EXACT", "en"], invalid: false },
  ]);
});

it("uses semicolons when the first row has the same number of commas and semicolons", () => {
  expect(readTermCsv("a,b,c;cat;EXACT\nx;cat;EXACT")).toEqual([
    { line: 1, fields: ["a,b,c", "cat", "EXACT"], invalid: false },
    { line: 2, fields: ["x", "cat", "EXACT"], invalid: false },
  ]);
});

it("breaks a tie between valid headerless parses in favor of semicolons", () => {
  expect(readTermCsv("a,b,EXACT,c;cat;EXACT\nx,y,EXACT,z;cat;EXACT")).toEqual([
    { line: 1, fields: ["a,b,EXACT,c", "cat", "EXACT"], invalid: false },
    { line: 2, fields: ["x,y,EXACT,z", "cat", "EXACT"], invalid: false },
  ]);
});
