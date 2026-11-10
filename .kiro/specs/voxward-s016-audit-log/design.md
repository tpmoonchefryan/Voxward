<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:4c1238d3c3d98f2cc2f7d756 revision=4 sha256=cd4c9fa17111b306e7b19316552166ff99015adae56fc4b3469371496f1ec61b -->

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


# S016 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-016（VW-S016-R001@1，revision 4）；VOXWARD-SUB-029（VW-SUB029-R001@1，工单 work:d2a9653d30297ce71924a1a2）；VOXWARD-SUB-030（VW-SUB030-R001@1，工单 work:627762790cd401f266c46100）；提案 §2.1、§10、§11.3、§12.1–§12.4；S002 设计第 6–8 节（已有日志表）；S003 `auth/permissions.ts` 能力表；S005 的 `ScoringLedgerPort` 接入方式。标「自定」的是来源没有规定的实施选择。

## 1. 布局

| 区域 | 文件 | 说明 |
| --- | --- | --- |
| 契约 `packages/contracts` | `src/ports/audit-log.ts`（新） | 日志枚举、大小与保留常量、记录类型、`AuditLogPort` |
| 契约 | `src/modules/audit-store.ts`（改） | `AuditEntry` 改为两类条目的判别联合；`findByCorrelationId` 返回的证据 payload 不可读时为 null |
| 契约 | `src/index.ts`（改） | 导出新端口 |
| 数据库 `apps/server/src/db` | `schema/logs.ts`（改）；`migrations/0002_audit_log_fields.sql`（新，序号 0002）；`migrations/meta/0002_snapshot.json` 与 `_journal.json`（drizzle-kit 生成）；`audit-log.ts`（新，`AuditLogPort` 的数据库实现） | 日志表字段与短事务写入 |
| 模块 `apps/server/src/modules/audit-store` | `index.ts`（改）；`change-log.ts`、`technical-log.ts`、`correlation.ts`、`content-policy.ts`、`deletion-index.ts`、`invalidation.ts`、`errors.ts`（新） | 写入校验、关联 ID、字段权限与长度、删除索引、失效通知 |
| 文档 | `docs/data-dictionary.md`（改：`change_logs`、`technical_logs`、`technical_log_evidence` 三节） | `schema.test.ts` 要求逐列、逐约束与字典一致 |
| 测试 | `apps/server/test/audit-store/write/`、`apps/server/test/audit-store/deletion-index/`、`apps/server/test/db/audit-log.test.ts`（新）；`test/db/constraints.test.ts` 补充 | 只用合成数据，数据库文件放 `$KIROCREW_SCRATCH` |

## 2. 依赖方向（scripts/check-deps.mjs 规则不变）

| 层 | 可以引用 | 不可以引用 |
| --- | --- | --- |
| `modules/audit-store/**` | `@voxward/contracts`、本模块文件 | `db/**`、`security/**`、`auth/**`、`config/**`、`adapters/**`，以及 Node 内置模块（例如 `node:crypto`） |
| `db/audit-log.ts`（db 区） | contracts、db 内文件、`drizzle-orm`、`better-sqlite3`、Node 内置模块 | modules、security、auth |
| `ports/audit-log.ts` | 仅类型与常量 | 其它任何模块 |
| 组合层 `registry.ts`、`app.ts`、`main.ts` | 全部 | 本包不改组合层 |

- 模块不能导入 `redactText`。`createAuditStore` 通过参数 `sanitize` 注入脱敏函数；组合层应传入 `security/redaction.ts` 的 `redactText`（自定。接线属于后续 Story）。
- 模块不能导入 `node:crypto`。标识符生成函数 `newId` 由调用方注入（自定）。
- 没有修改分区规则，因此不需要临时违规文件的负面对照。

## 3. 数据

### 3.1 枚举

- `ACTOR_KINDS`、`CHANGE_KINDS`、`CHANGE_OUTCOMES`、`TECHNICAL_STAGES`、`TECHNICAL_STATUSES`、`EVIDENCE_KINDS` 从 `db/schema/logs.ts` 移到 contracts，取值不变。数据库侧改为从 contracts 导入，因此两侧 CHECK 来自同一份常量。
- `TECHNICAL_LEVELS` = `INFO`、`WARN`、`ERROR`（自定：§12.2 只要求有 `level` 字段，没有给取值）。

### 3.2 迁移 0002：补齐 §12.2 字段

| 表 | 新增列 | 约束与索引 | 依据 |
| --- | --- | --- | --- |
| `technical_logs` | `level` TEXT NOT NULL DEFAULT `'INFO'` | CHECK `ck_technical_logs_level` | §12.2 `level` |
| `technical_logs` | `task_id` TEXT NULL，外键 `tasks.id` | 索引 `technical_logs_task_idx` | §12.2 `taskId`；SUB-029 要求 task |
| `technical_logs` | `attempt` INTEGER NULL | CHECK `ck_technical_logs_attempt`（NULL 或不小于 1） | §12.2 `attempt`；SUB-029 要求 attempt |
| `technical_logs` | `data_json` TEXT NULL | CHECK `ck_technical_logs_data`（合法 JSON，且字节数不超过 2000） | §12.2 `data`（有大小限制的阶段数据）；2000 字节为自定 |

- 不新增 `roomId`。`channels` 表的一行即一个直播间（S002 设计），`channel_id` 已限定范围。自定。
- 迁移写法（自定）：只用 `ALTER TABLE … ADD COLUMN` 和 `CREATE INDEX`，不重建 `technical_logs`。原因：`technical_log_evidence` 外键引用 `technical_logs`，外键开启时删除父表会级联删除证据行。
- 快照与 journal 由 `drizzle-kit generate --name audit_log_fields` 生成。生成的 SQL 按上述写法替换。核对方法：生成后再跑一次 `drizzle-kit generate`，应显示没有 schema 变更。
- `technical_log_evidence` 与 `change_logs` 的表结构不变。

### 3.3 长度上限与保留期限

| 证据种类 | 最大字节数（模块校验，自定） |
| --- | --- |
| `MESSAGE_TEXT` | 2048 |
| `TRANSLATION` | 2048 |
| `ITEM_ID_MAP` | 4096 |
| `VALIDATED_JSON` | 8192，且必须能被 `JSON.parse` 解析 |

- 数据库不加证据大小 CHECK，理由见 3.2。模块在写入前拒绝超限内容，不截断（截断会改写内容，自定）。
- Change Log 的 `summary` 上限 500 个码点，沿用 S002 的 CHECK（来源：§12.1 与 S002 字典）。
- 保留期限（提案 §12.3 初始建议）：证据 7 天；`technical_logs` 与 `change_logs` 30 天。`expires_at` 由模块按注入的 `clock` 计算，调用方不能指定。

## 4. 接口

### 4.1 契约端口 `AuditLogPort`（`packages/contracts/src/ports/audit-log.ts`）

- `insertChangeLog(row)`：一次短事务写入一行。
- `insertTechnicalLog(row, evidence)`：一次短事务内，为同一 (`channel_id`, `correlation_id`) 分配下一个 `sequence`（从 0 起，连续），写入日志行与证据行，返回 `sequence`。若 `subject_id` 所属频道与 `channel_id` 不一致，抛出错误（自定）。
- `readChain(correlationId, channelIds)`：只读，按 `sequence` 升序，限定频道。
- `readChangeLogs(correlationId, channelIds)`：只读，限定频道。
- `locateSubjectLogs(subjectId)`：只读，返回该主体的技术日志行、证据数量、关联 ID，以及按关联 ID 找到的变更行。
- `removeSubjectLogs(subjectId, certificateSummary)`：一次短事务。删除该主体的技术日志行，证据行随外键级联删除（同时显式删除）；把关联变更行的 `summary` 改为 `certificateSummary`；返回删除清单。

### 4.2 模块 `createAuditStore(options?)`（`modules/audit-store/index.ts`）

- 不传参数：与 S001 占位行为相同，所有方法以 `MODULE_NOT_IMPLEMENTED` 拒绝。注册表行为不变。
- 参数：`port: AuditLogPort`；`sanitize: (text: string) => string`；`access: { channelsFor(actorRef): readonly string[]; capabilitiesFor(actorRef, channelId): ReadonlySet<string> }`；`newId: () => string`（必填）；`clock?: () => Date`；`invalidation?: InvalidationBus`。
- `recordChange(entry) → changeId`：校验后写 Change Log。
- `recordTechnical(entry) → { logId, sequence }`：校验后写 Technical Log 与证据。
- `append(entry) → Promise<void>`：按 `kind` 分派，满足 `AuditStore` 契约。
- `findByCorrelationId(correlationId, actorRef) → Promise<AuditEntry[]>`：先校验关联 ID 格式；`channelsFor` 为空则返回空数组；读取技术日志链和变更行；证据 payload 只在 `capabilitiesFor` 包含该证据所需能力时返回，否则 payload 为 null。
- `locateSubject(subjectId)`：删除索引的只读查询。
- `removeSubject(subjectId) → 删除清单`：执行删除，提交后发布失效事件。

### 4.3 输入校验（模块内；失败抛出 `AuditInputError`，不调用端口）

- 关联 ID：`^[A-Za-z0-9._:-]{1,128}$`。`newCorrelationId(newId)` 生成 `corr-<newId()>`（自定）。
- 时间：`Date.parse` 可解析的 ISO 字符串。
- Change Log：`changeKind`、`actor.kind`、`outcome` 取自枚举；`actor.ref` 非空且不超过 128 字符；`summary` 先经 `sanitize`，再按码点计数，必须为 1 到 500。Change Log 的输入类型没有正文字段（结构保证）。
- Technical Log：`stage`、`status`、`level` 取自枚举；`attempt` 为 null 或不小于 1 的整数；`latencyMs` 为 null 或不小于 0 的整数；`errorCode` 为 null 或匹配 `^[A-Z][A-Z0-9_]{0,63}$`；`providerRef`、`modelRef`、`ruleTemplateVersion` 为 null 或不超过 128 字符，且先经 `sanitize`；`data` 为 null，或是键名匹配 `^[a-zA-Z][A-Za-z0-9_]{0,63}$`、最多 8 个键的对象，值只能是字符串（不超过 200 字符，先经 `sanitize`）、有限数字、布尔或 null，JSON 字节数不超过 2000。
- 证据：每条日志每种证据最多一条；种类只能是四种，没有第三类 AI 日志、完整会话或提示词种类；有证据则必须带 `subjectRef`，删除索引靠它定位；payload 先经 `sanitize`，再按 3.3 的上限校验；`VALIDATED_JSON` 必须能被 `JSON.parse` 解析。
- 写入的 `expiresAt` 由模块计算。

## 5. 字段权限（SUB-030）

- 查看关联链需要 `logs.view`：`channelsFor` 只返回获准查看的频道。组合层依据 S003 的 `membershipAllows` 计算该结果。
- 证据正文需要的能力（自定。提案 §12.2 写“必要消息证据按内容权限访问”，本包按 S003 能力表映射）：
  - `MESSAGE_TEXT`、`TRANSLATION` → `message.original`
  - `ITEM_ID_MAP`、`VALIDATED_JSON` → `subject.evidence`
- 不可读的证据保留行，payload 为 null；元数据照常返回。没有 `logs.view` 的频道，整条链不返回。

## 6. 删除索引与失效（SUB-030）

- 索引路径：`subject_id` → `technical_logs` 行 → `technical_log_evidence` 行；关联 ID → `change_logs` 行。
- `removeSubject` 在一次短事务内完成：删除该主体的技术日志行和证据行，不影响同一批次中其他主体的行；把关联变更行的 `summary` 替换为证书文本 `DATA_REQUEST_CERTIFICATE`（自定。§11.3 要求删除后只保留不含正文和历史分数的最小处理凭证）。
- 不在本包范围：昵称变更（`subject_nickname_changes`）、任务、计分账本、名单与记分例外的删除。§11.3 的这些部分由 DataLifecycleService 的对应 Story 承接。本包的索引只定位日志部分。
- 失效事件（`invalidation.ts`；拆单为衔接 STORY-017 与 STORY-020 提出的实施安排，不是新增来源需求，自定）：进程内订阅。删除提交后发布 `{ reason: "DELETED", logIds, correlationIds, changeLogIds }`。`EXPIRED` 原因已定义，但本包不做到期扫描，由 STORY-020 实现。监听器抛错不影响已提交的删除结果。

## 7. 测试与验收行对应

| 验收行 | 测试文件 | 证明什么 |
| --- | --- | --- |
| VW-SUB029-AC001（主验收行） | `test/audit-store/write/chain.test.ts` | 同一消息的规则、推理、重试（attempt 为 2）、人工、计分、投递写入同一 correlationId，sequence 为 0 到 n-1 连续；原文不出现在 `change_logs`；微批（两个主体、同一 batchId）中每条消息的证据只属于它自己；采纳行（`SCORE_CHANGED`）与建议行（`VALIDATED_JSON`）分开；证据种类只有四种 |
| VW-SUB029-STORY | 同上 | 同上（Story 行，本包承担的部分） |
| VW-SUB030-AC001（主验收行） | `test/audit-store/deletion-index/subject-removal.test.ts`、`field-permission.test.ts` | 微批含两个主体，删除其中一个后，该主体的日志行与证据全部消失，另一主体不变，关联变更行改为证书；无 `message.original` 的人读取条目时，`MESSAGE_TEXT` payload 为 null，其余元数据仍在；无 `logs.view` 时整条链为空 |
| VW-SUB030-STORY | 同上 | 同上（Story 行） |
| 长度上限 | `test/audit-store/write/limits.test.ts` | 超限证据、超限 summary、超限 data 被拒绝，端口未被调用 |
| 脱敏 | `test/audit-store/write/redaction.test.ts` | 含凭据形状文本经注入的 `sanitize` 后写入，数据库中不含原文 |
| 数据库端口 | `test/db/audit-log.test.ts` | sequence 分配与连续性、外键、频道限定、删除级联、证书改写、主体与频道不一致时拒绝 |
| 迁移与字典 | `test/db/schema.test.ts`（既有）、`test/db/constraints.test.ts`（补充） | 逐列、逐约束与字典一致；新 CHECK 生效 |

- `VW-S016-PARENT`、`VW-S016-INHERIT-*`、`VW-SUB0nn-INHERIT-*`：只记录本包实际触及的部分（日志落库、关联、字段权限、删除索引）。运行时完整验证和 INIT 的 `VW-AC-*` 不在本包证明范围内。

## 8. 不做的事

- 不接线：不改 `registry.ts`，`createAuditStore()` 仍是未接线占位；不改 `app.ts`、`main.ts`，启动流程不变。
- 不做查看器分页。§12.2 的分页加载属于 STORY-017。
- 不做到期清理（STORY-020）、备份恢复和数据请求编排。
- 不改 `CONTRACT_VERSION`（自定：`AuditStore` 之前没有实现和消费者，本包是首次实现，形状变化记入报告）。
- 不做 PostgreSQL、多写者或网络文件系统。
- 不写引擎工单，不推送。
- 不保存完整会话、提示词、工具轨迹、模型思维链、密钥，或未经校验的模型输出。
- 不放宽 `check-deps` 规则。

## 9. 与子单交付清单的偏离（自定；需主线程同步到引擎，本包不写引擎）

- 模块目录：子单写 `apps/server/src/modules/audit/`，本包改为 `modules/audit-store/`。理由：S001 骨架已有 `modules/audit-store` 并被注册表绑定为 `AuditStore`；另建 `audit/` 会留下两个模块对应同一契约。测试目录同理为 `test/audit-store/`。
- 子单 deliverables 中的 `change-log.ts`、`technical-log.ts`、`correlation.ts`、`index.ts`、`content-policy.ts`、`deletion-index.ts`、`invalidation.ts` 保留文件名。
- 新增文件：`modules/audit-store/errors.ts`；`packages/contracts/src/ports/audit-log.ts`；`apps/server/src/db/audit-log.ts`；迁移 `0002_audit_log_fields.sql` 及其快照。
- 迁移序号 0002。本批其它包可能也在加迁移，合并时统一调整。
- 改动的既有文件：`packages/contracts/src/modules/audit-store.ts`、`packages/contracts/src/index.ts`、`apps/server/src/db/schema/logs.ts`、`docs/data-dictionary.md`、`apps/server/test/db/constraints.test.ts`。

## 10. 来源缺口

- VOXWARD-STORY-016 的 allocations 尚未写入。子单正文已说明：转 ready 前需补齐，且需 Owner 以 changeDecision 决定。本包不写引擎。
- 提案没有给出证据长度上限、`data` 大小、各证据对应的权限能力，也没有给出保留期限的执行方式（只有初始建议）。以上标「自定」。
- 提案 §12.2 的分页加载、§12.4 的备份与 WAL 清理，来源没有给出实施方式。本包不做。
- 失效通知接口的形状来源中没有定义（自定）。
- 问题清单（`tasks.md` 末尾）逐条核对后，没有点名归 S016 的条目。简报中“下面点名的条目”一节为空。
