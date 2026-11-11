// Extracts the live acceptance rows of the 5 cards of batch m7 part 1 (E01) and compares the S011 cards with cards-m6r1.json.
// Copied from the m6r1 extract-cards.cjs; only this header and the key list changed. S015 cards have no previous round.
// Usage: node extract-cards.cjs <workDir> <previousCardsJson> <outCardsJson>
const fs = require("fs");
const path = require("path");
const [workDir, prevPath, outPath] = process.argv.slice(2);
const keys = [
  "VOXWARD-STORY-011", "VOXWARD-SUB-021", "VOXWARD-SUB-022",
  "VOXWARD-STORY-015", "VOXWARD-SUB-028",
];
const prev = JSON.parse(fs.readFileSync(prevPath, "utf8"));
const prevByKey = Object.fromEntries(prev.map((c) => [c.externalKey, c]));
const cards = [];
let rowTotal = 0;
for (const k of keys) {
  const j = JSON.parse(fs.readFileSync(path.join(workDir, k + ".json"), "utf8"));
  const r = j.record, c = j.content, wc = j.workContent;
  const rows = c.acceptance.map((a) => ({
    acceptanceId: a.id,
    acceptanceVersion: a.version,
    requirement: { workId: a.requirement.workId, requirementId: a.requirement.requirementId, version: a.requirement.version },
    scenario: a.scenario,
    expected: a.expected,
    method: a.method,
  }));
  rowTotal += rows.length;
  cards.push({ externalKey: k, workId: r.id, revision: r.revision, libraryVersion: j.version, headEventHash: j.headEventHash, rows });
  const p = prevByKey[k];
  const same = p && JSON.stringify(p.rows) === JSON.stringify(rows);
  const diffs = [];
  if (p && !same) {
    const pm = Object.fromEntries(p.rows.map((x) => [x.acceptanceId, x]));
    for (const x of rows) {
      const y = pm[x.acceptanceId];
      if (!y) { diffs.push(`new ${x.acceptanceId}@${x.acceptanceVersion}`); continue; }
      for (const f of ["acceptanceVersion", "requirement", "scenario", "expected", "method"]) {
        if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) diffs.push(`${x.acceptanceId}.${f}`);
      }
    }
    for (const y of p.rows) if (!rows.find((x) => x.acceptanceId === y.acceptanceId)) diffs.push(`gone ${y.acceptanceId}`);
  }
  console.log([
    k, r.id, "rev", r.revision, r.status, "lib", j.version, "head", j.headEventHash.slice(0, 16),
    "complete", wc.complete, "missing", JSON.stringify(wc.missing), "sp", JSON.stringify(wc.structureProblems),
    "evidence", c.evidence.length, "rows", rows.length,
    "impact", JSON.stringify(j.contentImpact && j.contentImpact.impact),
    "impactRevs", `${j.contentImpact && j.contentImpact.previousRevision}->${j.contentImpact && j.contentImpact.currentRevision}`,
    "prevRev", p ? p.revision : "-", "rowsSameAsPrev", same ? "yes" : "no", diffs.length ? "diffs " + diffs.join(",") : "",
  ].join(" "));
}
fs.writeFileSync(outPath, JSON.stringify(cards, null, 1));
console.log("rows total", rowTotal);
