# 第 m8c-r1 批判断（Wave 3c：S026 核心消息流跨模块集成验证返工一复验）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离只读检出 `verify-m8cr1` 上的 `f1a75e9`（完整提交 `f1a75e9393106a1ae8e8b7069b0d18d91763e586`，在 `b1cc8af` / 只读产品基线 `6a6af8a` 之上合入 `voxward/s026-fix1`：Spec 提交 `f3d1a6a` -> 实现提交 `d9e7d48`）。
- 范围：2 张活跃工单、45 行验收（`VOXWARD-STORY-026` `rev=5` 22 行、`VOXWARD-SUB-048` `rev=4` 23 行，均属返工一复验）。**satisfied 45 行，failed 0 行，unverified 0 行**（`24` 行 `source-behavior-review` + `21` 行 `machine`）。逐条依据见 `.kiro/specs/voxward-batch-m8cr1/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-026 | 返工一复验 | **通过** | 22/22 satisfied | 无（B14a、B14b、B14c、N16a 已关闭） | 最小可复现缺陷断言、矩阵 §3/§4 如实披露、异常不扣分跨模块用例与仓库相对路径全部闭环，可以 `f1a75e9` 关单（同步关闭 `Q20`、`Q43`、`Q49`） |
| VOXWARD-SUB-048 | 返工一复验 | **通过** | 23/23 satisfied | 无（B14a、B14b、B14c、N16a 已关闭） | 严格零 `src/` 改动边界下 `4/4` 集成测试文件 `16/16` 用例及 E80 `P1`–`P4` 独立探针全部通过，可以 `f1a75e9` 关单 |

- rejection 计数：**S026** 前轮（`m8c`）打回 1 次（`B14` 归 `VOXWARD-SUB-048`），本轮返工一复验一次通过，不再新增 rejection。
- **关单建议**：建议主线程通过 `DONE_KEYS=VOXWARD-SUB-048,VOXWARD-STORY-026` 直接完成两张工单关单（`close-batch.cjs` 干跑输出 `{"annotate":2,"done":2}`）。
- 门禁与守护审计：
  - **零产品改动与 Spec-First 核查（D2）**：`git diff 6a6af8a..d9e7d48` 核实仅修改 `.kiro/specs/voxward-s026-core-flow/*`、`apps/server/test/integration/core-flow/*`、`docs/acceptance/core-flow-matrix.md` 与 `tests/integration/core-flow/README.md`；`apps/*/src/**`、`packages/*/src/**`、`scripts/**`、`deploy/**`、`vitest.workspace.ts` 全部 **0 修改**；Git DAG 满足 Spec 提交 `f3d1a6a` 先于实现提交 `d9e7d48`。
  - **常规与守护门禁**：`pnpm build`（E03）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，264 文件 0 违规；E09 负向对照检出 2 违规并以退出码 1 拒绝）及 `guarded.sh` 下 `test/integration/core-flow` **4/4 文件、16/16 用例**全绿（E05）全部退出 0。
  - **Q58 网络与 CLI 守护审计**：`e05-s026-vitest` 与 `e80-m8cr1` 均满足 `guardLoaded: true`、5 个外部域名全部连接拒绝、`shim.log` 0 行、外发非环回放行 0 条（`probes/logs/q58-audit.json`）。
  - **Spec 状态**：`.kiro/specs/voxward-s026-core-flow`（`workRevision: 5`）经 `kiro-specs.mjs check` 返回 `SPEC_CURRENT`（E10）。

## 必验项结论（`B14a`、`B14b`、`B14c`、`N16a` 逐项闭环核验）

| 前轮项 | 状态 | 实测与审查闭环证据 |
| --- | --- | --- |
| `B14a`（`Q55` `C6`、`Q46`、`Q39`、`Q41`、`Q52`、`Q57` `R7` 失实标 `PASS` 且缺最小复现断言） | **已关闭** | ① `manual-coordinator-wiring.test.ts:445-634` 新增 `Q55` `C6`（`maxScore=10` 下 `[-3, +2×6, -3]` 改判首条后 `currentScore=9`、`needsManualAdjustment=false` vs 账本重放 `7`）与 `Q57` `R7`（双 `ReviewRunner` 共享协调器跳过非本实例 `BACKGROUND` 任务，`items.length === 0`）最小复现断言，并将 `score_exceptions` 用例去除了 `Q55` 误标；② `dedupe-replay-sc.test.ts:309-394` 新增 `Q46`（`memberMilestoneChatDetails.userComment` 解析为 `null` / `body: ""` 且 `ChannelEvent` 无付费标记）与 `Q41`（非空 `resumeToken` 稳态轮询在 `+6m01s` 时钟快偏下 `staleReplay=1, delivered=0`）最小复现断言；③ `docs/acceptance/core-flow-matrix.md` §3 将 `Q39`/`Q41`/`Q46`/`Q52`/`Q57` 标为 `PARTIAL / OPEN`、`Q55` 标为 `FAIL / OPEN`，并在 §4 第 4–9 项逐条给出真实模块现象与复现测试定位（E05 + E80 `P1`、`P2`、`P4`）。 |
| `B14b`（缺失必交「异常不扣分」跨模块测试与矩阵行） | **已关闭** | 新增 `apps/server/test/integration/core-flow/failure-no-penalty.test.ts`（2 条跨模块用例）并在 `docs/acceptance/core-flow-matrix.md:35` 增加对应证据行：在真实迁移 SQLite + `DecisionService` + `ScoringEngine` + `TaskCoordinator` + `ReviewRunner` 上验证实时 `reportFailure` 耗尽有界重试转入 `PENDING_REVIEW`、以及后台 `ReviewRunner` 遭遇 AI 超时（`MODEL_CALL_FAILED`）与非法 JSON（`AI_OUTPUT_INVALID`）返回 `FAILED` 时，`scoringCalls === 0`、`currentScore` 与 `score_ledger` 均保持不变。E80 `P3` 进一步在已有正分观众（`initialScore=2`、`1` 条奖励账本）上独立复核上述三类故障后 `finalScore === 2`、`finalLedgerCount === 1`，零扣分契约完全成立。 |
| `B14c`（入库文档固化本机与临时工作树绝对路径） | **已关闭** | E80 `P4` 扫描全部 14 个 S026 相关文件（排除引擎自动生成的 `EINZBERN-SPEC:MANAGED` 历史记录块），本地文件 URI、家目录路径与临时工作树路径匹配数均为 **`0`**；主交付物 `docs/acceptance/core-flow-matrix.md` 中全部 `8/8` 个仓库相对 Markdown 链接均在磁盘上真实存在可解析。 |
| `N16a`（矩阵头部区分只读产品 `src/` 基线与测试分支） | **已关闭** | `docs/acceptance/core-flow-matrix.md:5-7` 清晰列明只读产品 `src/` 基线提交 `6a6af8a`、跨模块测试分支 `voxward/s026-fix1` 及零 `src/` 改动边界。 |

## 阻断发现

无。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N18a | `tests/integration/core-flow/README.md:17` 位于三级子目录（`tests/integration/core-flow/`），文末指向矩阵的相对链接写成了 `../../docs/acceptance/core-flow-matrix.md`（少了 1 级 `../`，应为 `../../../docs/acceptance/core-flow-matrix.md`）。该处不含任何本机或临时目录硬编码且不影响主交付物 `docs/acceptance/core-flow-matrix.md`（其内部 `8/8` 链接全部解析正常）。 | E80 `P4` 相对链接解析检查 | 后续 EPIC-006 汇总验收文档或收尾时顺手修正 |

### 问题清单（Q 项）处置建议

- **可随 `VOXWARD-STORY-026` 关单正式关闭的 Q 项（3 项）**：
  - **`Q20`**（退订/降级不扣历史合规分，`identityBaseScore` 与 `behaviorAdjustTotal` 分离重算）：已在 `routing-scoring.test.ts` 跨模块闭环。
  - **`Q43`**（身份基准上调叠加高行为分时的上限钳制与退级回落）：已在 `routing-scoring.test.ts` 跨模块闭环。
  - **`Q49`**（已终态任务并发冲突拒绝 `conflict` 与人工 `overturn` `operationId` 幂等 `duplicate`）：已在 `manual-coordinator-wiring.test.ts` 跨模块闭环。
- **因 S026 严格不修改 `src/`、已在 `core-flow-matrix.md` §3/§4 如实作为既有产品缺陷或未装配项归档并继续保持 `OPEN` 的 Q 项（6 项）**：
  - **`Q39`**（内存 `MessageIdStore` 与 SQLite `channel_events_dedupe_uq` 生产入站单事务未合一）
  - **`Q41`**（`runStreamList` 稳态轮询未限定仅首连/重连执行 `classifyReplay`，时钟快偏误丢实时消息）
  - **`Q46`**（`memberMilestoneChatDetails.userComment` 丢失为 `null` 且 `ChannelEvent` 缺付费标识字段）
  - **`Q52`**（`apps/server/src/app.ts` 尚未装配流摄入、SC 自动入 `PAID` 车道、复盘模型与 `resumePendingScoring` 定时任务）
  - **`Q55`**（`db/decision-store.ts` 序列 `C6` 上限钳制改判补偿 `+2` 偏差）
  - **`Q57`**（`moderation-engine/review/runner.ts` 多实例共享 `TaskCoordinator` 时 `R7` 跳过未知 `BACKGROUND` 任务悬挂）

## 需 Owner 决定

无。
