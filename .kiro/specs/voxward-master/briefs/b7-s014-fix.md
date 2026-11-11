你是 VoxWard S014 第一次返工包 P-S014-fix 的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同批还有另外两个返工包在 `.worktrees/` 下的其它工作树里，不要碰它们。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底，本地分支提交，不推送。普通实现选择自己决定，写进报告，不要当成「等 Owner 决定」。

## 背景
- 工单：VOXWARD-STORY-014（work:210958ccce508a7abf314287）、VOXWARD-SUB-026（work:e054586882ab35ec0b6a5fca）、VOXWARD-SUB-027（work:72af8ac97c70068c90e95e09）；阻断 B5 归 SUB-027。第 1 次验收在候选 5482e5d 被打回。
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s014-fix`，分支 voxward/s014-fix，基于 main 0f7fcd0（含本轮证据）。

## 必读
- 本轮判断：工作树里 `.kiro/specs/voxward-batch-m6/evidence/judgment.md` 的 `### B5`，以及「非阻断建议」表和「下一轮拆分」表里 P-S014-fix 那一行。
- 复现：`.kiro/specs/voxward-batch-m6/evidence/acceptance.md` 的 E70（§C、§D）（用 grep 定位）。探针在 `.kiro/specs/voxward-batch-m6/evidence/probes/`（见 README.md），可以改写成回归测试。
- spec：`.kiro/specs/voxward-s014-decision/`，只看受管段以外的部分。编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。

## 要修的项
1. **B5（SUB-027）**：改判不能自动生成可投递的放行意图。改判为放行时只改裁决和纠分；要投递必须走显式补发，并受补发时限约束（提案 §7.1、§6.3，验收行「补发必须明确」）。
2. 一起做 Q49（N4）：改判纠分时，若其后有条目触及上下限，要么在保留账本内重算，要么把这次纠分标为需要人工调整并在结果里说明（提案 §7.1）。二选一，写进设计。设计里还要写明改判不对新结论计分的取舍。
3. Q53 里 S014 设计 §2（不存在的 `decision-routes.ts`）和 §4（人工补偿键格式）与代码对齐。

## 测试要求
- 先用修复前的代码跑新测试，确认它们能报出问题，再修。
- B5：2 小时前被拦截的消息改判为放行后，没有可投递记录；之后显式补发按时限被拒（`WINDOW_CLOSED`）；时限内的显式补发照常可用。
- N4：复现 E70 C5（实测 −7、重放应为 −10），按你选的方案断言结果。
- 原有 S014 用例继续通过。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 只改上面列出的范围。范围：`db/decision-store.ts`、`decision-service/`、`packages/contracts/src/modules/decision-service.ts`、对应测试、S014 设计。
- 推理只用替身。不连真实 Kiro、Crew、YouTube 或 Google，也不连本机 Kiro Crew 网关。
- 每个阻断项单独 commit（提交信息含子单号和阻断编号，例如 `VOXWARD-SUB-027 B5`）；非阻断项、spec 和证据可以合成一个 commit。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。
- 如果返回 `User denied tool execution`，可能是批准框超时。不要换写法绕过，停下来报告。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`，以及 `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:210958ccce508a7abf314287 --spec-dir .kiro/specs/voxward-s014-decision`。
- 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s014-fix-smoke`。不要手工起 `pnpm dev`。
- 结果写到 `.kiro/specs/voxward-s014-decision/evidence/rework1-self-check.md` 并提交。

## 交付报告
写明：实际使用的模型；commit hash 和改动文件；每项的修法；修复前后的实测对照；自测命令、退出码和测试数；未验证项；可能与另外两个返工包冲突的文件。

停止条件：修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
