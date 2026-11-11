// Builds acceptance.md and evidence-records.json for batch 6 from the live rows (E01), the fragments and rows.mjs.
// Usage: node build-out.mjs <outDir>
// Reads cards-b6.json and the acc-*.md fragments from this directory. Fails (exit 1) on any shape problem.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROWS } from "./rows.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) throw new Error("usage: node build-out.mjs <outDir>");
const cards = JSON.parse(fs.readFileSync(path.join(here, "cards-b6.json"), "utf8"));
const frag = (name) => fs.readFileSync(path.join(here, name), "utf8").trimEnd();
const CODE = "0b929d3";
const FULL = "0b929d3edc9068206cbeac0aeb677cf4ccba5a70";
const LOC = ".kiro/specs/voxward-batch6/evidence/acceptance.md";
const problems = [];

const kindOf = (method) =>
  method.startsWith("接口/数据字段/文档与原始需求核对") || method.startsWith("对照本单交付边界及依赖") ? "source-behavior-review" : "machine";
const anchorOf = (id) => id.toLowerCase();
const card = (key) => cards.find((c) => c.externalKey === key);
const rowsOf = (key) => card(key).rows;

function block(row, withExpected) {
  const entry = ROWS[row.acceptanceId];
  if (!entry) {
    problems.push(`no text for ${row.acceptanceId}`);
    return "";
  }
  const [outcome, actual] = entry;
  const r = row.requirement;
  const lines = [
    `<a id="${anchorOf(row.acceptanceId)}"></a>`,
    `**${row.acceptanceId}@${row.acceptanceVersion}：${outcome}**（${kindOf(row.method)}；要求 ${r.workId}#${r.requirementId}@${r.version}）`,
    "",
  ];
  if (withExpected) lines.push(`- expected：${row.expected}`);
  lines.push(`- 依据：${actual}`);
  return lines.join("\n");
}

function ownRows(key, ids) {
  return rowsOf(key).filter((row) => ids.some((suffix) => row.acceptanceId.endsWith(suffix)));
}

function inheritSection(keys) {
  const parts = [];
  const story = rowsOf(keys[0]).filter((row) => row.acceptanceId.includes("-INHERIT-"));
  for (const sRow of story) {
    const suffix = sRow.acceptanceId.slice(sRow.acceptanceId.indexOf("-INHERIT-"));
    const r = sRow.requirement;
    const siblings = keys.map((k) => rowsOf(k).find((row) => row.acceptanceId.endsWith(suffix)));
    for (const sib of siblings) {
      if (!sib) problems.push(`missing sibling ${suffix}`);
      else if (sib.expected !== sRow.expected || sib.method !== sRow.method || JSON.stringify(sib.requirement) !== JSON.stringify(sRow.requirement)) {
        problems.push(`INHERIT row differs across tickets: ${sib.acceptanceId}`);
      }
    }
    parts.push(`#### ${r.requirementId}@${r.version}（${suffix.slice(1)}）`, "", `expected：${sRow.expected}`, "");
    for (const sib of siblings) if (sib) parts.push(block(sib, false), "");
  }
  return parts.join("\n").trimEnd();
}

function group(prefix, storyKey, subKeys) {
  const parts = [];
  parts.push(`### ${prefix}.4 ${storyKey} 本单行`, "");
  for (const row of ownRows(storyKey, ["-AC001", "-PARENT"])) parts.push(block(row, true), "");
  subKeys.forEach((sub, i) => {
    parts.push(`### ${prefix}.${5 + i} ${sub} 本单行`, "");
    for (const row of ownRows(sub, ["-AC001", "-STORY", "-PARENT"])) parts.push(block(row, true), "");
  });
  parts.push(`### ${prefix}.${5 + subKeys.length} INHERIT 行`, "", "同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。", "");
  parts.push(inheritSection([storyKey, ...subKeys]));
  return parts.join("\n");
}

const s009Keys = ["VOXWARD-STORY-009", "VOXWARD-SUB-017", "VOXWARD-SUB-018"];
const s013Keys = ["VOXWARD-STORY-013", "VOXWARD-SUB-024", "VOXWARD-SUB-025"];
const count = (keys) => keys.reduce((n, k) => n + rowsOf(k).length, 0);
const tally = (keys, outcome) => keys.reduce((n, k) => n + rowsOf(k).filter((row) => ROWS[row.acceptanceId]?.[0] === outcome).length, 0);
const label = (keys) => {
  const total = count(keys);
  const sat = tally(keys, "satisfied");
  return sat === total ? `${total} 行，全部 satisfied` : `${total} 行：${sat} 行 satisfied，${tally(keys, "failed")} 行 failed`;
};

// The S009 summary fragment numbers its subsections 2.0–2.3, the S013 one 3.0–3.4; row sections follow.
const s013Group = group("3", "VOXWARD-STORY-013", ["VOXWARD-SUB-024", "VOXWARD-SUB-025"]).replace(/^### 3\.(\d)/gm, (_m, d) => `### 3.${Number(d) + 1}`);
const md = [
  frag("acc-00-head.md"),
  "",
  `## 2. VOXWARD-STORY-009 组（${label(s009Keys)}）`,
  "",
  frag("acc-20-s009.md"),
  "",
  group("2", "VOXWARD-STORY-009", ["VOXWARD-SUB-017", "VOXWARD-SUB-018"]),
  "",
  `## 3. VOXWARD-STORY-013 组（${label(s013Keys)}）`,
  "",
  frag("acc-30-s013.md"),
  "",
  s013Group,
  "",
  frag("acc-90-scope.md"),
  "",
].join("\n");

// ---------- evidence records ----------
const targets = [];
const byTarget = {};
for (const c of cards) {
  const evidence = c.rows.map((row) => {
    const entry = ROWS[row.acceptanceId] ?? ["unverified", ""];
    return {
      acceptanceId: row.acceptanceId,
      acceptanceVersion: row.acceptanceVersion,
      requirement: { workId: row.requirement.workId, requirementId: row.requirement.requirementId, version: row.requirement.version },
      codeVersion: CODE,
      locator: `${LOC}#${anchorOf(row.acceptanceId)}`,
      actual: entry[1],
      outcome: entry[0],
      kind: kindOf(row.method),
    };
  });
  targets.push({ externalKey: c.externalKey, workId: c.workId, revision: c.revision, evidence });
  const t = { total: evidence.length, satisfied: 0, failed: 0, unverified: 0 };
  for (const e of evidence) t[e.outcome] += 1;
  byTarget[c.externalKey] = t;
}

// ---------- shape checks ----------
const KEYS = ["acceptanceId", "acceptanceVersion", "requirement", "codeVersion", "locator", "actual", "outcome", "kind"];
for (const t of targets) {
  const live = rowsOf(t.externalKey);
  if (live.length !== t.evidence.length) problems.push(`${t.externalKey}: ${t.evidence.length} rows, live ${live.length}`);
  t.evidence.forEach((e, i) => {
    const l = live[i];
    if (JSON.stringify(Object.keys(e)) !== JSON.stringify(KEYS)) problems.push(`${e.acceptanceId}: keys`);
    if (JSON.stringify(Object.keys(e.requirement)) !== JSON.stringify(["workId", "requirementId", "version"])) problems.push(`${e.acceptanceId}: requirement keys`);
    if (!Number.isInteger(e.acceptanceVersion) || e.acceptanceVersion < 1 || !Number.isInteger(e.requirement.version) || e.requirement.version < 1) problems.push(`${e.acceptanceId}: versions`);
    if (!["satisfied", "failed", "unverified"].includes(e.outcome)) problems.push(`${e.acceptanceId}: outcome`);
    if (!["machine", "source-behavior-review"].includes(e.kind)) problems.push(`${e.acceptanceId}: kind`);
    if (e.actual.length < 40 || /^(pass|ok|success)$/i.test(e.actual.trim())) problems.push(`${e.acceptanceId}: actual too thin`);
    if (/\$\{|undefined|TODO|TBD/.test(e.actual)) problems.push(`${e.acceptanceId}: placeholder in actual`);
    if (e.codeVersion !== CODE) problems.push(`${e.acceptanceId}: codeVersion`);
    if (e.acceptanceId !== l.acceptanceId || e.acceptanceVersion !== l.acceptanceVersion || JSON.stringify(e.requirement) !== JSON.stringify(l.requirement)) problems.push(`${e.acceptanceId}: does not match the live row`);
    const anchor = `<a id="${e.locator.split("#")[1]}"></a>`;
    const hits = md.split(anchor).length - 1;
    if (hits !== 1) problems.push(`${e.acceptanceId}: anchor appears ${hits} times`);
    if (!md.includes(`**${e.acceptanceId}@${e.acceptanceVersion}：${e.outcome}**`)) problems.push(`${e.acceptanceId}: heading missing in acceptance.md`);
  });
}
for (const id of Object.keys(ROWS)) if (!cards.some((c) => c.rows.some((r) => r.acceptanceId === id))) problems.push(`text for unknown row ${id}`);

const all = targets.flatMap((t) => t.evidence);
const counts = {
  total: all.length,
  satisfied: all.filter((e) => e.outcome === "satisfied").length,
  failed: all.filter((e) => e.outcome === "failed").length,
  unverified: all.filter((e) => e.outcome === "unverified").length,
  byTarget,
};
const records = {
  note: "草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样放进对应工单 content.evidence；targets 外层与说明字段不是引擎格式，写入前去掉。64 行全部 satisfied：STORY-009 组 35 行（第 5b 批 B4、B5 已修复），STORY-013 组 29 行。S009 组三单的 content.evidence 里已有 5ce5bee 的一批行（其中有 failed 行），本轮行以 codeVersion 0b929d3 追加；转 done 时完成候选须为同一字符串 0b929d3。locator 指向 .kiro/specs/voxward-batch6/evidence/acceptance.md，主线程需把本轮 acceptance.md 放到这个路径。",
  candidate: {
    codeVersion: CODE,
    fullSha: FULL,
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选。若主线程改在更新的候选上关单，先按 judgment.md「复验范围」确认相关路径的 diff 为空，再重新盖 codeVersion。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <KEY>…（内部 einzbern.mjs work-show --workspace <Ether> --external-key <KEY>；2026-11-11，6 单 xargs -P 6 并行，退出码均为 0）",
    libraryVersion: cards[0].libraryVersion,
    headEventHash: cards[0].headEventHash,
  },
  shapeCheck:
    "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次且该行标题存在、codeVersion 为 0b929d3，并核对 acceptanceId、acceptanceVersion 与 requirement 和 E01 读到的实时验收行逐项相同、每单行数与实时行数相同、同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 相同。没有调用引擎校验，也没有写入引擎。",
  counts,
  targets,
};

if (new Set(cards.map((c) => c.headEventHash)).size !== 1 || new Set(cards.map((c) => c.libraryVersion)).size !== 1) problems.push("cards read from different library states");
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
fs.writeFileSync(path.join(out, "acceptance.md"), md);
fs.writeFileSync(path.join(out, "evidence-records.json"), `${JSON.stringify(records, null, 1)}\n`);
console.log(JSON.stringify({ rows: counts.total, satisfied: counts.satisfied, failed: counts.failed, unverified: counts.unverified, byTarget, mdBytes: Buffer.byteLength(md) }));
