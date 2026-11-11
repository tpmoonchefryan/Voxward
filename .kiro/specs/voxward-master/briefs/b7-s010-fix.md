你是 VoxWard S010 第一次返工包 P-S010-fix 的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同批还有另外两个返工包在 `.worktrees/` 下的其它工作树里，不要碰它们。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底，本地分支提交，不推送。普通实现选择自己决定，写进报告，不要当成「等 Owner 决定」。

## 背景
- 工单：VOXWARD-STORY-010（work:029c382b5915050f0c4de600）、VOXWARD-SUB-019（work:8369223695f7ef4f1f9e7d13）、VOXWARD-SUB-020（work:9165df7ffbc45df4a73496f9）；阻断 B1 归 SUB-020。第 1 次验收在候选 5482e5d 被打回。
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s010-fix`，分支 voxward/s010-fix，基于 main 0f7fcd0（含本轮证据）。

## 必读
- 本轮判断：工作树里 `.kiro/specs/voxward-batch-m6/evidence/judgment.md` 的 `### B1`，以及「非阻断建议」表和「下一轮拆分」表里 P-S010-fix 那一行。
- 复现：`.kiro/specs/voxward-batch-m6/evidence/acceptance.md` 的 E50（§F）（用 grep 定位）。探针在 `.kiro/specs/voxward-batch-m6/evidence/probes/`（见 README.md），可以改写成回归测试。
- spec：`.kiro/specs/voxward-s010-sc-translation/`，只看受管段以外的部分。编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。

## 要修的项
1. **B1（SUB-020）**：精翻关闭时，安全审核必须用用户选的模型和 reasoning。现在假 CLI 收到的是适配器构造时的 `--model`，或者干脆没有 `--model`，而且返回 ok。要求：每次运行把所选模型和参数传到适配器；适配器不能应用时明确失败，不静默换模型。设计 §3.3 改成与代码一致。
   - 修法自己选。需要改 `packages/contracts/src/modules/inference-provider.ts` 或 `apps/server/src/adapters/kiro-cli/*` 时可以改，只做最小改动，写进报告的冲突清单。
2. 不处理 Q46、Q47（G1、G4、G6、G10），它们归后续 Story。

## 测试要求
- 先用修复前的代码跑新测试，确认它们能报出问题，再修。
- 精翻开、关两种路径：假 CLI 实际收到的 `--model` 和 reasoning 等于所选值；适配器不支持时明确失败、不写结果。
- 原有 Q40、Q23 的测试继续通过。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 只改上面列出的范围。范围：`inference-provider/`、它的测试、必要时的契约和 kiro-cli 适配器、S010 设计。
- 推理只用替身。不连真实 Kiro、Crew、YouTube 或 Google，也不连本机 Kiro Crew 网关。
- 每个阻断项单独 commit（提交信息含子单号和阻断编号，例如 `VOXWARD-SUB-020 B1`）；非阻断项、spec 和证据可以合成一个 commit。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。
- 如果返回 `User denied tool execution`，可能是批准框超时。不要换写法绕过，停下来报告。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`，以及 `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:029c382b5915050f0c4de600 --spec-dir .kiro/specs/voxward-s010-sc-translation`。
- 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s010-fix-smoke`。不要手工起 `pnpm dev`。
- 结果写到 `.kiro/specs/voxward-s010-sc-translation/evidence/rework1-self-check.md` 并提交。

## 交付报告
写明：实际使用的模型；commit hash 和改动文件；每项的修法；修复前后的实测对照；自测命令、退出码和测试数；未验证项；可能与另外两个返工包冲突的文件。

停止条件：修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
