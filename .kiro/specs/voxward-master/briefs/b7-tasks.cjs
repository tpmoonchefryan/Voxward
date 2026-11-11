// Render batch 6 (master table) implementer briefs: S010, S011, S014.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const common = "- 第 4–6 批已完成：S006（审核路由与归一化）、S008（Kiro CLI 适配器）、S009（task-coordinator：车道、截止、有限重试、Crew 适配）、S012（YouTube 凭据，含 PKCE）、S013（streamList 接入、身份映射、配额、版本化 ChannelEvent）、S016、S017、S018。\n- 工单 deliverables 里的路径用的是拆单时的旧模块名。实际模块名以 `apps/server/src/modules/` 为准：`inference` → `inference-provider`，`moderation` → `moderation-engine`，`decision` → `decision-service`。测试目录同理。把映射写进 spec 的偏离表。\n- 被拒时：如果返回 `User denied tool execution`，可能是批准框超时。不要换写法绕过，停下来报告。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读）。";
const pkgs = [
  {
    file: "b7-s010.md", PKG: "P-S010", WT: "s010-sc-translation", SPEC: "voxward-s010-sc-translation",
    STORY_KEY: "VOXWARD-STORY-010", STORY_ID: "work:029c382b5915050f0c4de600",
    TICKETS: "- 父 Story：VOXWARD-STORY-010（work:029c382b5915050f0c4de600）「实现 SC 安全精翻与模型能力设置」\n- VOXWARD-SUB-019（work:8369223695f7ef4f1f9e7d13）「实现实时/SC/复盘模型与 reasoning 能力设置」\n- VOXWARD-SUB-020（work:9165df7ffbc45df4a73496f9）「实现付费 SC 安全审核后的双语精翻小抄」\n顺序：先 SUB-019，再 SUB-020。",
    SECTIONS: " §8（第 261–352 行）、§9.1（第 355–362 行）、§13.1（第 524–531 行）",
    OTHERS: "同批还有 S011（`.worktrees/s011-review`，改 moderation-engine/review）和 S014（`.worktrees/s014-decision`，改 decision-service）。",
    EXTRA: "\n## 注意\n- **先修 Q40**：Super Chat 留言在 `superChatDetails.userComment`，`apps/server/src/modules/platform-source/youtube/stream-list.ts` 没读，事件正文为空；测试替身塞了 `textMessageDetails`，所以测不出。改读取逻辑，并把替身改成真实形状（有 SC 留言、无留言两种）。单独 commit，提交信息含 `VOXWARD-STORY-010 Q40`。\n- **Q23**：SC 里判为 BLOCK 的条目，译文如果命中规则，会让整批失败。按提案 §8 定行为：BLOCK 条目不进精翻；译文命中规则只影响该条，不让整批失败。加测试。\n- 模型能力设置只是配置和校验，**不调用真实模型**。推理一律用 S008 适配器的假 CLI 替身。\n- 只改 inference-provider 模块、它的测试，以及 Q40 涉及的 `stream-list.ts` 和测试。需要改 contracts 时做最小改动，并写进报告的冲突清单。\n",
  },
  {
    file: "b7-s011.md", PKG: "P-S011", WT: "s011-review", SPEC: "voxward-s011-review",
    STORY_KEY: "VOXWARD-STORY-011", STORY_ID: "work:8f928245aa79a29f26ad28a6",
    TICKETS: "- 父 Story：VOXWARD-STORY-011（work:8f928245aa79a29f26ad28a6）「实现快速通道复盘与候选词确认」\n- VOXWARD-SUB-021（work:a42a05e89d8c991f62abd995）「实现快速通道复盘选择、临时作者别名与统一结算」\n- VOXWARD-SUB-022（work:49db71dc5c4327f322c4c4af）「实现谐音候选词卡片与授权确认接口」\n顺序：先 SUB-021，再 SUB-022。",
    SECTIONS: " §5.3、§5.4（第 186–199 行）、§6.2（第 208–220 行）、§7.2（第 245–252 行）",
    OTHERS: "同批还有 S010（`.worktrees/s010-sc-translation`，改 inference-provider 和 stream-list.ts）和 S014（`.worktrees/s014-decision`，改 decision-service）。",
    EXTRA: "\n## 注意\n- 复盘任务走 S009 的 `enqueueInLane(\"BACKGROUND\", …)`，只用 task-coordinator 已导出的接口。**不要改 `task-coordinator/` 的内部实现**；只有 Q38 例外（见下）。\n- **Q27（前半）**：「BLOCK 与复核记录」接线在本包完成：复盘判为 BLOCK 时写复核记录，进人工队列。加测试。\n- **Q38**：task-coordinator 结算后的轻量记录约 514 字节/条，只增不减。复盘接线后量会变大。按「结算后删除记录，或只保留有上限的近期窗口」修，单独 commit，提交信息含 `VOXWARD-STORY-011 Q38`，并加测试证明记录数有上限。\n- 候选词卡片只做卡片和授权确认接口；确认需要频道角色鉴权（S003）。不自动把候选词写进规则。\n- 推理一律用替身，不连真实 Kiro 或 Crew。\n",
  },
  {
    file: "b7-s014.md", PKG: "P-S014", WT: "s014-decision", SPEC: "voxward-s014-decision",
    STORY_KEY: "VOXWARD-STORY-014", STORY_ID: "work:210958ccce508a7abf314287",
    TICKETS: "- 父 Story：VOXWARD-STORY-014（work:210958ccce508a7abf314287）「实现人工裁决、冲突提示与计分纠错」\n- VOXWARD-SUB-026（work:e054586882ab35ec0b6a5fca）「实现 DecisionService 人工接管、复核改判与冲突状态」\n- VOXWARD-SUB-027（work:72af8ac97c70068c90e95e09）「实现计分纠错补偿、名单/词条权限与过期消息补发动作」\n顺序：先 SUB-026，再 SUB-027。",
    SECTIONS: " §7.1–§7.3（第 229–260 行）、§10（第 387–406 行）、§11.4（第 444–460 行）",
    OTHERS: "同批还有 S010（`.worktrees/s010-sc-translation`，改 inference-provider）和 S011（`.worktrees/s011-review`，改 moderation-engine/review 和 task-coordinator 记录回收）。",
    EXTRA: "\n## 注意\n- **Q19**：① 首次决策没有效果时也要留幂等记录；② 人工补偿和身份事件的幂等键按频道（和主体）划分，不要全局；③ 计分入口要能和业务事务组合（同一个短事务里提交裁决和计分）。如果要改 scoring-engine 或 `apps/server/src/db/scoring-ledger.ts`，只做最小改动，加测试。\n- **Q21**：例外守卫要在端口本身生效：对例外主体的计分写入，端口直接拒绝。加测试。\n- **Q27（后半）**：「校验与裁决提交」接线在本包完成：人工裁决提交前校验任务代次和状态，不被晚到的 AI 结果覆盖（提案 §7.2）。\n- **Q29 的写入方要求**：主体级 Change Log（例外、名单、人工调分）要带可定位的关联或主体字段，摘要不写分数。\n- 多房管并发冲突要有明确的冲突状态和提示，不能后写覆盖先写。\n- 不改 `task-coordinator/` 和 `moderation-engine/review/`。\n",
  },
];
for (const p of pkgs) {
  const vars = { BATCH: "6", REJ: "0", BASE: process.argv[2] ?? "MAIN", PRIOR_NOTE: `- ${p.OTHERS}不要碰它们的工作树。\n${common}`, ...p };
  const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
  if (left) throw new Error(`${p.file} unfilled ${left.join(",")}`);
  fs.writeFileSync(path.join(dir, p.file), text);
  console.log(p.file, text.length);
}
