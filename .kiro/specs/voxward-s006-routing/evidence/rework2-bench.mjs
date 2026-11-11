// Time of normalizeField on bodies of 300 to 500 characters, before and after the B3 change.
// Usage: node rework2-bench.mjs <pre-normalize.mts> <post-normalize.mts>   (copies of rules/normalize.ts, as for the fuzz script)
const [preFile, postFile] = process.argv.slice(2);
const versions = { before: await import(preFile), after: await import(postFile) };

const samples = {
  "ASCII chat line": "this stream is great, thanks for the gift!! see you next time ".repeat(9).slice(0, 500),
  "Japanese text": "今日の配信ありがとうございました！またねー。ガチャ回したらバカみたいに爆死したｗｗｗ".repeat(10).slice(0, 500),
  "half-width kana with marks": "ﾊﾞｶ ﾌﾞｽ ﾃﾞﾌﾞ ﾊｹﾞ ﾎﾟﾝｺﾂ ﾊﾟﾝ ｶﾞｽ ".repeat(20).slice(0, 500),
  "text with format characters": "ba\u200Bd w\u2060ord ば\u200Bか は\u200B\u3099か ".repeat(15).slice(0, 500),
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeOne(module, text, options) {
  const rounds = 9;
  const perRound = 300;
  const times = [];
  for (let round = 0; round < rounds + 2; round += 1) {
    const start = process.hrtime.bigint();
    for (let index = 0; index < perRound; index += 1) module.normalizeField("body", text, options);
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6 / perRound;
    if (round >= 2) times.push(elapsed);
  }
  return median(times);
}

console.log("sample | option | before ms/call | after ms/call | ratio");
// Alternate the order so a warm-up or load drift hits both versions alike.
for (const [name, text] of Object.entries(samples)) {
  for (const strip of [true, false]) {
    const options = { stripCombiningMarks: strip };
    const first = timeOne(versions.before, text, options);
    const second = timeOne(versions.after, text, options);
    const third = timeOne(versions.before, text, options);
    const fourth = timeOne(versions.after, text, options);
    const before = (first + third) / 2;
    const after = (second + fourth) / 2;
    console.log(`${name} (${text.length} chars) | strip=${strip} | ${before.toFixed(4)} | ${after.toFixed(4)} | ${(after / before).toFixed(2)}`);
  }
}
