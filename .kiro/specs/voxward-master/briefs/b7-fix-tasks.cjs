// Render the batch m6 rework briefs (S010, S011, S014; rejections=1).
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const head = (p) => `你是 VoxWard ${p.story} 第一次返工包 ${p.pkg} 的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同批还有另外两个返工包在 \`.worktrees/\` 下的其它工作树里，不要碰它们。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底，本地分支提交，不推送。普通实现选择自己决定，写进报告，不要当成「等 Owner 决定」。

## 背景
- 工单：${p.tickets}。第 1 次验收在候选 5482e5d 被打回。
- 工作树 \`/home/ryanlan/Code/Voxward/.worktrees/${p.wt}\`，分支 voxward/${p.wt}，基于 main 0f7fcd0（含本轮证据）。

## 必读
- 本轮判断：工作树里 \`.kiro/specs/voxward-batch-m6/evidence/judgment.md\` 的 ${p.read}，以及「非阻断建议」表和「下一轮拆分」表里 ${p.pkg} 那一行。
- 复现：\`.kiro/specs/voxward-batch-m6/evidence/acceptance.md\` 的 ${p.repro}（用 grep 定位）。探针在 \`.kiro/specs/voxward-batch-m6/evidence/probes/\`（见 README.md），可以改写成回归测试。
- spec：\`.kiro/specs/${p.spec}/\`，只看受管段以外的部分。编码规范：\`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md\`。

## 要修的项
${p.fix}

## 测试要求
- 先用修复前的代码跑新测试，确认它们能报出问题，再修。
${p.tests}

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 只改上面列出的范围。${p.scope}
- 推理只用替身。不连真实 Kiro、Crew、YouTube 或 Google，也不连本机 Kiro Crew 网关。
- 每个阻断项单独 commit（提交信息含子单号和阻断编号，例如 \`${p.commitEx}\`）；非阻断项、spec 和证据可以合成一个 commit。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。
- 如果返回 \`User denied tool execution\`，可能是批准框超时。不要换写法绕过，停下来报告。

## 自测（全部要退出 0）
- 在工作树根执行：\`pnpm install --frozen-lockfile\`、\`pnpm build\`、\`pnpm typecheck\`、\`pnpm test\`、\`pnpm check:deps\`，以及 \`node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id ${p.storyId} --spec-dir .kiro/specs/${p.spec}\`。
- 启动冒烟：\`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/${p.wt}-smoke\`。不要手工起 \`pnpm dev\`。
- 结果写到 \`.kiro/specs/${p.spec}/evidence/rework1-self-check.md\` 并提交。

## 交付报告
写明：实际使用的模型；commit hash 和改动文件；每项的修法；修复前后的实测对照；自测命令、退出码和测试数；未验证项；可能与另外两个返工包冲突的文件。

停止条件：修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
`;
const pkgs = [
  {
    file: "b7-s010-fix.md", story: "S010", pkg: "P-S010-fix", wt: "s010-fix", spec: "voxward-s010-sc-translation",
    storyId: "work:029c382b5915050f0c4de600",
    tickets: "VOXWARD-STORY-010（work:029c382b5915050f0c4de600）、VOXWARD-SUB-019（work:8369223695f7ef4f1f9e7d13）、VOXWARD-SUB-020（work:9165df7ffbc45df4a73496f9）；阻断 B1 归 SUB-020",
    read: "`### B1`", repro: "E50（§F）",
    fix: "1. **B1（SUB-020）**：精翻关闭时，安全审核必须用用户选的模型和 reasoning。现在假 CLI 收到的是适配器构造时的 `--model`，或者干脆没有 `--model`，而且返回 ok。要求：每次运行把所选模型和参数传到适配器；适配器不能应用时明确失败，不静默换模型。设计 §3.3 改成与代码一致。\n   - 修法自己选。需要改 `packages/contracts/src/modules/inference-provider.ts` 或 `apps/server/src/adapters/kiro-cli/*` 时可以改，只做最小改动，写进报告的冲突清单。\n2. 不处理 Q46、Q47（G1、G4、G6、G10），它们归后续 Story。",
    tests: "- 精翻开、关两种路径：假 CLI 实际收到的 `--model` 和 reasoning 等于所选值；适配器不支持时明确失败、不写结果。\n- 原有 Q40、Q23 的测试继续通过。",
    scope: "范围：`inference-provider/`、它的测试、必要时的契约和 kiro-cli 适配器、S010 设计。",
    commitEx: "VOXWARD-SUB-020 B1",
  },
  {
    file: "b7-s011-fix.md", story: "S011", pkg: "P-S011-fix", wt: "s011-fix", spec: "voxward-s011-review",
    storyId: "work:8f928245aa79a29f26ad28a6",
    tickets: "VOXWARD-STORY-011（work:8f928245aa79a29f26ad28a6）、VOXWARD-SUB-021（work:a42a05e89d8c991f62abd995）、VOXWARD-SUB-022（work:49db71dc5c4327f322c4c4af）；阻断 B2、B3、B4 归 SUB-021",
    read: "`### B2`、`### B3`、`### B4`", repro: "E60（§A、§G）、E61（H2、H3），以及 E30–E34（S009 回归）",
    fix: "1. **B2（SUB-021）**：取批要分车道。复盘运行器只取 BACKGROUND 任务；S009 的 Crew 执行器不取 BACKGROUND 复盘任务（或按复盘结算）。实时容量要让给 REALTIME 和 PAID（VW-R-006）。**本包允许改 `task-coordinator/`**（`coordinator.ts`、`index.ts`、`crew/adapter.ts`），只做最小改动，不改第 6 批已验收的车道保序、截止、取消语义。\n2. **B3（SUB-021）**：复盘结果先按 S007 整批契约校验。重复 itemId、缺项、批外 ID 时整批受控失败（转人工），不结算任何条目（提案 §8.3、VW-R-008）。\n3. **B4（SUB-021）**：任务因删除被取消、在协调器里到期、或其它不经 runBatch 的方式结束时，运行器要释放消息正文。内存里不留无上限的正文副本（INHERIT-017）。\n4. 一起做：Q50（N5）候选词卡片加驳回和 REJECTED 状态，确认权限统一用 `list.edit`，或在设计写明为何不同；Q53 里 S009 设计 §12、§13 和 S011 设计的文档出入。",
    tests: "- B2：共用协调器时，复盘运行器不取 REALTIME/PAID；Crew 执行器不把复盘任务按普通审核结算。\n- B3：重复、缺项、批外 ID 三种都整批转人工，分数不变。\n- B4：取消和到期两种结束后，运行器里没有该条正文（可以用 `retainedRecords()` 一类的计数，或堆快照）。\n- 交付前在本包内复跑第 6 批 S009 探针（`.kiro/specs/voxward-batch6/evidence/probes/`），结果不能变差。",
    scope: "范围：`moderation-engine/review/`、`moderation-engine/candidates/`、`task-coordinator/`（仅上面写的部分）、对应测试、S011 与 S009 设计。",
    commitEx: "VOXWARD-SUB-021 B2",
  },
  {
    file: "b7-s014-fix.md", story: "S014", pkg: "P-S014-fix", wt: "s014-fix", spec: "voxward-s014-decision",
    storyId: "work:210958ccce508a7abf314287",
    tickets: "VOXWARD-STORY-014（work:210958ccce508a7abf314287）、VOXWARD-SUB-026（work:e054586882ab35ec0b6a5fca）、VOXWARD-SUB-027（work:72af8ac97c70068c90e95e09）；阻断 B5 归 SUB-027",
    read: "`### B5`", repro: "E70（§C、§D）",
    fix: "1. **B5（SUB-027）**：改判不能自动生成可投递的放行意图。改判为放行时只改裁决和纠分；要投递必须走显式补发，并受补发时限约束（提案 §7.1、§6.3，验收行「补发必须明确」）。\n2. 一起做 Q49（N4）：改判纠分时，若其后有条目触及上下限，要么在保留账本内重算，要么把这次纠分标为需要人工调整并在结果里说明（提案 §7.1）。二选一，写进设计。设计里还要写明改判不对新结论计分的取舍。\n3. Q53 里 S014 设计 §2（不存在的 `decision-routes.ts`）和 §4（人工补偿键格式）与代码对齐。",
    tests: "- B5：2 小时前被拦截的消息改判为放行后，没有可投递记录；之后显式补发按时限被拒（`WINDOW_CLOSED`）；时限内的显式补发照常可用。\n- N4：复现 E70 C5（实测 −7、重放应为 −10），按你选的方案断言结果。\n- 原有 S014 用例继续通过。",
    scope: "范围：`db/decision-store.ts`、`decision-service/`、`packages/contracts/src/modules/decision-service.ts`、对应测试、S014 设计。",
    commitEx: "VOXWARD-SUB-027 B5",
  },
];
for (const p of pkgs) {
  const text = head(p);
  fs.writeFileSync(path.join(dir, p.file), text);
  console.log(p.file, text.length);
}
