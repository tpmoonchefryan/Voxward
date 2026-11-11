<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:685ad243ec946eb7f628c93e revision=4 sha256=831e7e6ee3fb5d5a41fcca81603c3c1300104bbf004f878b1f2de06a27ab7d15 -->

This file records design-source availability. It does not establish a new design authority or claim publication/build evidence.

Resolution: unconfigured.

No design authority is configured for the resolved work context. No authority was inferred.

## Effective design context

`design.authority`: not configured.

> {"status":"unconfigured","targets":[{"authoritySetting":null,"design":null,"reason":"coordination-is-not-development","reference":{"libraryId":"workspace:7732a51de4c38afb83bb77cf","projectId":"project:f824c7861e6888255132af42"},"status":"unconfigured"}]}

## Cited decisions

### minutes:92f6353f4d2e04aa552ea04e

#### D1

> Owner 原话：“同意，开Voxward新链，然后落INIT-001”。据此在现有共享总库 workspace:7732a51de4c38afb83bb77cf 中建立独立 VoxWard 产品项目 project:f824c7861e6888255132af42（externalKey VOXWARD，无父项目），绑定已经迁移的服务器 Voxward 仓库；复用现有同步和服务器工作方式，不新建或复制第二套治理库，不搬移或重开既有历史。实际记录者为 agent:codex。

#### D2

> 采用 VoxWard 仓库相对路径 docs/proposal/y3_project_proposal.md 的 2026-11-09 对话决策整合版作为 INIT-001 产品基线，SHA-256 cad909c1f8e839bfef64b5e2b7ba0569059cef953e4e652d8dda734750a133ee。完整继承 Middleware 定位、频道评分核心、平台直接输入、远端自托管与浏览器多人协作、统一裁决、Kiro/Crew 可替换适配器、SQLite、一次性 AI 会话与校验后 JSON、两种删除选项及记分例外、Change Log/Technical Log 和 correlationId 关联查看器、自有 OBS 路径及版本化指引；只参加 Frankenstein 主赛道，不申请附加奖项。旧稿冲突设计不恢复。

#### D3

> 创建 VOXWARD-INIT-001，状态 planned，承载完整 MVP 的目标、来源、需求、范围、验收、后续拆分方向及未决依赖。本次执行范围是新链与 Initiative 落单，不据此宣称已开发、验收、部署或提交，也不批量创建或启动 Epic/Story。YouTube 逐观众评分用途与保存期限、自托管审核覆盖、Cloud/隐私/申请材料、第三方兼容性、Kiro/Crew 清理和模型性能继续按 proposal 记为未确认或待验证；无真实许可证据时使用明确标识的合成演示，保留评分实现目标。

### minutes:a791ac5683fc0b966d851c2f

#### D1

> Owner 原话：“拆Epic+Story”。本次在 VoxWard 已有 INIT-001 下继续拆分 Epic 与 Story，沿用 2026-11-09 proposal 及 VW-R-001 至 VW-R-022 的有效版本，不重新立项、不替换或删除已定产品需求。前次开链记录描述前次执行范围，本次指令明确授权后续拆单。

#### D2

> 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。

#### D3

> 补齐 INIT→Epic→Story 的版本化需求、实施/验证责任与验收引用；Story 的自测材料不冒充独立验收，跨模块验证由验证交付 Epic 承接，材料审查在对应政策/参赛 Story 内明确。所有新增工单及 INIT 保持 planned；验收证据留空，不记录实现或验收已通过。本次可通过原生引擎更新 INIT 的拆分说明和责任分配，保留原文来源与决策历史；不据此发起产品开发、真实平台操作、公开发布或参赛提交。

### minutes:be2ce03bcd6fda69f1db9839

#### D2

> 据 D1 授权，在每个 Story 的内容中写入需求分配：Story 的每条 required 需求分配给其每张直属 Subtask，各一条 implementation 与一条 verification 责任。实施子代理只做最小自测；独立验收与跨模块验证仍按 Subtask verificationOwner 与 EPIC-006 验证 Story 执行。Story 的需求、来源、约束与验收文本不变，仅新增分配。
<!-- EINZBERN-SPEC:MANAGED-END -->


# S006 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-006 rev 4（VW-S006-R001@1）；VOXWARD-SUB-012 rev 1（VW-SUB012-R001@1，主验收行 VW-SUB012-AC001）；提案 §4.1–§4.4、§5.1、§5.3、§5.4；主工作区 tasks.md 问题清单 Q6、Q8、Q12、Q22；第 5a 批判断 B3（`.kiro/specs/voxward-batch5a/evidence/judgment.md`）；S004 设计（§5、§8）；S005 设计（§5、§9、§11、§13）。
标「自定」的是 Story discretion 内的选择，或来源没有规定的参数。

## 0. 范围

- 做：统一路由真值表；名单与例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS 标记；系统失败与人工接管状态；问题清单 Q6、Q8、Q12、Q22。
- 不做：AI 调用与任务调度的接线（TaskCoordinator、InferenceProvider 仍是占位）；DecisionService 的提交、verdicts 行与投递意图；快速放行的复盘结算（提案 §5.4）；白名单与付费身份的数据来源；记分例外的建立与撤销；注册表与应用装配。

## 1. 布局

| 路径 | 动作 | 说明 |
| --- | --- | --- |
| `apps/server/src/modules/moderation-engine/routing/truth-table.ts` | 新增 | 真值表 `planRoute` |
| `apps/server/src/modules/moderation-engine/routing/classification.ts` | 新增 | 无意义互动的确定性判定（内部分类） |
| `apps/server/src/modules/moderation-engine/routing/states.ts` | 新增 | 处理状态、转移表、存储状态映射 |
| `apps/server/src/modules/moderation-engine/routing/exception-queue.ts` | 新增 | 例外队列端口与进程内实现 |
| `apps/server/src/modules/moderation-engine/routing/router.ts` | 新增 | 路由编排、计分接线、审核完成 |
| `apps/server/src/modules/moderation-engine/index.ts` | 修改 | 导出路由工厂与类型 |
| `apps/server/src/modules/moderation-engine/rules/normalize.ts`、`groups.ts`、`engine.ts` | 修改 | Q6 归一化选项；Q12 准入提示；规则集携带归一化选项；B3（返工 2）：`normalize.ts` 的单元切分与处理顺序，见 4.11 |
| `packages/contracts/src/decisions/verdict.ts` | 修改 | Q22：`Verdict.penaltyHits` 与 `PenaltyHit` |
| `apps/server/src/modules/scoring-engine/rules.ts`、`engine.ts`、`index.ts` | 修改 | Q22：BLOCK 扣分经 `selectPenalty`；输入校验 |
| `apps/server/src/db/schema/subjects.ts` | 修改 | Q8：删除 `subject_nickname_checks` 定义 |
| `apps/server/src/db/migrations/0003_*.sql` 与 `meta/` | 新增 | Q8：`DROP TABLE subject_nickname_checks`，由 drizzle-kit 生成（编号 0003；0002 已是审计字段迁移 `0002_audit_log_fields`） |
| `docs/data-dictionary.md` | 修改 | Q8：删除该表段落，表数 27 改为 26 |
| `apps/server/test/db/schema.test.ts` | 修改 | Q8：表数与迁移中的删除语句 |
| `apps/server/test/moderation-engine/routing/*.test.ts` | 新增 | 路由验收测试 |
| `apps/server/test/moderation-engine/rules/*.test.ts` | 修改 | Q6、Q12；B3：`normalize.test.ts`、`transliterate.test.ts` 增补，新增 `sound-marks.test.ts` 与用例表 `sound-mark-cases.ts`；`routing/classification.test.ts` 增补 |
| `apps/server/test/scoring-engine/engine/*.test.ts` | 修改 | Q22 |
| `packages/contracts/test/contracts.test.ts` | 修改 | 新字段 |
| `.kiro/specs/voxward-s006-routing/evidence/self-check.md` | 新增 | 自测证据 |
| `.kiro/specs/voxward-s006-routing/evidence/rework2-self-check.md`、`rework2-before-after.md`、`rework2-probe.ts`、`rework2-fuzz.mjs`、`rework2-bench.mjs`、`rework2-mutate.py` | 新增 | B3（返工 2）的自测、修复前后的逐输入对照，以及产生这些数字的探针、随机语料比对、耗时与变异检查脚本 |

## 2. 依赖方向

- 路由位于 moderation-engine 模块内，只导入 `@voxward/contracts` 与本模块文件。
- 计分通过契约接口 `ScoringEngine` 的 `applyVerdict` 接入，端口类型为 `Pick<ScoringEngine, "applyVerdict">`。模块之间不互相导入。
- 计分拒绝（例外）在路由中按错误的 `code === "SCORING_REFUSED"` 识别，不 `instanceof` 计分模块的类（自定，分区规则限制）。
- `scripts/check-deps.mjs` 的分区规则不改，因此本包不做负面对照。装配层（`registry.ts`、`app.ts`、`main.ts`）不改。

## 3. 数据

- 不新增表。`tasks.status` 仍只取 `TASK_STATUSES`。系统失败存为 `PENDING_REVIEW`，人工接管存为 `RUNNING`（自定，见第 4.5 节映射）。
- 迁移 0003 删除 `subject_nickname_checks`（Q8）。编号 0003 是因为 0002 已是审计字段迁移 `0002_audit_log_fields`（N9）。选择进程内缓存的理由：S004 设计 §8 只规定进程内缓存；提案 §10 的数据组没有列该表；持久化摘要超出已列数据范围（自定）。缓存保存期限沿用 S004：TTL 1 小时，最多 10000 项，进程重启即清空。
- 开发库（N10）：drizzle 的 SQLite 迁移器只执行 `when` 晚于库中最新 `created_at` 的条目。若开发库由改编号前的迁移链建成（本表的删除迁移曾记为 `0002`），升级时会跳过审计字段迁移，并在 `0003` 报错回滚。这类开发库应删除后重建。迁移本身不改；部署环境未受影响。
- UNSETTLED_FAST_PASS 的当次裁决在 `verdicts` 中记为分类 `ALLOW_NOISE`、来源 `FAST_PASS`、下游 `ALLOW`（自定）。这样满足现有 CHECK，且不加分。

## 4. 接口

### 4.1 契约

- `Verdict` 增加字段 `penaltyHits: readonly PenaltyHit[]`，`PenaltyHit = { code: string; points: number }`。`points` 是扣分值的大小，不是带符号的增量（与 `selectPenalty` 一致）。
- `createVerdict(classification, penaltyHits = [])`。已有调用方不变。

### 4.2 路由输入

- `RoutingFacts`：`exceptionMarked`、`paidText`、`whitelisted`、`score: number | null`。由入口或计分侧提供，本包不读数据库。
- `RoutingOptions`：`fastPassThreshold: number | null`。`null` 关闭按评分快速放行。
- 路由器自行计算：基础检查路由（`PASS`、`BLOCK`、`REVIEW`）、`noise`（第 4.4 节）、`scoreReachesFastPass = threshold !== null && score !== null && score >= threshold`。

### 4.3 真值表

`planRoute` 按下表顺序求值，首条命中生效。顺序与提案 §4.2 流程图一致：记分例外先于付费。N1 返工前，付费行在前，例外∧付费组合走 `PAID_TEXT_REVIEW` 并带例外标记；返工后该组合走 `REALTIME_REVIEW`。两者都是 AI 或人工路径，不构成快速放行。

| 序 | 条件 | 计划 | 初始处理状态 | 说明 |
| --- | --- | --- | --- | --- |
| R1 | 基础检查 `BLOCK` | FINAL：来源 `BASE_RULE`，分类 `BLOCK`，结算 `NONE` | `DONE` | 基础拒绝可终结；例外队列项同时结束（`BASE_BLOCK`） |
| R2 | 记分例外 | REVIEW：任务 `REALTIME_REVIEW`，例外 = 是 | `QUEUED` | 每条都审，包括同时是付费文本的消息；不走白名单、评分或噪声短路 |
| R3 | 付费或会员自定义文本 | REVIEW：任务 `PAID_TEXT_REVIEW`，例外 = 否 | `QUEUED` | 付费文本审核不可跳过 |
| R4 | 基础检查 `REVIEW` | REVIEW：任务 `REALTIME_REVIEW` | `QUEUED` | 未通过基础检查，不能快速放行 |
| R5 | 无意义互动（确定性判定为 NOISE） | FINAL：来源 `FAST_PASS`，分类 `ALLOW_NOISE`，结算 `NONE` | `DONE` | 不加分、不扣分 |
| R6 | 白名单 | FINAL：来源 `FAST_PASS`，分类 `ALLOW_NOISE`，结算 `NONE` | `DONE` | 短路；不冒充模型确认的有意义互动 |
| R7 | 评分达到快速通道阈值 | FINAL：来源 `FAST_PASS`，分类 `ALLOW_NOISE`，结算 `UNSETTLED_FAST_PASS` | `DONE` | 当次不加分，待复盘结算（复盘不在本包） |
| R8 | 其余 | REVIEW：任务 `REALTIME_REVIEW` | `QUEUED` | 进入 AI 审核，或人工路径 |

- 下游只得到 `ALLOW` 或 `BLOCK`：分类经 `toDownstreamVerdict` 映射。
- R5、R6、R7 的分类记为 `ALLOW_NOISE`，是为了让它们不计分。这是占位分类，不是模型判定（自定）。

### 4.4 内部分类

`classifyDeterministicNoise(body)` 返回 `NOISE` 或 `UNCERTAIN`（自定）：

1. 正文先经 `normalizeText`（处理顺序见 4.11：删不可见字符、独立浊点转组合浊点、NFKC、小写、删残余标记），再按空白切分词元。半角与独立浊点因此读作带浊点的假名：`ﾊﾞﾊﾟﾊ` 是三个不同的假名，不会被当成同一字符重复三次（B3 之前读成 `ハハハ`，判为 NOISE）。
2. 全部词元都属于下列之一时为 `NOISE`：（a）`w` 连续出现不少于 3 次；（b）仅由表情或象形字符（`\p{Extended_Pictographic}`、`\p{Emoji_Component}`）组成；（c）同一字符连续出现不少于 3 次。
3. 空正文、或含任何其它词元，为 `UNCERTAIN`。

该判定只在基础检查 `PASS` 之后使用，不产生下游裁决。

### 4.5 处理状态

- 状态：`QUEUED`、`RUNNING`、`PENDING_REVIEW`、`SYSTEM_FAILED`、`MANUAL_TAKEOVER`、`DONE`、`DISCARDED`。`DONE` 与 `DISCARDED` 为终态。
- 步骤与转移：

| 步骤 | 转移 | 含义 |
| --- | --- | --- |
| `START` | `QUEUED` → `RUNNING` | 开始 AI 审核 |
| `SYSTEM_FAILURE` | `RUNNING` → `SYSTEM_FAILED` | 超时、限流、输出不合法或内部错误。不下发、不计分（提案 §5.1） |
| `RETRY` | `SYSTEM_FAILED` → `QUEUED` | 重试次数上限由调用方决定（自定） |
| `ESCALATE` | `SYSTEM_FAILED` → `PENDING_REVIEW` | 不再重试，交人工 |
| `TAKE_OVER` | `QUEUED`、`SYSTEM_FAILED`、`PENDING_REVIEW` → `MANUAL_TAKEOVER` | 人工接管 |
| `RELEASE` | `MANUAL_TAKEOVER` → `PENDING_REVIEW` | 人工放回待审 |
| `DISCARD` | 任一非终态 → `DISCARDED` | 过期代次或已删除，不产生裁决 |
| 模型完成 | `RUNNING` → `DONE` | 来源 `MODEL` |
| 人工完成 | `MANUAL_TAKEOVER` → `DONE` | 来源 `MANUAL` |

- 非法转移抛 `ProcessingTransitionError`，不改变状态。
- 存储映射（自定）：`QUEUED`→`QUEUED`；`RUNNING`→`RUNNING`；`MANUAL_TAKEOVER`→`RUNNING`；`PENDING_REVIEW`→`PENDING_REVIEW`；`SYSTEM_FAILED`→`PENDING_REVIEW`；`DONE`→`DONE`；`DISCARDED`→`DISCARDED`。

### 4.6 例外队列

- 端口 `ExceptionQueue`：`register(key, correlationId)` 按 `channelId` 与 `platformMessageId` 幂等，返回 `CREATED` 或 `EXISTING`；`settle(key, resolution)`，`resolution` 取 `BASE_BLOCK`、`MODEL`、`MANUAL`、`DISCARDED`，先结算者生效；`entry(key)`；`openEntries()`。（实施时增加 `correlationId` 参数，便于结算后追溯。）
- 进程内实现 `createInMemoryExceptionQueue()`。来源没有队列表，持久化留到接线（第 9 节）。
- 凡例外消息，登记发生在任何短路之前（提案 §4.2）。

### 4.7 路由器

`createReviewRouter({ checker, scoring, exceptionQueue, options })` 返回三个方法：

- `route(event, facts)`：先登记例外队列（若是例外）；再做基础检查；按第 4.3 节求值。
  - FINAL 的裁决：`BLOCK` 时 `penaltyHits` 取基础命中中每个扣分组一条（`code` 为组 ID，`points` 为该组扣分值）；`ALLOW` 时为空。
  - 来源 `BASE_RULE` 的 `BLOCK` 调用计分；来源 `FAST_PASS` 不调用计分。
- `transition(event, review, step)`：按第 4.5 节转移；`DISCARD` 时例外队列项以 `DISCARDED` 结算。
- `complete(event, review, decision)`：`decision.source` 为 `MODEL`（要求状态 `RUNNING`）或 `MANUAL`（要求 `MANUAL_TAKEOVER`）。裁决 `BLOCK` 时带上 `review.penaltyHits`。调用计分，并以 `MODEL` 或 `MANUAL` 结算例外队列项。

计分状态 `scoring`：`APPLIED`（带 `delta`）、`REFUSED`（`EXCEPTION_ACTIVE`）、`NOT_CALLED`（来源 `FAST_PASS` 或无裁决）。计分的其它错误原样抛出，不吞掉。

调用计分后再识别拒绝（自定）：不做事前例外检查，以计分引擎的守卫为准。这与 S005 §13 的「接线 Story 决定」一致。

### 4.8 Q6：组合标记

- `NormalizeOptions = { stripCombiningMarks: boolean }`，默认 `true`（自定：这是绕过路径，安全默认开启）。
- 开启时，每个单元的处理顺序见 4.11（B3 起，NFKD 之前先删不可见字符、独立浊点先转为组合浊点）。组合附加符号区块为 U+0300–036F、U+1AB0–1AFF、U+1DC0–1DFF、U+20D0–20FF、U+FE20–FE2F。按区块删除，不按文字或语言启用（自定）。U+3099、U+309A 不在这些区块内，因此 `が`（か + U+3099）经 NFKC 重新组合为 `が`，不会变成 `か`。这只在浊点与假名处于同一单元、之间没有会拦住组合的字符时成立。B3 之前，半角浊点 U+FF9E、U+FF9F 与独立浊点 U+309B、U+309C 各自成单元，格式字符夹在假名与组合浊点之间时 NFKC 也在格式字符处停止组合，两种写法的浊点都丢失；4.11 记录修法。
- 规则集可在 `normalization` 字段覆盖。非布尔值或未知键在编译时报 `NORMALIZATION_INVALID`。
- 普通归一化规则（`normalized`）的模式与正文使用同一选项。转写表的键校验与读音也使用规则集的同一选项：检查器工厂用规则集的选项构建转写表，两者不一致时报 `NORMALIZATION_MISMATCH`。
- 正则规则（`regex`）不受该选项影响。模式源串不归一化，正则匹配副本为 NFKC、小写并删除 `\p{M}` 与 `\p{Cf}`、但不去除组合标记的副本（即 S004 第 3 节、第 5 节的副本），单元切分与 4.11 的删不可见字符、独立浊点转换两步与归一化副本相同。这是 B1 验收允许的两种做法中的第二种（自定）。结果：`ばか`、`café` 命中原文；`café` 也命中分解形式 `cafe` + U+0301。
- 残余风险：正则 `badword` 不命中 `ba\u0301dword`。c67db24 因正则也在去除后的副本上匹配而命中。组合标记绕过只在归一化规则上封堵，这与 Q6 的问题描述（归一化规则）一致。若要求正则也封堵，改用第一种做法：正则源串按同一选项归一化，需要单独设计字符类与转义的处理，本包未做。
- 行为变化：S004 的规则在默认设置下，含可组合标记的文本会按去除后的形式匹配（例如 `bádword` 匹配 `badword`）。这是 Q6 的修复范围。自测给出修复前后对照。

### 4.9 Q12：准入提示

- `RuleIssue` 增加可选字段 `hint`。固定文案，不含模式原文。
- `REGEX_GROUP_ALTERNATION`：`write the alternatives as top-level branches, such as a|b, or split them into several rules`。
- `REGEX_UNBOUNDED_WITH_VARIABLE_REPEAT`：`split the pattern into several rules, or give one of the quantifiers a fixed count`。
- 错误信息格式：`RULE_SET_INVALID: <code> at <ref> (hint: <文案>)`。文案以代码为准（`groups.ts` 的 `REGEX_HINTS`，英文）。N9：本段原为中文，与代码不一致，已改为代码中的原文。

### 4.10 Q22：计分接线

- `ruleForClassification(classification, config, penaltyHits)`：`BLOCK` 的扣分为 `-selectPenalty([{ code: "VERDICT_BLOCK", points: violationPenalty }, ...penaltyHits])`。
- `validateVerdictInput` 校验 `penaltyHits`：每项 `code` 非空，`points` 为非负安全整数；否则抛 `ScoringInputError("penaltyHits")`，不调用账本。
- 允许分类忽略 `penaltyHits`。

### 4.11 匹配副本的归一化（B3）

背景：第 5a 批判断 B3。归一化副本逐单元做 NFKC。半角浊点 U+FF9E、U+FF9F（`\p{Lm}`）与独立浊点 U+309B、U+309C（`\p{Sk}`）自成单元；NFKC 把前两者变成组合浊点，单元里没有可组合的基字，随后被「删除 `\p{M}`」一步去掉。格式字符夹在假名与组合浊点之间时，NFKC 在格式字符处停止组合，浊点同样被删。后果：`ﾊﾞｶ` 的副本是 `ハカ`，归一化与正则的 `バカ` 规则漏拦，`ハカ` 规则误伤，`ｶﾞｶ` 读成 kaka。三条路径（归一化规则、正则、读音）共用同一套切分与归一化，所以三处同时出错。

**单元**（`splitUnits`）：按码点切分。下列字符并入前一个单元：`\p{M}`、`\p{Cf}`、谚文中声与终声字母（U+1160–U+11FF、U+D7B0–U+D7FF），以及 B3 新增的 U+309B、U+309C、U+FF9E、U+FF9F。文本开头没有前一个单元可并入的字符自成一个单元。单元是映射粒度：每个单元对应原文一段连续区间，相邻单元首尾相接，覆盖全文。昵称与正文各自切分，单元不跨字段，所以昵称末尾的假名不会与正文开头的浊点组合。

**处理顺序**（`normalizeUnit`，对每个单元，三条路径相同）：

1. 删除不可见字符：全部 `\p{Cf}`，以及默认可忽略的组合标记（同时属于 `\p{M}` 与 `\p{Default_Ignorable_Code_Point}` 的码点：变体选择符、组合字素连接符 U+034F 等）。NFC 与 NFKC 只在标记与基字之间没有组合类为 0 的字符时才把两者组合，所以这些字符必须在组合之前删掉。
2. 独立浊点转组合浊点：U+309B → U+3099，U+309C → U+309A。NFKC 会把它们变成「空格 + 组合浊点」，空格会隔开浊点与假名。半角浊点不用单独处理：NFKC 直接把 U+FF9E、U+FF9F 变成 U+3099、U+309A。
3. NFKC。选项 `stripCombiningMarks` 开启（默认）时先 NFKD，删除组合附加符号区块中的标记（4.8），再 NFKC；关闭时直接 NFKC。
4. 转小写。
5. 删除剩下的 `\p{M}` 与 `\p{Cf}`。不能与前一个字符组合的浊点（拉丁字母后的 U+FF9E 等）在这一步消失，不能用来隐藏一个词。

**三条路径一致**：归一化规则的模式（`normalizeText`）与正文副本（`normalizeField`，规则集选项）、正则规则匹配的组合副本（`normalizeField`，`stripCombiningMarks: false`）、转写表的键校验与读音（`createTableTransliterator`）都调用同一个 `splitUnits` 与 `normalizeUnit`，没有第二套实现。三者的单元边界相同；组合副本与归一化副本的差别只有 4.8 的组合附加符号区块。`routing/classification.ts` 的噪声判定也调用 `normalizeText`。

**原文区间**：副本里的命中 `[s, e)` 映射为所有与之相交的单元的原文区间的并集（`spansFor`，未改）。因此：

- 命中包含它覆盖的整个单元：单元内的组合浊点、半角浊点和格式字符都在区间内。
- 紧跟命中末字符的格式字符属于该字符的单元，在区间内。命中首字符之前的格式字符属于前一个字符的单元（或文本开头的零长单元），不在区间内。
- 归一化结果为空的单元（孤立浊点、文本开头的格式字符）严格位于命中内部时计入，位于边界时不计入。
- 区间按 UTF-16 单位计，补充平面字符占两个。

**修法的选择**（自定）：判断列出两种做法：先删 `\p{Cf}`、整段 NFKC，再按码点对应重建单元与区间；或在 `splitUnits` 里把浊点并入前一个单元，并在 NFKC 之前删单元内的格式字符。本包选第二种。理由：区间映射本来按单元记录，三条路径共用切分与归一化函数，改动只在这两处；整段 NFKC 还会把兼容谚文字母（`ㅂㅏ`）折叠成音节，改变判断 N11 记录的行为，超出 B3。验证：`test/moderation-engine/rules/normalize.test.ts` 把逐单元的结果与「先删不可见字符、独立浊点转组合浊点、再整段归一化」的参照在 1344 个构造串上逐一比对，两种选项下都一致；30 万个随机串的比对见 `evidence/rework2-self-check.md`，唯一的不一致是兼容谚文字母，修复前后相同。

**不在本修法内**（各版本行为相同，判断 N11）：兼容谚文字母 `ㅂㅏㅂㅗ` 不折叠成音节；阿拉伯语 tatweel U+0640 不删除；越南语声调与 й、ё 在归一化副本里折叠。正则规则的模式源串不归一化（4.8），所以写成半角的正则源串 `ﾊﾞｶ` 既不命中 `バカ`，也不命中 `ﾊﾞｶ`；需要半角写法时用归一化规则，它的模式与正文走同一套归一化。

**行为变化**：

- 半角、独立浊点和被不可见字符隔开的浊点，现在与全角预组合写法得到同一个副本（下表）。`ハカ` 不再命中 `ﾊﾞｶ`，`カス` 不再命中 `ｶﾞｽ`，`ｶﾞｶ` 读作 gaka。
- U+309B、U+309C 不再在副本里留下一个空格；拉丁字母后的这类浊点被删除，`ba゛dword` 现在命中 `badword`。
- 组合副本里，不可见字符不再拦住组合：`cafe` + U+200B + U+0301 的组合副本是 `café`，正则 `café` 命中它（修复前不命中）。
- 谚文字母之间的格式字符不再拦住音节的组合（`ᄇ` + U+200B + `ᅡ` 的副本是 `바`）。
- 副本发生变化的文本只限含 U+309B、U+309C、U+FF9E、U+FF9F 或不可见字符的文本；其它文本的副本不变（30 万个随机串验证）。

下表是输入写法、匹配副本和原文区间的例子。「规则 → 原文区间」中的区间 `[起,止)` 是正文里的 UTF-16 偏移；副本和区间取自实测，修复前的结果与全部输入的逐项对照在 `evidence/rework2-before-after.md`。

| 输入写法（正文） | 匹配副本 | 规则 → 原文区间 | 说明 |
| --- | --- | --- | --- |
| 半角假名加半角浊点：`ﾊ\uFF9Eｶ` | `バカ` | 归一化 バカ → [0,3) |  |
| 前后有其它字符：`x ﾊ\uFF9Eｶ y` | `x バカ y` | 归一化 バカ → [2,5) | 命中区间只含 ﾊﾞｶ 的三个单位，前后的 `x `、` y` 不在内 |
| 假名加独立浊点 U+309B：`ハ\u309Bカ` | `バカ` | 归一化 バカ → [0,3) | 副本里没有空格，修复前是 `ハ カ` |
| 假名、U+200B、组合浊点：`は\u200B\u3099か` | `ばか` | 归一化 ばか → [0,4) | 格式字符在单元内，区间包含它 |
| 半角假名、U+2060、半角浊点：`ﾊ\u2060\uFF9Eｶ` | `バカ` | 归一化 バカ → [0,4) |  |
| 假名、U+FE0F、组合浊点：`は\uFE0F\u3099か` | `ばか` | 归一化 ばか → [0,4) | 变体选择符同属不可见字符 |
| 拉丁字母后的半角浊点：`ba\uFF9Edword` | `badword` | 归一化 badword → [0,8) | 不能组合的浊点被删除，不能用来隐藏拉丁词 |
| 谚文字母之间的 U+200B：`\u1107\u200B\u1161\u1107\u1169` | `바보` | 归一化 바보 → [0,5) | 副本是组合好的音节 `바보` |
| 命中前有补充平面字符：`😀ﾊ\uFF9Eｶ` | `😀バカ` | 归一化 バカ → [2,5) | 区间按 UTF-16 单位计，U+1F600 占两个 |
| 命中前有格式字符：`あ\u200Bﾊ\uFF9Eｶ` | `あバカ` | 归一化 バカ → [2,5) | U+200B 属于「あ」的单元，不在区间内 |
| 命中后有格式字符：`ﾊ\uFF9Eｶ\u200Bx` | `バカx` | 归一化 バカ → [0,4) | U+200B 属于「ｶ」的单元，在区间内 |
| 长音符 ｰ：`ﾊ\uFF9Eｰｶ` | `バーカ` | 归一化 バーカ → [0,4) | 长音符是字母，保留为 `ー` |
| 文本开头的孤立浊点：`\uFF9Eｶ` | `カ` | 归一化 カ → [1,2) | 自成零长单元，不在区间内 |
| 拉丁字母、U+200B、组合锐音符：`cafe\u200B\u0301` | `cafe`（归一化）；`café`（正则） | 正则 café → [0,6) | 归一化副本去掉锐音符；正则副本是 `café` |

## 5. 测试与验收对应

| 测试文件 | 覆盖 | 对应验收 |
| --- | --- | --- |
| `test/moderation-engine/routing/truth-table.test.ts` | 基础结果 × 例外 × 付费 × 白名单 × 噪声 × 达到阈值的全部 96 种组合：不变式；各行的代表用例 | VW-SUB012-AC001；VW-S006-AC001 |
| `test/moderation-engine/routing/classification.test.ts` | 噪声判定正例与反例；全角、零宽字符 | VW-SUB012-AC001 |
| `test/moderation-engine/routing/states.test.ts` | 转移表、非法转移、存储映射、终态 | VW-SUB012-AC001 |
| `test/moderation-engine/routing/exception-queue.test.ts` | 幂等登记、结算 | VW-SUB012-AC001 |
| `test/moderation-engine/routing/router.test.ts` | 合成事件经真实基础检查与真实计分引擎（假账本）：BLOCK 扣分取最大；例外拒绝不计分；快速放行不加分；系统失败不计分；人工接管后人工裁决计分；丢弃结算 | VW-SUB012-AC001；VW-S006-AC001 |
| `test/moderation-engine/rules/normalize.test.ts`、`groups.test.ts`、`engine.test.ts` | Q6：组合标记绕过在默认下被拦截，关闭时保持旧行为；Q12：两类拒绝的提示与无模式原文 | 问题清单 Q6、Q12 |
| `test/moderation-engine/rules/sound-marks.test.ts`、`sound-mark-cases.ts` | B3：判断 E20 与 E21 的全部输入、B1 对照输入、自补的 37 种组合（全角半角混排、半浊点、长音符、谚文字母与格式字符、越南语叠加声调、补充平面偏移、重复命中、前后格式字符）；五个词（バカ、ブス、デブ、ハゲ、ポンコツ）× 11 种写法 × 归一化与正则规则，加无浊点规则的反向对照；每条断言路由与原文区间。另有 `stripCombiningMarks: false` 的同组输入、昵称与组合范围的字段边界、扣分规则 `カス`、读音 `ｶﾞｶ`、三条路径的单元边界与副本一致 | 判断 B3 复验；VW-S006-INHERIT-003；VW-SUB012-INHERIT-003 |
| `test/moderation-engine/rules/normalize.test.ts`（B3 部分）、`transliterate.test.ts`（B3 部分）、`routing/classification.test.ts`（B3 部分） | 单元切分；全部 `\p{Cf}` 与不可见标记不拦住组合；逐单元归一化与整段参照在 1344 个构造串上一致；单元映射无缝覆盖；半角、独立浊点的转写与键校验；`ﾊﾞﾊﾟﾊ` 不再判为 NOISE | 判断 B3 复验 |
| `test/scoring-engine/engine/rules.test.ts`、`index.test.ts` | Q22：多规则取最大；校验 `penaltyHits` | 问题清单 Q22 |
| `packages/contracts/test/contracts.test.ts` | `createVerdict` 的新字段 | 契约 |
| `test/db/schema.test.ts`、`test/db/migrate.test.ts` | Q8：表数 26；迁移删除表；字典一致；从 0000–0002 升级时保留既有行 | 问题清单 Q8 |

- VW-SUB012-AC001 是主验收行。STORY 的 VW-S006-AC001 由真值表与短路测试承担。PARENT 与 INHERIT 行只记录本包实际触及的部分。

## 6. 不做的事

- 不接入 AI 调用、任务队列或结果回写；不实现 `DecisionService.commit`、`verdicts` 写入、`deliveries`。
- 不实现复盘结算（SETTLEMENT_REVIEW）、候选关键词、删除编排、保留期限清理。
- 不新增白名单、会员或付费的数据来源；不实现记分例外的建立与撤销。
- 不改注册表、`app.ts`、`main.ts`、`ServerConfig` 与配置 schema。
- 不改 `scripts/check-deps.mjs`、`package.json`、`pnpm-lock.yaml`。
- 不写引擎工单，不推送，不改主工作区、`.kiro/steering` 与 skills。

## 7. 自定

- 第 4.3 节 R5–R7 的 `ALLOW_NOISE` 占位分类；第 4.5 节的存储映射。
- 第 4.8 节归一化默认开启。
- 第 4.11 节（B3）：在 `splitUnits` 里把半角与独立浊点并入前一个单元，不整段 NFKC；NFKC 之前删除全部 `\p{Cf}` 与默认可忽略的组合标记；U+309B、U+309C 先转为组合浊点；兼容谚文字母等 N11 项保持原样。
- 第 4.4 节噪声的三类词元与 3 次阈值；空正文不算噪声。
- 人工裁决与模型裁决一样按分类计分；BLOCK 的扣分包含 `VERDICT_BLOCK` 的基础值。
- 第 4.7 节计分拒绝的处理方式：调用后识别，不做事前检查。
- 快速通道阈值由路由选项传入，计分配置不增加键。
- Q8 选择进程内缓存，并删除持久表。

## 8. 与子单交付清单的偏离

- 目录：工单写 `apps/server/src/modules/moderation/`，实际模块目录是 `moderation-engine/`，与 S001 的九个模块和 S004 的命名一致。Q10 已记录同类偏差。测试目录为 `test/moderation-engine/routing/`。
- 工单的 `moderation/index.ts` 对应 `moderation-engine/index.ts`，是修改，不是新增。
- 不在工单交付清单内的改动：第 1 节中除 `routing/` 目录与 `moderation-engine/index.ts` 外的全部文件。这些改动是问题清单 Q6、Q8、Q12、Q22 指定归属 S006 的要求，并非 SUB-012 的交付范围。

## 9. 来源缺口

- 白名单：没有数据表或端口。路由以 `whitelisted` 事实输入。
- 付费文本：提案 §4.2 要求识别 Super Chat 与会员自定义文本，但没有判定来源。路由以 `paidText` 事实输入。
- 频道内评分读取：计分模块没有读取接口。`score` 由调用方提供。
- 快速通道阈值：提案 §5.1 列为配置项，计分配置没有该键，S005 §9 留给接线 Story。本包以路由选项传入，默认关闭。
- 例外队列持久化：没有表。本包只定义端口与进程内实现。
- AI 审核的任务调度与结果回写：TaskCoordinator、InferenceProvider 仍是占位，不接线。
- 系统失败的重试上限：提案 §6 与 VW-E002 要求有界，但没有数值。由调用方决定（自定）。
- 结果提交：DecisionService、verdicts 写入、deliveries 未接线。
- 复盘结算：提案 §5.4 有描述，本包不实现。

## 10. 未验证项

- 真实平台消息、真实模型输出、真实白名单与会员身份：未涉及。测试全部使用合成数据。
- 性能：噪声判定的耗时未测量。B3 之后归一化变慢：`normalizeField` 处理 300–500 字符的正文，修复前每次调用 0.04–0.17 ms，修复后 0.06–0.20 ms，约 1.1–2.0 倍（本机，负载约 2；原始数字见 `evidence/rework2-self-check.md`）。归一化发生在规则预算开始之前，不占用 20 ms 的预算。未在真实直播语料上测量。
- 归一化覆盖的写法：测试与 30 万个随机串覆盖半角与独立浊点、被不可见字符隔开的浊点、谚文字母与格式字符。其它文字的同形异码、谚文填充字符等写法未验证。
- 装配与端到端：路由器未接入注册表。`pnpm dev` 只验证服务能启动、`/healthz` 返回 200 与绑定地址。
- 进程重启后的缓存与例外队列：未验证（均为进程内实现）。
