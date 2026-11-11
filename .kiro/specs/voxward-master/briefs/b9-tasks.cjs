// Render master batch 7 (part 2) briefs: S019 and S027 (SUB-049 only); S021 resume is a separate file.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const common = "- 已完成：S001–S018（S017、S018 含日志查看器和数据面板）、S031。S021（输出协议）正在 `.worktrees/s021-output` 续做传输层，改 output-adapter、`app.ts`、`auth/routes.ts`。\n- 工单 deliverables 里的路径用的是拆单时的旧模块名。实际模块名以 `apps/server/src/modules/` 为准：`data-lifecycle` → `data-lifecycle-service`，`decision` → `decision-service`。测试目录同理。把映射写进 spec 的偏离表。\n- 被拒时：如果返回 `User denied tool execution`，可能是批准框超时或宿主规则拦截。不要换写法绕过，停下来报告。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读）。";
const pkgs = [
  {
    file: "b9-s019.md", PKG: "P-S019", WT: "s019-delete-exception", SPEC: "voxward-s019-delete-exception",
    STORY_KEY: "VOXWARD-STORY-019", STORY_ID: "work:7f0ac0774bc508523d09b5f1",
    TICKETS: "- 父 Story：VOXWARD-STORY-019（work:7f0ac0774bc508523d09b5f1）「实现删除并加入例外的原子流程」\n- VOXWARD-SUB-035（work:de64f4522b4c54f1d76ede8f）「实现删除并加入例外的同事务确认与代次提升」\n- VOXWARD-SUB-036（work:11fe17ddd33774eb6ef1ed6b）「实现全存储面删除清理执行与失败续作」\n顺序：先 SUB-035，再 SUB-036。",
    SECTIONS: " §11.2–§11.4（第 415–460 行）、§12.3、§12.4（第 498–521 行）、§7.2（第 245–252 行）",
    OTHERS: "同批还有 S021（`.worktrees/s021-output`）和 S027 样本集（`.worktrees/s027-bench`，只改 `bench/`）。",
    EXTRA: "\n## 注意\n- 组合选项（删除 + 加入例外）在同一短事务里：确认记分例外、提升主体代次、登记删除。从例外建立起，所有旧任务的晚到结果和新计分都被拒（S009 代次、S014 端口层例外守卫已有）。偏好只保留 HMAC 最小标记；恢复计分要有明确请求。\n- 清理按存储面逐个做：评分账本、`score_outcomes`、证据、映射、缓存、日志索引、任务与 AI 内容、候选词卡片。部分失败可续作；两部分都完成才报告成功。\n- 本包一起处理这些问题清单项（各加测试）：\n  - Q7：昵称缓存按主体失效的接口；\n  - Q35：删除路径和查看器缓存共用同一条失效总线（不要再各建一条）；\n  - Q42：身份缓存在删除时清理；\n  - Q29：删除索引能找到没有技术日志关联的主体级 Change Log（例外、名单、人工调分），删除后只留不含正文和分数的最小凭证；\n  - Q51：删除索引覆盖 `score_outcomes`（按 `subject_id`），候选词卡片随来源删除或去关联（二选一写进设计）。\n- 不改 `task-coordinator/` 的内部实现；取消在途任务只用它已导出的接口。\n- Q30（SQLite 空闲页残留）不在本包，归 S020。\n",
  },
  {
    file: "b9-s027.md", PKG: "P-S027a", WT: "s027-bench", SPEC: "voxward-s027-bench",
    STORY_KEY: "VOXWARD-STORY-027", STORY_ID: "work:58dd548e00e4c319dce50484",
    TICKETS: "- 父 Story：VOXWARD-STORY-027（work:58dd548e00e4c319dce50484）「测量 AI 质量、实时容量与清理行为」\n- **本包只做** VOXWARD-SUB-049（work:2aa6c8e36e17dd07df29f664）「建立合法多语言评测样本集与基准脚本」。\n- VOXWARD-SUB-050（真实运行与报告）要用 Owner 提供的独立 Kiro 账号（minutes:8fc0b8640384844e0b2a1787 D1），现在不做，也不用转态。",
    SECTIONS: " §18（第 649–683 行）、§4.3（第 142–151 行）、§5.3（第 186–191 行）",
    OTHERS: "同批还有 S019（`.worktrees/s019-delete-exception`）和 S021（`.worktrees/s021-output`）。",
    EXTRA: "\n## 注意\n- spec 按 STORY-027 初始化，但实施设计只覆盖 SUB-049；SUB-050 在 spec 里标「待 Owner 账号（S029 演练时一起跑）」。\n- 样本必须来源合法：自己合成，或用许可证明确允许的公开数据，并在 `bench/samples/` 写清来源与许可。**不用真实观众数据**，不抓取 YouTube。覆盖中、日、英、混合、谐音、昵称组合、跨条。\n- 脚本（`bench/scripts/quality.ts`、`latency-capacity.ts`、`cleanup-observe.ts`）默认跑合成适配器和假 CLI 替身，能在本机复现；真实模型只通过显式参数和环境变量开启，默认关闭，文档里写清。**本包不跑真实模型**，不用本机开发 Kiro 账号，不连本机 Kiro Crew 网关。\n- 用替身跑一遍，把脚本能跑通的证据写进 self-check；这不是 SUB-050 的报告，不写 `docs/reports/`。\n- 只改 `bench/`、必要的根 `package.json` 脚本入口和 spec。不改 `apps/` 下的源码。\n",
  },
];
for (const p of pkgs) {
  const vars = { BATCH: "7", REJ: "0", BASE: "main（本批简报提交之后的 HEAD）", PRIOR_NOTE: `- ${p.OTHERS}不要碰它们的工作树。\n${common}`, ...p };
  const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
  if (left) throw new Error(`${p.file} unfilled ${left.join(",")}`);
  fs.writeFileSync(path.join(dir, p.file), text);
  console.log(p.file, text.length);
}
