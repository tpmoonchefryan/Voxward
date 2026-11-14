# 第 m8c 批判断（Wave 3a：S026 核心消息流跨模块集成验证首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m8c` 上的 `df376eb`（完整提交 `df376eb934fe8c2185777a467f625117facf2a66`，在 `994db71` 之上合入 `51f12b0` `voxward/s026-core-flow`：Spec `f237c9f` -> 实现 `51f12b0`）。
- 范围：2 张活跃工单、45 行验收（`VOXWARD-STORY-026` `rev=4` 22 行、`VOXWARD-SUB-048` `rev=3` 23 行，均属首次验收）。**satisfied 20 行，failed 25 行，unverified 0 行**（`24` 行 `source-behavior-review` + `21` 行 `machine`）。逐条依据见 `.kiro/specs/voxward-batch-m8c/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-026 | 首次验收 | **打回** | 10/22 satisfied、12 failed | B14（B14a、B14b、B14c） | failed：`VW-S026-{AC001,PARENT,INHERIT-001,INHERIT-002,INHERIT-003,INHERIT-004,INHERIT-005,INHERIT-006,INHERIT-007,INHERIT-011,INHERIT-012,INHERIT-014}`；10 条跨模块边界/隐私/日志/性能职责审查行成立 |
| VOXWARD-SUB-048 | 首次验收 | **打回** | 10/23 satisfied、13 failed | B14（B14a、B14b、B14c，归本单） | failed：`VW-SUB048-{AC001,STORY,PARENT,INHERIT-001,INHERIT-002,INHERIT-003,INHERIT-004,INHERIT-005,INHERIT-006,INHERIT-007,INHERIT-011,INHERIT-012,INHERIT-014}` |

- rejection 计数：**S026** 首次验收打回 1 次，`B14`（`B14a`、`B14b`、`B14c`）归唯一实现子单 `VOXWARD-SUB-048`。
- 门禁与守护审计：
  - **零产品改动边界（D2）**：`git diff 994db71...51f12b0` 核实仅新增/更新 `.kiro/specs/voxward-s026-core-flow/*`、`apps/server/test/integration/core-flow/*.test.ts`、`tests/integration/core-flow/**` 与 `docs/acceptance/core-flow-matrix.md`；`apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**`、`scripts/**`、`vitest.workspace.ts` 全部 **0 修改**。
  - **常规与守护门禁**：`pnpm build`（E03）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，254 文件 0 违规；E09 负向对照检出 4 违规并以退出码 1 拒绝）及 `guarded.sh` 下 S026 集成套件 3/3 文件 10/10 用例（E05；配合主线程同 SHA 全量基线 `pnpm test` 167/167 文件 1956/1956 用例全绿与 `smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听）全部退出 0。
  - **Q58 网络与 CLI 守护审计**：`e05-s026-vitest` 与 `e80-m8c` 均满足 `guardLoaded: true`、5 个外部域名（Google/OAuth/Kiro/example）全部 `ECONNREFUSED`/`ENOTFOUND`、`shim.log` 0 行、外发非环回放行 0 条（`probes/logs/q58-audit.json`）。
  - **Spec 状态**：`.kiro/specs/voxward-s026-core-flow`（`workRevision: 4`）经 `kiro-specs.mjs check` 返回 `SPEC_CURRENT`（E10），Git DAG 满足 Spec 提交 `f237c9f` 先于实现提交 `51f12b0`。

## 必验项结论

### 1. S026 已验证成立的部分（可在返工一原样保留复用）

1. **只读产品边界严格成立**：未触碰任何 `src/` 业务代码、契约或门禁脚本。
2. **路由与规则边界（`R1`–`R6`）**：`routing-scoring.test.ts` 在真实编译规则集与 `planRoute` 上覆盖了匿名噪声 `ALLOW_NOISE`/`FAST_PASS`（`0` 分不变）、白名单快通、高分 `SCORE_FAST_PASS`、Unicode 变音归一化（`café -> cafe` 抽查 `REVIEW`）、精确拦截扣分（`-5`）、中文谐音（`草泥马 -> caonima` 受 `READING_CANNOT_PENALIZE` 约束进入 `REVIEW`）及记分例外用户绕过快通进入 `EXCEPTION`。
3. **身份事件基准分离与上下限钳制（`Q20`、`Q43`）**：`routing-scoring.test.ts` 完整验证了 `UNKNOWN(0) -> PAID_MEMBER(10) -> +95(钳制 100，behaviorAdjustTotal=90) -> MODERATOR(30，钳制 100) -> UNKNOWN(0，回落至 90)` 的基准分离重算与幂等落库。
4. **平台删除故障降级与例外零分拒绝**：`dedupe-replay-sc.test.ts` 验证了平台删除 `QUOTA_EXHAUSTED` 保留本地 `BLOCK`、以及 `UNKNOWN` 经 `readBack=PRESENT` 有界重试后 `SUCCEEDED`（2 次尝试、100 配额单位）；`manual-coordinator-wiring.test.ts` 验证了 `score_exceptions` 生效窗口内提交 `BLOCK` 抛 `EXCEPTION_ACTIVE` 且分值保持 `0`，并在矩阵 §4 第 1、2 项如实复现记录了 `m7c N7`/`m7e N12b`（`buildApp` 默认 `NO_SUBJECT_CACHES` 未清理默认 `CandidateStore`）与 `m8a N13`（`output-store.ts` 原样返回 `TRANSLATION` JSON 字符串）。

### 2. 不成立并构成阻断的部分

S026 作为跨模块验收矩阵工单，其核心契约（`VW-S026-R001`、`VW-SUB048-R001`、`VW-S026-AC001`、`design.md:65`）明确规定：**在不修改 `src/` 的前提下，「每项结果有实际证据；缺陷和未测清楚；最小可复现缺陷」，且各继承行「不填写虚构通过」**。然而候选 `df376eb` 存在三方面实质缺口（合记为 **`B14`**）：

1. **`B14a`**：`docs/acceptance/core-flow-matrix.md` §3 将 **6 个仍存在真实产品缺陷或生产未装配缺口的 Q 项（`Q55` `C6`、`Q46`、`Q39`、`Q41`、`Q52`、`Q57` `R7`）全部标为 `PASS`**，既未编写最小复现断言揭示其真实缺口，也未将其列入 §4「最小可复现既有缺陷与未装配缺口」。
2. **`B14b`**：完全漏做并漏记工单交付物与 `VW-R-004` 明确要求的 **「异常不扣分」（AI 超时/调用失败/结构非法回退且观众 `0` 扣分）** 跨模块集成用例与矩阵条目。
3. **`B14c`**：提交入库的持久文档 `docs/acceptance/core-flow-matrix.md`（7 处）与 `tests/integration/core-flow/README.md`（1 处）固化了本机临时工作树绝对路径 `file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...`。

## 阻断发现

### B14（新，归 VOXWARD-SUB-048）：验收矩阵将多项既有产品缺陷/未装配缺口失实标为 `PASS`（`B14a`）、漏测必交的「异常不扣分」链路（`B14b`），且入库文档固化临时工作树本机绝对路径（`B14c`）

#### B14a：`docs/acceptance/core-flow-matrix.md` §3 对 `Q55`、`Q46`、`Q39`、`Q41`、`Q52`、`Q57` 给出失实 `PASS`，未复现并记录真实既有缺陷与未装配缺口

- **当前行为与实测复现（`probe-m8c.mts` E80 `C1`–`C3`）**：
  1. **`Q55`（`db/decision-store.ts:724-748` 序列 `C6` 钳制改判补偿偏差）**：主 Spec `tasks.md:119` 与 `m6r1/evidence/judgment.md`（`N1`）明确交由 S026 覆盖序列 `C6`——原时间线未触发上下限钳制，但撤销早期扣分后新时间线本应触发上限钳制。`manual-coordinator-wiring.test.ts:104-240` 未测 `C6`（仅测了单事件 `0 -> +1 -> overturn` 并把例外零分测试误冠名为 `Q55`），`core-flow-matrix.md:35` 遂标为 **`PASS`（「账本与当前分值一致」）**。E80 `C1` 在真实 SQLite + `DecisionService` 上执行 `maxScore=10` 下 `[-3, +2×6, -3]`（原分 `6`）后改判首条为 `ALLOW_MEANINGFUL`，实测 `subject_scores.current_score = 9` 且 `needsManualAdjustment = false`，而真实账本重放（6 次 `+2` 在 `10` 处钳制再 `-3`）应为 **`7`**，账本与当前分值并不一致。
  2. **`Q46`（`stream-list.ts:76-80` 丢弃会员里程碑自定义文本 + `ChannelEvent` 无付费消息标识）**：`dedupe-replay-sc.json:33` 仅构造了天然无评论字段的 `membershipGiftingEvent` 并手工调用 `coordinator.enqueueInLane("PAID", ...)`，`core-flow-matrix.md:33` 却将「`Q46 & Q52`：SC `userComment` 与会员里程碑解析、`PAID` 车道优先于 `REALTIME` 调度」标为 **`PASS`**。E80 `C2` 实测向 `parseStreamItem` 传入含 `memberMilestoneChatDetails.userComment` 的 `memberMilestoneChatEvent` 时返回 `text: null`（`toBusinessEvent` 产出空串 `body: ""`），且 `ChannelEvent` 仅含 9 个基础字段、无任何付费消息/类型标记可供下游自动识别 SC 入 `PAID` 车道。
  3. **`Q39`、`Q41`、`Q52`、`Q57`（未披露的装配缺口与边界缺陷）**：
     - **`Q39`**：`dedupe-replay-sc.test.ts` 先跑内存 `runStreamList` 再单独手工写 SQLite `channel_events`，证明组件各自存在但未披露生产代码中 `MessageIdStore` 尚未与 `channel_events_dedupe_uq` 绑定在同一入站事务中（`core-flow-matrix.md:31` 标 `PASS`）。
     - **`Q41`**：`stream-list.ts:154` 在携带非空 `resumeToken` 的稳态轮询中仍对每条消息调用 `classifyReplay`；E80 `C2` 实测当本机时钟快偏 `+6m01s` 时，稳态轮询收到的实时消息被全部判为 `STALE_REPLAY` 丢弃（`delivered = 0, staleReplay = 1`）（`core-flow-matrix.md:32` 标 `PASS`）。
     - **`Q52`**：`apps/server/src/app.ts` 尚未把平台流摄入、SC 自动入 `PAID` 车道、复盘模型绑定及 `resumePendingScoring` 定时补偿串入主运行链路（`core-flow-matrix.md:33` 标 `PASS`）。
     - **`Q57`（`R7`）**：`moderation-engine/review/runner.ts:145-153,175` 在多 `ReviewRunner` 共享同一 `TaskCoordinator` 时，抽到非本实例入队的 `BACKGROUND` 任务会直接 `continue` 跳过并调用 `finishBatch`，使该任务悬挂在 `RUNNING` 直至 `deadlineAt` 超时（E80 `C3` 实测 `runnerB` 返回 `items.length === 0`）（`core-flow-matrix.md:37` 仅测单实例 `TASK_NOT_FOUND` 即标 `PASS`）。

#### B14b：完全缺失「异常不扣分」（`VW-R-004` / `VW-S026-R001` / `VW-SUB048-R001`）跨模块验证用例与矩阵行

- **当前行为与根因**：`VW-S026-R001` 与 `VW-SUB048-R001` 均明确规定「交付：路由/评分边界、平台去重、身份、人工冲突/补偿、**异常不扣分**和例外矩阵」，S026 自身的 `design.md:71` 与 `tests/integration/core-flow/README.md:11` 也声明覆盖「异常不扣分」；但 `apps/server/test/integration/core-flow/*.test.ts` 的 10 条用例与 `docs/acceptance/core-flow-matrix.md` §3 中没有任何测试或矩阵行验证 AI 超时/调用失败/结构非法（`MODEL_CALL_FAILED` / `AI_OUTPUT_INVALID` / `TaskCoordinator.reportFailure` 转 `pending_review`）时观众分保持不变、不产生扣分账本（E80 `C3` 实测 `ReviewRunner` 遇到 `SYNTHETIC_AI_TIMEOUT` 时返回 `FAILED` 且 `scoringCalls === 0`）。

#### B14c：提交入库的验收矩阵与夹具说明硬编码临时工作树本机绝对路径（`AGENTS.md` 无人值守指令原则）

- **当前行为与实测证据（E80 `C4`）**：`docs/acceptance/core-flow-matrix.md:7-14`（7 处链接）与 `tests/integration/core-flow/README.md:16`（1 处链接）将仓库内文件写成了 `file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...`。该工作树是开发代理临时目录，合并或清理后路径即失效，且直接固化了开发者主机绝对路径，违反 `AGENTS.md`「安装产物与持久文本使用可解析的相对路径，不固化设备位置」。
- **影响与不成立的行**：
  - `VOXWARD-STORY-026`（12 行 `failed`）：`VW-S026-{AC001,PARENT,INHERIT-001,INHERIT-002,INHERIT-003,INHERIT-004,INHERIT-005,INHERIT-006,INHERIT-007,INHERIT-011,INHERIT-012,INHERIT-014}`。
  - `VOXWARD-SUB-048`（13 行 `failed`）：`VW-SUB048-{AC001,STORY,PARENT,INHERIT-001,INHERIT-002,INHERIT-003,INHERIT-004,INHERIT-005,INHERIT-006,INHERIT-007,INHERIT-011,INHERIT-012,INHERIT-014}`。
- **修复方向（`voxward/s026-fix1`，继续严格保持 `apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**` 零修改）**：
  1. **补齐最小复现集成断言并修正矩阵状态（闭环 `B14a`）**：
     - 在 `manual-coordinator-wiring.test.ts` 增加 `Q55` `C6` 最小可复现断言（`maxScore=10` 下 `[-3, +2×6, -3]` 改判首条后断言当前实现产出 `currentScore === 9`、`needsManualAdjustment === false` 与真实账本重放值 `7` 存在 `+2` 偏差），以及 `Q57` `R7` 双 `ReviewRunner` 共享 `TaskCoordinator` 跳过未知 `BACKGROUND` 任务致其滞留 `RUNNING` 的最小复现断言；
     - 在 `dedupe-replay-sc.test.ts` 增加 `Q46` `memberMilestoneChatDetails.userComment` 被 `parseStreamItem` 解析为 `null`（`body: ""`）及 `ChannelEvent` 无付费标记字段的最小复现断言，以及 `Q41` 稳态轮询（非空 `resumeToken`）在本机时钟快偏超过 `replayMaxAgeMs` 时丢弃实时消息的最小复现断言；
     - 更新 `docs/acceptance/core-flow-matrix.md` §3 与 §4：将已实测通过的局部契约（如 `Q49` 并发冲突/`operationId` 幂等、单实例 `PAID > REALTIME > BACKGROUND` 优先级、`superChatDetails.userComment` 解析、`classifyReplay` 精确阈值）与仍打开的产品缺陷/未装配项（`Q55` `C6`、`Q46` 里程碑评论与 `ChannelEvent` 付费标记、`Q39` 入站事务未合一、`Q41` 稳态时钟偏移误丢、`Q52` `app.ts` 主链路与 `resumePendingScoring` 未装配、`Q57` `R7` 跨实例跳过）明确区分，不再把未闭环 Q 项笼统标为 `PASS`，并在 §4 逐条给出最小复现用例定位与现象。
  2. **补齐「异常不扣分」跨模块测试与矩阵行（闭环 `B14b`）**：
     - 在 `apps/server/test/integration/core-flow/` 新增跨模块「异常不扣分」集成测试（覆盖实时任务经 `TaskCoordinator.reportFailure` 耗尽重试转入 `pending_review` 以及后台 `ReviewRunner` 模型超时/返回非法 JSON 触发 `MODEL_CALL_FAILED`/`AI_OUTPUT_INVALID` 时，目标观众 `subject_scores.current_score` 与 `score_ledger` 行数保持不变、零扣分），并在 `docs/acceptance/core-flow-matrix.md` §3 增加对应证据行。
  3. **改为仓库内可解析相对路径（闭环 `B14c`）**：
     - 将 `docs/acceptance/core-flow-matrix.md` 与 `tests/integration/core-flow/README.md` 中的全部 `file:///home/ryanlan/...` 链接改为仓库内相对 Markdown 链接（如 `../../tests/integration/core-flow/README.md`、`../../apps/server/test/integration/core-flow/routing-scoring.test.ts`），同步更新 `.kiro/specs/voxward-s026-core-flow/{design.md,tasks.md,evidence/self-check.md}`。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N16a | `docs/acceptance/core-flow-matrix.md:5,55` 标注「固定候选版本：`fcad360`」，系分支切出时的产品源码基线 SHA（不含本分支新增测试提交 `51f12b0`）。建议在 `s026-fix1` 更新矩阵时同时注明「产品 `src/` 基线提交」与「跨模块测试套件所在分支/验收候选说明」，便于读者区分只读产品树版本与测试资产版本。 | 审查 `docs/acceptance/core-flow-matrix.md:5,55` | `s026-fix1` 顺手完善 |

### 问题清单（Q 项）处置建议（`tasks.md` 关联 9 项）

> 说明：S026 工单明确限定**不修改产品 `src/`**，因此对仍存在真实代码缺陷或主运行链路未装配的 Q 项，S026 的职责是**如实复现并记录在矩阵 §4**（待后续产品修复/装配工单修改 `src/` 后关闭），而非在未改 `src/` 的情况下将其关闭。

- **已在 `df376eb` 跨模块实测验证成立（待 S026 返工一通过关单时正式关闭）的 Q 项（2 项）**：
  - **`Q20`**（退订/降级不扣历史合规积累分，`identityBaseScore` 与 `behaviorAdjustTotal` 分离重算）：`routing-scoring.test.ts` 已完整闭环。
  - **`Q43`**（身份基准分上调叠加高行为分时的上限钳制与退级回落）：`routing-scoring.test.ts` 已完整闭环。
- **在 `df376eb` 的 `src/` 中仍未闭环、须在 `s026-fix1` 矩阵 §4 如实作为既有缺陷/未装配项记录并保持 OPEN 的 Q 项（7 项）**：
  - **`Q39`**：`MessageIdStore` 与 SQLite `channel_events_dedupe_uq` 各自有效，但生产入站路径尚未绑定在同一短事务中（保持 OPEN）。
  - **`Q41`**：`classifyReplay` 5 分钟阈值本身精确，但 `runStreamList` 稳态轮询未限定仅首连/重连执行，时钟快偏超阈值会误丢实时消息（保持 OPEN）。
  - **`Q46`**：`superChatDetails.userComment` 已保留，但 `memberMilestoneChatDetails.userComment` 仍被丢弃为 `null` 且 `ChannelEvent` 缺付费标识字段（保持 OPEN）。
  - **`Q49` / `Q55`**：`Q49`（终态任务并发冲突拒绝与 `operationId` 幂等）已验证成立；但 `Q55` 的 `C6` 上限钳制改判补偿偏差在 `db/decision-store.ts` 中仍复现（`currentScore=9` vs 账本重放 `7`），须在 §4 记录 `Q55` 为既有缺陷（`Q49` 可在矩阵单独标 `PASS`，`Q55` 保持 OPEN）。
  - **`Q52`**：`TaskCoordinator` 车道优先级已验证成立，但 `apps/server/src/app.ts` 尚未装配 SC 自动入 `PAID` 车道、复盘模型绑定与 `resumePendingScoring` 定时补偿（保持 OPEN）。
  - **`Q57`**：单实例车道调度与未知任务 `reportFailure` 收敛已验证，但多 `ReviewRunner` 共享协调器的 `R7` 跳过悬挂问题在 `src/` 中仍存在（保持 OPEN）。

## 需 Owner 决定

无。`B14`（`B14a`、`B14b`、`B14c`）完全属于在不改 `src/` 约束下补齐 S026 验收矩阵真实性、最小复现断言、异常不扣分用例与文档相对路径的工单内返工事项，无需调整产品范围或请求外部授权。

## 复验范围（供 S026 返工一使用）

若 `voxward/s026-fix1` 继续严格保持 `apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**` 零改动，仅修改 `.kiro/specs/voxward-s026-core-flow/**`、`tests/integration/core-flow/**`、`apps/server/test/integration/core-flow/**` 与 `docs/acceptance/core-flow-matrix.md`，下一轮只需执行常规门禁（`build`、`typecheck`、`check:deps`、`kiro-specs.mjs check`）并在 `guarded.sh` 下运行 `apps/server/test/integration/core-flow` 与文档路径/矩阵核查，即可对 `VOXWARD-STORY-026` 与 `VOXWARD-SUB-048`（45 行）完成窄范围复验。
