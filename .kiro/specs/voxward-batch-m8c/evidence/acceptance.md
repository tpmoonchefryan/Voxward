# 第 m8c 批独立验收证据（Wave 3a：S026 首次验收，候选 `df376eb`）

## 1. 验收基线、门禁与实测探针摘要

- **候选版本**：分离只读工作树 `/home/ryanlan/Code/Voxward/.worktrees/verify-m8c` 上的 `df376eb`（完整 SHA `df376eb934fe8c2185777a467f625117facf2a66`，在 `994db71` 之上合入 `51f12b0` `voxward/s026-core-flow`；Spec 提交 `f237c9f` 先于实现提交 `51f12b0`）。
- **实时工单快照**：`headEventHash = d3fa513afd7b9c6b584586d1f9071b43d312839e52e0556b81e5c815ae1f2781`，共 2 张活跃工单、45 行验收（`VOXWARD-STORY-026` `rev=4` 22 行；`VOXWARD-SUB-048` `rev=3` 23 行）。
- **统计汇总**：**45 行（satisfied 20 行、failed 25 行、unverified 0 行；machine 21 行、source-behavior-review 24 行）**。两单均因阻断 **`B14`（`B14a`、`B14b`、`B14c`）** 判定 **打回（REJECT）**。

### 1.1 独立门禁与 Q58 守护实测记录

| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |
| --- | --- | --- | --- | --- |
| D2 | Spec 先行与零产品改动核查 | `git log / git diff 994db71...51f12b0`（`probes/logs/d2-diff.log`） | `0` | Spec `f237c9f`（4 文件）先于实现 `51f12b0`（9 文件）；`apps/server/src`、`apps/web/src`、`packages/contracts/src`、`scripts`、`vitest.workspace.ts` 均为 **0 修改** |
| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |
| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |
| E05 | Q58 守卫下 S026 集成套件 + 基线全量单测 | `guarded.sh .../e05-s026-vitest pnpm --filter @voxward/server exec vitest run test/integration/core-flow`（配合主线程同 SHA 全量 `pnpm test` 与 `smoke.sh`） | `0` | S026 套件 **3/3 文件、10/10 用例**全绿；同 SHA 全量基线 **167/167 文件、1956/1956 用例**全绿；`smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听 |
| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 临时目录违规对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `254 files checked, 0 violations`；负向对照检出 `4 violation(s)` 并以退出码 `1` 拒绝 |
| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:3ebb2c33e7560e8661143983 --spec-dir .../voxward-s026-core-flow`（`e10-s026-spec.json`） | `0` | `SPEC_CURRENT`（`workRevision: 4`） |
| E80 | Q58 守卫下独立跨模块探针 `probe-m8c.mts` | `CI=1 bash guarded.sh .../e80-m8c tsx .../probe-m8c.mts`（`e80-m8c.json`、`q58-audit.json`） | `0` | `C1`（Q55 `C6` 钳制改判账本偏差：`currentScore=9` vs 账本重放 `7`）、`C2`（Q46 里程碑 `userComment` 丢失为 `null`/空串 + `ChannelEvent` 无付费标记；Q41 稳态轮询时钟快偏 6 分钟丢弃实时消息）、`C3`（Q57 `R7` 跨实例跳过未知任务致任务悬挂 `RUNNING`；`VW-R-004` AI 超时 `FAILED` 且 `scoringCalls=0`）、`C4`（提交入库文档含 8 处硬编码临时工作树 `file://` URI）全部实测复现；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行 |

---

## 2. VOXWARD-STORY-026 逐行验收证据（22 行：10 satisfied / 12 failed）

<a id="vw-s026-ac001"></a>
### VW-S026-AC001 — `failed` (`machine`)
- **关联需求**：`VW-S026-R001@1` (`work:3ebb2c33e7560e8661143983`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。

<a id="vw-s026-parent"></a>
### VW-S026-PARENT — `failed` (`machine`)
- **关联需求**：`VW-E006-R026@1` (`work:79b813cdbe785e9ab7d32228`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。

<a id="vw-s026-inherit-001"></a>
### VW-S026-INHERIT-001 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：第 m8c 批（df376eb）文档与边界审查未通过（阻断 B14c）。模块边界与只读范围保持成立（E06 check:deps 254 文件 0 违规，D2 核实未改动任何产品 src/ 或引入新代理/云服务），但本单提交入库的持久验收文档 docs/acceptance/core-flow-matrix.md:7-14（7 处）与 tests/integration/core-flow/README.md:16（1 处）硬编码了开发者本机临时工作树绝对 URI file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4 实测命中 8 处），违反持久文本使用可解析相对路径、不固化设备与临时工作树位置的要求。

<a id="vw-s026-inherit-002"></a>
### VW-S026-INHERIT-002 — `failed` (`machine`)
- **关联需求**：`VW-R-002@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-002 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。虽然 routing-scoring.test.ts 实测验证了 Q20/Q43 身份基准分离与退级回落，dedupe-replay-sc.test.ts 验证了平台删除配额耗尽与 UNKNOWN 重试，但 docs/acceptance/core-flow-matrix.md:31-32 将 Q39 与 Q41 标为 PASS 而未披露真实缺口：Q39 在生产入站路径中 MessageIdStore 仍为纯内存结构且未与 SQLite channel_events_dedupe_uq 绑定于同一入站事务；Q41 在 platform-source/youtube/stream-list.ts 中对非首次稳态轮询（resumeToken 非空）仍逐条执行 classifyReplay，E80 C2 实测本机时钟快偏 6 分钟时实时消息被判为 STALE_REPLAY 静默丢弃（delivered=0, staleReplay=1）。违反「缺陷和未测清楚」判据。

<a id="vw-s026-inherit-003"></a>
### VW-S026-INHERIT-003 — `failed` (`machine`)
- **关联需求**：`VW-R-003@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-003 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。routing-scoring.test.ts 对普通消息 R1–R6（含规范化 café->cafe、精确拦截、谐音草泥马->caonima 进 REVIEW、白名单与噪声先经规则检查、例外先入 EXCEPTION）验证成立；但在付费自定义文本路径（Q46）上，dedupe-replay-sc.json:33 仅使用无评论字段的 membershipGiftingEvent 并手工硬编码 enqueueInLane('PAID')，而 docs/acceptance/core-flow-matrix.md:33 将「Q46 & Q52：SC userComment 与会员里程碑解析」标为 PASS。E80 C2 实测 parseStreamItem 对含 memberMilestoneChatDetails.userComment 的 memberMilestoneChatEvent 返回 text: null（toBusinessEvent 产出空串 body: ''），且 ChannelEvent 仍不含付费消息标识字段供下游自动分流，该真实产品缺口未被复现列入矩阵 §4。

<a id="vw-s026-inherit-004"></a>
### VW-S026-INHERIT-004 — `failed` (`machine`)
- **关联需求**：`VW-R-004@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-004 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14b、B14a）。routing-scoring.test.ts 验证了上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份变化基准重算，但：（1）B14b：VW-R-004 与 VW-S026-R001 明确要求的「故障不扣分 / 异常不扣分」（AI 调用超时/异常/非法 JSON 时不触发观众扣分，E80 C3 对 ReviewRunner 实测 MODEL_CALL_FAILED 时 scoringCalls=0）在 3 个集成测试文件与 docs/acceptance/core-flow-matrix.md 中完全缺失；（2）B14a：Q55 上限钳制后的改判补偿偏差（E80 C1）在矩阵 §3 中被误标为 PASS。

<a id="vw-s026-inherit-005"></a>
### VW-S026-INHERIT-005 — `failed` (`machine`)
- **关联需求**：`VW-R-005@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-005 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。本单虽在矩阵 §4 第 1 项如实记录了默认 CandidateStore 未入 SubjectCacheHub 的装配缺口（N7/N12b），但在后台复盘与调度链路上，docs/acceptance/core-flow-matrix.md:33,37 将 Q52（含复盘待记分恢复定时 resumePendingScoring 未在 app.ts 装配）与 Q57（ReviewRunner R7：多实例共享 TaskCoordinator 时抽到非本实例入队的 BACKGROUND 任务会跳过并调 finishBatch，导致任务卡在 RUNNING 直至过期，E80 C3 实测 skippedItems=0）直接标为 PASS，未按要求在 §4 记录最小可复现缺口，且缺失整单要求的异常不扣分矩阵项。

<a id="vw-s026-inherit-006"></a>
### VW-S026-INHERIT-006 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：第 m8c 批（df376eb）连接与边界审查未通过（阻断 B14a）。对照 VW-R-006（微批、付费优先、复盘让出实时容量）审查 docs/acceptance/core-flow-matrix.md:33,37 与 apps/server/test/integration/core-flow/{dedupe-replay-sc,manual-coordinator-wiring}.test.ts：测试仅用独立单实例手工调用 coordinator.enqueueInLane('PAID') 与 coordinator.reportFailure('task-does-not-exist')，却在矩阵中将 Q52（生产 app.ts 尚未把 SC 自动路由至 PAID 车道或装配复盘模型/定时任务）与 Q57（master tasks.md 明确指出的 R7 缺陷：ReviewRunner 抽到其它实例的 BACKGROUND 任务时跳过并 finishBatch 使任务悬挂 RUNNING，E80 C3 复现）标为 PASS，违反本行「记录本单的连接/审查证据……不填写虚构通过」的要求。

<a id="vw-s026-inherit-007"></a>
### VW-S026-INHERIT-007 — `failed` (`machine`)
- **关联需求**：`VW-R-007@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-007 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。manual-coordinator-wiring.test.ts 验证了已终态任务重复 commit 返回 conflict、operationId 幂等及平台删除降级，但完全漏测 master tasks.md:119 与 m6r1 judgment.md N1 明确交由 S026 覆盖的 Q55 序列 C6（db/decision-store.ts:724-748 仅在原时间线发生过钳制时标 needsManualAdjustment，未检测补偿后新时间线触发上限钳制），反而将例外零分测试标为 Q55 并在 docs/acceptance/core-flow-matrix.md:35-36 标为 PASS（「账本与当前分值一致」）。E80 C1 实测 maxScore=10 下 [-3, +2×6, -3] 改判首条为 ALLOW_MEANINGFUL 后 currentScore=9、needsManualAdjustment=false，而真实账本重放应在 10 处钳制得 7，违反 VW-R-007「纠分依据真实账本」与本单「缺陷和未测清楚、最小可复现缺陷」判据。

<a id="vw-s026-inherit-008"></a>
### VW-S026-INHERIT-008 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-008@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。
- **场景**：核对本单与 VW-R-008 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-008 核查 D2 变更集、apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts:390-441 及 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未修改普通审核/SC/复盘 JSON 契约或校验器职责，并在不改 src/ 的前提下如实复现记录了 m8a N13（db/output-store.ts 对 TRANSLATION JSON 字符串原样直出而非提取译文字段），未对未测契约填写虚构通过。

<a id="vw-s026-inherit-009"></a>
### VW-S026-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8c 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及真实外部提供方清理。

<a id="vw-s026-inherit-010"></a>
### VW-S026-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与核心业务端口解耦，未改动 EPIC-002/005 模型选择或适配器代码，并在矩阵 §5 明确标注本单未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。

<a id="vw-s026-inherit-011"></a>
### VW-S026-INHERIT-011 — `failed` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-011 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。虽然测试均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待，但 docs/acceptance/core-flow-matrix.md:31,35 将 Q39（内存 MessageIdStore 尚未与 SQLite channel_events_dedupe_uq 绑定为单一生产入站事务）与 Q55（C6 改判后 subject_scores.current_score=9 与真实账本重放值 7 不一致且 needsManualAdjustment=false，E80 C1）标为 PASS 而未列入 §4 最小可复现缺陷，且缺失异常不扣分跨模块证据。

<a id="vw-s026-inherit-012"></a>
### VW-S026-INHERIT-012 — `failed` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-012 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。manual-coordinator-wiring.test.ts:331-385 复用了真实 /auth/login 会话 Cookie、x-csrf-token 与 DATA_ADMIN 角色门禁执行删除请求，未破坏既有 RBAC 边界；但本行共享 S026 整单机器判据（「每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚」），因矩阵 §3 对 Q39/Q41/Q46/Q52/Q55/Q57 给出失实 PASS 且遗漏异常不扣分验证而未满足。

<a id="vw-s026-inherit-013"></a>
### VW-S026-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4 第 1 项：本单未修改 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并如实记录了 buildApp 默认 NO_SUBJECT_CACHES 导致外部/默认 CandidateStore 候选词卡在主体删除后仍保留（m7c N7 / m7e N12b），与显式注入 SubjectCacheHub 的清理结果对照清晰，无虚构通过。

<a id="vw-s026-inherit-014"></a>
### VW-S026-INHERIT-014 — `failed` (`machine`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-014 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。routing-scoring.test.ts（R7 例外绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:195-240（score_exceptions 生效期拒绝 BLOCK 记分并抛 EXCEPTION_ACTIVE、分值保持 0）本身验证成立；但后者将该用例误标为 Q55 以支撑矩阵 §3「Q49 & Q55 PASS」，掩盖了真正的 Q55 C6 钳制改判账本偏差（E80 C1），且整单缺失异常不扣分矩阵与用例，未满足本行「缺陷和未测清楚」判据。

<a id="vw-s026-inherit-015"></a>
### VW-S026-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单未修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中保持了模型模拟替身与数据库已提交事实的区分，未填写虚构通过。

<a id="vw-s026-inherit-016"></a>
### VW-S026-INHERIT-016 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- **场景**：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-016 核查合成夹具（routing-scoring.json、dedupe-replay-sc.json、manual-coordinator-wiring.json）与测试套件：各测试事件均携带显式 correlationId 贯穿路由、裁决与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，未填写虚构通过。

<a id="vw-s026-inherit-017"></a>
### VW-S026-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，未创建清理遗漏持久副本，也未宣称合成测试覆盖了备份恢复或提供方删除（完整生命周期由 S019/S020 承接）。

<a id="vw-s026-inherit-018"></a>
### VW-S026-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:390-441 与 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议实现，如实复现并记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），未填写虚构通过。

<a id="vw-s026-inherit-019"></a>
### VW-S026-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，也未冒充前端 UI 或隔离 sandbox 验收。

<a id="vw-s026-inherit-020"></a>
### VW-S026-INHERIT-020 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-020@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-020 承载。
- **场景**：核对本单与 VW-R-020 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-006；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环验证，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。

---

## 3. VOXWARD-SUB-048 逐行验收证据（23 行：10 satisfied / 13 failed）

<a id="vw-sub048-ac001"></a>
### VW-SUB048-AC001 — `failed` (`machine`)
- **关联需求**：`VW-SUB048-R001@1` (`work:39c1e2e33d41ec9ee1b74170`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。

<a id="vw-sub048-story"></a>
### VW-SUB048-STORY — `failed` (`machine`)
- **关联需求**：`VW-S026-R001@1` (`work:3ebb2c33e7560e8661143983`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：本单承担 VW-S026-R001@1 中「路由/评分边界、平台去重、身份、人工冲突/补偿、异常不扣分和例外矩阵；固定候选版本与测试输入；最小可复现缺陷」：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 本单只证明所承担部分；VOXWARD-STORY-026 的完整判据（VW-S026-AC001@1）保持。
- **实测/审查结论**：第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。

<a id="vw-sub048-parent"></a>
### VW-SUB048-PARENT — `failed` (`machine`)
- **关联需求**：`VW-E006-R026@1` (`work:79b813cdbe785e9ab7d32228`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（继承自 VOXWARD-STORY-026 VW-S026-PARENT@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。

<a id="vw-sub048-inherit-001"></a>
### VW-SUB048-INHERIT-001 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：第 m8c 批（df376eb）文档与边界审查未通过（阻断 B14c）。模块边界与只读范围保持成立（E06 check:deps 254 文件 0 违规，D2 核实未改动任何产品 src/ 或引入新代理/云服务），但本单提交入库的持久验收文档 docs/acceptance/core-flow-matrix.md:7-14（7 处）与 tests/integration/core-flow/README.md:16（1 处）硬编码了开发者本机临时工作树绝对 URI file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4 实测命中 8 处），违反持久文本使用可解析相对路径、不固化设备与临时工作树位置的要求。

<a id="vw-sub048-inherit-002"></a>
### VW-SUB048-INHERIT-002 — `failed` (`machine`)
- **关联需求**：`VW-R-002@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-002 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-002@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。虽然 routing-scoring.test.ts 实测验证了 Q20/Q43 身份基准分离与退级回落，dedupe-replay-sc.test.ts 验证了平台删除配额耗尽与 UNKNOWN 重试，但 docs/acceptance/core-flow-matrix.md:31-32 将 Q39 与 Q41 标为 PASS 而未披露真实缺口：Q39 在生产入站路径中 MessageIdStore 仍为纯内存结构且未与 SQLite channel_events_dedupe_uq 绑定于同一入站事务；Q41 在 platform-source/youtube/stream-list.ts 中对非首次稳态轮询（resumeToken 非空）仍逐条执行 classifyReplay，E80 C2 实测本机时钟快偏 6 分钟时实时消息被判为 STALE_REPLAY 静默丢弃（delivered=0, staleReplay=1）。违反「缺陷和未测清楚」判据。

<a id="vw-sub048-inherit-003"></a>
### VW-SUB048-INHERIT-003 — `failed` (`machine`)
- **关联需求**：`VW-R-003@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-003 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-003@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。routing-scoring.test.ts 对普通消息 R1–R6（含规范化 café->cafe、精确拦截、谐音草泥马->caonima 进 REVIEW、白名单与噪声先经规则检查、例外先入 EXCEPTION）验证成立；但在付费自定义文本路径（Q46）上，dedupe-replay-sc.json:33 仅使用无评论字段的 membershipGiftingEvent 并手工硬编码 enqueueInLane('PAID')，而 docs/acceptance/core-flow-matrix.md:33 将「Q46 & Q52：SC userComment 与会员里程碑解析」标为 PASS。E80 C2 实测 parseStreamItem 对含 memberMilestoneChatDetails.userComment 的 memberMilestoneChatEvent 返回 text: null（toBusinessEvent 产出空串 body: ''），且 ChannelEvent 仍不含付费消息标识字段供下游自动分流，该真实产品缺口未被复现列入矩阵 §4。

<a id="vw-sub048-inherit-004"></a>
### VW-SUB048-INHERIT-004 — `failed` (`machine`)
- **关联需求**：`VW-R-004@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-004 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-004@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14b、B14a）。routing-scoring.test.ts 验证了上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份变化基准重算，但：（1）B14b：VW-R-004 与 VW-S026-R001 明确要求的「故障不扣分 / 异常不扣分」（AI 调用超时/异常/非法 JSON 时不触发观众扣分，E80 C3 对 ReviewRunner 实测 MODEL_CALL_FAILED 时 scoringCalls=0）在 3 个集成测试文件与 docs/acceptance/core-flow-matrix.md 中完全缺失；（2）B14a：Q55 上限钳制后的改判补偿偏差（E80 C1）在矩阵 §3 中被误标为 PASS。

<a id="vw-sub048-inherit-005"></a>
### VW-SUB048-INHERIT-005 — `failed` (`machine`)
- **关联需求**：`VW-R-005@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-005 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-005@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。本单虽在矩阵 §4 第 1 项如实记录了默认 CandidateStore 未入 SubjectCacheHub 的装配缺口（N7/N12b），但在后台复盘与调度链路上，docs/acceptance/core-flow-matrix.md:33,37 将 Q52（含复盘待记分恢复定时 resumePendingScoring 未在 app.ts 装配）与 Q57（ReviewRunner R7：多实例共享 TaskCoordinator 时抽到非本实例入队的 BACKGROUND 任务会跳过并调 finishBatch，导致任务卡在 RUNNING 直至过期，E80 C3 实测 skippedItems=0）直接标为 PASS，未按要求在 §4 记录最小可复现缺口，且缺失整单要求的异常不扣分矩阵项。

<a id="vw-sub048-inherit-006"></a>
### VW-SUB048-INHERIT-006 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-006@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：第 m8c 批（df376eb）连接与边界审查未通过（阻断 B14a）。对照 VW-R-006（微批、付费优先、复盘让出实时容量）审查 docs/acceptance/core-flow-matrix.md:33,37 与 apps/server/test/integration/core-flow/{dedupe-replay-sc,manual-coordinator-wiring}.test.ts：测试仅用独立单实例手工调用 coordinator.enqueueInLane('PAID') 与 coordinator.reportFailure('task-does-not-exist')，却在矩阵中将 Q52（生产 app.ts 尚未把 SC 自动路由至 PAID 车道或装配复盘模型/定时任务）与 Q57（master tasks.md 明确指出的 R7 缺陷：ReviewRunner 抽到其它实例的 BACKGROUND 任务时跳过并 finishBatch 使任务悬挂 RUNNING，E80 C3 复现）标为 PASS，违反本行「记录本单的连接/审查证据……不填写虚构通过」的要求。

<a id="vw-sub048-inherit-007"></a>
### VW-SUB048-INHERIT-007 — `failed` (`machine`)
- **关联需求**：`VW-R-007@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-007 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-007@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。manual-coordinator-wiring.test.ts 验证了已终态任务重复 commit 返回 conflict、operationId 幂等及平台删除降级，但完全漏测 master tasks.md:119 与 m6r1 judgment.md N1 明确交由 S026 覆盖的 Q55 序列 C6（db/decision-store.ts:724-748 仅在原时间线发生过钳制时标 needsManualAdjustment，未检测补偿后新时间线触发上限钳制），反而将例外零分测试标为 Q55 并在 docs/acceptance/core-flow-matrix.md:35-36 标为 PASS（「账本与当前分值一致」）。E80 C1 实测 maxScore=10 下 [-3, +2×6, -3] 改判首条为 ALLOW_MEANINGFUL 后 currentScore=9、needsManualAdjustment=false，而真实账本重放应在 10 处钳制得 7，违反 VW-R-007「纠分依据真实账本」与本单「缺陷和未测清楚、最小可复现缺陷」判据。

<a id="vw-sub048-inherit-008"></a>
### VW-SUB048-INHERIT-008 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-008@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。
- **场景**：核对本单与 VW-R-008 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-008@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-008 核查 D2 变更集、apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts:390-441 及 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未修改普通审核/SC/复盘 JSON 契约或校验器职责，并在不改 src/ 的前提下如实复现记录了 m8a N13（db/output-store.ts 对 TRANSLATION JSON 字符串原样直出而非提取译文字段），未对未测契约填写虚构通过。

<a id="vw-sub048-inherit-009"></a>
### VW-SUB048-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-009@1）
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8c 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及真实外部提供方清理。

<a id="vw-sub048-inherit-010"></a>
### VW-SUB048-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-010@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与核心业务端口解耦，未改动 EPIC-002/005 模型选择或适配器代码，并在矩阵 §5 明确标注本单未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。

<a id="vw-sub048-inherit-011"></a>
### VW-SUB048-INHERIT-011 — `failed` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-011@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。虽然测试均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待，但 docs/acceptance/core-flow-matrix.md:31,35 将 Q39（内存 MessageIdStore 尚未与 SQLite channel_events_dedupe_uq 绑定为单一生产入站事务）与 Q55（C6 改判后 subject_scores.current_score=9 与真实账本重放值 7 不一致且 needsManualAdjustment=false，E80 C1）标为 PASS 而未列入 §4 最小可复现缺陷，且缺失异常不扣分跨模块证据。

<a id="vw-sub048-inherit-012"></a>
### VW-SUB048-INHERIT-012 — `failed` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-012@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。manual-coordinator-wiring.test.ts:331-385 复用了真实 /auth/login 会话 Cookie、x-csrf-token 与 DATA_ADMIN 角色门禁执行删除请求，未破坏既有 RBAC 边界；但本行共享 S026 整单机器判据（「每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚」），因矩阵 §3 对 Q39/Q41/Q46/Q52/Q55/Q57 给出失实 PASS 且遗漏异常不扣分验证而未满足。

<a id="vw-sub048-inherit-013"></a>
### VW-SUB048-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-013@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4 第 1 项：本单未修改 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并如实记录了 buildApp 默认 NO_SUBJECT_CACHES 导致外部/默认 CandidateStore 候选词卡在主体删除后仍保留（m7c N7 / m7e N12b），与显式注入 SubjectCacheHub 的清理结果对照清晰，无虚构通过。

<a id="vw-sub048-inherit-014"></a>
### VW-SUB048-INHERIT-014 — `failed` (`machine`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-014 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-014@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。routing-scoring.test.ts（R7 例外绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:195-240（score_exceptions 生效期拒绝 BLOCK 记分并抛 EXCEPTION_ACTIVE、分值保持 0）本身验证成立；但后者将该用例误标为 Q55 以支撑矩阵 §3「Q49 & Q55 PASS」，掩盖了真正的 Q55 C6 钳制改判账本偏差（E80 C1），且整单缺失异常不扣分矩阵与用例，未满足本行「缺陷和未测清楚」判据。

<a id="vw-sub048-inherit-015"></a>
### VW-SUB048-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-015@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单未修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中保持了模型模拟替身与数据库已提交事实的区分，未填写虚构通过。

<a id="vw-sub048-inherit-016"></a>
### VW-SUB048-INHERIT-016 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- **场景**：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-016@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-016 核查合成夹具（routing-scoring.json、dedupe-replay-sc.json、manual-coordinator-wiring.json）与测试套件：各测试事件均携带显式 correlationId 贯穿路由、裁决与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，未填写虚构通过。

<a id="vw-sub048-inherit-017"></a>
### VW-SUB048-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-017@1）
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，未创建清理遗漏持久副本，也未宣称合成测试覆盖了备份恢复或提供方删除（完整生命周期由 S019/S020 承接）。

<a id="vw-sub048-inherit-018"></a>
### VW-SUB048-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-018@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:390-441 与 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议实现，如实复现并记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），未填写虚构通过。

<a id="vw-sub048-inherit-019"></a>
### VW-SUB048-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-019@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，也未冒充前端 UI 或隔离 sandbox 验收。

<a id="vw-sub048-inherit-020"></a>
### VW-SUB048-INHERIT-020 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-020@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-020 承载。
- **场景**：核对本单与 VW-R-020 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-020@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-006；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环验证，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。
