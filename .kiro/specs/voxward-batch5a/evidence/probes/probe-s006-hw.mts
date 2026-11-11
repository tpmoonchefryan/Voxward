// Supplementary evidence for the half-width sound-mark gap. Usage: tsx probe-s006-hw.mts <checkout> <work>
import { CONTRACT_VERSION } from "@voxward/contracts";

const [C, W] = process.argv.slice(2);
const MOD = "apps/server/src/modules/moderation-engine";
const versions = {
  f4808fb: await import(`${W}/old/f4808fb/${MOD}/index.ts`),
  fa5dc19: await import(`${W}/old/fa5dc19/${MOD}/index.ts`),
  candidate: await import(`${C}/${MOD}/index.ts`),
} as const;
const candNorm = await import(`${C}/${MOD}/rules/normalize.ts`);
const candTr = await import(`${C}/${MOD}/rules/transliterate.ts`);
let n = 0;
const event = (body: string) => ({ contractVersion: CONTRACT_VERSION, platform: "synthetic", channelId: "c", platformMessageId: `m${++n}`, platformOrder: n, receivedAt: "2026-01-01T00:00:00.000Z", correlationId: `x${n}`, body, sender: { contractVersion: CONTRACT_VERSION, senderRef: "s" } });
async function route(mod: any, kind: string, pattern: string, body: string) {
  const rule = kind === "regex" ? { id: "r", kind, source: pattern } : { id: "r", kind, text: pattern };
  const checker = mod.createModerationChecker({ ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [rule] }] }, nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") }, now: () => 0 });
  return (await checker.check(event(body))).route;
}
const rows: Array<[string, string, string, string]> = [
  ["normalized", "バカ", "ﾊﾞｶ", "BLOCK"],
  ["normalized", "ブス", "ﾌﾞｽ", "BLOCK"],
  ["normalized", "デブ", "ﾃﾞﾌﾞ", "BLOCK"],
  ["normalized", "ハゲ", "ﾊｹﾞ", "BLOCK"],
  ["normalized", "ポンコツ", "ﾎﾟﾝｺﾂ", "BLOCK"],
  ["regex", "バカ", "ﾊﾞｶ", "BLOCK"],
  ["normalized", "ハカ", "ﾊﾞｶ", "PASS"],
  ["normalized", "バカ", "ハ゛カ", "BLOCK"],
  ["normalized", "ばか", "は\u200B\u3099か", "BLOCK"],
  ["normalized", "バカ", "ﾊﾞｶ".normalize("NFKC"), "BLOCK"],
];
console.log("kind | pattern | body | f4808fb | fa5dc19 | candidate | expected");
let failures = 0;
for (const [kind, pattern, body, expected] of rows) {
  const results = [];
  for (const mod of Object.values(versions)) results.push(await route(mod, kind, pattern, body));
  if (results[2] !== expected) failures += 1;
  const shown = [...body].map((ch) => (/[\p{M}\p{Cf}]/u.test(ch) ? `\\u${ch.codePointAt(0)!.toString(16).toUpperCase()}` : ch)).join("");
  console.log(`${kind} | ${pattern} | ${shown} | ${results.join(" | ")} | ${expected}`);
}
for (const text of ["ﾊﾞｶ", "ﾌﾞｽ", "ﾎﾟﾝｺﾂ", "ハ゛カ"]) console.log(`normal copy ${text} -> ${JSON.stringify(candNorm.normalizeText(text))}; NFKC of the whole text -> ${text.normalize("NFKC")}`);
const table = candTr.createTableTransliterator(new Map([["ガ", "ga"], ["カ", "ka"]]));
const read = (t: string) => { const r = table.transliterate("body", t); return `${r.mapped.text}/${r.complete}`; };
console.log(`reading with {ガ:ga,カ:ka}: ガカ -> ${read("ガカ")}; ｶﾞｶ -> ${read("ｶﾞｶ")}`);
console.log(`candidate misses: ${failures}`);
