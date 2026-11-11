你是 VoxWard S011 第一次返工包 P-S011-fix 的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同批还有另外两个返工包在 `.worktrees/` 下的其它工作树里，不要碰它们。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底，本地分支提交，不推送。普通实现选择自己决定，写进报告，不要当成「等 Owner 决定」。

## 背景
- 工单：VOXWARD-STORY-011（work:8f928245aa79a29f26ad28a6）、VOXWARD-SUB-021（work:a42a05e89d8c991f62abd995）、VOXWARD-SUB-022（work:49db71dc5c4327f322c4c4af）；阻断 B2、B3、B4 归 SUB-021。第 1 次验收在候选 5482e5d 被打回。
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s011-fix`，分支 voxward/s011-fix，基于 main 0f7fcd0（含本轮证据）。

## 必读
- 本轮判断：工作树里 `.kiro/specs/voxward-batch-m6/evidence/judgment.md` 的 `### B2`、`### B3`、`### B4`，以及「非阻断建议」表和「下一轮拆分」表里 P-S011-fix 那一行。
- 复现：`.kiro/specs/voxward-batch-m6/evidence/acceptance.md` 的 E60（§A、§G）、E61（H2、H3），以及 E30–E34（S009 回归）（用 grep 定位）。探针在 `.kiro/specs/voxward-batch-m6/evidence/probes/`（见 README.md），可以改写成回归测试。
- spec：`.kiro/specs/voxward-s011-review/`，只看受管段以外的部分。编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。

## 要修的项
1. **B2（SUB-021）**：取批要分车道。复盘运行器只取 BACKGROUND 任务；S009 的 Crew 执行器不取 BACKGROUND 复盘任务（或按复盘结算）。实时容量要让给 REALTIME 和 PAID（VW-R-006）。**本包允许改 `task-coordinator/`**（`coordinator.ts`、`index.ts`、`crew/adapter.ts`），只做最小改动，不改第 6 批已验收的车道保序、截止、取消语义。
2. **B3（SUB-021）**：复盘结果先按 S007 整批契约校验。重复 itemId、缺项、批外 ID 时整批受控失败（转人工），不结算任何条目（提案 §8.3、VW-R-008）。
3. **B4（SUB-021）**：任务因删除被取消、在协调器里到期、或其它不经 runBatch 的方式结束时，运行器要释放消息正文。内存里不留无上限的正文副本（INHERIT-017）。
4. 一起做：Q50（N5）候选词卡片加驳回和 REJECTED 状态，确认权限统一用 `list.edit`，或在设计写明为何不同；Q53 里 S009 设计 §12、§13 和 S011 设计的文档出入。

## 测试要求
- 先用修复前的代码跑新测试，确认它们能报出问题，再修。
- B2：共用协调器时，复盘运行器不取 REALTIME/PAID；Crew 执行器不把复盘任务按普通审核结算。
- B3：重复、缺项、批外 ID 三种都整批转人工，分数不变。
- B4：取消和到期两种结束后，运行器里没有该条正文（可以用 `retainedRecords()` 一类的计数，或堆快照）。
- 交付前在本包内复跑第 6 批 S009 探针（`.kiro/specs/voxward-batch6/evidence/probes/`），结果不能变差。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 只改上面列出的范围。范围：`moderation-engine/review/`、`moderation-engine/candidates/`、`task-coordinator/`（仅上面写的部分）、对应测试、S011 与 S009 设计。
- 推理只用替身。不连真实 Kiro、Crew、YouTube 或 Google，也不连本机 Kiro Crew 网关。
- 每个阻断项单独 commit（提交信息含子单号和阻断编号，例如 `VOXWARD-SUB-021 B2`）；非阻断项、spec 和证据可以合成一个 commit。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。
- 如果返回 `User denied tool execution`，可能是批准框超时。不要换写法绕过，停下来报告。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`，以及 `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:8f928245aa79a29f26ad28a6 --spec-dir .kiro/specs/voxward-s011-review`。
- 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s011-fix-smoke`。不要手工起 `pnpm dev`。
- 结果写到 `.kiro/specs/voxward-s011-review/evidence/rework1-self-check.md` 并提交。

## 交付报告
写明：实际使用的模型；commit hash 和改动文件；每项的修法；修复前后的实测对照；自测命令、退出码和测试数；未验证项；可能与另外两个返工包冲突的文件。

停止条件：修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
