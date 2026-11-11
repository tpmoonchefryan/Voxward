// Build a work-batch that writes acceptance evidence into each target's content.
// Targets listed in DONE_KEYS (comma-separated env) also get completion and a done transition;
// other targets only record their evidence rows (failed ones included) so rejections stay on the chain.
// Usage: DONE_KEYS=K1,K2 node close-batch.js <evidence-records.json> <showDir> <out.json>
const fs = require("fs");
const path = require("path");
const [evFile, showDir, outFile] = process.argv.slice(2);
const doneKeys = new Set((process.env.DONE_KEYS ?? "").split(",").filter(Boolean));
const ev = JSON.parse(fs.readFileSync(evFile));
const annotate = [];
const done = [];
// Children first so the Story transition sees completed Subtasks.
const targets = [...ev.targets].sort((a, b) => (a.externalKey.includes("STORY") ? 1 : 0) - (b.externalKey.includes("STORY") ? 1 : 0));
for (const t of targets) {
  const show = JSON.parse(fs.readFileSync(path.join(showDir, `${t.externalKey}.json`)));
  if (show.record.id !== t.workId) throw new Error(`id mismatch ${t.externalKey}`);
  const content = structuredClone(show.content);
  const keep = content.evidence.filter((e) => !t.evidence.some((n) => n.acceptanceId === e.acceptanceId && n.codeVersion === e.codeVersion));
  content.evidence = [...keep, ...t.evidence];
  const close = doneKeys.has(t.externalKey);
  if (close) {
    if (t.evidence.some((e) => e.outcome !== "satisfied")) throw new Error(`${t.externalKey} has non-satisfied evidence`);
    content.completion = {
      result: `独立验收通过：${t.evidence.length} 行验收全部 satisfied，候选 ${t.evidence[0].codeVersion}；证据 ${t.evidence[0].locator.split("#")[0]}`,
      codeVersion: t.evidence[0].codeVersion,
    };
  }
  annotate.push({ verb: "work-annotate", id: t.workId, expectedRevision: show.record.revision, content });
  if (close) done.push({ verb: "work-transition", id: t.workId, status: "done" });
}
fs.writeFileSync(outFile, JSON.stringify({ schemaVersion: "tcrn.work-batch.v1", members: [...annotate, ...done] }));
console.log(JSON.stringify({ annotate: annotate.length, done: done.length }));
