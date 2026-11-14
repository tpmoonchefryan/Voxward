# 第 m8c-r1 批独立验收证据（Wave 3c：S026 返工一复验，候选 `f1a75e9`）

## 1. 验收基线、门禁与实测探针摘要

- **候选版本**：分离只读检出 `verify-m8cr1` 上的 `f1a75e9`（完整 SHA `f1a75e9393106a1ae8e8b7069b0d18d91763e586`，在 `b1cc8af` / 只读产品基线 `6a6af8a` 之上合入 `d9e7d48` `voxward/s026-fix1`；Spec 提交 `f3d1a6a` 先于实现提交 `d9e7d48`）。
- **实时工单快照**：`headEventHash = 108fc16d76405fa00c3eab8035fcc0b2f7e0dfd0c801ba874dca6967519db247`，共 2 张活跃工单、45 行验收（`VOXWARD-STORY-026` `rev=5` 22 行；`VOXWARD-SUB-048` `rev=4` 23 行）。
- **统计汇总**：**45 行（satisfied 45 行、failed 0 行、unverified 0 行；machine 21 行、source-behavior-review 24 行）**。前轮阻断 **`B14`（`B14a`、`B14b`、`B14c`）** 与建议 **`N16a`** 全部闭环，两张工单均判定 **通过（PASS）**。

### 1.1 独立门禁与 Q58 守护实测记录

| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |
| --- | --- | --- | --- | --- |
| D2 | Spec 先行与零产品改动核查 | `git log / git diff 6a6af8a..d9e7d48`（`probes/logs/d2-diff.log`） | `0` | Spec `f3d1a6a`（4 文件）先于实现 `d9e7d48`（8 文件）；`apps/*/src`、`packages/*/src`、`scripts`、`deploy`、`vitest.workspace.ts` 均为 **0 修改** |
| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |
| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |
| E05 | Q58 守卫下 S026 集成套件 | `guarded.sh .../e05-s026-vitest pnpm --filter @voxward/server test test/integration/core-flow` | `0` | **4/4 文件、16/16 用例**全绿（含新增 `failure-no-penalty.test.ts` 与 `B14a` 四项最小复现断言） |
| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 临时目录违规对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `264 files checked, 0 violations`；负向对照检出 `2 violation(s)` 并以退出码 `1` 拒绝 |
| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:3ebb2c33e7560e8661143983 --spec-dir .kiro/specs/voxward-s026-core-flow`（`e10-s026-spec.json`） | `0` | `SPEC_CURRENT`（`workRevision: 5`） |
| E80 | Q58 守卫下独立复验探针 `probe-m8cr1.mts` | `CI=1 bash guarded.sh .../e80-m8cr1 tsx .../probe-m8cr1.mts`（`e80-m8cr1.json`、`q58-audit.json`） | `0` | `P1`（`Q55` `C6` 改判偏差 `9` vs `7` 复现且矩阵标 `FAIL / OPEN`）、`P2`（`Q46`、`Q41`、`Q57` `R7` 复现且矩阵标 `PARTIAL / OPEN`）、`P3`（`B14b` 正分观众 `score=2` 在实时 `reportFailure` 转 `PENDING_REVIEW` 与复盘 `MODEL_CALL_FAILED`/`AI_OUTPUT_INVALID` 下保持 `score=2`、`ledger=1`、`scoringCalls=0`）、`P4`（14 个 S026 文件作者受控区 `0` 处本地绝对路径、主矩阵 `8/8` 相对链接存在，仅三级目录 `README.md:17` 少一级 `../` 记非阻断 `N18a`）全绿；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行、外发 0 条 |

---

## 2. VOXWARD-STORY-026 逐行验收证据（22 行：22 satisfied / 0 failed）

<a id="vw-s026-ac001"></a>
### VW-S026-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-S026-R001@1` (`work:3ebb2c33e7560e8661143983`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。

<a id="vw-s026-parent"></a>
### VW-S026-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E006-R026@1` (`work:79b813cdbe785e9ab7d32228`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。

<a id="vw-s026-inherit-001"></a>
### VW-S026-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 D2 变更集、scripts/check-deps.mjs（E06 264 文件 0 违规；E09 负向对照退出码 1）及 E80 P4 文档可移植路径扫描：本单严守零产品改动边界，未引入生产托管服务、新本机代理或供应商对象贯穿业务层；前轮 B14c 已关闭，docs/acceptance/core-flow-matrix.md（8/8 相对链接全部解析存在）、tests/integration/core-flow/README.md 与 Spec 作者受控区 0 处本地 URI、家目录或临时工作树路径（仅 README.md:17 回指矩阵少一级 ../ 记为非阻断建议 N18a）。

<a id="vw-s026-inherit-002"></a>
### VW-S026-INHERIT-002 — `satisfied` (`machine`)
- **关联需求**：`VW-R-002@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-002 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 16/16 全绿 + E80 P2）实测覆盖身份事件基准分离与退级回落（Q20/Q43）、平台删除 QUOTA_EXHAUSTED 本地 BLOCK 保留与 UNKNOWN 有界重试、MessageIdStore + channel_events_dedupe_uq 组件级去重及 classifyReplay 5 分钟精确阈值；同时如实以最小复现断言固定并在 core-flow-matrix.md §3/§4（PARTIAL / OPEN）披露 Q39 入站单事务未合一与 Q41 稳态轮询 +6m01s 时钟快偏误丢实时消息（staleReplay=1, delivered=0），满足每项有实证且缺陷与未测清楚（B14a 已关闭）。

<a id="vw-s026-inherit-003"></a>
### VW-S026-INHERIT-003 — `satisfied` (`machine`)
- **关联需求**：`VW-R-003@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-003 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P2）验证了普通消息 R1–R6 真值表（含匿名噪声 ALLOW_NOISE/FAST_PASS、白名单、高分快通、café->cafe 规范化抽查、精确匹配扣分、谐音草泥马->caonima 进 REVIEW、例外先入 EXCEPTION）与 superChatDetails.userComment 解析；同时在 dedupe-replay-sc.test.ts:309-348 新增 Q46 最小复现断言并在 core-flow-matrix.md §3（PARTIAL / OPEN）与 §4.6 如实记录 memberMilestoneChatDetails.userComment 解析为 null（body=''）及 ChannelEvent 缺付费标记字段的既有缺口（B14a 已关闭）。

<a id="vw-s026-inherit-004"></a>
### VW-S026-INHERIT-004 — `satisfied` (`machine`)
- **关联需求**：`VW-R-004@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-004 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts、failure-no-penalty.test.ts 与 manual-coordinator-wiring.test.ts（E05 + E80 P1、P3）完整验证：（1）上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份基准分离重算（Q20/Q43）；（2）前轮 B14b 必交「异常不扣分」：实时 TaskCoordinator.reportFailure 耗尽重试转 PENDING_REVIEW 与后台 ReviewRunner 遇 AI 超时（MODEL_CALL_FAILED）/ 非法 JSON（AI_OUTPUT_INVALID）均满足 scoringCalls=0、观众分与 score_ledger 零扣分（E80 P3 进一步验证正分观众 score=2 原样保持 2）；（3）前轮 B14a：Q55 C6 上限钳制改判偏差已由最小复现断言固定并在 core-flow-matrix.md §3（FAIL / OPEN）与 §4.8 如实披露。

<a id="vw-s026-inherit-005"></a>
### VW-S026-INHERIT-005 — `satisfied` (`machine`)
- **关联需求**：`VW-R-005@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-005 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 manual-coordinator-wiring.test.ts 与 failure-no-penalty.test.ts（E05 + E80 P2、P3）验证了复盘模型超时/坏输出零扣分回退、候选词卡显式 SubjectCacheHub 清理对照，并在不改 src/ 前提下将默认 NO_SUBJECT_CACHES 遗留外部 CandidateStore（§4.1）、Q52 app.ts 未装配复盘模型与 resumePendingScoring（§3 PARTIAL / OPEN、§4.7）以及 Q57 R7 双 ReviewRunner 共享协调器跳过非本实例任务（§3 PARTIAL / OPEN、§4.9）全部以最小复现断言固定披露（B14a、B14b 已关闭）。

<a id="vw-s026-inherit-006"></a>
### VW-S026-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 审查 dedupe-replay-sc.test.ts、manual-coordinator-wiring.test.ts 与 docs/acceptance/core-flow-matrix.md §3/§4（E80 P2、P4）：本单验证了单实例 TaskCoordinator PAID > REALTIME > BACKGROUND 车道优先级与未知任务收敛，同时将 Q52（app.ts 尚未自动串接 SC->PAID 与主链路）和 Q57 R7（多 ReviewRunner 跨实例跳过未知 BACKGROUND 任务）明确标为 PARTIAL / OPEN 并在 §4.7、§4.9 给出复现定位，无任何虚构通过（B14a 已关闭）。

<a id="vw-s026-inherit-007"></a>
### VW-S026-INHERIT-007 — `satisfied` (`machine`)
- **关联需求**：`VW-R-007@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-007 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P1）验证了已终态任务并发冲突拒绝（conflict）、单事件改判纠分与 operationId 幂等（duplicate，Q49）、平台删除配额耗尽本地 BLOCK 保留与 UNKNOWN 有界重试；并在 manual-coordinator-wiring.test.ts:445-555 补齐 Q55 C6 上限钳制改判补偿偏差最小复现断言（currentScore=9、needsManualAdjustment=false vs 账本重放 7），在 core-flow-matrix.md §3 标为 FAIL / OPEN、§4.8 如实归档，去除了原 score_exceptions 用例的 Q55 误标（B14a 已关闭）。

<a id="vw-s026-inherit-008"></a>
### VW-S026-INHERIT-008 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-008@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。
- **场景**：核对本单与 VW-R-008 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-008 核查 D2 变更集、failure-no-penalty.test.ts:159-241（非法 JSON 触发 AI_OUTPUT_INVALID 拒绝采信且 0 扣分）、manual-coordinator-wiring.test.ts:396-443 及 docs/acceptance/core-flow-matrix.md §4.2：本单未修改审核/SC/复盘 JSON Schema 契约，并如实复现记录了 db/output-store.ts 对 TRANSLATION JSON 字符串原样透传的既有现象（m8a N13），无虚构通过。

<a id="vw-s026-inherit-009"></a>
### VW-S026-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8cr1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及外部提供方清理。

<a id="vw-s026-inherit-010"></a>
### VW-S026-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与业务端口解耦，零修改 EPIC-002/005 模型适配器代码，并在矩阵 §5 明确说明未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。

<a id="vw-s026-inherit-011"></a>
### VW-S026-INHERIT-011 — `satisfied` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-011 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块套件（4 文件 16 用例）与 E80 P1、P3 均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待；同时在 core-flow-matrix.md §3/§4 如实区分了 SQLite channel_events_dedupe_uq 唯一约束生效与 Q39 生产入站单事务未合一（PARTIAL / OPEN）、以及 Q55 C6 改判补偿偏差（FAIL / OPEN），并补齐了异常不扣分真实 SQLite 账本断言（B14a、B14b 已关闭）。

<a id="vw-s026-inherit-012"></a>
### VW-S026-INHERIT-012 — `satisfied` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-012 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：manual-coordinator-wiring.test.ts:326-386 通过真实 buildApp + /auth/login 会话 Cookie + x-csrf-token + DATA_ADMIN 角色门禁执行删除请求，dedupe-replay-sc.test.ts 与 manual-coordinator-wiring.test.ts 校验了 REVIEW_CAPABILITY 操作员身份，且矩阵 §3/§4 所有状态与实测断言逐一对齐，无越权或虚构通过（B14a、B14b 已关闭）。

<a id="vw-s026-inherit-013"></a>
### VW-S026-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4.1：本单未改动 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并记录了 buildApp 默认 NO_SUBJECT_CACHES 下外部 CandidateStore 未自动清理（m7c N7 / m7e N12b）与显式注入 SubjectCacheHub 的清理对照，无虚构通过。

<a id="vw-s026-inherit-014"></a>
### VW-S026-INHERIT-014 — `satisfied` (`machine`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-014 的贡献）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts（例外用户绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:196-241（score_exceptions 生效期提交 BLOCK 被 EXCEPTION_ACTIVE 拒绝、分值保持 0）实测成立，且已修正用例命名与矩阵 §3:34 说明（明确区分例外零分窗口 PASS 与 §3:40 Q55 C6 FAIL / OPEN），配合 failure-no-penalty.test.ts 完整满足本行贡献判据（B14a、B14b 已关闭）。

<a id="vw-s026-inherit-015"></a>
### VW-S026-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单零修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中清晰区分合成模拟替身与数据库已提交事实，无虚构通过。

<a id="vw-s026-inherit-016"></a>
### VW-S026-INHERIT-016 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- **场景**：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-016 核查合成夹具与 4 个集成测试文件：各测试事件均携带显式 correlationId 贯穿路由、裁决、审核失败回退与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，无虚构通过。

<a id="vw-s026-inherit-017"></a>
### VW-S026-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，测试临时 SQLite 目录均在 afterEach 清理完毕，未创建清理遗漏持久副本，也未冒充 S020/S028 的完整数据生命周期验收。

<a id="vw-s026-inherit-018"></a>
### VW-S026-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:396-443 与 docs/acceptance/core-flow-matrix.md §4.2：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议代码，如实复现记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），无虚构通过。

<a id="vw-s026-inherit-019"></a>
### VW-S026-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/** 与 deploy/sandbox/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，未冒充前端 UI 或隔离 sandbox 验收。

<a id="vw-s026-inherit-020"></a>
### VW-S026-INHERIT-020 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-020@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-020 承载。
- **场景**：核对本单与 VW-R-020 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-006；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环与既有缺陷最小复现，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。

---

## 3. VOXWARD-SUB-048 逐行验收证据（23 行：23 satisfied / 0 failed）

<a id="vw-sub048-ac001"></a>
### VW-SUB048-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-SUB048-R001@1` (`work:39c1e2e33d41ec9ee1b74170`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。

<a id="vw-sub048-story"></a>
### VW-SUB048-STORY — `satisfied` (`machine`)
- **关联需求**：`VW-S026-R001@1` (`work:3ebb2c33e7560e8661143983`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：本单承担 VW-S026-R001@1 中「路由/评分边界、平台去重、身份、人工冲突/补偿、异常不扣分和例外矩阵；固定候选版本与测试输入；最小可复现缺陷」：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 本单只证明所承担部分；VOXWARD-STORY-026 的完整判据（VW-S026-AC001@1）保持。
- **实测/审查结论**：第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。

<a id="vw-sub048-parent"></a>
### VW-SUB048-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E006-R026@1` (`work:79b813cdbe785e9ab7d32228`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（继承自 VOXWARD-STORY-026 VW-S026-PARENT@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。
- **实测/审查结论**：第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。

<a id="vw-sub048-inherit-001"></a>
### VW-SUB048-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 D2 变更集、scripts/check-deps.mjs（E06 264 文件 0 违规；E09 负向对照退出码 1）及 E80 P4 文档可移植路径扫描：本单严守零产品改动边界，未引入生产托管服务、新本机代理或供应商对象贯穿业务层；前轮 B14c 已关闭，docs/acceptance/core-flow-matrix.md（8/8 相对链接全部解析存在）、tests/integration/core-flow/README.md 与 Spec 作者受控区 0 处本地 URI、家目录或临时工作树路径（仅 README.md:17 回指矩阵少一级 ../ 记为非阻断建议 N18a）。

<a id="vw-sub048-inherit-002"></a>
### VW-SUB048-INHERIT-002 — `satisfied` (`machine`)
- **关联需求**：`VW-R-002@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-002 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-002@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 16/16 全绿 + E80 P2）实测覆盖身份事件基准分离与退级回落（Q20/Q43）、平台删除 QUOTA_EXHAUSTED 本地 BLOCK 保留与 UNKNOWN 有界重试、MessageIdStore + channel_events_dedupe_uq 组件级去重及 classifyReplay 5 分钟精确阈值；同时如实以最小复现断言固定并在 core-flow-matrix.md §3/§4（PARTIAL / OPEN）披露 Q39 入站单事务未合一与 Q41 稳态轮询 +6m01s 时钟快偏误丢实时消息（staleReplay=1, delivered=0），满足每项有实证且缺陷与未测清楚（B14a 已关闭）。

<a id="vw-sub048-inherit-003"></a>
### VW-SUB048-INHERIT-003 — `satisfied` (`machine`)
- **关联需求**：`VW-R-003@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-003 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-003@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P2）验证了普通消息 R1–R6 真值表（含匿名噪声 ALLOW_NOISE/FAST_PASS、白名单、高分快通、café->cafe 规范化抽查、精确匹配扣分、谐音草泥马->caonima 进 REVIEW、例外先入 EXCEPTION）与 superChatDetails.userComment 解析；同时在 dedupe-replay-sc.test.ts:309-348 新增 Q46 最小复现断言并在 core-flow-matrix.md §3（PARTIAL / OPEN）与 §4.6 如实记录 memberMilestoneChatDetails.userComment 解析为 null（body=''）及 ChannelEvent 缺付费标记字段的既有缺口（B14a 已关闭）。

<a id="vw-sub048-inherit-004"></a>
### VW-SUB048-INHERIT-004 — `satisfied` (`machine`)
- **关联需求**：`VW-R-004@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-004 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-004@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts、failure-no-penalty.test.ts 与 manual-coordinator-wiring.test.ts（E05 + E80 P1、P3）完整验证：（1）上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份基准分离重算（Q20/Q43）；（2）前轮 B14b 必交「异常不扣分」：实时 TaskCoordinator.reportFailure 耗尽重试转 PENDING_REVIEW 与后台 ReviewRunner 遇 AI 超时（MODEL_CALL_FAILED）/ 非法 JSON（AI_OUTPUT_INVALID）均满足 scoringCalls=0、观众分与 score_ledger 零扣分（E80 P3 进一步验证正分观众 score=2 原样保持 2）；（3）前轮 B14a：Q55 C6 上限钳制改判偏差已由最小复现断言固定并在 core-flow-matrix.md §3（FAIL / OPEN）与 §4.8 如实披露。

<a id="vw-sub048-inherit-005"></a>
### VW-SUB048-INHERIT-005 — `satisfied` (`machine`)
- **关联需求**：`VW-R-005@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-005 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-005@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 manual-coordinator-wiring.test.ts 与 failure-no-penalty.test.ts（E05 + E80 P2、P3）验证了复盘模型超时/坏输出零扣分回退、候选词卡显式 SubjectCacheHub 清理对照，并在不改 src/ 前提下将默认 NO_SUBJECT_CACHES 遗留外部 CandidateStore（§4.1）、Q52 app.ts 未装配复盘模型与 resumePendingScoring（§3 PARTIAL / OPEN、§4.7）以及 Q57 R7 双 ReviewRunner 共享协调器跳过非本实例任务（§3 PARTIAL / OPEN、§4.9）全部以最小复现断言固定披露（B14a、B14b 已关闭）。

<a id="vw-sub048-inherit-006"></a>
### VW-SUB048-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-006@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 审查 dedupe-replay-sc.test.ts、manual-coordinator-wiring.test.ts 与 docs/acceptance/core-flow-matrix.md §3/§4（E80 P2、P4）：本单验证了单实例 TaskCoordinator PAID > REALTIME > BACKGROUND 车道优先级与未知任务收敛，同时将 Q52（app.ts 尚未自动串接 SC->PAID 与主链路）和 Q57 R7（多 ReviewRunner 跨实例跳过未知 BACKGROUND 任务）明确标为 PARTIAL / OPEN 并在 §4.7、§4.9 给出复现定位，无任何虚构通过（B14a 已关闭）。

<a id="vw-sub048-inherit-007"></a>
### VW-SUB048-INHERIT-007 — `satisfied` (`machine`)
- **关联需求**：`VW-R-007@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-007 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-007@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P1）验证了已终态任务并发冲突拒绝（conflict）、单事件改判纠分与 operationId 幂等（duplicate，Q49）、平台删除配额耗尽本地 BLOCK 保留与 UNKNOWN 有界重试；并在 manual-coordinator-wiring.test.ts:445-555 补齐 Q55 C6 上限钳制改判补偿偏差最小复现断言（currentScore=9、needsManualAdjustment=false vs 账本重放 7），在 core-flow-matrix.md §3 标为 FAIL / OPEN、§4.8 如实归档，去除了原 score_exceptions 用例的 Q55 误标（B14a 已关闭）。

<a id="vw-sub048-inherit-008"></a>
### VW-SUB048-INHERIT-008 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-008@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。
- **场景**：核对本单与 VW-R-008 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-008@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-008 核查 D2 变更集、failure-no-penalty.test.ts:159-241（非法 JSON 触发 AI_OUTPUT_INVALID 拒绝采信且 0 扣分）、manual-coordinator-wiring.test.ts:396-443 及 docs/acceptance/core-flow-matrix.md §4.2：本单未修改审核/SC/复盘 JSON Schema 契约，并如实复现记录了 db/output-store.ts 对 TRANSLATION JSON 字符串原样透传的既有现象（m8a N13），无虚构通过。

<a id="vw-sub048-inherit-009"></a>
### VW-SUB048-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-009@1）
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8cr1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及外部提供方清理。

<a id="vw-sub048-inherit-010"></a>
### VW-SUB048-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-010@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与业务端口解耦，零修改 EPIC-002/005 模型适配器代码，并在矩阵 §5 明确说明未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。

<a id="vw-sub048-inherit-011"></a>
### VW-SUB048-INHERIT-011 — `satisfied` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-011@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块套件（4 文件 16 用例）与 E80 P1、P3 均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待；同时在 core-flow-matrix.md §3/§4 如实区分了 SQLite channel_events_dedupe_uq 唯一约束生效与 Q39 生产入站单事务未合一（PARTIAL / OPEN）、以及 Q55 C6 改判补偿偏差（FAIL / OPEN），并补齐了异常不扣分真实 SQLite 账本断言（B14a、B14b 已关闭）。

<a id="vw-sub048-inherit-012"></a>
### VW-SUB048-INHERIT-012 — `satisfied` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-012@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：manual-coordinator-wiring.test.ts:326-386 通过真实 buildApp + /auth/login 会话 Cookie + x-csrf-token + DATA_ADMIN 角色门禁执行删除请求，dedupe-replay-sc.test.ts 与 manual-coordinator-wiring.test.ts 校验了 REVIEW_CAPABILITY 操作员身份，且矩阵 §3/§4 所有状态与实测断言逐一对齐，无越权或虚构通过（B14a、B14b 已关闭）。

<a id="vw-sub048-inherit-013"></a>
### VW-SUB048-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-013@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4.1：本单未改动 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并记录了 buildApp 默认 NO_SUBJECT_CACHES 下外部 CandidateStore 未自动清理（m7c N7 / m7e N12b）与显式注入 SubjectCacheHub 的清理对照，无虚构通过。

<a id="vw-sub048-inherit-014"></a>
### VW-SUB048-INHERIT-014 — `satisfied` (`machine`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：跨模块集成测试与源要求/断言核对；复用仍有效的组件证据。
- **场景**：合成重放和并发故障输入覆盖 INIT 相应验收；真实接入具备条件时补充平台观察。（本单对 VW-R-014 的贡献）（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-014@1）
- **期望**：每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚；本单不自称完成产品修复或外部许可。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：跨模块测试 routing-scoring.test.ts（例外用户绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:196-241（score_exceptions 生效期提交 BLOCK 被 EXCEPTION_ACTIVE 拒绝、分值保持 0）实测成立，且已修正用例命名与矩阵 §3:34 说明（明确区分例外零分窗口 PASS 与 §3:40 Q55 C6 FAIL / OPEN），配合 failure-no-penalty.test.ts 完整满足本行贡献判据（B14a、B14b 已关闭）。

<a id="vw-sub048-inherit-015"></a>
### VW-SUB048-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-015@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单零修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中清晰区分合成模拟替身与数据库已提交事实，无虚构通过。

<a id="vw-sub048-inherit-016"></a>
### VW-SUB048-INHERIT-016 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- **场景**：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-016@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-016 核查合成夹具与 4 个集成测试文件：各测试事件均携带显式 correlationId 贯穿路由、裁决、审核失败回退与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，无虚构通过。

<a id="vw-sub048-inherit-017"></a>
### VW-SUB048-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-017@1）
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，测试临时 SQLite 目录均在 afterEach 清理完毕，未创建清理遗漏持久副本，也未冒充 S020/S028 的完整数据生命周期验收。

<a id="vw-sub048-inherit-018"></a>
### VW-SUB048-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-018@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:396-443 与 docs/acceptance/core-flow-matrix.md §4.2：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议代码，如实复现记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），无虚构通过。

<a id="vw-sub048-inherit-019"></a>
### VW-SUB048-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-019@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/** 与 deploy/sandbox/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，未冒充前端 UI 或隔离 sandbox 验收。

<a id="vw-sub048-inherit-020"></a>
### VW-SUB048-INHERIT-020 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-020@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-020 承载。
- **场景**：核对本单与 VW-R-020 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-026 VW-S026-INHERIT-020@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-006；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环与既有缺陷最小复现，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。
