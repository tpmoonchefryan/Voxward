# Core Flow 跨模块集成验收矩阵（`VOXWARD-STORY-026` / `VOXWARD-SUB-048`）

## 1. 基线与范围边界

- **固定候选版本**：`fcad360`（分支 `voxward/s026-core-flow`）
- **工单范围约束**：严格遵守 `VOXWARD-SUB-048`「不修复产品缺陷」规定，**未修改** `apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**`、`scripts/**` 或 `vitest.workspace.ts`。
- **合成夹具目录**：[tests/integration/core-flow/README.md](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/tests/integration/core-flow/README.md)
  - [routing-scoring.json](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/tests/integration/core-flow/fixtures/routing-scoring.json)
  - [dedupe-replay-sc.json](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/tests/integration/core-flow/fixtures/dedupe-replay-sc.json)
  - [manual-coordinator-wiring.json](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/tests/integration/core-flow/fixtures/manual-coordinator-wiring.json)
- **跨模块 Vitest 套件**：
  - [routing-scoring.test.ts](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/apps/server/test/integration/core-flow/routing-scoring.test.ts)
  - [dedupe-replay-sc.test.ts](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/apps/server/test/integration/core-flow/dedupe-replay-sc.test.ts)
  - [manual-coordinator-wiring.test.ts](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts)

## 2. 实际执行命令与门禁摘要

| 检查项 | 命令 | 退出码 | 实测结果摘要 |
| --- | --- | --- | --- |
| 新增集成套件（guarded） | `guarded.sh /tmp/s026-probe-1 pnpm --filter @voxward/server exec vitest run test/integration/core-flow` | `0` | `3 passed (3)` files, `10 passed (10)` tests, `2.30s` |
| 构建、类型与依赖门禁 | `pnpm build && pnpm typecheck && pnpm run bench:typecheck && node scripts/check-deps.mjs` | `0` | `packages/contracts`、`apps/server`、`apps/web`、`bench` 全部通过；`check-deps: ok, 254 files checked, 0 violations` |
| 全量测试（guarded，Q58） | `guarded.sh /tmp/s026-probe-full pnpm test` | `0` | `167 passed (167)` files, `1956 passed (1956)` tests, `36.29s` |
| Spec 校验 | `node .kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:3ebb2c33e7560e8661143983 --spec-dir .kiro/specs/voxward-s026-core-flow` | `0` | `SPEC_CURRENT` |

## 3. 逐项验收矩阵

| 编号 / Q 项 | 验证场景与模块链 | 夹具 / 用例 | 状态 | 实测结论 |
| --- | --- | --- | --- | --- |
| `R1`–`R6` | 路由与规则边界（匿名噪声 `ALLOW_NOISE`/`FAST_PASS`、白名单、`score >= fastPassThreshold` 快通、规范化 `café -> cafe` 抽查、精确匹配拦截扣分、谐音 `草泥马 -> caonima` `REVIEW`、例外用户 `EXCEPTION` 绕过快通） | `routing-scoring.json` / `routing-scoring.test.ts` | PASS | 全 7 条子场景均按 `planRoute` 真值表与 `evaluateMessage` 收敛 |
| `Q20` & `Q43` | 身份事件基准分离与上下限钳制（`UNKNOWN -> PAID_MEMBER -> +95(钳制100) -> MODERATOR -> UNKNOWN`，验证 `behaviorAdjustTotal=90` 与退级回落 `90`） | `routing-scoring.json` / `routing-scoring.test.ts` | PASS | `identityBaseScore` 与 `behaviorAdjustTotal` 分离存储且重算精确 |
| `Q39` | 平台去重（`MessageIdStore` 容量驱逐后由 SQLite `channel_events_dedupe_uq` 兜底拦截重复写入） | `dedupe-replay-sc.test.ts` | PASS | 内存驱逐后重复 `channel_events` 插入被唯一索引拒绝 |
| `Q41` | 时间戳回放边界（`age == replayMaxAgeMs` 为 `LIVE`、`age == replayMaxAgeMs + 1ms` 为 `STALE_REPLAY`、未来时间戳为 `LIVE`） | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | PASS | 3 项边界全部符合预期 |
| `Q46` & `Q52` | SC `userComment` 与会员里程碑解析、`PAID` 车道优先于 `REALTIME` 调度 | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | PASS | `PAID` 车道先于 `REALTIME` 出队；SC 文本完整保留 |
| 平台删除故障降级 | 配额耗尽（`QUOTA_EXHAUSTED`）保留本地 `BLOCK`；`UNKNOWN` 经 `readBack=PRESENT` 有界重试后 `SUCCEEDED`（2 attempts, 100 units） | `dedupe-replay-sc.json` / `dedupe-replay-sc.test.ts` | PASS | 本地裁决不受平台失败回滚，重试受 `maxAttempts` 上限约束 |
| `Q49` & `Q55` | 人工改判并发冲突（已终态 task 再次 `commit` 返回 `conflict`）、`overturn` 纠分重算与 `operationId` 幂等 | `manual-coordinator-wiring.json` / `manual-coordinator-wiring.test.ts` | PASS | 重复 `overturn` 返回 `duplicate`，账本与当前分值一致 |
| `Q55`（例外零分窗口） | `score_exceptions` 生效期间提交 `BLOCK` 裁决被 `EXCEPTION_ACTIVE` 拒绝，分值保持 `0` | `manual-coordinator-wiring.test.ts` | PASS | 评分拒绝且未写入扣分 |
| `Q57` | `TaskCoordinator` `PAID > REALTIME > BACKGROUND` 调度顺序、微批与未知任务收敛（`statusOf` 抛 `TASK_NOT_FOUND`、`reportFailure` 返回 `ignored/UNKNOWN_TASK`） | `manual-coordinator-wiring.test.ts` | PASS | 车道顺序与未知任务收敛符合契约 |

## 4. 最小可复现既有缺陷与未装配缺口（原样记录，未修改 `src/`）

1. **`m7c N7` / `m7e N12b`：组合根默认 `NO_SUBJECT_CACHES` 与默认 `CandidateStore` 未入 `SubjectCacheHub`**
   - **现象**：在 `apps/server/src/app.ts` 中，调用 `buildApp({ modules, database, candidateStore })` 且未显式传入 `subjectCaches` 时，默认使用 `NO_SUBJECT_CACHES`（`names: []`, `forgetSubject: () => 0`）。执行 `/channels/:channelId/data/requests/:requestId/execute` 删除受试者后，外部或默认 `CandidateStore` 中的关联候选词卡仍保留（`listCards` 仍返回 `1` 条）。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `records composition root gaps as-is without modifying src/` 用例前段对比了未注入 `subjectCaches`（删除后仍留 `1` 张卡）与显式 `SubjectCacheHub.forgetSubject`（返回 `1` 且清空词卡）。
2. **`m8a N13`：`output-store.ts` `TRANSLATION` 原始 JSON 字符串直出**
   - **现象**：`apps/server/src/db/output-store.ts` 的 `createApprovedContentPort.readApproved` 直接返回 `translation: translation?.payload ?? null`。当 `technical_log_evidence` 的 `TRANSLATION` 记录负载为 JSON 字符串（如 `{"text":"こんにちは","translatedText":"Hello"}`）时，`readApproved` 原样返回该 JSON 字符串而非提取译文字段。
   - **复现**：`manual-coordinator-wiring.test.ts` 中 `records composition root gaps as-is without modifying src/` 用例后段写入 `MESSAGE_TEXT` 与 `TRANSLATION` JSON 字符串并断言 `approved?.translation === rawTranslationJson`。
3. **规则与路由设计约束实测观察**
   - `moderation-engine/rules/groups.ts` 禁止 `reading`（谐音）规则放入 `BLOCK`/`DEDUCT` 组（触发 `RULE_SET_INVALID: READING_CANNOT_PENALIZE`），谐音命中需通过 `REVIEW` 组进入复核。
   - `truth-table.ts` 中 `WHITELIST` 与 `SCORE_FAST_PASS` 均产出 `ALLOW_NOISE`（不触发合规加分）。

## 5. 未在本单实测范围说明

- **真实 YouTube OAuth 与真实 YouTube Live Chat API**：未连接真实 Google/YouTube 端点；所有测试在 `guarded.sh` 外发网络阻断下使用合成事件与 `PlatformDeletePort` 替身完成。
- **真实 Kiro CLI（`kiro-cli` / `kirocrew` / `kiro`）**：未在本单调用真实外部 CLI；均通过 `guarded.sh` shim 隔离及合成推理/协调替身验证。
- 本验收矩阵仅代表 `fcad360` 候选版本下的跨模块合成集成证据，不替代后续真实平台联调或生产发布批准。
