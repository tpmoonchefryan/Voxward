# Core Flow 跨模块集成验收矩阵（`VOXWARD-STORY-026` / `VOXWARD-SUB-048` Rework 1）

## 1. 基线与范围边界（`N16a`）

- **只读产品 `src/` 基线提交**：`6a6af8a`
- **跨模块测试套件所在分支**：`voxward/s026-fix1`（在 `6a6af8a` 之上仅新增/更新 Spec、集成夹具、集成测试与本验收矩阵）
- **工单范围约束（D2）**：严格遵守 `VOXWARD-SUB-048`「不修改产品 `src/`」规定，**未修改** `apps/*/src/**`、`packages/*/src/**`、`scripts/**`、`deploy/**` 或 `vitest.workspace.ts`。
- **合成夹具目录**：[tests/integration/core-flow/README.md](../../tests/integration/core-flow/README.md)
  - [routing-scoring.json](../../tests/integration/core-flow/fixtures/routing-scoring.json)
  - [dedupe-replay-sc.json](../../tests/integration/core-flow/fixtures/dedupe-replay-sc.json)
  - [manual-coordinator-wiring.json](../../tests/integration/core-flow/fixtures/manual-coordinator-wiring.json)
- **跨模块 Vitest 套件**：
  - [routing-scoring.test.ts](../../apps/server/test/integration/core-flow/routing-scoring.test.ts)
  - [dedupe-replay-sc.test.ts](../../apps/server/test/integration/core-flow/dedupe-replay-sc.test.ts)
  - [manual-coordinator-wiring.test.ts](../../apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts)
  - [failure-no-penalty.test.ts](../../apps/server/test/integration/core-flow/failure-no-penalty.test.ts)

## 2. 实际执行命令与门禁摘要

| 检查项 | 命令 | 退出码 | 实测结果摘要 |
| --- | --- | --- | --- |
| 新增集成套件（guarded，Q58） | `.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh /tmp/s026-fix1-test pnpm --filter @voxward/server test test/integration/core-flow` | `0` | `4 passed (4)` files, `16 passed (16)` tests, `5.46s` |
| 构建、类型与依赖门禁 | `pnpm build && pnpm typecheck && pnpm run bench:typecheck && node scripts/check-deps.mjs` | `0` | `packages/contracts`、`apps/server`、`apps/web`、`bench` 全部通过；`check-deps: ok, 264 files checked, 0 violations` |
| Spec 校验 | `node .kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<ether-workspace>" --work-id work:3ebb2c33e7560e8661143983 --spec-dir .kiro/specs/voxward-s026-core-flow` | `0` | `SPEC_CURRENT` |

## 3. 逐项验收矩阵（区分已验证局部子契约与既有 `src/` 缺陷/未装配项）

| 编号 / Q 项 | 验证场景与模块链 | 夹具 / 用例 | 状态 | 实测结论 |
| --- | --- | --- | --- | --- |
| `R1`–`R6` | 路由与规则边界（匿名噪声 `ALLOW_NOISE`/`FAST_PASS`、白名单、`score >= fastPassThreshold` 快通、规范化 `café -> cafe` 抽查、精确匹配拦截扣分、谐音 `草泥马 -> caonima` `REVIEW`、例外用户 `EXCEPTION` 绕过快通） | `routing-scoring.json` / `routing-scoring.test.ts` | `PASS` | 全 7 条子场景均按 `planRoute` 真值表与 `evaluateMessage` 收敛 |
| `Q20` & `Q43` | 身份事件基准分离与上下限钳制（`UNKNOWN -> PAID_MEMBER -> +95(钳制 100) -> MODERATOR -> UNKNOWN`，验证 `behaviorAdjustTotal=90` 与退级回落 `90`） | `routing-scoring.json` / `routing-scoring.test.ts` | `PASS` | `identityBaseScore` 与 `behaviorAdjustTotal` 分离存储且重算精确，本项已在 `src/` 闭环 |
| 平台删除故障降级 | 配额耗尽（`QUOTA_EXHAUSTED`）保留本地 `BLOCK`；`UNKNOWN` 经 `readBack=PRESENT` 有界重试后 `SUCCEEDED`（2 attempts, 100 units） | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | `PASS` | 本地裁决不受平台失败回滚，重试受 `maxAttempts` 上限约束 |
| `Q49`（人工并发冲突与幂等） | 已终态 task 再次 `commit` 返回 `conflict`；单事件 `overturn` 纠分重算与 `operationId` 幂等（重复返回 `duplicate`） | `manual-coordinator-wiring.json` / `manual-coordinator-wiring.test.ts` | `PASS` | 终态并发拒绝与 `operationId` 幂等已验证成立 |
| `score_exceptions`（例外零分窗口） | `score_exceptions` 生效期间提交 `BLOCK` 裁决被 `EXCEPTION_ACTIVE` 拒绝，分值保持 `0` | `manual-coordinator-wiring.test.ts` | `PASS` | 评分拒绝且未写入扣分（注：此用例验证例外零分窗口，不代表 `Q55` `C6` 已闭环） |
| **异常不扣分（`VW-R-004` / `B14b`）** | ① 实时任务经 `TaskCoordinator.reportFailure` 耗尽重试转 `PENDING_REVIEW`；② 后台 `ReviewRunner` 遇到 AI 超时（`MODEL_CALL_FAILED`）与非法 JSON（`AI_OUTPUT_INVALID`）返回 `FAILED` | `failure-no-penalty.test.ts` | `PASS` | 两种异常路径下 `scoringCalls === 0`，目标观众 `subject_scores.current_score === 0` 且 `score_ledger` 行数为 `0` |
| `Q39`（平台去重） | 局部组件：`MessageIdStore` 容量驱逐后，单独写入 SQLite `channel_events` 被 `channel_events_dedupe_uq` 拦截；**生产入站事务未合一** | `dedupe-replay-sc.test.ts` | `PARTIAL / OPEN` | 局部组件各自有效，但生产入站路径尚未将 `MessageIdStore` 与 `channel_events_dedupe_uq` 绑定在同一短事务中（见 §4.4） |
| `Q41`（时间戳回放边界） | 局部组件：`classifyReplay` 5 分钟阈值（`==`/`+1ms`/未来时间戳）精确；**稳态轮询未限定仅首连/重连执行** | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | `PARTIAL / OPEN` | `classifyReplay` 阈值正确，但 `runStreamList` 在非空 `resumeToken` 稳态轮询且本机时钟快偏 `+6m01s` 时误丢实时消息（`delivered=0, staleReplay=1`，见 §4.5） |
| `Q46`（SC 与里程碑解析） | 局部组件：`superChatDetails.userComment` 保留且可手工入 `PAID` 车道；**里程碑评论丢失且 `ChannelEvent` 缺付费标识** | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | `PARTIAL / OPEN` | `parseStreamItem` 将 `memberMilestoneChatDetails.userComment` 解析为 `null`（`body=""`），且 `ChannelEvent` 无付费/类型标记字段（见 §4.6） |
| `Q52`（主运行链路与补偿装配） | 局部组件：`TaskCoordinator` `PAID > REALTIME` 出队顺序成立；**`app.ts` 尚未装配主链路与 `resumePendingScoring`** | `dedupe-replay-sc.test.ts` | `PARTIAL / OPEN` | 车道优先级本身成立，但 `apps/server/src/app.ts` 尚未串接平台流摄入、SC 自动入 `PAID` 车道、复盘模型与 `resumePendingScoring`（见 §4.7） |
| `Q55`（`C6` 上限钳制改判偏差） | `maxScore=10` 下 `[-3, +2×6, -3]`（原分 `6`）后改判首条为 `ALLOW_MEANINGFUL` | `manual-coordinator-wiring.test.ts` | `FAIL / OPEN` | `src/` 真实产出 `currentScore === 9` 与 `needsManualAdjustment === false`，与账本重放值 `7` 存在 `+2` 偏差（见 §4.8） |
| `Q57`（`R7` 跨实例跳过悬挂） | 局部组件：单实例 `PAID > REALTIME > BACKGROUND` 与未知任务 `reportFailure` 收敛；**多 `ReviewRunner` 共享协调器跳过非本实例任务** | `manual-coordinator-wiring.test.ts` | `PARTIAL / OPEN` | 单实例契约成立，但 `runnerB` 抽到 `runnerA` 入队的 `BACKGROUND` 任务时跳过并调用 `finishBatch`（`items.length === 0`，见 §4.9） |

## 4. 最小可复现既有缺陷与未装配缺口（原样记录，未修改 `src/`）

1. **`m7c N7` / `m7e N12b`：组合根默认 `NO_SUBJECT_CACHES` 与默认 `CandidateStore` 未入 `SubjectCacheHub`**
   - **现象**：在 `apps/server/src/app.ts` 中，调用 `buildApp({ modules, database, candidateStore })` 且未显式传入 `subjectCaches` 时，默认使用 `NO_SUBJECT_CACHES`（`names: []`, `forgetSubject: () => 0`）。执行 `/channels/:channelId/data/requests/:requestId/execute` 删除受试者后，外部或默认 `CandidateStore` 中的关联候选词卡仍保留（`listCards` 仍返回 `1` 条）。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `records composition root gaps as-is without modifying src/` 用例前段。
2. **`m8a N13`：`output-store.ts` `TRANSLATION` 原始 JSON 字符串直出**
   - **现象**：`apps/server/src/db/output-store.ts` 的 `createApprovedContentPort.readApproved` 直接返回 `translation: translation?.payload ?? null`。当 `technical_log_evidence` 的 `TRANSLATION` 记录负载为 JSON 字符串时，`readApproved` 原样返回该 JSON 字符串而非提取译文字段。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `records composition root gaps as-is without modifying src/` 用例后段。
3. **规则与路由设计约束实测观察**
   - `moderation-engine/rules/groups.ts` 禁止 `reading`（谐音）规则放入 `BLOCK`/`DEDUCT` 组（触发 `RULE_SET_INVALID: READING_CANNOT_PENALIZE`），谐音命中需通过 `REVIEW` 组进入复核。
   - `truth-table.ts` 中 `WHITELIST` 与 `SCORE_FAST_PASS` 均产出 `ALLOW_NOISE`（不触发合规加分）。
4. **`Q39`（OPEN）：生产入站路径未将 `MessageIdStore` 与 `channel_events_dedupe_uq` 绑定在同一事务**
   - **现象**：`MessageIdStore`（内存有界驱逐）与 SQLite `channel_events_dedupe_uq` 唯一索引各自有效，但生产入站链路尚未将两者绑定在同一短事务中统一去重落库。
   - **复现**：`dedupe-replay-sc.test.ts` 中 `enforces MessageIdStore + SQLite channel_events_dedupe_uq unique index across restarts (Q39)` 分别验证内存驱逐与 SQLite 唯一约束。
5. **`Q41`（OPEN）：`runStreamList` 稳态轮询误将时钟偏移下的实时消息判为 `STALE_REPLAY` 丢弃**
   - **现象**：`platform-source/stream-list.ts` 在携带非空 `resumeToken` 的稳态轮询中仍对每条消息调用 `classifyReplay`；当本机时钟快偏超过 `replayMaxAgeMs`（如 `+6m01s`）时，实时消息被误判为 `STALE_REPLAY` 丢弃（`delivered === 0`, `staleReplay === 1`）。
   - **复现**：`dedupe-replay-sc.test.ts` 中 `reproduces Q41 steady-state poll dropping live messages on +6m01s local clock skew (as-is without modifying src/)`。
6. **`Q46`（OPEN）：`memberMilestoneChatDetails.userComment` 丢失且 `ChannelEvent` 缺少付费消息标记**
   - **现象**：`parseStreamItem` 解析含 `memberMilestoneChatDetails.userComment` 的 `memberMilestoneChatEvent` 返回 `text: null`（`toBusinessEvent` 产出 `body: ""`）；且 `ChannelEvent` 仅含基础字段，无任何付费/类型标记字段供下游自动识别 SC 入 `PAID` 车道。
   - **复现**：`dedupe-replay-sc.test.ts` 中 `reproduces Q46 milestone userComment drop and missing paid flag on ChannelEvent (as-is without modifying src/)`。
7. **`Q52`（OPEN）：`apps/server/src/app.ts` 尚未装配流摄入、SC 自动入 `PAID` 车道、复盘模型与 `resumePendingScoring`**
   - **现象**：`TaskCoordinator` 自身的 `PAID > REALTIME > BACKGROUND` 调度优先级成立，但 `app.ts` 组合根尚未将平台流摄入、SC 自动入 `PAID` 车道、复盘模型绑定及 `resumePendingScoring` 定时补偿串入主运行链路。
   - **复现**：当前 `dedupe-replay-sc.test.ts` 需手工调用 `coordinator.enqueueInLane("PAID", ...)` 才能演示 `PAID` 车道调度。
8. **`Q55` `C6`（OPEN）：上限钳制改判补偿偏差（`+2`）**
   - **现象**：`db/decision-store.ts` 在 `maxScore=10` 下执行 `[-3, +2×6, -3]`（原分 `6`）后改判首条为 `ALLOW_MEANINGFUL` 时，直接补偿 `+3` 产出 `currentScore === 9` 与 `needsManualAdjustment === false`，而真实账本重放（6 次 `+2` 在 `10` 处钳制再 `-3`）应为 `7`。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `reproduces Q55 C6 clamp compensation drift on overturn (+2 vs ledger replay, as-is without modifying src/)`。
9. **`Q57` `R7`（OPEN）：多 `ReviewRunner` 共享 `TaskCoordinator` 时跳过非本实例 `BACKGROUND` 任务**
   - **现象**：两个 `ReviewRunner` 实例共享同一 `TaskCoordinator` 时，`runnerB` 抽到由 `runnerA` 入队的 `BACKGROUND` 任务会直接跳过并调用 `finishBatch`（返回 `items.length === 0`），导致任务滞留 `RUNNING` 直至超时。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `reproduces Q57 R7 cross-instance ReviewRunner skip leaving BACKGROUND task RUNNING (as-is without modifying src/)`。

## 5. 未在本单实测范围说明

- **真实 YouTube OAuth 与真实 YouTube Live Chat API**：未连接真实 Google/YouTube 端点；所有测试在 `guarded.sh` 外发网络阻断下使用合成事件与 `PlatformDeletePort` 替身完成。
- **真实 Kiro CLI（`kiro-cli` / `kirocrew` / `kiro`）**：未在本单调用真实外部 CLI；均通过 `guarded.sh` shim 隔离及合成推理/协调替身验证。
- 本验收矩阵仅代表只读产品 `src/` 基线 `6a6af8a` 在 `voxward/s026-fix1` 下的跨模块合成集成证据，不替代后续真实平台联调、产品缺陷修复或生产发布批准。
