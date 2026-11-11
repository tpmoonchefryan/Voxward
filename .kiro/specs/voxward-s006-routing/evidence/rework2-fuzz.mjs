// Random-corpus audit of normalizeText. Usage: node rework2-fuzz.mjs <pre-normalize.mts> <post-normalize.mts>
// The two arguments are copies of rules/normalize.ts before (git show fe93a49:...) and after the change, saved with
// the extension .mts so that Node 24 strips the types itself. normalize.ts has no imports.
// Compares the code before and after the B3 change, and the code after the change with a whole-string reference.
const [preFile, postFile] = process.argv.slice(2);
const pre = await import(preFile);
const post = await import(postFile);

let seed = 20261111;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const pick = (list) => list[Math.floor(rand() * list.length)];

const pools = {
  ascii: [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-_"],
  fullwidthLatin: [..."ＡＢＣａｂｃ１２３"],
  hiragana: [..."あいうえおかきくけこはひふへほばびぶべぼぱぴぷぺぽがぎぐげごゔゝ"],
  katakana: [..."アイウエオカキクケコハヒフヘホバビブベボパピプペポガギグゲゴヴワヲヽー"],
  halfwidthKana: [..."ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾜｦﾝｰ"],
  soundMarks: ["\u3099", "\u309A", "\u309B", "\u309C", "\uFF9E", "\uFF9F"],
  formats: ["\u200B", "\u200C", "\u200D", "\u2060", "\u00AD", "\uFEFF", "\u200E", "\u061C", "\u180E"],
  invisibleMarks: ["\uFE0F", "\uFE00", "\u034F", "\u180B", "\u{E0100}"],
  diacritics: ["\u0300", "\u0301", "\u0302", "\u0303", "\u0308", "\u0323", "\u20D7", "\u1AB0", "\u1DC0"],
  latinAccent: [..."éèêëàáâãäçñüöÿ"],
  vietnamese: [..."ếềểễệắằẳẵặơưạảãấầẩ"],
  hangul: [..."바보파부가각한글"],
  hangulJamo: ["\u1100", "\u1107", "\u1161", "\u1169", "\u11A8", "\u11AB", "\uD7B0"],
  hangulCompat: ["\u3142", "\u314F", "\u3157"],
  arabic: [..."كلبَُّْٰ", "\u0640"],
  cyrillic: [..."мойёжиеЙЁ"],
  han: [..."笨蛋你好世界"],
  emoji: ["\u{1F600}", "\u{1F44D}", "\u{1F3FD}", "\u200D", "\uFE0F", "\u20E3", "1"],
  other: [..."㍿ﬁ①½™ℌ"],
  stray: ["\u00B4", "\u00A8", "\u02DC", "\uFFE3"],
};
const names = Object.keys(pools);

function makeString() {
  const length = 1 + Math.floor(rand() * 12);
  let text = "";
  const kinds = new Set();
  for (let index = 0; index < length; index += 1) {
    const kind = pick(names);
    kinds.add(kind);
    text += pick(pools[kind]);
  }
  return { text, kinds };
}

const INVISIBLE = /\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/gu;
const COMBINING = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/gu;
// The whole-string reference: drop the invisible characters, map the spacing marks, normalize the whole text at once.
const reference = (raw, strip) => {
  const visible = raw.replace(INVISIBLE, "").replace(/\u309B/gu, "\u3099").replace(/\u309C/gu, "\u309A");
  const composed = strip ? visible.normalize("NFKD").replace(COMBINING, "").normalize("NFKC") : visible.normalize("NFKC");
  return composed.toLowerCase().replace(/[\p{M}\p{Cf}]/gu, "");
};
const show = (text) =>
  [...text]
    .map((char) =>
      /[\p{M}\p{Cf}\u309B\u309C\uFF9E\uFF9F\p{Cc}]/u.test(char)
        ? `\\u${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`
        : char,
    )
    .join("");

const TOUCHES_B3 = /[\u309B\u309C\uFF9E\uFF9F]|\p{Cf}|(?=\p{M})\p{Default_Ignorable_Code_Point}/u;
const total = 300000;
const changedByPools = new Map();
const referenceByPools = new Map();
let changed = 0;
let changedWithoutB3Input = 0;
let differsFromReference = 0;
let mappingViolations = 0;
let differsWithoutCompatJamo = 0;
let changedOnlyInvisible = 0;
const invisibleOnlySamples = [];

for (let index = 0; index < total; index += 1) {
  const { text, kinds } = makeString();
  for (const strip of [true, false]) {
    const options = { stripCombiningMarks: strip };
    const before = pre.normalizeText(text, options);
    const after = post.normalizeText(text, options);
    if (before !== after) {
      changed += 1;
      if (!TOUCHES_B3.test(text)) changedWithoutB3Input += 1;
      if (!/[\u309B\u309C\uFF9E\uFF9F]/u.test(text)) {
        changedOnlyInvisible += 1;
        if (invisibleOnlySamples.length < 6) invisibleOnlySamples.push(`${show(text)} : ${show(before)} -> ${show(after)}`);
      }
      const key = [...kinds].sort().join("+");
      const entry = changedByPools.get(key) ?? { count: 0, sample: `${show(text)} : ${show(before)} -> ${show(after)}` };
      entry.count += 1;
      changedByPools.set(key, entry);
    }
    const wanted = reference(text, strip);
    if (after !== wanted) {
      differsFromReference += 1;
      if (!kinds.has("hangulCompat")) differsWithoutCompatJamo += 1;
      const key = [...kinds].sort().join("+");
      const entry = referenceByPools.get(key) ?? { count: 0, sample: `${show(text)} : after ${show(after)} reference ${show(wanted)}` };
      entry.count += 1;
      referenceByPools.set(key, entry);
    }
    // Invariants of the unit map: contiguous in the source and in the copy, and the copy equals normalizeText.
    const field = post.normalizeField("body", text, options);
    let sourceAt = 0;
    let copyAt = 0;
    for (const unit of field.units) {
      if (unit.srcStart !== sourceAt || unit.start !== copyAt || unit.end < unit.start || unit.srcEnd <= unit.srcStart) {
        mappingViolations += 1;
      }
      sourceAt = unit.srcEnd;
      copyAt = unit.end;
    }
    if (sourceAt !== text.length || copyAt !== field.text.length || field.text !== after) mappingViolations += 1;
  }
}

console.log(`strings ${total} x 2 options`);
console.log(`before/after differ: ${changed}; of those, input without a sound mark or invisible character: ${changedWithoutB3Input}`);
console.log(`after differs from the whole-string reference: ${differsFromReference}`);
console.log(`unit-map violations: ${mappingViolations}`);
console.log(`after differs from the reference, input without compatibility jamo: ${differsWithoutCompatJamo}`);
console.log(`before/after differ, input without U+309B/U+309C/U+FF9E/U+FF9F (invisible characters only): ${changedOnlyInvisible}`);
for (const sample of invisibleOnlySamples) console.log("   e.g.", sample);
console.log("--- before/after differences by pools in the string (top 10)");
for (const [key, value] of [...changedByPools.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)) {
  console.log(String(value.count).padStart(7), key, "  e.g.", value.sample);
}
console.log("--- after vs reference, by pools (top 10)");
for (const [key, value] of [...referenceByPools.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)) {
  console.log(String(value.count).padStart(7), key, "  e.g.", value.sample);
}
