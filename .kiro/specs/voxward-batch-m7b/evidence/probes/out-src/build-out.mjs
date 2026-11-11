// Builds acceptance.md and evidence-records.json for batch m7b from cards-m7b.json (live rows, E01), rows.mjs (outcome and
// evidence per row) and the acc-*.md fragments, then checks the shape of every evidence row. Nothing is written when a
// check fails. Usage: node build-out.mjs <outDir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rows } from "./rows.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
if (!outDir) throw new Error("usage: node build-out.mjs <outDir>");
const cardsFile = JSON.parse(fs.readFileSync(path.join(here, "cards-m7b.json"), "utf8"));
const cards = cardsFile.cards;
const byKey = Object.fromEntries(cards.map((card) => [card.externalKey, card]));
const CODE_VERSION = "7400f39";
const LOCATOR_FILE = ".kiro/specs/voxward-batch-m7b/evidence/acceptance.md";
const problems = [];

const kindOf = (method) =>
  method.startsWith("接口/数据字段/文档与原始需求核对") || method.startsWith("对照本单交付边界及依赖") ? "source-behavior-review" : "machine";
const anchorOf = (id) => id.toLowerCase();
const suffixOf = (id) => id.replace(/^VW-(S021|SUB039|SUB040|SUB049)-/, "");

function rowBlock(row, { withExpected }) {
  const entry = rows[row.acceptanceId];
  if (entry === undefined) {
    problems.push(`${row.acceptanceId}: no entry in rows.mjs`);
    return "";
  }
  const kind = kindOf(row.method);
  const req = row.requirement;
  const lines = [
    `<a id="${anchorOf(row.acceptanceId)}"></a>`,
    `**${row.acceptanceId}@${row.acceptanceVersion}：${entry.outcome}**（${kind}；要求 ${req.workId}#${req.requirementId}@${req.version}）`,
    "",
  ];
  if (withExpected) lines.push(`- expected：${row.expected}`);
  lines.push(`- 依据：${entry.actual}`, "");
  return lines.join("\n");
}

function ownRows(key, heading) {
  const card = byKey[key];
  const own = card.rows.filter((row) => !suffixOf(row.acceptanceId).startsWith("INHERIT-"));
  return [`### ${heading}`, "", ...own.map((row) => rowBlock(row, { withExpected: true }))].join("\n");
}

function inheritRows(keys, heading, note) {
  const parts = [`### ${heading}`, "", note, ""];
  const first = byKey[keys[0]];
  for (const twin of first.rows.filter((row) => suffixOf(row.acceptanceId).startsWith("INHERIT-"))) {
    const suffix = suffixOf(twin.acceptanceId);
    parts.push(`#### ${twin.requirement.requirementId}@${twin.requirement.version}（${suffix}）`, "", `expected：${twin.expected}`, "");
    for (const key of keys) {
      const row = byKey[key].rows.find((candidate) => suffixOf(candidate.acceptanceId) === suffix);
      if (row === undefined) {
        problems.push(`${key}: no ${suffix}`);
        continue;
      }
      if (row.expected !== twin.expected || row.method !== twin.method) problems.push(`${row.acceptanceId}: differs from ${twin.acceptanceId}`);
      parts.push(rowBlock(row, { withExpected: false }));
    }
  }
  return parts.join("\n");
}

const fragment = (name) => fs.readFileSync(path.join(here, name), "utf8").trimEnd();
const acceptance = [
  fragment("acc-00-head.md"),
  fragment("acc-10-common.md"),
  fragment("acc-20-s021.md"),
  "",
  ownRows("VOXWARD-STORY-021", "2.8 VOXWARD-STORY-021 本单行"),
  ownRows("VOXWARD-SUB-039", "2.9 VOXWARD-SUB-039 本单行"),
  ownRows("VOXWARD-SUB-040", "2.10 VOXWARD-SUB-040 本单行"),
  inheritRows(["VOXWARD-STORY-021", "VOXWARD-SUB-039", "VOXWARD-SUB-040"], "2.11 INHERIT 行", "同一 INHERIT 行在 Story 与两张子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。"),
  fragment("acc-40-s027.md"),
  "",
  ownRows("VOXWARD-SUB-049", "3.4 VOXWARD-SUB-049 本单行"),
  inheritRows(["VOXWARD-SUB-049"], "3.5 INHERIT 行", "VOXWARD-STORY-027 的同名行本轮不判（简报），下列只有 SUB-049 的行。"),
  fragment("acc-90-scope.md"),
  "",
].join("\n");

// ------------------------------------------------------------------ evidence rows and shape checks
const EIGHT = ["acceptanceId", "acceptanceVersion", "requirement", "codeVersion", "locator", "actual", "outcome", "kind"];
const targets = [];
const counts = { total: 0, satisfied: 0, failed: 0, unverified: 0, byTarget: {} };
const used = new Set();
for (const card of cards) {
  const evidence = [];
  const tally = { total: 0, satisfied: 0, failed: 0, unverified: 0 };
  for (const row of card.rows) {
    const entry = rows[row.acceptanceId];
    if (entry === undefined) continue;
    used.add(row.acceptanceId);
    const record = {
      acceptanceId: row.acceptanceId,
      acceptanceVersion: row.acceptanceVersion,
      requirement: { workId: row.requirement.workId, requirementId: row.requirement.requirementId, version: row.requirement.version },
      codeVersion: CODE_VERSION,
      locator: `${LOCATOR_FILE}#${anchorOf(row.acceptanceId)}`,
      actual: entry.actual,
      outcome: entry.outcome,
      kind: kindOf(row.method),
    };
    if (JSON.stringify(Object.keys(record)) !== JSON.stringify(EIGHT)) problems.push(`${row.acceptanceId}: keys`);
    if (JSON.stringify(Object.keys(record.requirement)) !== '["workId","requirementId","version"]') problems.push(`${row.acceptanceId}: requirement keys`);
    if (!Number.isInteger(record.acceptanceVersion) || record.acceptanceVersion < 1) problems.push(`${row.acceptanceId}: version`);
    if (!Number.isInteger(record.requirement.version) || record.requirement.version < 1) problems.push(`${row.acceptanceId}: requirement version`);
    if (!["satisfied", "failed", "unverified"].includes(record.outcome)) problems.push(`${row.acceptanceId}: outcome`);
    if (!["machine", "source-behavior-review"].includes(record.kind)) problems.push(`${row.acceptanceId}: kind`);
    if (typeof record.actual !== "string" || record.actual.trim().length < 40 || /^(pass|ok|success)$/i.test(record.actual.trim())) problems.push(`${row.acceptanceId}: actual`);
    if (/\$\{|undefined|TODO/.test(record.actual)) problems.push(`${row.acceptanceId}: placeholder in actual`);
    const anchorTag = `<a id="${anchorOf(row.acceptanceId)}"></a>`;
    const occurrences = acceptance.split(anchorTag).length - 1;
    if (occurrences !== 1) problems.push(`${row.acceptanceId}: anchor occurs ${occurrences} times`);
    if (!acceptance.includes(`**${row.acceptanceId}@${row.acceptanceVersion}：${record.outcome}**`)) problems.push(`${row.acceptanceId}: heading missing`);
    evidence.push(record);
    tally.total += 1;
    tally[record.outcome] += 1;
  }
  if (evidence.length !== card.rows.length) problems.push(`${card.externalKey}: ${evidence.length} rows written, ${card.rows.length} live`);
  counts.byTarget[card.externalKey] = tally;
  counts.total += tally.total;
  counts.satisfied += tally.satisfied;
  counts.failed += tally.failed;
  counts.unverified += tally.unverified;
  targets.push({ externalKey: card.externalKey, workId: card.workId, revision: card.revision, evidence });
}
for (const id of Object.keys(rows)) if (!used.has(id)) problems.push(`${id}: in rows.mjs but not a live row`);
for (const id of ["recheck", "spec", "gates", "isolation", "deps", "s021-summary", "s027-summary", "scope"]) {
  if (acceptance.split(`<a id="${id}"></a>`).length - 1 !== 1) problems.push(`section anchor ${id}`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const failedIds = targets.flatMap((target) => target.evidence.filter((row) => row.outcome === "failed").map((row) => row.acceptanceId));
const evidenceRecords = {
  note: `草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样追加到对应工单 content.evidence；targets 外层与说明字段不是引擎格式，写入前去掉。${counts.total} 行：satisfied ${counts.satisfied}、failed ${counts.failed}、unverified ${counts.unverified}。STORY-021 组 35 行中 ${failedIds.join("、")} 为 failed（B7，见 judgment.md），其余 satisfied；SUB-049 23 行全部 satisfied。四单的 content.evidence 目前为空。STORY-027 与 SUB-050 按简报本轮不出证据行。locator 指向 ${LOCATOR_FILE}，主线程需把本轮 acceptance.md 放到这个路径。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: "7400f392d1ed9ec78678b711d3bfd00fb3c5641c",
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选。SUB-049 可以用 7400f39 关单；STORY-021 组有 failed 行，不能以 7400f39 关单，返工后在新候选上重新判定（judgment.md「复验范围」）。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <KEY>…（内部 einzbern.mjs work-show --workspace <Ether> --external-key <KEY>；2026-11-11，4 单 xargs -P 6 并行，退出码均为 0）",
    libraryVersion: cardsFile.readFrom.libraryVersion,
    headEventHash: cardsFile.readFrom.headEventHash,
  },
  shapeCheck:
    "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次且该行标题存在、codeVersion 为 7400f39，并核对每单写出的行数与 E01 读到的实时行数相同、rows.mjs 没有多余或缺少的行、同一 INHERIT 行在 Story 与子单上的 expected 与 method 相同。没有调用引擎校验，也没有写入引擎。",
  counts,
  targets,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "acceptance.md"), acceptance);
fs.writeFileSync(path.join(outDir, "evidence-records.json"), `${JSON.stringify(evidenceRecords, null, 1)}\n`);
console.log(JSON.stringify(counts));
