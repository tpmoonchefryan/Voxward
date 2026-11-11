<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:ac2a8c1b963085361cf086f0 revision=4 sha256=cdcf67a029fe854ac47ea20b9afa3f524e781016862fe706b15f8fd5e22ea616 -->

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

# S009 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-009 rev 4（VW-S009-R001@1）；VOXWARD-SUB-017（VW-SUB017-R001@1）；VOXWARD-SUB-018（VW-SUB018-R001@1）；提案 §6.1–§6.3、§7.2、§9.2、§9.3。
标「自定」的是 Story discretion 内的选择，或来源没有规定的参数。微批与超时数值是自定默认值，未经测量。部署前按实际模型与消息量测定（提案 §6.2）。

## 0. 偏离与来源缺口（登记）

1. 提案章节：子单写的「§7 任务队列、截止时间、代次」，队列与截止时间实际在 §6；晚到结果与事务确认在 §7.2。两处都按原文执行。
2. 契约缺口：`TaskCoordinator.enqueue(event, deadlineAt)` 没有车道参数，`ChannelEvent` 也不带付费标记。模块增加 `enqueueInLane(lane, …)`，`enqueue` 默认走 REALTIME。契约包不改。
3. 事务确认需要的事实（事件版本、数据代次、是否已删除、是否已结算）由数据库持有。模块只定义 `TaskFactsPort`，由接线方在一个同步事务内完成检查与写入。真实数据库绑定不在本包。
4. 任务状态只在内存中。进程重启后旧任务不恢复，它们的结果按 UNKNOWN_TASK 丢弃。持久化任务表与恢复流程留给接线 Story。
5. S016 Technical Log：本包只给接线点接口 `TechnicalLogSink`。S008 的 itemId 映射与校验后 JSON 经 `TaskResult.evidence` 传入。真正写入属于 S011（问题清单 Q27），不做。
6. Kiro Crew：`CrewPort` 是本包的端口，测试只用替身。本包不启动队列，也不连接本机正在运行的 Kiro Crew 网关。真实接入标「待部署实测（S029）」。
7. 提案旧稿的 250 ms、< 2 ms 不作为承诺。本包所有微批数值都是「自定」默认值。

## 1. 仓库布局

与子单交付清单一致，没有新增源文件。

```
apps/server/src/modules/task-coordinator/
  index.ts            createTaskCoordinator(options?)：无选项时保持占位，有选项时返回服务；再导出 Crew 执行器与动态并发
  coordinator.ts      状态机：入队、取批、失败重试、取消、截止时间扫描、结果提交；端口类型与默认限值
  micro-batch.ts      微批判定：条数、UTF-8 字节、等待时间、最早截止时间（纯函数）
  priority.ts         车道与派工顺序 PAID > REALTIME > BACKGROUND，后台余量（纯函数）
  deadline.ts         截止时间解析与判定（纯函数）
  retry.ts            可重试错误码、退避、次数与时间预算（纯函数）
  generation.ts       结果提交的期望事实与过期原因（类型与映射）
  ordering.ts         通道内有限保序的门控（纯函数）
  crew/adapter.ts     Crew 执行器：提交批次、解析报告、不可用时明确失败、取消、回收空闲批次
  crew/capacity.ts    动态并发上限：资源信号 → 目标并发，夹在 [min, max] 之间
apps/server/test/task-coordinator/
  *.test.ts、helpers.ts（假时钟、假事实端口、假技术日志）
  crew/*.test.ts、crew/fake-crew.ts（假 Crew 替身）
```

## 2. 依赖方向

模块文件只导入 `@voxward/contracts` 与本模块文件，这是 check-deps 现有规则，本包不改。`Buffer`、`globalThis.crypto`、`Date` 是全局对象，不算导入。注册表（`modules/registry.ts`）不改，仍调用无选项的 `createTaskCoordinator()`。

## 3. 状态与流程

任务状态转移：

- QUEUED → RUNNING：被 `takeBatch` 取入一个批次。
- RUNNING → DONE：结果提交通过事务确认。
- RUNNING → QUEUED：可重试错误，并设置 `notBeforeMs`。
- QUEUED / RUNNING → PENDING_REVIEW：明确的系统失败（超时、重试耗尽、不可重试错误、过载、输入过大、Crew 不可用、提交异常）。进入人工队列，不自动放行，不扣分（提案 §6.2）。
- QUEUED / RUNNING → DISCARDED：取消、结果过期、结果被替代、数据已删除、未知任务。DISCARDED 的结果永远不写入。

一条事件（`channelId` + `platformMessageId`）最多对应一张任务。重复入队返回已有任务的 `TaskRef`（自定）。

入队检查顺序：
1. 字段校验，失败抛 `TaskInputError`（自定）。
2. 已有任务则返回其 `TaskRef`。
3. 读取事实：数据已删除则 DISCARDED（DATA_DELETED）。
4. 截止时间已过则 PENDING_REVIEW（DEADLINE_EXCEEDED）。
5. 正文字节数超过批次上限则 PENDING_REVIEW（INPUT_TOO_LARGE），否则一条大消息会永远排不进批次。
6. 车道排队数已达上限则 PENDING_REVIEW（QUEUE_FULL）。

被拒绝的任务仍有记录和 `TaskRef`，状态可以查询，不会静默丢弃。

## 4. 接口

```ts
export interface TaskCoordinatorService extends TaskCoordinator {
  enqueueInLane(lane: TaskLane, event: ChannelEvent, deadlineAt: string): Promise<TaskRef>;
  reasonOf(taskId: string): Promise<string | null>;
  takeBatch(): Promise<TaskBatch | null>;                    // 先扫描截止时间，再按车道取批
  reportFailure(taskId: string, errorCode: string): Promise<FailureOutcome>;
  commitResult(taskId: string, result: TaskResult): Promise<CommitResult>;
  finishBatch(batchId: string): Promise<void>;                // 释放并发槽位
  cancelEvent(key: EventKey): Promise<{ readonly cancelledTaskIds: readonly string[] }>;
  idleBatchIds(): Promise<readonly string[]>;                 // 无 RUNNING 任务但尚未 finishBatch 的批次
  sweep(): Promise<number>;                                   // 返回转入 PENDING_REVIEW 的任务数
}
```

端口（由接线方提供）：

- `TaskFactsPort.readFacts(key)` 返回 `{ eventVersion, processingGeneration, deleted }`。
- `TaskFactsPort.commitIfCurrent(key, expected, apply)`：在一个短同步事务中比对期望事实。全部一致时执行 `apply` 并返回 committed；否则返回 `stale` 与原因，且不执行 `apply`。比对顺序为：已删除、代次变化、版本被替代、已结算。
- `ConcurrencySource.current()`：当前并发上限，整数，至少为 1。
- `TechnicalLogSink.record(entry)`：写入 S016 Technical Log 的契约条目。

`TaskResult = { apply: () => void; evidence: readonly EvidenceEntry[] }`。`apply` 在事务内执行，只写裁决及其副作用。`evidence` 只在 committed 时写入技术日志，被丢弃的结果不留内容副本。

`CommitResult`：`committed`、`waiting`（前序任务未完成，且其截止时间未到，调用方稍后重试）、`discarded`（带原因）、`failed`（事务异常，任务转入人工队列）。

`FailureOutcome`：`retry_scheduled`（带 `notBeforeMs`）、`pending_review`（带原因）、`ignored`（任务已不在 RUNNING，忽略迟到的失败报告）。

## 5. 微批与车道（自定数值）

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| maxBatchItems | 8 | 每批最多条数 |
| maxBatchBytes | 8192 | 每批正文 UTF-8 字节上限；单条超过则 INPUT_TOO_LARGE |
| maxBatchWaitMs | 200 | 批内最早一条等待上限，超过即取批 |
| deadlineMarginMs | 1000 | 距最早截止时间不足该值即取批 |
| maxQueued | PAID 50 / REALTIME 200 / BACKGROUND 500 | 车道排队上限，超过则 QUEUE_FULL |

判定顺序（`decideBatch`）：先按 FIFO 累计候选，遇到条数或字节上限即取批；否则依次检查等待时间、最早截止时间，满足任一即取批；都不满足则等待。

车道：
- 派工顺序 PAID > REALTIME > BACKGROUND。PAID 与 REALTIME 可用全部槽位。
- 后台余量：`reserve = min(limit, max(1, ceil(limit / 4)))`，BACKGROUND 批次数不得超过 `limit - reserve`。并发降到最小值时后台暂停（自定）。
- 每个批次占一个并发槽位，直到 `finishBatch` 释放。槽位由执行器在 Crew 接受取消、或会话已报告后释放（§9）。截止时间到期后，执行器对仍在运行的会话发起取消。

## 6. 重试与退避（自定）

- 可重试错误码：`RATE_LIMITED`、`TRANSIENT_FAILURE`。其余错误码（如 `INVALID_OUTPUT`、`CREW_UNAVAILABLE`、`CANCELLED`）直接转入人工队列。
- 最多 `maxAttempts = 3` 次派工。第 n 次失败后的退避为 `min(cap, base × 2^(n-1))`，`base = 1000 ms`，`cap = 8000 ms`。
- 时间预算：`now + 退避 < deadlineAt` 才重试，否则转入人工队列（DEADLINE_EXCEEDED）。
- 重试期间被取消的任务不再派工。

## 7. 结果提交与代次（提案 §7.2）

`commitResult` 的顺序：
1. 未知任务：`discarded(UNKNOWN_TASK)`。进程重启后的迟到结果落在这里。
2. 非 RUNNING：返回原有的丢弃原因，不改变状态。
3. 已过截止时间：转 DISCARDED（DEADLINE_EXCEEDED）。过期任务不恢复为有效输出。
4. 前序门控：有未过期的前序任务，返回 `waiting`。
5. 调用 `facts.commitIfCurrent`。committed 则转 DONE；stale 则转 DISCARDED，原因为 DATA_DELETED、GENERATION_CHANGED、VERSION_SUPERSEDED 或 ALREADY_SETTLED。
6. 端口抛异常：转 PENDING_REVIEW（COMMIT_FAILED），返回 `failed`。

模块不写裁决。人工放行或误判修正产生的版本变化，由事实端口在提交时发现（STALE）。

## 8. 通道内有限保序（提案 §6.3）

- 门控只作用于同一频道（`channelId`）且同一车道（`lane`）内 `platformOrder` 更小、仍为 QUEUED 或 RUNNING 的前序任务。提案「在各自通道内」指处理车道，不指 YouTube 频道（B4）。不同车道互不等待：后台任务不挡实时与付费任务，付费任务不被同频道实时任务挡住。不同频道互不等待。
- 前序任务未过截止时间：返回 `waiting`，等待对象为最早的未过期前序任务。
- 前序任务已过截止时间但仍未结束：门控放行，并在本任务上记录 `PREDECESSOR_UNFINISHED:<taskId>`（自定，写入技术日志的 `data`）。
- 门控只约束提交顺序，派工不按通道排序。

## 9. 动态并发与 Crew 适配（SUB-018）

资源信号（`ResourceSignalPort.read()`，由接线方提供）：`{ freeMemoryRatio, loadPerCpu }`。
- CRITICAL：空闲内存比 < 0.10 或每核负载 ≥ 2.0。
- TIGHT：空闲内存比 < 0.25 或每核负载 ≥ 1.0。
- NORMAL：其余情况。
- 非有限数、负数，或空闲内存比超过 1 时视为 CRITICAL（保守收缩）。阈值为自定。

目标并发：NORMAL → max；TIGHT → `max(min, floor(max / 2))`；CRITICAL → min。结果始终夹在 [min, max] 内。`min ≥ 1`，因此不会出现零并发的全局屏障。无滞后，每次读取即时生效（自定）。

Crew 执行器（`createCrewExecutor`）：
- `CrewPort.start(job)` 返回 `{ crewRef, done }`。`start` 抛出即视为 Crew 不可用。
- `done` 解析为 `completed`（带校验后的条目）或 `failed`（带错误码）。
- 不可用或 `failed`：每个任务 `reportFailure`，不默认放行。`failed` 的错误码格式不合法时记为 CREW_FAILED。
- `done` 被拒绝（会话中途失联）记为 CREW_UNAVAILABLE。执行器内部未预期的异常使本批次整体明确失败（CREW_FAILED），槽位释放。
- 同一任务出现两条以上对应条目时同样报 INVALID_OUTPUT。
- 会话 `completed` 但某任务没有对应条目：该任务报 INVALID_OUTPUT。Crew 会话状态不是业务裁决，裁决只来自校验后的条目。
- 有条目：`commitResult`，`apply` 调用 `writeVerdict(taskId, item)`，evidence 为 ITEM_ID_MAP 与 VALIDATED_JSON（每个任务各一条）。
- `waiting` 的提交放入待重试列表，下一次 `pump` 再试。
- `pump()`：先 `sweep`，再对无 RUNNING 任务的空闲批次发起 Crew 取消，重试暂存的提交，然后按并发上限取批启动。返回启动的批次数。`pump` 不等待会话结束，也不等待取消返回（B5）。
- 取消不在主路径上等待（B5）：发起取消后，该批次保留槽位，直到 Crew 接受取消才 `finishBatch`。被拒绝的取消保留槽位，下一次 `pump` 再发。取消一直不返回时，该槽位一直保留，其它批次照常派工。若并发上限为 1，派工暂停直到 Crew 应答。这是残留风险：执行器侧不设上限，因为提前释放会让 Crew 侧的会话数超过上限；有界取消须由真实绑定保证（S029）。
- start 尚未返回时批次已空闲：槽位立即释放，因为此时还没有可取消的 Crew 会话。若 start 之后才返回，执行器立即发起取消且不等待；被拒绝则由下一次 `pump` 再发。在取消被接受前，Crew 侧可能短暂多出一个会话（残留风险，未测量）。
- `drain()`：等待已启动的会话全部报告。供测试与停机使用。
- `cancelEvent(key)`：调用 `coordinator.cancelEvent`，再执行一次回收，使运行中的 Crew 任务及时取消，然后立即返回，不等待 Crew（B5）。取消被拒绝的会话保留槽位，下一次 `pump` 再试。

## 10. 测试与验收对应

| 验收行 | 测试文件 | 证明内容 |
| --- | --- | --- |
| VW-SUB017-AC001 | `micro-batch.test.ts` | 条数、字节、等待、截止时间四种取批条件 |
| VW-SUB017-AC001 | `priority.test.ts` | 派工顺序；后台余量；并发降到最小时后台暂停 |
| VW-SUB017-AC001 | `micro-batch.test.ts`（截止时间部分）、`acceptance.test.ts` | 慢请求超时转 PENDING_REVIEW，不放行不扣分；迟到结果丢弃，不恢复 |
| VW-SUB017-AC001 | `ordering.test.ts`（重试部分）、`coordinator.test.ts` | 限流退避递增且有上限；不可重试直接转人工；次数与时间预算耗尽后转人工；取消后迟到的失败报告被忽略，不再重试 |
| VW-SUB017-AC001 | `coordinator.test.ts` | 超过字节上限的正文转人工；队列满明确转人工，队列长度有界；取消立即生效，即使车道排队已满 |
| VW-SUB017-AC001 | `generation.test.ts` | 版本被替代、数据已删除、代次变化、已结算各自被拒；重复提交不重复写入 |
| VW-SUB017-AC001 | `ordering.test.ts` | 前序慢请求时等待至其截止时间，之后推进并记录原因；跨通道不等待 |
| VW-SUB017-AC001 | `acceptance.test.ts` | 慢请求、限流、队列满、进程重启、删除取消、前序超时六类故障注入 |
| VW-SUB017-STORY | 同上 | 本单承担的 VW-S009-R001 中「微批、付费优先、重试、取消、保序」部分 |
| VW-SUB018-AC001 | `crew/capacity.test.ts` | 资源收缩与恢复；并发不超过上限、不低于下限；未知信号收缩 |
| VW-SUB018-AC001 | `crew/adapter.test.ts` | Crew 可用、不可用（明确失败）、会话完成但无条目（不是裁决）、取消、重启后新进程不接管旧会话（未知任务的丢弃见 `acceptance.test.ts`）；并发随资源收缩 |
| VW-SUB018-STORY | 同上 | 本单承担的 VW-S009-R001 中「Crew 适配与动态并发」部分 |
| VW-S009-INHERIT-* | `scripts/check-deps.mjs`、契约包 `typecheck` | 依赖方向、契约不变；其余继承行为的完整验证由 EPIC-006 承接，本包不宣称 |

真实 Crew 行为：未验证。本包只用替身。

## 11. 不做的事

- 数据库版 `TaskFactsPort`、任务表持久化、进程重启后的恢复（接线 Story）。
- S008 输出写入 S016 Technical Log 的实际接线（S011，Q27）。
- 投递、交付序号与下游去重（`DeliveryIntent`，S010/S011）。
- 人工放行、误判修正、平台删除与补偿（S014/S015）。
- 数据删除时的代次递增（S019/S020）。
- 真实 Kiro Crew 的启动、连接与固定版本实测（S029）。
- 配置接入 `ServerConfig`。调度参数经 `createTaskCoordinator` 的选项注入，不改配置模式（S029 接线时决定）。
- 注册表接线：本包不改 `modules/registry.ts`。

## 12. 自定

- 微批、截止时间余量、排队上限、退避与阈值全部为自定默认值，未测量。
- 主体引用沿用 S004 的做法：`channelId` + `sender.senderRef`，并标注为自定，待与 S019 的删除索引对齐。
- 技术日志的 stage：入队失败与超时用 ERROR，提交结果用 COMMIT。超时 status 为 TIMED_OUT，丢弃为 SKIPPED。
- 车道排队上限、并发上限的确切值由部署配置决定。

## 13. 未验证项

- 真实 Kiro Crew 的会话语义、资源信号来源与报告格式。
- 提案所列的 250 ms 与 2 ms 数值。
- 微批默认值在真实模型与消息量下的表现。
- 与 S019 删除索引、S008 适配器、S011 决定提交的实际对接。
