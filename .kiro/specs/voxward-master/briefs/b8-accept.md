你是 VoxWard 总表第 7 批（第一部分）的独立验收兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。本轮两组：S011 第 3 轮复验、S015 首次验收。按小轮处理：验收、判断和 lessons 一次完成。你没有参与实现，也没有做过前几轮验收。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只能读代码，只能在检出里运行命令。不改源码，不 commit，不写引擎工单。不用真实 Kiro 账号推理，不连本机 Kiro Crew 网关，不启动真实 Crew 队列，不连真实 YouTube 或 Google。
如果某个命令返回 `User denied tool execution`，可能是批准框超时或宿主规则拦截。不要换写法绕过；能做的先做完，在报告里写明哪一步被拒。

## 候选
- 本地 main `cb822f0`：在 0a3237c 之后依次合入两个分支，都没有冲突：
  - voxward/s011-fix2：db2af1b（B6）、0b9e662（设计和证据）；
  - voxward/s015-platform-delete：0f2b8fa（spec）、1f46fa1（SUB-028）、9ab18aa（证据）。
- S021 这次没有合入（依赖安装被宿主规则拦截，未完成），不在本轮范围。
- 检出：`$KIROCREW_SCRATCH/vw-int-m7`，detached at cb822f0，已经 install 过。主线程跑过的检查（结果可复用，也可以重跑）：
  - install --frozen-lockfile、build、typecheck、test（1802/1802）、check:deps（204 个文件 0 违规），都退出 0；
  - `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <日志目录>`：dev 和 dist 的 `/healthz` 都是 200，停止后没有监听。
- 起服务只用 smoke.sh，不要手工起 `pnpm dev`。你起的进程用完必须停掉，并确认 3000、5173 已经释放。

## 工单（5 张）
| 组 | 工单 | 范围 |
|---|---|---|
| S011 第 3 轮复验 | VOXWARD-STORY-011 work:8f928245aa79a29f26ad28a6；VOXWARD-SUB-021 work:a42a05e89d8c991f62abd995；VOXWARD-SUB-022 work:49db71dc5c4327f322c4c4af | 三张单全部行，在 cb822f0 上重新判定 |
| S015 首次验收 | VOXWARD-STORY-015 work:83d8e6716c550b3fa7d657ba；VOXWARD-SUB-028 work:31b9d4884fab6b3886f36539 | 两张单全部行 |

一共 5 张单。用这条命令取实时内容：
`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-m7-work <KEY>...`

## 依据
- S011 上一轮：`.kiro/specs/voxward-batch-m6r1/evidence/` 的 judgment.md（`### B6`、N3、N4、「复验范围」）、acceptance.md 的 E60、E61、E62 和 `probes/`；再上一轮 `.kiro/specs/voxward-batch-m6/evidence/`。第 6 批 S009 探针 `.kiro/specs/voxward-batch6/evidence/probes/`（E30–E34）。
- 实施证据：`.kiro/specs/voxward-s011-review/evidence/rework2-self-check.md`、`.kiro/specs/voxward-s015-platform-delete/evidence/`；实施报告原文 `/home/ryanlan/.kiro/crew/subagents/{5c7e5a4a484b9e7a,c15ee0fb5d2d6742}/result.txt`（只作线索）。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`：S011 看 §5.3、§5.4、§6.2、§7.2；S015 看 §7.3、§3.1、§16。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 的「Acceptance evidence and recheck scope」一节。
- 格式参考：`.kiro/specs/voxward-batch-m6r1/evidence/` 下的四个文件。

## 必验项
1. **S011 B6**：E60 A6 改为期望通过（实时就绪时后台取到 0 个批次）；E62 复盘先取时 8/8 实时完成、0 条转人工；E61、E30–E34 不变差。B2–B4、N5 的修复不退回。路径与 fff691e 相同的 satisfied 行可复用上一轮证据并重新盖 codeVersion。
2. **S015**：
   - 删除前校验本地权限（房管/房主）和 OAuth 写权限；无权限、无写权限、配额不足时请求前失败，平台调用 0 次；
   - 等待、成功、失败、未知四种平台状态与本地拦截分开记录；
   - 结果未知时先核实，不盲目重试，重试有上限；
   - 只用替身，不连真实 YouTube 或 Google。
3. 两份 spec 都跑 `kiro-specs.mjs check`，照实写结果，并核对设计和代码是否一致。
4. 阻断发现必须有依据：当前行为、明确的契约，或可信的安全边界，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-m7-out/`：
- acceptance.md
- judgment.md
- lessons.json（最多 5 条，不能和以往的重复）
- evidence-records.json（每行 8 个键，codeVersion 写 "cb822f0"，覆盖 5 张单的全部行，locator 指向 `.kiro/specs/voxward-batch-m7/evidence/acceptance.md#<锚点>`）
- 如果写了探针，放进 `probes/`

报告开头写明实际用的是哪个模型。完成后一次性汇报。
