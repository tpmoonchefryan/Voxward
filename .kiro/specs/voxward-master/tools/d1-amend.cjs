// Apply Owner decision D1 (minutes:8fc0b8640384844e0b2a1787): change the acceptance method of
// real-Kiro-call rows in STORY-008/SUB-015/SUB-016 to a stub-tested method, and add a real-run
// acceptance row to STORY-029. Usage: node d1-amend.cjs <showDir> <out.json>
const fs = require("fs");
const path = require("path");
const [dir, out] = process.argv.slice(2);
const MIN = "minutes:8fc0b8640384844e0b2a1787";
const members = [];
const load = (k) => JSON.parse(fs.readFileSync(path.join(dir, `${k}.json`)));
let changed = 0;
for (const k of ["VOXWARD-STORY-008", "VOXWARD-SUB-015", "VOXWARD-SUB-016"]) {
  const show = load(k);
  const content = structuredClone(show.content);
  content.acceptance = content.acceptance.map((a) => {
    if (!/真实 ?Kiro/.test(a.method) || /替身/.test(a.method)) return a;
    changed++;
    const method = a.method.replace(/固定版本真实 ?Kiro 调用/, "固定版本 kiro-cli 3.1.0 的假 CLI 替身调用")
      + `真实 Kiro 调用未验证，移到 VOXWARD-STORY-029 部署演练（${MIN}#D1）。`;
    return { ...a, method, version: a.version + 1 };
  });
  content.changeDecision = `${MIN}#D1`;
  members.push({ verb: "work-annotate", id: show.record.id, expectedRevision: show.record.revision, content });
}
const s029 = load("VOXWARD-STORY-029");
const c = structuredClone(s029.content);
const req = c.requirements[0];
if (!c.acceptance.some((a) => a.id === "VW-S029-KIRO-REAL")) {
  c.acceptance.push({
    id: "VW-S029-KIRO-REAL",
    version: 1,
    requirement: { workId: s029.record.id, requirementId: req.id, version: req.version },
    scenario: "使用独立运行时账号（独立系统用户、HOME、KIRO_API_KEY，最小权限）与合成消息，按固定版本 kiro-cli 做真实调用演练，包括正常完成、失败、取消与服务崩溃。",
    expected: "会话保存位置、--delete-session 效果、崩溃后孤儿会话清理与无人值守未信任工具处理都有实测结果；运行目录与 CLI 会话存储无残留；不使用开发账号。",
    method: `真实 Kiro 调用演练与文件/会话存储观察；账号与密钥由 Owner 提供（${MIN}#D2）。`,
  });
}
c.changeDecision = `${MIN}#D2`;
members.push({ verb: "work-annotate", id: s029.record.id, expectedRevision: s029.record.revision, content: c });
fs.writeFileSync(out, JSON.stringify({ schemaVersion: "tcrn.work-batch.v1", members }));
console.log(JSON.stringify({ changedRows: changed, members: members.length }));
