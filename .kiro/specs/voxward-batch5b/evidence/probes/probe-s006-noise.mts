// Noise classification before and after B3. Usage: tsx probe-s006-noise.mts <checkout> <work>
const [C, W] = process.argv.slice(2);
const P = "apps/server/src/modules/moderation-engine/routing/classification.ts";
const cand = await import(`${C}/${P}`);
const prev = await import(`${W}/old/b1a1471/${P}`);
const inputs = ["www", "ｗｗｗ", "草草草", "８８８", "😂😂😂", "ﾊﾊﾊ", "ﾊﾞﾊﾟﾊ", "ﾊﾞﾊﾞﾊﾞ", "ハ\u309Bハ\u309Bハ\u309B", "ﾞﾞﾞ", "バカ", "www ﾊﾞｶ", ""];
for (const text of inputs) console.log(JSON.stringify(text), "b1a1471:", prev.classifyDeterministicNoise(text), " candidate:", cand.classifyDeterministicNoise(text));
