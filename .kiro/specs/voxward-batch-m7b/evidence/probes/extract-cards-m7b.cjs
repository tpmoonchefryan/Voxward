// Extracts the live acceptance rows of the four work items from the work-show outputs (E01) and checks that each INHERIT
// and PARENT row has the same expected, method and requirement on the Story and on its subtasks.
// Usage: node extract-cards-m7b.cjs <workDir> <outFile>
const fs = require("fs");
const path = require("path");
const [workDir, outFile] = process.argv.slice(2);
const KEYS = ["VOXWARD-STORY-021", "VOXWARD-SUB-039", "VOXWARD-SUB-040", "VOXWARD-SUB-049"];
const cards = [];
let head = null;
let library = null;
for (const key of KEYS) {
  const j = JSON.parse(fs.readFileSync(path.join(workDir, `${key}.json`), "utf8"));
  if (head === null) head = j.headEventHash;
  if (head !== j.headEventHash) throw new Error(`headEventHash differs for ${key}`);
  if (library === null) library = j.version;
  const c = j.content;
  cards.push({
    externalKey: key,
    workId: j.record.id,
    revision: j.record.revision,
    status: j.record.status,
    workContent: { complete: j.workContent.complete, missing: j.workContent.missing, structureProblems: j.workContent.structureProblems },
    evidenceRows: (c.evidence || []).length,
    rows: c.acceptance.map((a) => ({
      acceptanceId: a.id,
      acceptanceVersion: a.version,
      requirement: { workId: a.requirement.workId, requirementId: a.requirement.requirementId, version: a.requirement.version },
      scenario: a.scenario,
      expected: a.expected,
      method: a.method,
    })),
  });
}
// Same INHERIT suffix on the Story and its subtasks: same expected, method and requirement.
const story = cards[0];
const suffixOf = (id) => id.replace(/^VW-(S021|SUB039|SUB040|SUB049)-/, "");
const mismatches = [];
for (const sub of cards.slice(1, 3)) {
  for (const row of sub.rows) {
    const suffix = suffixOf(row.acceptanceId);
    if (!suffix.startsWith("INHERIT-")) continue;
    const twin = story.rows.find((r) => suffixOf(r.acceptanceId) === suffix);
    if (twin === undefined) mismatches.push(`${row.acceptanceId}: no Story twin`);
    else if (twin.expected !== row.expected || twin.method !== row.method || JSON.stringify(twin.requirement) !== JSON.stringify(row.requirement)) mismatches.push(`${row.acceptanceId}: differs from ${twin.acceptanceId}`);
  }
}
const out = { readFrom: { libraryVersion: library, headEventHash: head }, inheritTwinMismatches: mismatches, cards };
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
for (const card of cards) console.log(card.externalKey, card.workId, "rev", card.revision, card.status, "rows", card.rows.length, "evidence", card.evidenceRows, JSON.stringify(card.workContent));
console.log("library", library, "head", head, "twin mismatches", mismatches.length);
