<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:7f0ac0774bc508523d09b5f1 revision=5 sha256=c70eb6b58bb7b36ba05ff81120a30f8fcbc97c791c38990567229cb8ac7ce1c2 -->

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


---

## 实施设计（自定，受管段之外）

本段由实施子代理在写代码之前写入。来源没有规定的选择标「自定」。受管段不改。

### 1. 范围

- SUB-035（VOXWARD-SUB-035，`work:de64f4522b4c54f1d76ede8f`，先做）：删除请求在一个短事务内确认记分例外、提升主体代次、登记删除项；偏好只保留最小标记；恢复计分只接受明确的请求。
- SUB-036（VOXWARD-SUB-036，`work:11fe17ddd33774eb6ef1ed6b`，后做）：按存储面逐个清理，部分失败可续作，两部分都完成才报告成功。
- 问题清单（`tasks.md` 末尾）本包处理：Q7、Q29、Q35、Q42、Q51。Q30 归 S020，不做。

### 2. 偏离表（拆单名 → 实际）

| 项 | 子单交付清单 | 实际 | 理由 |
| --- | --- | --- | --- |
| 模块目录 | `apps/server/src/modules/data-lifecycle/` | `apps/server/src/modules/data-lifecycle-service/` | 骨架 S001 已有该模块并被注册表绑定；主线程批次说明给出的映射（`data-lifecycle` → `data-lifecycle-service`） |
| 测试目录 | `apps/server/test/data-lifecycle/` | `apps/server/test/data-lifecycle-service/` | 同上，测试目录同理 |
| 模块目录（决策） | `decision/` | 不涉及 S019 | S019 不改决策模块的文件，只读引用其代次语义 |
| 偏好标记 | 「HMAC 偏好最小标记」 | 见第 8 节「来源缺口」：本包不实现 HMAC 派生，只保留主体行与例外行 | 仓库内没有 HMAC 密钥来源，`senderRefOf` 由平台适配器注入、无密钥配置；不新增密钥配置项 |

### 3. 依赖方向（check-deps 不改规则）

- `modules/data-lifecycle-service/**` 只导入 `@voxward/contracts` 与本模块文件。时间、随机 ID、缓存与 HMAC 都经端口或注入函数进入。
- 端口定义在 `packages/contracts/src/ports/data-request.ts`（扩展）与 `ports/audit-log.ts`（扩展）。
- `apps/server/src/db/**` 实现端口，只导入 contracts、db 与 drizzle。新文件 `db/subject-cleanup.ts` 属于 db 区。
- 组合根 `apps/server/src/app.ts` 与 `auth/data-routes.ts` 绑定端口与路由。两者的分区不变。
- 进程内缓存（昵称、身份、候选卡片）只通过模块自己的方法失效。组合根通过 `SubjectCacheHub` 端口调用它们。
- 不改 `scripts/check-deps.mjs`，因此不需要负面对照。

### 4. 数据

- 迁移 `0006`（drizzle-kit 生成，重建表方式同 `0004_data_request_kinds`）：
  - `data_requests.request_kind` CHECK 增加 `RESUME_SCORING`（自定：明确恢复计分请求作为一种请求，而非另建表）。
  - `data_request_items.target_kind` CHECK 增加 `SCORE_OUTCOME`、`CANDIDATE_CARD`、`CACHE`（Q51 与缓存面需要）。
  - 同步 `docs/data-dictionary.md` 中两张表的 CHECK 取值，`test/db/schema.test.ts` 核对字典。
- `score_exceptions` 与 `change_logs` 不改列。
- 主体级变更日志的关联标识沿用 S014 约定 `subject:<subjectId>`（`db/decision-store.ts` 名单写入已采用）。删除索引按此值定位（Q29）。

### 5. 接口

契约（`packages/contracts/src/ports/data-request.ts`）新增：

- `DELETION_TARGET_KINDS`：与 `db/schema/data-requests.ts` 同值，新增 `SCORE_OUTCOME`、`CANDIDATE_CARD`、`CACHE`。
- `DataRequestPort.startDeletion(start)`：一个短事务。依次：校验请求属于频道、是 VERIFIED 的 DELETE 且执行态为 PENDING；`DELETE_AND_EXCEPT` 时执行 `ScoreExceptionStore.ensureActive` 并在新建时写 `SCORE_EXCEPTION_CHANGED` 日志；`SubjectStore.bumpGeneration`；写入全部 `data_request_items`（PENDING）；请求执行态改为 RUNNING；写 `DATA_REQUEST_CHANGED` 日志。返回 `STARTED`（含新代次与是否新建例外）、`ALREADY_STARTED`（不做任何写入）、`NOT_ELIGIBLE`（含原因）或 `NOT_FOUND`。
- `DataRequestPort.markItem(input)`：把一个存储面标记为 DONE 或 FAILED（含错误码，不含内容）。
- `DataRequestPort.finishExecution(input)`：把请求置为 COMPLETED 或 PARTIAL_FAILED，并写 Change Log。
- `DataRequestPort.resumeException(input)`：只在 RESUME_SCORING 的已验证请求存在时，给主体的生效例外写 `removed_at` 与原因码 `RESUME_REQUESTED`，并写 Change Log。其他任何路径不移除例外。
- `SubjectCleanupPort`（新）：
  - `readCleanupFacts(channelId, subjectId)`：返回主体的 `platformSubjectKey` 与其事件、技术日志的 `correlationId` 列表（只读，用于候选卡片与缓存失效）。
  - `cleanSurface(input)`：对一个 DB 存储面执行一次幂等删除或重置，返回删除行数。调用方随后再 `markItem`。
- `AuditLogPort` 新增（`ports/audit-log.ts`）：
  - `removeSubjectEvidence(subjectId, kind)`：删除该主体日志的某一种证据行，返回行数。
  - `removeSubjectTechnicalRows(subjectId)`：删除该主体的技术日志行（证据已先清），返回行数。
  - `certifySubjectChangeLogs(subjectId, summary)`：把按技术日志关联或 `subject:<id>` 关联的 Change Log 行改成证书文本。
- `SubjectCacheHub`（新，组合根注入）：`names: readonly string[]`；`forgetSubject(name, channelId, platformSubjectKey, correlationIds): number`。`name` 之一是 `NICKNAME_VERDICT`、`IDENTITY_TRACKER`、`CANDIDATE_CARD`。

模块（`apps/server/src/modules/data-lifecycle-service/`）新增：

- `delete-with-exception.ts`：SUB-035 的编排。校验入参，计算存储面清单（来自 `cleanup-targets.ts`），调用 `startDeletion`。
- `preference-marker.ts`：偏好最小标记的形状。只有 `purpose`（固定为 `SCORING_EXCEPTION_PREFERENCE`）与主体键；不含旧分数、昵称或正文。
- `resume-scoring.ts`：恢复计分的入口。调用 `resumeException`，结果只有 `RESUMED`、`NO_ACTIVE_EXCEPTION` 或 `REQUEST_NOT_ELIGIBLE`。
- `cleanup-targets.ts`：固定顺序的存储面清单（见第 6 节）。
- `cleanup-executor.ts`：SUB-036 的执行器。按清单顺序执行；第一个失败的步骤之后停止，请求置 PARTIAL_FAILED；续作时从第一个非 DONE 的项开始；全部 DONE 且（若 `DELETE_AND_EXCEPT`）例外仍生效时才 COMPLETED。
- `requests.ts`、`routes.ts`、`validate.ts`、`types.ts`：接入 `RESUME_SCORING` 与 `execute` 路由。`DataDeps` 增加 `cleanup`、`caches`、`publishInvalidation`、`logs` 的新方法。

HTTP（`auth/data-routes.ts`，组合）：

- `POST /channels/:channelId/data/requests/:requestId/execute`：执行或续作（SUB-035 + SUB-036）。
- 既有的 `POST /channels/:channelId/data/requests` 接受 `kind: "RESUME_SCORING"`（`mode` 必须为空）。

### 6. 清理顺序（固定，`cleanup-targets.ts`）

依赖关系决定顺序：关联值来自事件与日志，必须先读取；外键要求先删子行。

1. `CHANGE_LOG`（主体）：证书化按技术日志关联或 `subject:<id>` 关联的 Change Log。必须最先执行，之后才删日志行。
2. `TECHNICAL_LOG_EVIDENCE` 四个种类（`MESSAGE_TEXT`、`TRANSLATION`、`VALIDATED_JSON`、`ITEM_ID_MAP`，其中 `ITEM_ID_MAP` 即「映射」）。
3. `TECHNICAL_LOG`（主体）：删除技术日志行。
4. `CANDIDATE_CARD`（经 `SubjectCacheHub`）：按事件与日志的关联值删除候选卡片（随来源删除，二选一的结论见第 7 节）。必须在 `CHANNEL_EVENT` 之前。
5. `SCORE_OUTCOME`（主体）：删除 `score_outcomes` 中按 `subject_id` 的行（Q51）。
6. `SCORE_LEDGER`（主体）：删除评分账本行。
7. `SUBJECT_IDENTITY`（主体）：删除身份事实行。
8. `NICKNAME_CHANGE`（主体）：删除昵称变更行（只含摘要）。
9. `SUBJECT_SCORE`（主体）：把分数行重置为 0（版本号加一，不删行）。原因：`commitInTransaction` 在读状态时要求分数行存在；删行会让后续消息抛错而不是被拒。
10. `DELIVERY`（主体）：删除该主体事件的投递行。
11. `VERDICT`（主体）：删除该主体事件的裁决行。
12. `TASK`（主体）：先删除挂在这些任务上的技术日志与证据，再删任务行。
13. `CHANNEL_EVENT`（主体）：删除事件引用行（事件表不含正文）。
14. `CACHE` 的 `NICKNAME_VERDICT`、`IDENTITY_TRACKER`（经 `SubjectCacheHub`）。

不删除：`subjects` 行（代次与平台键，外键锚点）、`score_exceptions` 行（例外的最小标记，`DELETE_AND_EXCEPT` 才有）、`list_entries`（名单，见第 8 节）、`data_requests` 与 `data_request_items`（删除本身的记录）。

### 7. 决定

- **代次与例外的先后**：在同一事务中先例外、后代次，然后登记项。之后任何旧任务的结果在 `commitVerdict` 与 `commitInTransaction` 中都会被拒（代次不符或例外生效）。
- **幂等**：`startDeletion` 对已 RUNNING、COMPLETED、PARTIAL_FAILED 的请求返回 `ALREADY_STARTED`，不再提升代次，也不再新建例外行。`ensureActive` 已有活动行时复用它。
- **续作**：每一步是幂等操作。先执行清理，再 `markItem`。两者不在同一事务中。崩溃后重跑未标记的步骤，删除结果不变（删到零行或重置为相同值）。
- **两部分完成**：`COMPLETED` 的条件是全部存储面 DONE，并且（`DELETE_AND_EXCEPT` 时）`subjects.readSubject` 显示例外仍生效。否则为 `PARTIAL_FAILED`，原因码 `EXCEPTION_NOT_CONFIRMED`。
- **候选卡片：随来源删除**（二选一结论）。卡片只在进程内保存，且与主体的事件或日志共享关联值。随来源删除能让卡片不再保留观众文本；去关联则保留卡片文本。选前者。
- **例外与新消息**：例外只阻止计分（`commitInTransaction` 与 `withExceptionGuard`）。消息的审核与任务创建不受影响。
- **恢复计分**：只接受 `RESUME_SCORING` 的已验证请求。名单同步、重连、普通房管改分都不移除例外。
- **证书**：删除后 Change Log 只留 `DATA_REQUEST_CERTIFICATE` 文本，不留正文与分数（沿用 S016 的 `CERTIFICATE_SUMMARY`）。
- **失效总线**：组合根只创建一条 `InvalidationBus`，同时交给查看器缓存与数据删除路径（Q35）。每个日志步骤在提交后发布一次 `DELETED` 事件（只含标识）。

### 8. 来源缺口与未满足项（需在报告中写明）

- **HMAC 偏好标记未满足**：来源要求偏好只保留 HMAC 最小标记。仓库内没有 HMAC 密钥来源或派生函数（`senderRefOf` 由平台适配器注入，代码中没有密钥配置）。本包不新增配置项，只保留 `subjects` 行的 `platform_subject_key` 与 `score_exceptions` 行。需要 Owner 决定密钥来源（配置项或保险箱）后再接线。
- **名单（`list_entries`）不删除（自定）**：名单属于频道的审核决定，删除它会解除黑名单。来源没有规定名单是否属于「删除数据」。本包不删除名单行，但按 Q29 把名单相关 Change Log 证书化。需要 Owner 确认。
- **本地 AI 会话未清理**：`adapters/kiro-cli` 的会话目录不按主体标识，删除路径无法定位。它们由 S008 的会话生命周期清理。第三方模型提供方的留存不由本包证明（提案 §12.4）。
- **昵称缓存、身份跟踪器、候选存储的实例未挂载**：这些对象由平台与审核模块的工厂创建，组合根当前没有实例。本包提供失效方法、`SubjectCacheHub` 注册点与测试。删除路径调用的是注册表中的对象；注册表为空时这些项直接 DONE（无对象需要清理），不伪造成已清理。接线在挂载对应模块时完成。
- **在途模型请求不取消**：`task-coordinator` 只导出 `TaskCoordinator` 的接口，没有按主体取消的入口。本包不改其内部实现。在途结果依靠代次校验被丢弃（来源要求「无法取消的晚到结果丢弃」）。
- **Q30 与到期清理不做**：归 S020。

### 9. 验收映射（子单 AC001 → 测试文件）

| 验收行 | 测试文件 | 证明什么 |
| --- | --- | --- |
| VW-SUB035-AC001（主） | `test/data-lifecycle-service/delete-with-exception/transaction.test.ts` | 启动事务中途失败（注入违反约束的日志行）时，例外、代次、登记项全部不落库；成功时三者同时存在；重复请求不重复提升代次与例外行；普通删除不新增也不撤销已有例外；例外生效时旧任务结果被代次拒绝（`commitVerdict` 返回 STALE_GENERATION）与新计分被拒（EXCEPTION_ACTIVE） |
| VW-SUB035-STORY、VW-SUB035-PARENT | 同上，加 `preference-marker.test.ts` | 偏好标记不含旧分数与昵称；`RESUME_SCORING` 是唯一移除例外的路径（名单同步、身份事件、人工改分后例外仍在） |
| VW-SUB036-AC001（主） | `test/data-lifecycle-service/cleanup/executor.test.ts` | 第 N 步注入失败后请求为 PARTIAL_FAILED 且 COMPLETED 不出现；续作从失败项开始并幂等；全部完成后只剩证书、标记与分数零行；另一主体的数据不变 |
| VW-SUB036-STORY、VW-SUB036-PARENT | 同上 | 每个存储面都有对应的 DONE 项；`score_outcomes`、候选卡片、缓存各有断言 |
| Q7 | `test/moderation-engine/nickname-cache/cache.test.ts`（新增用例） | `forgetSubject` 后同一主体的旧结果不再命中 |
| Q42 | `test/platform-source/youtube-identity/identity.test.ts`（新增用例） | `forget` 后同一主体的身份变化重新报告 |
| Q51 | `test/moderation-engine/candidates/store.test.ts`（新增用例）与 cleanup 测试 | `removeBySourceCorrelations` 删除来源卡片；`score_outcomes` 行被删 |
| Q29 | `test/data-lifecycle-service/cleanup/executor.test.ts` 与 `test/audit-store/deletion-index/subject-removal.test.ts`（新增） | 无技术日志关联的 `subject:` 变更日志被找到并证书化 |
| Q35 | `test/data-lifecycle-service/cleanup/executor.test.ts` | 删除路径发布的事件使查看器缓存的条目被丢弃（同一条总线） |
| 迁移与字典 | `test/db/schema.test.ts`、`test/db/migrate.test.ts`、`test/db/constraints.test.ts`（补充新 CHECK 值） | 新 CHECK 取值生效；字典与 schema 一致 |

### 10. 不做的事

- 不改 `task-coordinator/` 内部，不写引擎工单，不推送，不改主工作区与 `.kiro/steering`、skills。
- 不接线 S021 的传输层文件（`app.ts` 的输出适配器部分与 `auth/routes.ts`）。本包只改 `buildApp` 中与数据删除和查看器缓存相关的几行。
- 不做 Q30（SQLite 空闲页）与到期清理（S020）。
- 不创建 HMAC 密钥，不新增配置项。
- 不删除名单条目（见第 8 节）。
- 不发明来源没有的产品功能；不派子代理。


## SUB-036 实施记录（自定，受管段之外）

本段在 SUB-036 完成后写入，记录实际实现与第 1–10 节的差异。

### 11. 实际实现

- 清理顺序由 `cleaningRank`（`cleanup-targets.ts`）给出，与第 6 节一致。执行器按序号排序未完成项，不依赖存储的项顺序（项标识是随机值）。
- 删除索引（`db/audit-log.ts` 的 `locateScope`）覆盖三类数据：
  - 技术行：主体自有的行，以及挂在主体任务上的行（任务行的 `subject_id` 可能为空，见 Q29 与提案 §11.3「任务临时 ID」）；
  - 变更日志：主体事件与技术行的关联链，以及 `subject:<id>` 链（S014 约定）；
  - 读取（`locateSubjectLogs`）报告全部命中的行。写入（证书化、删除、移除证据）只报告尚未持有证书文本的变更行，因此重复删除不产生新事件。
- 执行器（`cleanup-executor.ts`）：逐个存储面执行，遇到第一个失败即停；失败项记录错误码（只存代码，不存错误文本）；续作从第一个非 DONE 项开始。`COMPLETED` 的条件是全部 DONE，且（`DELETE_AND_EXCEPT` 时）主体的例外仍然生效。否则为 `PARTIAL_FAILED`：未完成时原因为未清完，例外不生效时原因为 `EXCEPTION_NOT_CONFIRMED`。
- 任务面（`TASK`）执行前再扫一次主体的技术行，避免晚到的技术行阻塞任务删除（外键）。扫描是幂等的，并会发布它删除的行。
- **返工 1 补充（B8、B9、N10）**：
  - **B8（`readCleanupFacts` 关联标识并集）**：`db/subject-cleanup.ts` 的 `readCleanupFacts(channelId, subjectId)` 查询 `channel_events.correlation_id`（条件 `channel_id` 与 `subject_id` 匹配且非空），与 `locateSubjectLogs(subjectId).correlationIds` 取并集、去重并排序。这样即使 7 天保留期已清掉 `technical_logs` 或步骤 4 `CANDIDATE_CARD` 首次失败后从 `PARTIAL_FAILED` 续作，步骤 4 仍能拿到事件 `correlationId` 并清净 `CandidateStore` 卡片（`Q51`）。
  - **B9（父表面删除前的外键子表幂等预清扫）**：在 `cleanup-executor.ts` 执行外键父表面之前，按依赖顺序幂等预清扫子表面：`VERDICT` 前预清扫 `DELIVERY`；`TASK` 前预清扫 `removeSubjectTechnicalRows`、`DELIVERY`、`VERDICT`；`CHANNEL_EVENT` 前预清扫 `removeSubjectTechnicalRows`、`DELIVERY`、`VERDICT`、`TASK`。这确保例外观众在 `PARTIAL_FAILED` 期间发新不计分消息时，续作不会触发 `SQLITE_CONSTRAINT_FOREIGNKEY`。
  - **N10（`SCORE_EXCEPTION_CHANGED` 日志证书化说明）**：`DELETE_AND_EXCEPT` 在 `startDeletion` 事务内写入的 `SCORE_EXCEPTION_CHANGED` 变更日志（`targetRef = "subject:<id>"`）会在步骤 1 `CHANGE_LOG` 被一并替换为 `DATA_REQUEST_CERTIFICATE`（保留 `action = SCORE_EXCEPTION_CHANGED`），而 `DATA_REQUEST_CHANGED`（`targetRef = requestId`）保留其原摘要。这是预期行为，不泄露原值且保留审计动作痕迹。
- 进程内表面的错误码：表面不在注册表中时记为 `SURFACE_NOT_REGISTERED`，不记为完成（修正第 8 节「注册表为空时直接 DONE」的说法：注册表为空时，这些项不会生成，请求也不会因此被记为清理了这些表面）。
- 同一个执行入口 `POST /channels/:channelId/data/requests/:requestId/execute` 处理两类请求：`DELETE` 先启动（若未启动）再清理；`RESUME_SCORING` 调用恢复计分。这是对第 5 节「RESUME_SCORING 的 HTTP 绑定」的实现方式，未另设路由。
- 失效总线（Q35）：`buildApp` 只创建一条总线（传入的 `invalidation` 或新建的），查看器缓存与删除路径都使用它。删除路径通过 `DataDeps.publishInvalidation` 发布 `DELETED` 事件，只含标识。
- 进程内表面的注入点：`AppOptions.subjectCaches`（默认为空注册表）。组合根当前不传入任何实例。

### 12. 进程内表面的失效方法

| 问题 | 方法 | 位置 | 测试 |
| --- | --- | --- | --- |
| Q7 | `NicknameVerdictCache.forget(subject)` | `moderation-engine/nickname-cache/cache.ts` | `test/moderation-engine/nickname-cache/cache.test.ts` |
| Q42 | `IdentityTracker.forget(subjectKey)` | `platform-source/youtube/identity.ts` | `test/platform-source/youtube-identity/identity.test.ts` |
| Q51（候选卡片） | `CandidateStore.removeBySourceCorrelations(channelId, correlationIds)` | `moderation-engine/candidates/store.ts` | `test/moderation-engine/candidates/store.test.ts` |
| Q51（`score_outcomes`） | 存储面 `SCORE_OUTCOME`，按 `subject_id` 删除 | `db/subject-cleanup.ts` | `test/data-lifecycle-service/cleanup/executor.test.ts` |
| Q29 | `certifySubjectChangeLogs` 与扩展的 `locateScope` | `db/audit-log.ts` | `test/audit-store/deletion-index/subject-chain.test.ts`，以及执行器测试 |
| Q35 | 一条共用总线 | `app.ts` | `test/data-lifecycle-service/execute-routes.test.ts`（经 HTTP 发布到应用的总线） |

### 13. 偏离与自定选择

- 候选卡片随来源删除（第 7 节已定）。已确认的卡片所发布的规则词条不回滚；规则版本的历史不在本包范围内。
- 没有迁移：本包不改表结构，`0006` 保持不变。
- `TASK` 面执行前的技术行扫描（见第 11 节）是本包新增的顺序细节，不改变第 6 节的顺序。
- `AppOptions.subjectCaches` 是本包新增的组合根参数（第 7 节「组合根注入」的具体化）。

### 14. 仍未接线的部分（来源缺口，需在报告中说明）

- 生产组合根不持有昵称缓存、身份跟踪器、候选存储的实例，因此一次删除目前不会清理这三类进程内数据。它们只受 TTL（昵称缓存默认 1 小时）或进程重启限制。接线需要审核模块与平台模块把实例暴露给组合根，并在启动时传入 `subjectCaches`；本包只提供方法、注册点与测试。
- HMAC 偏好标记（第 8 节）仍未实现。
