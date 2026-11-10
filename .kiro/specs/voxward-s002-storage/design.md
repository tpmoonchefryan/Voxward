<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:40166e96c2ab9f8c9746a73a revision=4 sha256=e498f3f8608b9a41024d54686a3c68cc953dfe51e0fc1bd8192d29b68d369f24 -->

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


# S002 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-002 rev 4（VW-S002-R001@1）；VOXWARD-SUB-004、VOXWARD-SUB-005（rev 1，planned）；提案 §2.1、§4.2、§5、§7.2、§8.4、§10、§11、§12、§16；本批派工的 Q1、Q2。
标「自定」的是来源没有规定的实施选择。

## 1. 技术选型

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 数据库 | SQLite，WAL 模式 | 提案 §10 |
| 驱动 | `better-sqlite3`，同步 API | 同步事务对应「短事务，事务内不等待」。本机 Node v24.16.0 下原生模块已验证可打开数据库（SQLite 3.53.4），不需要回退 |
| ORM 与迁移器 | `drizzle-orm`，`drizzle-orm/better-sqlite3` 与 `drizzle-orm/better-sqlite3/migrator` | 提案 §10；子单要求 |
| 迁移生成 | `drizzle-kit`（devDependency，脚本 `db:generate`） | 生成可提交的 SQL 与 journal |

版本以 `pnpm-lock.yaml` 为准。探测时的版本：drizzle-orm 0.45.4、better-sqlite3 13.0.3、drizzle-kit 0.31.11。`node:sqlite` 未采用（自定）：better-sqlite3 与 Drizzle 迁移器的组合已满足需要。

## 2. 依赖方向（Q1，补充 S001 design.md 第 2 节）

| 层 | 可以引用 | 不可以引用 |
| --- | --- | --- |
| `apps/server/src/db/**`（分区 `db`） | `packages/contracts`、`db` 内文件、Node 内置模块、白名单包 `drizzle-orm`、`better-sqlite3` | `fastify`、`zod`、`modules/*`、`adapters/*`、`app.ts`、`main.ts`、`config/*`、白名单外的包 |
| `apps/server/src/modules/*` | contracts、本模块文件 | `db/**`，任何数据库包（含 drizzle） |
| `apps/server/src/adapters/*` | contracts | `db/**`、`modules/*` |
| 组合层：`app.ts`、`main.ts`、`modules/registry.ts`、`config/*` | 以上全部，含 `db/**` | — |

- 批次建议是「模块不直接导入 drizzle，只通过仓储接口」。自定：本包更严，模块也不导入 `db/**`。仓储端口类型暂留在 db 层。需要被模块使用时，由对应接线 Story 上提到 `packages/contracts`，并经注册表注入。
- `drizzle-kit` 只出现在 `apps/server/drizzle.config.ts`，该文件不在扫描范围内。

## 3. 配置与数据库路径

- `config/schema.ts` 新增键 `databaseFile`，默认 `data/voxward.sqlite3`，相对进程工作目录（自定）。环境变量为 `VOXWARD_DATABASE_FILE`。
- 默认值只供开发。部署必须指向本机持久卷，不放在网络文件系统上（提案 §10）。
- 启动流程暂不打开数据库，接线由后续 Story 完成。本包提供 `openDatabase({ filePath })`。

## 4. 连接与事务（SUB-005 的 client.ts、transaction.ts）

- 连接参数：`journal_mode=WAL`。返回值不是 `wal` 时抛错，不降级。`synchronous=FULL`（自定：耐久性优先，性能未测）。`foreign_keys=ON`。`busy_timeout=5000` ms（自定）。
- 写事务统一经 `runShortTransaction(db, work)`，使用 `BEGIN IMMEDIATE`，写锁在事务开始时取得。
- `work` 必须同步。若返回 Promise，事务回滚并抛出受控错误（自定：事务内不允许等待网络或模型，提案 §10）。
- 读取不包事务。
- 「单一后端实例」是部署约束（提案 §10）。SQLite 的锁只防止误用时损坏数据，不构成多写者方案。

## 5. 迁移

- 初始迁移由 `drizzle-kit generate --name initial` 生成，输出到 `apps/server/src/db/migrations/`。
- `runMigrations(db, { migrationsFolder })` 调用 Drizzle 迁移器。已应用的迁移按哈希记录，重跑不产生变化。
- 只向前迁移（自定）。回滚依赖备份恢复（提案 §12.4）。
- 后续 Story 只追加迁移。并行包合并时，迁移序号和 journal 由集成方统一（SUB-004 来源缺口）。

## 6. 表与数据组（SUB-004）

共 24 张表，按提案 §10 与 §11–§12 的数据组划分：

| 数据组 | 表 |
| --- | --- |
| 频道与权限 | `channels`、`deployment_settings`、`channel_members`、`credential_refs`、`output_grants` |
| 主体与评分 | `subjects`、`subject_identities`、`subject_scores`、`score_ledger`、`subject_nickname_checks`、`subject_nickname_changes` |
| 规则与名单 | `rule_versions`、`rule_terms`、`list_entries`、`score_exceptions` |
| 消息与任务状态 | `channel_events`、`tasks`、`verdicts`、`deliveries` |
| 数据请求 | `data_requests`、`data_request_items` |
| Change Log | `change_logs` |
| Technical Log | `technical_logs`、`technical_log_evidence` |

每张表的列、类型、约束、保留期限和内容分类，记录在 `docs/data-dictionary.md`。

## 7. 数据形状约束（DDL 与类型）

- 正文只出现在 `technical_log_evidence.payload` 中。`channel_events` 只保存引用、版本、截止时间和状态（提案 §10「不复制完整正文」）。
- 凭据只存引用。`credential_refs.secret_ref` 的 CHECK 要求 `secretref:` 前缀（自定格式）。测试检查所有表，不存在 token、secret、password、api_key 类的明文列；`secret_ref` 是唯一例外。
- 枚举值来自 contracts：`TASK_STATUSES`、`INTERNAL_CLASSIFICATIONS`、`DOWNSTREAM_VERDICTS`，DDL 中以 CHECK 固定。
- 裁决一致：`classification = 'BLOCK'` 当且仅当 `downstream = 'BLOCK'`（CHECK）。映射使用 contracts 的 `toDownstreamVerdict`。
- 唯一约束：频道内平台消息去重；`score_ledger.idempotency_key` 计分幂等；每个事件至多一条当前裁决（部分唯一索引）；每个频道与主体至多一条活动例外（部分唯一索引）；`tasks` 按 `(event_id, kind, event_version)` 唯一。
- 时间为 ISO 8601 UTC 文本，分值为整数。ID 由服务端生成（UUID 文本）。关联 ID 不含平台用户标识（提案 §12.2）。

## 8. 仓储接口（SUB-005 的 repository.ts）

每个写操作在一个短事务内完成，返回受控结果，不抛出业务判断。

| 接口 | 语义 | 结果 |
| --- | --- | --- |
| `ChannelEventStore.recordIfNew` | 同一频道的同一平台消息只记录一次 | `created` 或 `duplicate` |
| `TaskStore.commitVerdict` | 任务未结束（非 `DONE`、`DISCARDED`），事件版本与代次一致，事件尚无当前裁决。满足时写入裁决并把任务置为 `DONE` | `committed`，或 `rejected` 并带原因 `TASK_NOT_FOUND`、`TASK_NOT_OPEN`、`STALE_EVENT_VERSION`、`STALE_GENERATION`、`ALREADY_FINAL` |
| `ScoreLedgerStore.appendIfNew` | 按幂等键追加计分账本 | `created` 或 `duplicate` |
| `SubjectStore.compareAndSetScore` | 按 `version` 做乐观并发更新 | `updated` 或 `conflict` |
| `SubjectStore.bumpGeneration` | 删除或重算前提高主体的处理代次 | 新代次 |
| `ScoreExceptionStore.ensureActive` | 每个频道与主体最多一条活动例外 | `created` 或 `existing` |

计分公式、冷却和钳制属于 ScoringEngine 模块（提案 §9.3），不在 db 层实现（自定）。db 层只提供上述原子操作。

## 9. 测试与验收映射

| 测试 | 证明什么 | 对应验收 |
| --- | --- | --- |
| `apps/server/test/db/schema.test.ts` | 24 张表的列与索引与数据字典一致；无明文凭据列；正文只在 `technical_log_evidence`；CHECK 与 UNIQUE 生效 | VW-SUB004-AC001 |
| `apps/server/test/db/migrate.test.ts` | 空库迁移成功；重跑为空操作；重跑后已写入的数据保留 | VW-SUB005-AC001（迁移演练） |
| `apps/server/test/db/transaction.test.ts` | WAL 生效；异常时回滚；异步 `work` 被拒绝且回滚；写锁被占用时第二个写者受控失败 | VW-SUB005-AC001（事务回滚） |
| `apps/server/test/db/repositories.test.ts` | 去重；裁决提交守卫；计分幂等；乐观并发；活动例外唯一 | VW-S002-AC001（唯一约束与事务） |
| `apps/server/test/db/concurrency.test.ts` | 四个子进程并发写入，无重复且计数正确；子进程在写入后、提交前被 SIGKILL，重开后无半条记录；已提交数据保留 | VW-S002-AC001（并发写入、提交中断、重启） |
| `apps/server/test/app/startup-errors.test.ts` | 主机无法解析、端口被占用时输出一行受控错误，退出码非 0 | Q2 |
| `pnpm check:deps` 与 4 个临时违规文件 | 依赖方向规则生效，违规时报错 | Q1；VW-SUB005-AC001 的依赖审查 |

「业务服务重启」在本包以关闭并重开连接模拟。真实进程重启要等接线 Story 完成后才能验证，报告中列为未验证项。

## 10. 不做的事

- 不把数据库接入 `main.ts` 或 `app.ts`。
- 不实现计分公式、冷却和裁决逻辑，这些属于模块。
- 不实现保留期限的清理作业和删除编排（DataLifecycleService，后续 Story）。
- 不实现 PostgreSQL、多实例或网络文件系统。
- 不推送、不发布、不写引擎工单。
- 不对吞吐和延迟作承诺。

## 11. 与子单交付清单的偏离

- 本包还改动了以下文件，它们不在 SUB-004、SUB-005 的 deliverables 中：`apps/server/src/config/schema.ts`、`apps/server/src/config/load.ts`、`apps/server/test/config/load.test.ts`、`apps/server/src/main.ts`、`apps/server/test/app/startup-errors.test.ts`、`scripts/check-deps.mjs`、`apps/server/package.json`、`apps/server/tsconfig.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`.gitignore`。
- 原因：`databaseFile` 键来自 SUB-005 的依赖「数据库路径经配置加载提供」；Q1、Q2 是批次指定项；其余是依赖与忽略规则的必要改动。
- 引擎工单的 deliverables 不由本包回写。

## 12. 来源缺口

- SUB-004、SUB-005 的 `VW-SUB00n-STORY` 验收行要等 Story 把 `VW-S002-R001@1` 分配给子单后才生效。本包不写引擎。
- 提案没有规定数据库默认路径、`synchronous` 级别、`secret_ref` 格式、各类枚举取值，以及保留期限的执行方式（只有初始建议）。以上均标为「自定」。
- 提案 §5 的计分参数（上下限、冷却时长）没有给出数值。本包不实现计分计算。
