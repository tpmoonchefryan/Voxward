<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:c07537a238d62efa3b9779f6 revision=4 sha256=80d7e41968257f16670313aa84f9abd42376eb8c150c3d489133224958cd887a -->

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


# S005 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-005 rev 4（VW-S005-R001@1）；VOXWARD-SUB-010（VW-SUB010-R001@1，第 1/2 张）；VOXWARD-SUB-011（VW-SUB011-R001@1，第 2/2 张）；提案 §5.1–§5.4、§11.4；S002 设计（存储表与依赖方向）。
标「自定」的是来源没有规定的实施选择。标「待定」的是数值占位，待 Owner 决定，不作为产品决定使用。

## 1. 布局

实际模块目录是 `apps/server/src/modules/scoring-engine/`，与工单 deliverables 中的 `scoring/` 不同，见第 10 节。

| 文件 | 所属单 | 职责 |
| --- | --- | --- |
| `packages/contracts/src/ports/scoring-ledger.ts` | SUB-010 | 计分端口：决策类型、主体状态、提交请求与结果 |
| `apps/server/src/modules/scoring-engine/config.ts` | SUB-010 | 计分配置、占位默认值、校验 |
| `apps/server/src/modules/scoring-engine/clamp.ts` | SUB-010 | 运行钳制与实际生效变化 |
| `apps/server/src/modules/scoring-engine/errors.ts` | SUB-010 | 计分错误类型：输入无效、配置无效、例外拒绝 |
| `apps/server/src/modules/scoring-engine/rules.ts` | SUB-010 | 合规加分、违规扣分、最大适用扣分 |
| `apps/server/src/modules/scoring-engine/identity-delta.ts` | SUB-010 | 身份基础分差额 |
| `apps/server/src/modules/scoring-engine/engine.ts` | SUB-010 | 纯函数：裁决与主体状态 → 计分决策 |
| `apps/server/src/modules/scoring-engine/index.ts` | SUB-010，SUB-011 扩展 | `createScoringEngine`：ScoringEngine 与账本操作 |
| `apps/server/src/db/scoring-ledger.ts` | SUB-011 | 端口的数据库实现，模块外唯一接触计分表的文件 |
| `apps/server/src/modules/scoring-engine/exception-guard.ts` | SUB-011 | 记分例外统一守卫 |
| `apps/server/src/modules/scoring-engine/ledger.ts` | SUB-011 | 统一提交入口：守卫、决策、端口调用 |
| `apps/server/src/modules/scoring-engine/identity-events.ts` | SUB-011 | 身份事件，一次生效 |
| `apps/server/src/modules/scoring-engine/compensation.ts` | SUB-011 | 人工补偿接口 |

## 2. 依赖方向

| 层 | 可以引用 | 不可以引用 |
| --- | --- | --- |
| `apps/server/src/modules/scoring-engine/**` | `@voxward/contracts`，本模块文件 | `db/**`、drizzle、其它模块 |
| `apps/server/src/db/scoring-ledger.ts`（分区 `db`） | contracts，db 内文件，`drizzle-orm`，`better-sqlite3` | `modules/*`、`app.ts` |
| `packages/contracts/src/ports/**` | contracts 内文件 | 其它一切 |
| 组合层（`registry.ts` 等） | 以上全部 | 本包不改组合层 |

`scripts/check-deps.mjs` 的规则不改。端口类型放在 contracts，符合 S002 设计第 2 节「需要被模块使用时，由接线 Story 上提到 contracts」。注册表接线留给接线 Story。

## 3. 数据与状态

- 只使用 S002 已有的表：`subjects`、`subject_scores`（身份基准分、行为调整累计、当前分、`version`、`last_reward_at`）、`score_ledger`（幂等键、原因码、请求变化、实际变化）、`subject_identities`（身份事实，`source_event_ref` 唯一）、`score_exceptions`。不改迁移，不新增列，不改 `repository.ts`。
- 不变量（自定）：`current_score = identity_base_score + behavior_adjust_total`。两个分量都只累计实际生效的变化。
  - 每次变化按提案 §5.1 的运行钳制：`nextScore = clamp(currentScore + requested, min, max)`，`actualDelta = nextScore − currentScore`。
  - 身份事件把 `actualDelta` 记入身份基准分。加分、扣分、人工补偿把它记入行为调整累计。
  - 不采用「分量累计未钳制值，只钳制合计」。那种做法在达到上限后仍会累积加分，之后一次扣分就立刻降分，与 §5.1 的公式不符，也把被钳制掉的部分记进了分量。
- 账本只记 `actualDelta ≠ 0` 的变化（提案 §5.1「按实际生效值记账」）。起点为 0 时，账本 `actual_delta` 之和等于 `current_score`。
- 幂等键（自定）：
  - 裁决：`event:<channelId>:<platformMessageId>`。同一事件至多计一次，后续裁决变化也不再计分。
  - 身份事件：`identity:<sourceEventRef>`。另以 `subject_identities.source_event_ref` 唯一作为第二道保护。
  - 人工补偿：`manual:<operationId>`。
- 当前身份（自定）：`subject_identities` 中 `effective_to IS NULL` 的那一行。没有行时视为 `UNKNOWN`。身份变化时关闭旧行，插入新行。
- 冷却（自定）：只有合规加分受冷却限制。当 `rewardCooldownMs > 0` 且 `事件时间 − lastRewardAt < rewardCooldownMs` 时，本次不加分。事件早于上次加分也视为冷却中。`last_reward_at` 只在加分实际生效时更新。
- 主体键（自定）：`(channelId, senderRef)`。同一账号在两个频道中是两个独立主体。

## 4. 接口

端口（`packages/contracts/src/ports/scoring-ledger.ts`）：

- `ScoringLedgerPort.commitScoreDecision(request)`：在一个 `runShortTransaction` 中完成全部读写。
  - 顺序：查重，查找或创建主体，读取状态（分数、身份、例外），调用 `decide`，写入。
  - `decide(state)` 是同步纯函数，返回 `write`、`no_effect` 或 `refused`。
- 提交结果：
  - `applied`：已写入，附 `actualDelta` 与账本 ID。
  - `duplicate`：幂等键已存在，不写任何数据，返回原有 `actualDelta`。
  - `no_effect`：无变化，不写任何数据。
  - `refused`：记分例外生效，不写任何数据。
- 若身份事件的 `identityEventRef` 已在 `subject_identities` 中出现，同样返回 `duplicate`。

模块接口（`apps/server/src/modules/scoring-engine/index.ts`）：

- `createScoringEngine(options?)`，`options` 含 `ledger`、`config`（与默认值合并并校验）、`clock`（默认 `new Date()`）。
- 不传 `options` 时返回未接线的占位。`applyVerdict` 仍以 `MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict` 拒绝，因为注册表尚未接线，且 boundary 测试依赖这段文本。
- `applyVerdict(event, verdict)`：
  - 先校验输入。分类必须是 `INTERNAL_CLASSIFICATIONS` 之一，`receivedAt` 必须可解析。校验失败抛 `ScoringInputError`，不调用端口，不改分数。
  - 返回 `ScoreChange{ subjectRef, delta: actualDelta, idempotencyKey }`。
- SUB-011 增加 `applyIdentityTransition` 与 `applyManualCorrection`。
- 记分例外（自定）：三个入口遇到例外都抛 `ScoringRefusedError`，`reason = EXCEPTION_ACTIVE`，不写账本，不改分数。选择抛错而非返回零变化，是为了让调用方区分「被例外拦截」与「本次无变化」。

## 5. 计分规则

| 分类或事件 | 决策 | 说明 |
| --- | --- | --- |
| `ALLOW_MEANINGFUL` | 合规加分 `+complianceReward`，受冷却限制 | 冷却中为 `no_effect: COOLDOWN` |
| `ALLOW_NOISE` | 无变化 | `no_effect: NOISE` |
| `BLOCK` | 扣分 `−max(适用规则扣分)` | 多规则取最大，不累加。同一事件幂等 |
| AI 超时、限流、输出不合法、内部错误 | 不进入计分 | 没有裁决就不调用；收到无效分类时抛 `ScoringInputError` |
| 钳制后实际变化为 0 | `no_effect: CLAMPED` | 已达上限或下限，不写账本，不更新 `last_reward_at` |
| `enabled = false` | `no_effect: SCORING_DISABLED` | 配置关闭时不计分 |

- `BLOCK` 目前只有一条适用规则 `VERDICT_BLOCK`，扣分为 `violationPenalty`。
- `Verdict` 契约没有规则命中列表。多规则输入的接口留给接线 Story，见第 11 节。纯函数 `selectPenalty` 已按「取最大」实现并测试。

## 6. 配置

计分配置是模块内的类型，不进入 `ServerConfig`，本包不改配置 schema。

| 键 | 默认值 | 状态 |
| --- | --- | --- |
| `enabled` | `false` | 自定：默认关闭（失败关闭），待 Owner 决定开启 |
| `minScore` | `-100` | 待定（占位） |
| `maxScore` | `100` | 待定（占位） |
| `complianceReward` | `1` | 待定（占位） |
| `violationPenalty` | `5` | 待定（占位） |
| `rewardCooldownMs` | `60000` | 待定（占位） |
| `identityBaseScores` | 五种身份全为 `0` | 待定：未配置前身份变化不产生分差 |

- 校验（自定）：`minScore ≤ 0 ≤ maxScore`，因为起点为 0；所有数值为整数；加分与扣分不得为负；冷却不得为负。不合法时抛 `ScoringConfigError`。
- 身份差额（提案 §5.2）：`configured[新身份] − configured[旧身份]`。为负即降分。只动身份基准分，不覆盖行为调整累计。身份到期后回到 `UNKNOWN`。
- 改动配置只影响之后的变化，不回溯（自定）。

## 7. 测试与验收对应

| 测试文件 | 证明什么 | 对应验收 |
| --- | --- | --- |
| `test/scoring-engine/engine/clamp.test.ts` | 上下限边界，部分钳制的实际变化 | SUB-010 AC001 |
| `test/scoring-engine/engine/rules.test.ts` | 多规则取最大而非累加；扣分为零不写账本 | SUB-010 AC001 |
| `test/scoring-engine/engine/engine.test.ts` | 配置校验；冷却边界；噪声与未启用无变化；BLOCK 扣分；故障与无效输入不改分；分量不变量 | SUB-010 AC001 |
| `test/scoring-engine/engine/identity-delta.test.ts` | 身份差额计算，降级为负，同身份无变化 | SUB-010 AC001 |
| `test/scoring-engine/engine/index.test.ts` | 同一账号跨频道互不影响（假端口）；未接线占位保留旧文本 | SUB-010 AC001 |
| `test/scoring-engine/ledger/ledger-port.test.ts` | 真实 SQLite：账本等于实际变化，重复不二次计分，例外拒绝不写，跨频道独立 | SUB-011 AC001 |
| `test/scoring-engine/ledger/identity-events.test.ts` | 身份事件一次生效，重投递与重复识别不奖励，降级 | SUB-011 AC001 |
| `test/scoring-engine/ledger/compensation.test.ts` | 人工补偿记账，例外拒绝 | SUB-011 AC001 |
| `test/scoring-engine/ledger/concurrency.test.ts` | 四个进程提交同一事件只计一次；并发扣分后账本与分数一致 | SUB-011 AC001 |
| `test/scoring-engine/ledger/contract-consistency.test.ts` | 契约中的原因码与身份类型和 db schema 完全一致 | SUB-011 |

## 8. 不做的事

- 不接线 `registry.ts`、`app.ts`、`main.ts`。不改 `ServerConfig` 与配置 schema。
- 不改 S002 迁移与 schema，不改 `repository.ts`，只读使用。
- 不实现复盘（提案 §5.4）、快速通道阈值、删除编排、保留期限清理、记分例外的建立与撤销流程。
- 不实现 AI 输出的规则命中列表。
- 不写引擎工单，不推送，不改主工作区，不改 `.kiro/steering` 与 skills。

## 9. 自定

- 第 3 节的不变量、幂等键、当前身份、冷却与主体键。
- 第 4 节的例外抛错语义与占位注册。
- 第 5 节的「钳制后为零则不写」与「事件级幂等」。
- 第 6 节的默认值与校验规则。

## 10. 与子单交付清单的偏离

- 目录：工单写的是 `apps/server/src/modules/scoring/`，实际目录是 `scoring-engine/`，与已有 `index.ts` 桩和 `moderation-engine` 命名一致。测试目录同样使用 `test/scoring-engine/`。
- 新增文件（不在工单 deliverables 中）：`packages/contracts/src/ports/scoring-ledger.ts`、`config.ts`、`errors.ts`、`apps/server/src/db/scoring-ledger.ts`、`ledger.ts`，测试辅助 `test/scoring-engine/synthetic.ts` 与 `fake-ledger.ts`。另改 `packages/contracts/src/index.ts` 增加导出。
- 工单 deliverables 需要由主线程或 Owner 通过引擎更新。本包不写引擎。
- 工单依赖中的「VOXWARD-SUB-002 的 ScoringEngine 接口」「VOXWARD-SUB-004 的账本表」「VOXWARD-SUB-005 的事务接口」，在本仓库中分别对应 `packages/contracts` 的 `ScoringEngine`、`db/schema/subjects.ts` 的 `score_ledger`、`db/transaction.ts` 的 `runShortTransaction`。

## 11. 来源缺口

- 计分上下限、加分、扣分、冷却、身份基础分：提案没有给出数值。以上均为占位（待定）。
- 提案没有规定身份降级的计分细节、身份到期的判定来源、配置变更是否回溯。本包按第 6 节处理（自定）。
- 提案与 `Verdict` 契约都没有裁决 ID，幂等键按事件定义。
- `Verdict` 契约没有规则命中列表，多规则最大扣分目前只在纯函数层验证。
- 人工补偿的操作者不写入账本，因为账本表没有对应列。审计归属 AuditStore，尚未接线。
- 身份事件的来源是平台适配器，本包只接收已归一化的身份事件。
- 工单 `VW-SUB010-STORY` 与 `VW-SUB011-STORY` 的责任分配在 Story 中仍标注为「转 ready 前需补齐」。本包不处理。

## 12. 未验证项

- 真实平台身份事件与真实 AI 裁决：未涉及，测试全部使用合成数据。
- 多进程并发只在本机 SQLite WAL 上验证。未做性能测量，不对吞吐作承诺。
- 注册表接线、端到端流程、保留期限清理、删除编排：未验证。
