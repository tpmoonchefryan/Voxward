<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:8f928245aa79a29f26ad28a6 revision=4 sha256=172094d563836f521ce8f65ec1db1423fb3e16e1c38884a15535bb3a24f8319e -->

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

## 实施设计（VOXWARD-STORY-011，受管段之外）

依据：VW-S011-R001（工单 `work:8f928245aa79a29f26ad28a6`）；子单 VW-SUB021-R001（`work:a42a05e89d8c991f62abd995`）与 VW-SUB022-R001（`work:49db71dc5c4327f322c4c4af`）；提案 §5.4、§6.2、§7.2；数据字典 `docs/data-dictionary.md` 中 `channel_events.settlement_state` 的取值；主线程问题清单 Q27（前半）与 Q38。来源没有规定的选择均标「自定」。

### 1. 偏离表

| 工单交付路径（拆单时的旧名） | 实际路径 | 原因 |
| --- | --- | --- |
| `apps/server/src/modules/moderation/review/*` | `apps/server/src/modules/moderation-engine/review/*` | 模块名映射（主线程简报：`moderation` → `moderation-engine`） |
| `apps/server/src/modules/moderation/candidates/*` | `apps/server/src/modules/moderation-engine/candidates/*` | 同上 |
| `apps/server/src/modules/moderation/index.ts` | `apps/server/src/modules/moderation-engine/index.ts` | 同上 |
| `apps/server/test/moderation/review/` | `apps/server/test/moderation-engine/review/` | 测试目录同理 |
| `apps/server/test/moderation/candidates/` | `apps/server/test/moderation-engine/candidates/` | 同上 |
| 子单交付清单未列 | `moderation-engine/review/ports.ts`、`review/runner.ts` | 新增。端口类型集中定义；批次运行器把已有接口串成复盘流程（自定） |
| 子单交付清单未列 | `task-coordinator/coordinator.ts`、`index.ts`（Q38） | 主线程指定的唯一例外，单独提交（自定：窗口淘汰与接口观察方法） |

#### 1.1 返工偏离（rework1，N5、B2–B4）

- `moderation-engine/review/membership.ts`（新增）：批内 itemId 整批校验（B3）。`check:deps` 禁止 moderation-engine 导入 inference-provider，所以同一规则在本模块写一份（R8）。
- 候选词驳回（SUB-022 范围写「确认与驳回 API」，原实现只有确认）：`CandidateStatus` 增加 `REJECTED`，`createCandidateRoutes` 增加 `reject`（N5）。
- 确认与驳回的能力由 `review.decide` 改为 `list.edit`（N5）。理由：提案 §2.1 写房管做「获准的名单与词条操作」；S014 的词条入库已用 `list.edit`。`auth/permissions.ts` 中频道所有者与房管同时持有两者，改动不改变能拿到该操作的角色；数据管理员两者都没有。导出名 `REVIEW_DECIDE_CAPABILITY` 改为 `LIST_EDIT_CAPABILITY`。
- 取批按车道（B2）：`takeBatch` 接收 `lanes`，见 §3 与 §6。

### 2. 布局

```
apps/server/src/modules/moderation-engine/review/
  ports.ts         模块内端口类型（存储、模型、后台车道、复核队列、候选词、计分）
  triggers.ts      decideReviewTrigger：下播、累计条数、周期三种触发（纯函数）
  selection.ts     selectForReview：过滤、到期判定、去重、平台顺序、单周期上限（纯函数）
  author-alias.ts  createTaskAliasTable：任务内临时别名，别名含任务随机前缀（不跨任务复用）
  settlement.ts    settlementOf：模型条目 → 结算描述（分类、理由、复核记录、候选词）（纯函数）
  runner.ts        createReviewRunner：runCycle（触发→选择→enqueueInLane("BACKGROUND")）、
                   runBatch（takeBatch→模型→校验→commitResult→计分→finishBatch）、
                   resumePendingScoring（重放计分失败的已结算项）
  membership.ts    batchMembershipErrorOf：批内 itemId 整批校验，重复或批外为 AI_OUTPUT_INVALID，缺项为 AI_OUTPUT_INCOMPLETE（B3）
apps/server/src/modules/moderation-engine/candidates/
  store.ts         候选词卡片：提议（去重）、确认（状态比较交换）、列表；内存实现供模块语义与测试
  routes.ts        createCandidateRoutes：listCards、confirm、reject；返回 RouteResponse，不依赖 HTTP 框架
apps/server/src/modules/moderation-engine/index.ts    导出上述公共入口
apps/server/src/modules/task-coordinator/coordinator.ts   Q38：已结算记录的 FIFO 窗口
```

### 3. 接口

- `ReviewStorePort`（`review/ports.ts`，模块内端口）：`listOpenCandidates(channelId)`、`readCandidate(eventId)`、`markExpired(eventId)`、`commitSettlement(write)`（同步；一次短事务内做状态比较交换并写入裁决，同时把计分状态置为 PENDING）、`markScoring(eventId, state)`、`listPendingScoring()`。复核记录与候选词由运行器在同一个同步 `apply` 内写入对应端口。
- `ReviewModelPort`：`reviewBatch(input: AiBatchInput): Promise<unknown>`。输入只有 `itemId` 与 `text`（`text` 含任务别名前缀），输出先经 `validateReviewBatchResult`。推理一律用替身。
- `BackgroundCoordinatorPort`（`review/ports.ts`）：`enqueueInLane("BACKGROUND", event, deadlineAt): Promise<TaskRef>`、`takeBatch({ lanes: ["BACKGROUND"] })`（B2：只取后台车道）、`commitResult`、`reportFailure`、`statusOf`、`finishBatch`，由 task-coordinator 的已导出接口结构匹配。模块不导入 task-coordinator。`ReviewRunner.retainedEntries()` 观察运行器持有的条目数（B4）。
- `ScoringPort`：`Pick<ScoringEngine, "applyVerdict">`（合约）。`ScoringRefusedError` 的识别只读 `code`，与 router 的做法一致。
- `ReviewQueuePort`：`append(record)`，人工复核列表（Q27）。
- `CandidateRulePort`（`candidates/store.ts`）：`publishConfirmedTerm({channelId, term, candidateId, actorRef}): number`，同步返回新规则版本号。
- `CandidateActor`（`candidates/routes.ts`）：`{ accountId, channelId, capabilities: ReadonlySet<string> }`，与 data-lifecycle-service 的 `DataActor` 同形态。列表需要 `queue.read`，确认与驳回需要 `list.edit`（N5，原草案写 `review.decide`，见 §1.1）；HTTP 绑定从 S003 成员资格解析这些能力。

### 4. 数据（模块内表示，数据库绑定不在本包）

- `settlement_state` 取值沿用数据字典：`NONE`、`UNSETTLED_FAST_PASS`、`SETTLED`、`UNSETTLED_EXPIRED`。
- 计分状态 `scoring_state`（自定）：`NOT_REQUIRED`（无需计分）、`PENDING`、`APPLIED`、`REFUSED`。
- 复核记录 `ReviewRecord`（自定）：`{ id, channelId, eventId, correlationId, classification: "BLOCK", source: "REVIEW_SETTLEMENT", createdAt, humanState: "OPEN" }`。不含正文。
- 候选词卡片 `CandidateCard`（自定）：`{ id, channelId, term, note, sourceCorrelationId, sourceTaskId, status, createdAt, decidedByRef, decidedAt, ruleVersion }`，`status` 取 `PENDING_CONFIRMATION`、`CONFIRMED` 或 `REJECTED`（N5）。
- 同一频道内，相同的规范化词条只保留一张卡片，不论其状态。驳回后同一词条不再提出（N5）。

### 5. 依赖方向

| 来源 | 允许的导入 | 不允许 |
| --- | --- | --- |
| `moderation-engine/review/**`、`candidates/**` | `@voxward/contracts`；本模块文件（`routing/`、`rules/`、同目录） | task-coordinator、scoring-engine、db、auth、security、fastify、node 内建模块 |
| 测试（不扫描） | 任意，包括替身与其它模块的 `index.ts` | — |

`scripts/check-deps.mjs` 不改动，因为新增代码只用上述导入。唯一的改动是 Q38 所在的 task-coordinator 内部，它的依赖方向不变。

### 6. 状态与顺序

1. 触发（`decideReviewTrigger`）：下播 > 累计条数 >= 阈值 > 周期到期。没有待复盘项时不触发。
2. 选择（`selectForReview`）：先排除已删除、非 `UNSETTLED_FAST_PASS`、记分例外、已有人工裁决的项；再判定到期（证据到期或复盘截止已过）并标记 `UNSETTLED_EXPIRED`，到期项不计分；按同一 `(频道, 平台消息)` 去重；按平台顺序取前 N 条（自定 N=50）。未入选的项留给下一周期。
3. 入队：每条入选消息调用一次 `enqueueInLane("BACKGROUND", event, deadlineAt)`。协调器对同一事件的去重使重复周期安全。截止时间取 `settlement_deadline_at`，缺省时取证据到期时刻（自定）。运行器只为自己入队的任务保存条目，条目不含正文（B4）；每次 `runCycle` 与 `runBatch` 开始时释放协调器已结束或已淘汰任务的条目。
4. 批次：`takeBatch({ lanes: ["BACKGROUND"] })` 取得批次后（B2），为每条任务生成批内 `itemId`（`i0`、`i1`…）；作者别名按批次生成，一次模型调用内同一作者共用一个别名（自定，别名的作用范围是一次模型调用），调用模型替身，结果经 `validateReviewBatchResult`，再由 `batchMembershipErrorOf` 检查 itemId 集合（B3）：每个批内 itemId 恰好返回一次；批外或重复的 id 为 `AI_OUTPUT_INVALID`，缺项为 `AI_OUTPUT_INCOMPLETE`。任一失败时对批内每个任务调用 `reportFailure(taskId, <错误码>)`，不结算、不计分、不建卡片。
5. 结算：对每条合法条目调用 `commitResult(taskId, { apply, evidence })`。`apply` 在协调器的事实事务内同步运行：先做状态比较交换（当前仍为 `UNSETTLED_FAST_PASS` 才写），再写 `SETTLED` 与裁决；`BLOCK` 同时写复核记录并入人工队列（Q27）；候选词写入卡片，不写规则。已被他人处理的任务返回 `NOT_ELIGIBLE` 并正常结束。提交返回 waiting 时，调用 `reportFailure(taskId, "PREDECESSOR_PENDING")` 让任务重新排队，结果记为 `DEFERRED`（自定）。
6. 计分：只有提交成功且状态比较交换成功的项才调用 `applyVerdict`。成功记 `APPLIED`；`EXCEPTION_ACTIVE` 拒绝记 `REFUSED`；其它异常记 `PENDING`。`resumePendingScoring` 对 `PENDING` 项重放 `applyVerdict`，账本幂等键保证不重复计分。
7. 结束：每个批次都以 `finishBatch` 释放槽位。

### 7. 测试与验收对应

| 验收行 | 测试 | 断言要点 |
| --- | --- | --- |
| VW-SUB021-AC001 / VW-S011-AC001（复盘选择、并发结算、过期） | `test/moderation-engine/review/selection.test.ts`、`runner.test.ts` | 只选 `UNSETTLED_FAST_PASS`；人工、删除、例外、已结算项不选；到期标记 `UNSETTLED_EXPIRED` 且不计分；同一事件两次结算只计一次（协调器 + 账本幂等）；删除后不恢复；触发三种条件 |
| VW-SUB021-AC001（Q27 前半） | `runner.test.ts` | BLOCK 结算写复核记录并入人工队列；ALLOW 不写 |
| VW-SUB022-AC001（候选词确认与权限） | `candidates/store.test.ts`、`routes.test.ts` | 未确认不进规则；无 `list.edit` 返回 403 且不发布；确认后版本号增加；重复确认返回 409；驳回后不发布、不再提出、不能再确认（N5）；候选词保留来源与状态；AI 输出不直接发布 |
| Q38（记录数有上限） | `test/task-coordinator/retention.test.ts` | 结算数超过上限后，最旧记录 `statusOf` 抛 `TaskNotFoundError`，窗口内记录仍可查；未结算任务不被淘汰 |
| INHERIT 行（VW-R-001/005/006/008/009/010/011/012/017） | 无单独测试 | 仅记录本单触及部分；运行时完整验证由责任单承接 |

### 8. 不做的事（自定）

- 不修改组合根 `modules/registry.ts`；协调器与计分引擎仍按原样未接线。数据库绑定、HTTP 绑定、真实 Kiro/Crew 调用都不在本包。
- 不修改 `ServerConfig` 与配置 schema；复盘参数以函数选项传入并给默认值。
- 不写入规则库、不改 inference-provider、scoring-engine、decision-service 的目录（同批 S010、S014 在别的工作树）。
- 不处理 Q39（跨重启去重）、Q40（SC 留言正文）、Q41、Q43。
- 不自动把候选词写入规则；不新增产品功能。

### 9. 残余

- R1：计分在结算提交之后执行。提交成功后、计分前进程退出，会留下 `PENDING`，需调用 `resumePendingScoring` 补做。计分失败与重放的测试已覆盖；定时调用不在本包。
- R2：Q38 的窗口淘汰后，窗口外的同一事件若再次入队，会新建协调器任务。计分仍由账本幂等键保证不重复，但模型可能重跑。
- R3：数据库绑定的事务原子性未在本包验证，只在内存替身上验证。
- R4：真实 Kiro/Crew 行为未验证。
- R5：协调器按事件去重。若同一消息已有其它车道的任务（例如实时车道已结算），`enqueueInLane` 返回该任务，后台车道不会再处理它。消息进入哪条车道由组合层决定，本包未接线，需在接线时确认。取批按车道已由 B2 修复：运行器只取 BACKGROUND，Crew 执行器只取 PAID 与 REALTIME。
- R6：`apply` 的原子性由数据库绑定的事务保证。内存替身不回滚，测试只验证写入顺序与比较交换。
