// Builds acceptance.md and evidence-records.json from the fragments and rows.mjs, then checks their shape.
// Usage: node build-out.mjs <work> <out>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROWS } from "./rows.mjs";

const [W, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const SRC = join(W, "out-src");
const cards = JSON.parse(readFileSync(join(W, "cards.json"), "utf8"));
const seed = JSON.parse(readFileSync(join(W, "VOXWARD-STORY-006.json"), "utf8"));
const CODE = "b1a1471";
const LOCATOR = ".kiro/specs/voxward-batch5a/evidence/acceptance.md";

const GROUPS = [
  { story: "VOXWARD-STORY-006", subs: ["VOXWARD-SUB-012"], fragment: "acc-20-s006.md", section: 2, start: 2 },
  { story: "VOXWARD-STORY-008", subs: ["VOXWARD-SUB-015", "VOXWARD-SUB-016"], fragment: "acc-30-s008.md", section: 3 },
  { story: "VOXWARD-STORY-017", subs: ["VOXWARD-SUB-031", "VOXWARD-SUB-032"], fragment: "acc-40-s017.md", section: 4 },
  { story: "VOXWARD-STORY-018", subs: ["VOXWARD-SUB-033", "VOXWARD-SUB-034"], fragment: "acc-50-s018.md", section: 5 },
];

const REVIEW_METHODS = [/^接口\/数据字段\/文档与原始需求核对/, /^对照本单交付边界及依赖/];
const kindOf = (row) => (REVIEW_METHODS.some((re) => re.test(row.method)) ? "source-behavior-review" : "machine");
const anchorOf = (id) => id.toLowerCase();
const req = (row) => `${row.requirement.workId}#${row.requirement.requirementId}@${row.requirement.version}`;
const suffixOf = (id) => id.replace(/^VW-(S|SUB)\d+-/, "");

function rowBlock(row, withExpected) {
  const text = ROWS[row.id];
  if (!text) throw new Error(`no text for ${row.id}`);
  const lines = [
    `<a id="${anchorOf(row.id)}"></a>`,
    `**${row.id}@${row.version}：${text.outcome}**（${kindOf(row)}；要求 ${req(row)}）`,
    "",
  ];
  if (withExpected) lines.push(`- expected：${row.expected}`);
  lines.push(`- 依据：${text.actual}`, "");
  return lines.join("\n");
}

function groupRows(group) {
  const parts = [];
  let n = group.start ?? 1;
  const story = cards[group.story];
  const own = (card) => card.acceptance.filter((row) => !suffixOf(row.id).startsWith("INHERIT"));
  parts.push(`### ${group.section}.${n++} ${group.story} 本单行\n`);
  for (const row of own(story)) parts.push(rowBlock(row, true));
  for (const sub of group.subs) {
    parts.push(`### ${group.section}.${n++} ${sub} 本单行\n`);
    for (const row of own(cards[sub])) parts.push(rowBlock(row, true));
  }
  parts.push(`### ${group.section}.${n++} INHERIT 行\n`);
  parts.push("同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。\n");
  for (const storyRow of story.acceptance.filter((row) => suffixOf(row.id).startsWith("INHERIT"))) {
    const suffix = suffixOf(storyRow.id);
    parts.push(`#### ${storyRow.requirement.requirementId}@${storyRow.requirement.version}（${suffix}）\n`);
    parts.push(`expected：${storyRow.expected}\n`);
    parts.push(rowBlock(storyRow, false));
    for (const sub of group.subs) {
      const subRow = cards[sub].acceptance.find((row) => suffixOf(row.id) === suffix);
      if (subRow) parts.push(rowBlock(subRow, false));
    }
  }
  return parts.join("\n");
}

const doc = [readFileSync(join(SRC, "acc-00-head.md"), "utf8").trimEnd(), ""];
for (const group of GROUPS) {
  doc.push(readFileSync(join(SRC, group.fragment), "utf8").trimEnd(), "", groupRows(group).trimEnd(), "");
}
doc.push(readFileSync(join(SRC, "acc-90-scope.md"), "utf8").trimEnd(), "");
const acceptance = doc.join("\n");
writeFileSync(join(OUT, "acceptance.md"), acceptance);

// ---------- evidence records ----------
const targets = [];
const counts = { total: 0, satisfied: 0, failed: 0, unverified: 0, byTarget: {} };
const problems = [];
const KEYS = ["acceptanceId", "acceptanceVersion", "requirement", "codeVersion", "locator", "actual", "outcome", "kind"];
for (const group of GROUPS) {
  for (const key of [group.story, ...group.subs]) {
    const card = cards[key];
    const evidence = card.acceptance.map((row) => {
      const text = ROWS[row.id];
      return {
        acceptanceId: row.id,
        acceptanceVersion: row.version,
        requirement: { workId: row.requirement.workId, requirementId: row.requirement.requirementId, version: row.requirement.version },
        codeVersion: CODE,
        locator: `${LOCATOR}#${anchorOf(row.id)}`,
        actual: text.actual,
        outcome: text.outcome,
        kind: kindOf(row),
      };
    });
    const tally = { total: evidence.length, satisfied: 0, failed: 0, unverified: 0 };
    for (const record of evidence) {
      tally[record.outcome] += 1;
      counts[record.outcome] += 1;
      counts.total += 1;
      if (JSON.stringify(Object.keys(record)) !== JSON.stringify(KEYS)) problems.push(`${record.acceptanceId}: keys`);
      if (JSON.stringify(Object.keys(record.requirement)) !== JSON.stringify(["workId", "requirementId", "version"])) problems.push(`${record.acceptanceId}: requirement keys`);
      if (!Number.isInteger(record.acceptanceVersion) || record.acceptanceVersion < 1) problems.push(`${record.acceptanceId}: version`);
      if (!["satisfied", "failed", "unverified"].includes(record.outcome)) problems.push(`${record.acceptanceId}: outcome`);
      if (!["machine", "source-behavior-review"].includes(record.kind)) problems.push(`${record.acceptanceId}: kind`);
      if (record.actual.trim().length < 40 || /^(pass|ok|success)$/i.test(record.actual.trim())) problems.push(`${record.acceptanceId}: actual`);
      if (/<[A-Za-z_一-龥]+>|\$\{|TODO|TBD/.test(record.actual)) problems.push(`${record.acceptanceId}: placeholder`);
      const anchor = `<a id="${anchorOf(record.acceptanceId)}"></a>`;
      const occurrences = acceptance.split(anchor).length - 1;
      if (occurrences !== 1) problems.push(`${record.acceptanceId}: anchor x${occurrences}`);
      const live = card.acceptance.find((row) => row.id === record.acceptanceId);
      if (live.version !== record.acceptanceVersion || live.requirement.workId !== record.requirement.workId || live.requirement.requirementId !== record.requirement.requirementId || live.requirement.version !== record.requirement.version) problems.push(`${record.acceptanceId}: live mismatch`);
    }
    if (evidence.length !== card.acceptance.length) problems.push(`${key}: row count`);
    counts.byTarget[key] = tally;
    targets.push({ externalKey: key, workId: card.id, revision: card.rev, evidence });
  }
}
const unusedTexts = Object.keys(ROWS).filter((id) => !Object.values(cards).some((card) => card.acceptance.some((row) => row.id === id)));
if (unusedTexts.length > 0) problems.push(`texts without a live row: ${unusedTexts.join(", ")}`);

const records = {
  note: "草稿，供主线程链写。targets[].evidence 中每一行只含引擎 evidence 行允许的八个键，可原样放进对应工单 content.evidence，替换其中第 4 批 c67db24 的旧行；targets 外层与说明字段不是引擎格式，写入前去掉。STORY-008、STORY-017、STORY-018 三组全部 satisfied，可以 b1a1471 链写。STORY-006 组有 2 行 failed（B3，归属 SUB-012），同一候选上的 failed 行会阻断该组转 done，返工后须在新候选上重新取证。locator 指向 .kiro/specs/voxward-batch5a/evidence/acceptance.md，主线程需把本轮 acceptance.md 放到这个路径。简报写 10 张单，工单表实为 11 张，这里覆盖 11 张。",
  candidate: {
    codeVersion: CODE,
    fullSha: "b1a147172ff4ca26e024f4f2d2111814d3ca0923",
    note: "引擎按字符串精确比较 evidence.codeVersion 与完成候选，转 done 时须使用同一字符串 b1a1471。若 S008、S017、S018 改在 S006 返工后的新候选上关单，先按 judgment.md「复验范围」确认相关路径的 diff 为空，再重新盖 codeVersion。写入时以读回的 revision 为准。",
  },
  readFrom: {
    command: "bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <KEY>…（内部 einzbern.mjs work-show --workspace <Ether> --external-key <KEY>；2026-11-11，11 单 xargs -P 6 并行，退出码均为 0）",
    libraryVersion: seed.version,
    headEventHash: seed.headEventHash,
  },
  shapeCheck: "生成脚本对每一行检查：键名与顺序精确为八个、requirement 三键、正整数版本、outcome 与 kind 枚举、kind 按方法确定（方法以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的为 source-behavior-review，其余为 machine）、actual 非空且不是裸 pass/ok/success、无未替换占位符、locator 锚点在 acceptance.md 中恰好出现一次、codeVersion 为 b1a1471，并核对 acceptanceVersion 与 requirement 和 E01 读到的实时验收行逐项相同、每单行数与实时行数相同。没有调用引擎校验，也没有写入引擎。",
  counts,
  targets,
};
writeFileSync(join(OUT, "evidence-records.json"), `${JSON.stringify(records, null, 1)}\n`);
console.log(JSON.stringify({ counts, problems }, null, 1));
process.exit(problems.length === 0 ? 0 : 1);
