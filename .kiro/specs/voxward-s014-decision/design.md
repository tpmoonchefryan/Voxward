<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:210958ccce508a7abf314287 revision=4 sha256=8ac27e27d8b107ef077c4a1c9dd83f13eb8afe4215c2e7e7540c948b169ec5d3 -->

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


# S014 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-014（work:210958ccce508a7abf314287，rev 4，VW-S014-R001@1）；子单 VOXWARD-SUB-026（work:e054586882ab35ec0b6a5fca）与 VOXWARD-SUB-027（work:72af8ac97c70068c90e95e09）；提案 §7.1–§7.3、§10、§11.4；问题清单 Q19、Q21、Q27（后半）、Q29（写入方要求）；批次简报 b7-s014。
标「自定」的是来源没有规定的实施选择。

## 0. 偏离与登记

1. 模块目录：拆单交付物写 `apps/server/src/modules/decision/`，实际模块为 `decision-service/`（简报映射）。测试目录为 `apps/server/test/decision-service/`。
2. 契约改动：`DecisionService.commit` 的返回值由 `DeliveryIntent` 改为 `DecisionOutcome`，冲突是显式结果而不是异常；新增 `overturn`（复核改判）和 `resend`（过期补发）。新增端口 `DecisionStorePort`。契约版本号仍为 "1"（自定：当前没有其它实现者）。
3. 数据库：新增迁移 `0005_score_outcomes` 与表 `score_outcomes`，记录「没有产生计分变化」的幂等结果（Q19①）。
4. 路由：`routes.ts` 写成纯函数，与数据生命周期模块同形：模块不导入 auth，权限由 HTTP 绑定层解析成能力列表后传入。
5. 计分模块的最小改动：人工补偿与身份事件的幂等键带频道（Q19②）；身份事件引用带频道与主体前缀，使 `subject_identities.source_event_ref` 的全局唯一索引不跨频道冲突；导出组合用的纯计划函数。
6. `db/scoring-ledger.ts`：导出 `commitInTransaction`，使裁决与计分可在同一短事务内提交（Q19③）；端口层直接拒绝例外主体的计分写入（Q21）。

## 1. 依赖方向

- `modules/decision-service/*` 只导入 `@voxward/contracts` 与本模块文件（check-deps 规则不改）。
- 裁决与计分的存储实现是 `db/decision-store.ts`（分区 `db`，只依赖 contracts 与 db 内部）。计分的纯决策函数由组合层（`app.ts`，可导入模块）传入。
- 模块对计分的依赖只通过 `ScoreDecision` 类型和注入的计划函数，不导入 `scoring-engine`。
- HTTP 绑定 `auth/decision-routes.ts` 只接收 `routes` 对象，不导入 `modules/*`（与 `auth/data-routes.ts` 相同）。

## 2. 文件布局

```
packages/contracts/src/modules/decision-service.ts   接口与结果类型（改写）
packages/contracts/src/ports/decision-store.ts        存储端口（新增）
apps/server/src/db/schema/score-outcomes.ts           表 score_outcomes（新增）
apps/server/src/db/migrations/0005_score_outcomes.sql 迁移（drizzle-kit 生成）
apps/server/src/db/scoring-ledger.ts                  导出 commitInTransaction；无计分结果的幂等记录；例外端口拒绝
apps/server/src/db/decision-store.ts                  DecisionStorePort 的数据库实现（新增）
apps/server/src/modules/scoring-engine/identity-events.ts  身份幂等键带频道
apps/server/src/modules/scoring-engine/compensation.ts     人工补偿幂等键带频道
apps/server/src/modules/scoring-engine/index.ts            身份引用带频道；导出 planVerdictScoring、planCorrection
apps/server/src/modules/decision-service/index.ts     createDecisionService（无依赖时保持占位）
apps/server/src/modules/decision-service/service.ts   commit、overturn、resend 的编排（读取、判定、一次原子写入）
apps/server/src/modules/decision-service/concurrency.ts 冲突结果与当前结果视图
apps/server/src/modules/decision-service/compensation.ts 改判规则：代次、同结论、纠分结果映射
apps/server/src/modules/decision-service/list-permissions.ts 名单与词条的权限和编辑
apps/server/src/modules/decision-service/resend.ts    过期消息补发规则（显式、有效期限）
apps/server/src/modules/decision-service/routes.ts    路由纯函数
apps/server/src/auth/decision-routes.ts               Fastify 绑定（由 app.ts 注册）
apps/server/test/decision-service/**                  测试（合成数据）
apps/server/test/scoring-engine/ledger/outcomes.test.ts  Q19、Q21 的端口测试
apps/server/test/db/decision-store.test.ts            裁决与计分同一事务的回滚测试
```

## 3. 接口（契约）

- `DecisionService.commit(task, verdict, origin)`：`origin` 为 `HUMAN`（带操作者、频道与能力列表）或 `SYSTEM`（带裁决来源 `BASE_RULE`、`MODEL`、`FAST_PASS`）。返回 `DecisionOutcome`：`committed`（投递意图、序号、计分状态），`conflict`（原因与当前结果），`denied`（权限）。
- `DecisionService.overturn(request)`：复核改判。只允许对当前裁决改判；返回 `overturned`（新序号、计分状态、纠分变化量）、`conflict` 或 `denied`。
- `DecisionService.resend(request)`：过期消息补发。返回 `resent`、`refused`（原因）或 `denied`。
- `DecisionStorePort`：`readTask`、`readEventForOverturn`、`readDeliveryForResend`、`commitVerdict`、`commitOverturn`、`commitResend`、`applyListEdit`、`applyTermEdit`。每个写入方法是一次同步短事务；守卫在事务内重新读取，不通过则返回受控结果，不写入。

## 4. 数据与守卫

- 主体的 `processing_generation` 在删除或重算时提高。任务与改判都要求代次一致（提案 §7.2）。
- 裁决提交：任务未关闭、事件版本一致、代次一致、当前无裁决。四项任一不符则拒绝，并返回当前结果（Q27 后半）。
- 裁决、投递意图、计分和人工操作的 Change Log 在同一事务内写入。计分失败则整个事务回滚（Q19③）。
- 计分幂等键：裁决为 `event:<频道>:<平台消息>`；补偿为 `compensation:<频道>:<平台消息>`（每个事件至多纠分一次，自定）；人工补偿为 `manual:<频道>:<操作标识>`；身份事件为 `identity:<频道>:<主体>:<源事件>`（Q19②）。
- 无计分结果（冷却、噪声、钳制后为零、例外、禁用）也写入 `score_outcomes`，之后的同一键返回 `duplicate`，不会在冷却结束后补计分（Q19①）。
- 例外主体的任何计分写入由端口直接拒绝（Q21），并记录 `REFUSED`。
- 改判的纠分依据原账本条目的 `actual_delta`，取负号后经当前上下限钳制（提案 §5.1、§7.1）。不读取配置扣分值，不做机械加回（「无旧结果重建或机械加回配置分」）。
- 改判后不再对新结论计分。新结论只替换当前裁决，纠分依据原账本一次（自定：提案 §7.1 写的是「按账本纠正该条实际计分」）。
- 代次已变（删除交叉）时，改判、纠分与补发都被拒绝，不生成新数据（提案 §11.4、§12）。
- 补发：只对已过期的投递（`valid_until` 早于当前时间）、且其裁决仍为当前、代次未变、事件到达时间不超过 10 分钟的情况允许（自定）。新投递的有效期为 60 秒（自定）；同一操作标识重复时返回 `duplicate`（投递标识由频道与操作标识派生）。
- 名单与词条：需要 `list.edit` 能力（房管与房主有，数据管理员没有，见 `auth/permissions.ts`）。同一主体至多一条有效名单项（数据库已有唯一索引）。同一词条的有效记录唯一。
- Change Log 摘要不写分数、不写消息正文。主体级记录（名单、例外、人工调分）的 `correlation_id` 取 `subject:<主体标识>`，改判与补偿取事件的关联标识（Q29 写入方要求）。删除索引对主体级记录的查找仍是 S019 的工作，本包不改删除索引。

## 5. 测试与验收对应

| 测试 | 证明什么 | 对应验收 |
| --- | --- | --- |
| `test/decision-service/service/commit.test.ts` | 人工接管先于 AI 结果：AI 结果被拒且不计分；同一任务重复提交返回冲突与当前结果；版本与代次守卫；权限拒绝 | VW-SUB026-AC001 |
| `test/decision-service/service/concurrency.test.ts` | 两名房管对同一任务先后提交：只有一次结算，后者得到冲突与当前结果；超时重试不重复计分 | VW-SUB026-AC001 |
| `test/db/decision-store.test.ts` | 裁决与计分同一事务：计分失败回滚裁决；裁决冲突回滚计分 | Q19③、Q27 |
| `test/scoring-engine/ledger/outcomes.test.ts` | 无计分结果留幂等记录；例外主体端口拒绝；人工补偿与身份键按频道区分 | Q19①②、Q21 |
| `test/decision-service/compensation/overturn.test.ts` | 误判放行按实际账本纠分；钳制后的纠分只纠可纠部分；同一事件只纠一次；代次变化后拒绝 | VW-SUB027-AC001 |
| `test/decision-service/compensation/resend.test.ts` | 补发只允许已过期且仍为当前的投递；有效期受限；重复操作幂等；代次变化后拒绝 | VW-SUB027-AC001 |
| `test/decision-service/compensation/list-permissions.test.ts` | 数据管理员的名单与词条操作被拒绝；房管可以编辑；摘要不含分数 | VW-SUB027-AC001 |
| `test/decision-service/routes.test.ts` | 路由纯函数的状态码与能力检查 | VW-SUB026-AC001（路由） |

## 6. 不做的事

- 不改 `task-coordinator/`、`moderation-engine/review/`、`scripts/check-deps.mjs`、配置 schema 与 `ServerConfig`。
- 不改删除索引（S019）、数据生命周期模块、输出适配器的真实投递。
- 不实现「同一事件多次改判的计分重算」。改判只纠一次原始计分（自定）。
- 不做真实平台操作，不推送，不发布，不写引擎工单。
- 不对性能作承诺；并发测试使用同一数据库文件上的两个连接，不做压力测试。

## 7. 来源缺口与未验证项

- 提案没有规定补发的时效、改判后的二次计分、名单与裁决冲突的处理方式。以上均标「自定」。
- 删除索引找不到没有技术日志关联的主体级 Change Log（Q29），本包只保证写入方带关联值，不保证删除索引能找到它们。
- 生产环境的多进程并发、真实平台回执、真实投递均未验证。

## 8. 实施记录与偏离（SUB-026）

- 契约中 `commit` 的第一个参数是任务标识而不是 `TaskRef`。`TaskRef` 的版本与代次字段由存储层在事务内对照当前值，调用方不需要也不能提供它们。
- 提交结果类型名为 `CommitOutcome`。`DecisionOutcome` 已被数据请求端口占用（`data-request.ts` 的已决/未找到结果），不改名会造成导出冲突。
- `concurrency.ts` 放权限判断（`mayDecide`）与冲突结果构造（`conflictOutcome`）；`service.ts` 放 `commitDecision` 的编排。
- 裁决与计分的组合在 `db/decision-store.ts`：`TaskStore.commitVerdict` 做任务守卫，随后在同一事务内写投递意图、调用 `commitInTransaction` 计分，最后写 Change Log。计划函数由 `createScoringPlanner` 提供，组合层注入。
- HTTP 绑定与 app 接线未在 SUB-026 内完成。路由纯函数由 `routes.test.ts` 覆盖；绑定见后续提交或报告中的未完成项。

