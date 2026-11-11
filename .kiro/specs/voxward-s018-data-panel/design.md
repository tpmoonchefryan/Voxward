<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:2d989e13eeb4a9b2a8bde05d revision=4 sha256=74bf9dac8dd3b47ab3d59e4f10135492246e58212b861d32ffee8f9950b7775b -->

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

# S018 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-018 rev 4（VW-S018-R001@1）；VOXWARD-SUB-033（work:79ef6b7182c577ea2316ebc0）、VOXWARD-SUB-034（work:7b4dc2c9b2b4264108db88b2）；提案 §11.1–§11.4（第 407–462 行）、§2.1、§12.1；S002（`data_requests`、`data_request_items`、`subjects`）；S003 设计 §4.1（角色能力矩阵，`data.handle`）与不可信文本组件；S016（Change Log 的 `DATA_REQUEST_CHANGED`、`locateSubjectLogs`、`RETENTION_DAYS`）。
标「自定」的是来源没有规定的实施选择。

## 1. 范围

本包做：

- 登记四类请求：访问、更正、删除（两种模式）、停止计分。登记写入 `data_requests`，并在同一事务写一条 Change Log。
- 记录核验结果：通过或拒绝，须附核验方式。
- 按频道内稳定主体引用定位主体，展示评分、身份、名单与例外、保留类别与到期、请求状态。
- 两种删除按钮只登记请求，并显示该请求的状态。
- 受控材料生成函数。它只供服务端管理工具调用，不挂 HTTP 路由。

本包不做：

- 删除执行、名单与例外标记的建立、处理代次失效、清理。这些归 VOXWARD-STORY-019。
- 按昵称搜索主体。
- 登录页。S003 只提供会话接口。
- 平台侧任何操作。
- 访问、更正、停止计分的执行。本包只登记，执行状态停在「待处理」。

## 2. 布局

| 路径 | 归属 | 内容 |
| --- | --- | --- |
| `packages/contracts/src/ports/data-request.ts` | 契约（新） | 请求、核验、执行状态枚举；`DataRequestPort`、`SubjectReadPort`、`SubjectFacts` |
| `packages/contracts/src/index.ts` | 契约 | 导出上一文件（自定：加一行导出） |
| `apps/server/src/db/schema/data-requests.ts` | 数据库 | 表定义改为新形状（见第 4.1 节） |
| `apps/server/src/db/migrations/0004_data_request_kinds.sql` 与 `meta/0004_snapshot.json`、`_journal.json` | 数据库（新） | 表重建迁移，由 `drizzle-kit generate --custom` 生成骨架后填入 SQL（自定） |
| `apps/server/src/db/data-request-store.ts` | 数据库（新） | `DataRequestPort` 的实现，每次写入一个短事务 |
| `apps/server/src/db/subject-read.ts` | 数据库（新） | `SubjectReadPort` 的实现，只读 |
| `apps/server/src/modules/data-lifecycle-service/types.ts` | 模块（新） | `DataActor`、`DataDeps`、`RouteResponse` |
| `.../validate.ts` | 模块（新） | 请求体校验（手写，模块不能引用 zod） |
| `.../change-row.ts` | 模块（新） | 构造 Change Log 行：固定摘要模板，不含用户文本 |
| `.../requests.ts` | 模块（新） | 登记、核验、状态视图 |
| `.../subject-lookup.ts` | 模块（新） | 主体面板视图与保留类别 |
| `.../export-material.ts` | 模块（新） | 受控材料生成 |
| `.../routes.ts` | 模块（新） | 框架无关的处理器，返回 `{ status, body }` |
| `.../index.ts` | 模块 | 保留占位 `createDataLifecycleService`，并导出上述入口 |
| `apps/server/src/auth/data-routes.ts` | 鉴权（新） | Fastify 插件：会话与 CSRF、成员能力解析、把处理结果写成 HTTP 响应 |
| `apps/server/src/app.ts` | 组合层 | 构造 `DataDeps` 并注册上述插件 |
| `apps/web/src/pages/data/route.tsx` | 前端（新） | 路由 `/data/:channelId`，由现有 `pages/*/route.tsx` 约定自动注册 |
| `apps/web/src/pages/data/DataPanel.tsx`、`RequestStatus.tsx`、`DeleteActions.tsx` | 前端（新） | 页面与视图 |
| `apps/web/src/pages/data/api.ts` | 前端（新） | 调用 HTTP 接口，带 CSRF 头 |
| `apps/web/src/pages/data/flow.ts` | 前端（新） | 删除确认流程的纯函数状态机，供测试 |
| `apps/web/src/pages/data/__tests__/` | 前端（新） | 页面与流程测试（与子单交付清单一致） |
| `apps/server/test/data-lifecycle-service/` | 服务端测试（新） | 模块、路由、权限、迁移测试（子单清单写的是 `test/data-lifecycle/`，本包改为与模块目录同名） |
| `docs/data-dictionary.md` | 文档 | 同步 `data_requests` 的列与约束 |

## 3. 依赖方向

不修改 `scripts/check-deps.mjs` 的分区规则（自定）。新增文件都落在已有分区内：

| 分区 | 可以引用 | 本包的用法 |
| --- | --- | --- |
| `modules/data-lifecycle-service/**` | contracts、本模块文件 | 只用注入的端口与 `Date`。不引入 zod、fastify、drizzle、db、auth、audit-store |
| `db/data-request-store.ts`、`db/subject-read.ts` | contracts、db | 实现端口。短事务与 `runShortTransaction` 一致 |
| `auth/data-routes.ts` | contracts、auth、db、外部包 fastify | 不引用 modules。处理器类型按结构匹配 |
| `app.ts` | 全部 | 组装 `DataDeps`（含 `RETENTION_DAYS` 与随机 ID） |
| `apps/web/src/pages/data/**` | web、contracts、外部包 | 不引用服务端代码 |

## 4. 数据

### 4.1 `data_requests` 表重建（迁移 0004）

S002 的表只建模了删除模式，而提案 §11.2 列了四类请求。登记访问、更正、停止计分需要存储类别（自定）。变更如下：

- 新列 `request_kind`：`ACCESS`、`CORRECTION`、`DELETE`、`STOP_SCORING`。
- 新列 `verification_method`：`ACCOUNT_OWNERSHIP`、`REQUEST_AUTHORIZATION`。核验通过时必填。
- `mode` 改为可空。CHECK：`(request_kind = 'DELETE') = (mode IS NOT NULL)`。
- 新索引 `data_requests_subject_idx (channel_id, subject_id)`，供面板列出主体的请求。
- CHECK 新增 `ck_data_requests_kind`、`ck_data_requests_method`、`ck_data_requests_verified_method`（`verification_state <> 'VERIFIED' OR verification_method IS NOT NULL`）。

SQLite 不能去掉 NOT NULL，所以迁移用「建新表、复制、删旧表、改名」的方式。迁移开头执行 `PRAGMA defer_foreign_keys = ON`，使 `data_request_items` 的外键在提交时检查。S002 没有写入路径，表在现有部署里为空。若存在已核验但没有方式的旧行，复制会因 CHECK 失败，迁移整体回滚。

迁移测试：先迁移到 0003，写入一条删除请求和一条条目，再升级到 0004。两行都必须保留，且 `request_kind` 为 `DELETE`。

### 4.2 状态（自定）

| 事件 | 核验状态 | 执行状态 | 其它字段 |
| --- | --- | --- | --- |
| 登记（任何类别） | `PENDING` | `PENDING` | `mode` 按类别，`verification_method` 为空 |
| 核验通过 | `VERIFIED` | 不变（`PENDING`） | `verification_method`、`verified_at`、`handled_by_ref` |
| 核验拒绝 | `REJECTED` | `CANCELLED` | `handled_by_ref`、`updated_at` |

- 核验只能从 `PENDING` 做一次。已有结论时再次提交返回 409 `ALREADY_DECIDED`。这一判断由存储层在同一事务里用条件更新保证。
- 执行状态取 `RUNNING`、`COMPLETED`、`PARTIAL_FAILED` 的写入归 STORY-019。本包只显示它们。
- 访问、更正、停止计分在核验通过后仍停在 `PENDING`，界面标明「本包不执行」。

### 4.3 只读使用的表

`subjects`、`subject_scores`、`subject_identities`（取最近一条）、`list_entries`（未移除的一条）、`score_exceptions`（未移除的一条）、`score_ledger`（计数）。通过 `SubjectReadPort` 读取，不写入。

### 4.4 Change Log

每次登记与每次核验各写一条 `DATA_REQUEST_CHANGED`，结果为 `SUCCEEDED`，`actor_kind` 为 `ACCOUNT`。摘要是固定模板，只含类别、模式、结论、核验方式，不含用户文本。保留期限按 `RETENTION_DAYS.metadata`（30 天）计算。请求行与日志行在同一事务写入。

受控材料生成也写一条 Change Log，摘要为 `CONTROLLED_MATERIAL_GENERATED`。

## 5. 接口

### 5.1 端口（contracts）

- `DataRequestPort`：`insertRequest(record, change)`、`decideVerification(channelId, requestId, update, change)`、`readRequest(channelId, requestId)`、`listRequests(channelId, subjectId)`、`readItems(requestId)`。
- `SubjectReadPort`：`readSubject(channelId, subjectId)`，主体不属于该频道时返回 `undefined`。
- 注入到模块的还有 `AuditLogPort.locateSubjectLogs`（取日志范围计数）、`newId`、`now`、`retentionDays`。

### 5.2 HTTP

| 方法与路径 | 需要的能力 | 成功 | 拒绝 |
| --- | --- | --- | --- |
| GET `/channels/:channelId/data/capabilities` | 任一有效成员 | 200 `{ dataHandle }` | 401、403 |
| GET `/channels/:channelId/data/subjects/:subjectRef` | `data.handle` | 200 面板视图 | 403、404 `SUBJECT_NOT_FOUND` |
| GET `/channels/:channelId/data/requests?subjectRef=` | `data.handle` | 200 状态列表 | 400、403 |
| POST `/channels/:channelId/data/requests` | `data.handle` | 201 状态视图 | 400、403、404 |
| GET `/channels/:channelId/data/requests/:requestId` | `data.handle` | 200 | 403、404 |
| POST `/channels/:channelId/data/requests/:requestId/verification` | `data.handle` | 200 | 400、403、404、409 `ALREADY_DECIDED` |

- 下游输出凭据（bearer）访问这些路由一律 403。
- 写操作沿用 S003 的 CSRF 检查，由 `authenticateRequest` 完成。
- 模块处理器会再检查一次 `data.handle`（纵深防御）。
- 不存在任何导出端点，也不提供日志批量下载。

## 6. 权限与核验

- `data.handle` 是所有数据面板路由的唯一能力。`DATA_ADMIN` 持有它。`CHANNEL_OWNER` 不持有，主播处理数据需同时持有 `DATA_ADMIN`（S003 设计 §4.1 的自定）。`MODERATOR` 不持有。非成员、下游凭据、未登录一律拒绝。
- 定位与核验都不接受昵称。昵称不以明文入库（S002 只存 `subject_nickname_changes` 的摘要），所以定位键是频道内稳定主体引用 `subjects.id`（自定）。
- 核验结论只能是 `VERIFIED` 或 `REJECTED`。`VERIFIED` 必须附 `ACCOUNT_OWNERSHIP`（确认账号归属）或 `REQUEST_AUTHORIZATION`（确认请求授权）。这两个方式来自提案 §11.2 的「确认账号归属或请求授权」（自定：取值）。
- 核验证据本身不入库。库中只有方式、时间、核验人。证据存放在频道之外，这一点未验证。

## 7. 两种删除按钮的登记语义

- `DELETE_DATA_ONLY`：登记模式，文字说明「删除现有数据；不新增或撤销记分例外」。
- `DELETE_AND_EXCEPT`：登记模式，文字说明「删除历史数据，执行后停止计分并进入审核；登记时尚未生效」。
- 两种登记都不写 `score_exceptions`、`list_entries`、`subject_scores`、`score_ledger`。测试覆盖这一点，包括既有有效例外的主体。
- §11.2 要求组合选项在同一事务内建立例外标记、使旧任务代次失效、登记删除任务。本包登记时不做这三件事，留给 STORY-019 在核验通过后执行（自定）。这意味着登记到执行之间，主体仍会被计分。界面必须说明这一点，报告也要写明。

## 8. 主体面板视图

字段：`subjectRef`；`currentScore`（无记录时为 `null`）；`identity`（最近一条身份事实的 `kind` 与 `effectiveFrom`，无则 `null`）；`list`（有效名单种类，无则 `null`）；`exception`（是否有效、建立时间）；`ledgerEntryCount`；`retention`（类别与计数）；`requests`（状态列表）；`externalNotice`（固定文字）。

保留类别取自 `AuditLogPort.locateSubjectLogs` 的计数，并附保留天数：技术日志 30 天，证据正文 7 天（来源：S016 `RETENTION_DAYS`，提案 §12.3 只给初始建议）。

`externalNotice` 固定为：YouTube 原始内容与平台侧副本不由本实例删除，外部处理状态本实例无法查询（提案 §11.3）。

## 9. 受控材料

- 函数 `buildControlledMaterial(deps, actor, requestId)`，不挂 HTTP。
- 需要 `data.handle`，请求必须是 `VERIFIED`，否则 409 `REQUEST_NOT_VERIFIED`。
- 输出字段（自定）：`materialVersion` 固定为 `"1"`；`channelId`；`requestId`；`requestKind`；`mode`；`verificationMethod`；`verifiedAt`；`executionState`；`subjectRef`；`generatedAt`；保留类别计数；固定说明文字。
- 不含昵称、评分历史、消息正文、证据内容、日志 ID、Change Log 原文。测试检查这些字段名不在输出中。

## 10. 不可信文本

面板与状态视图中的字符串（请求 ID、主体引用、保留类别名）经 S003 的 `UntrustedText` 渲染，并在调用处包 `<bdi>` 做双向隔离（Q15，自定：不改 S003 组件）。主体与请求的类别、状态均是固定枚举，由服务端校验。

## 11. 测试与验收映射

| 测试文件（服务端除非注明） | 证明什么 | 对应验收 |
| --- | --- | --- |
| `test/data-lifecycle-service/requests/verification.test.ts` | 只用昵称无法核验（方式缺失即拒绝）；`VERIFIED` 必须有方式；结论只能做一次；拒绝后执行状态为 `CANCELLED` | VW-SUB033-AC001（不凭昵称核验） |
| `test/data-lifecycle-service/requests/permissions.test.ts` | `MODERATOR`、只有 `CHANNEL_OWNER` 而无 `DATA_ADMIN`、非成员、下游凭据、未登录，对每条路由都拒绝；缺 CSRF 的写操作被拒；另一频道的 `DATA_ADMIN` 拒绝本频道主体 | VW-SUB033-AC001（普通房管无数据管理权限）、VW-S018-AC001 |
| `test/data-lifecycle-service/requests/external-scope.test.ts` | 状态视图显示执行状态、条目失败与外部处理固定说明；访问、更正、停止计分停在待处理 | VW-SUB033-AC001（外部范围和失败真实显示） |
| `test/data-lifecycle-service/requests/subject-lookup.test.ts` | 同一频道内两个主体的昵称摘要相同，定位结果仍只取所选主体；另一频道的主体返回 404 | VW-SUB033-AC001（不凭昵称） |
| `test/data-lifecycle-service/requests/deletion-options.test.ts` | 两种删除登记后，`score_exceptions` 与 `list_entries` 不变；既有有效例外在 `DELETE_DATA_ONLY` 后仍有效 | VW-SUB034-AC001（普通删除不撤销例外） |
| `test/data-lifecycle-service/requests/material.test.ts` | 未核验请求拒绝；材料字段不含禁止项；生成写入 Change Log | VW-SUB033-AC001；VW-S018-INHERIT-009（无日志批量或原文） |
| `test/db/data-requests-migration.test.ts` | 0003 到 0004 升级保留旧行与条目，`request_kind` 为 `DELETE` | VW-S018-INHERIT-011（迁移与事务） |
| `test/db/data-request-store.test.ts` | 登记与 Change Log 同事务；核验条件更新只成功一次；请求与他频道主体不能关联 | VW-SUB033-AC001；VW-S018-INHERIT-011 |
| `test/db/data-dictionary`（沿用 `schema.test.ts`） | 数据字典列出新列与新约束 | 数据字典与 schema 一致 |
| `apps/web/src/pages/data/__tests__/flow.test.ts` | 删除确认流程：未确认不提交；两种模式各自生成正确的请求体；提交失败保留确认态 | VW-SUB034-AC001（两种操作效果清楚） |
| `apps/web/src/pages/data/__tests__/DataPanel.test.tsx` | 无 `data.handle` 时不渲染删除按钮与面板操作；有权限时渲染两种按钮和最小偏好说明 | VW-SUB034-AC001（无数据权限者看不到操作） |
| `apps/web/src/pages/data/__tests__/api.test.ts` | 写请求带 CSRF 头；错误码映射为固定文案 | VW-SUB034-PARENT（页面流程） |

继承行（VW-S018-INHERIT-001、-009、-011、-012 至 -019）只在本包实际触及的范围内核对，运行完整验证由 STORY-019 与 EPIC-006 承担，报告中按此注明。

## 12. 不做的事

- 删除执行、清理、代次失效、例外标记的建立（STORY-019）。
- 按昵称或平台身份搜索。
- 观众入口。登记由数据管理员代为完成，`requestSource` 由操作者选择。
- 登录页与会话 UI。
- 材料管理工具的命令行入口。本包只提供函数。
- 修改 `ServerConfig` 或配置 schema。
- 修改 `DataLifecycleService.requestDeletion` 的签名。它仍是占位，留给 STORY-019。
- 推送、发布、写引擎工单。

## 13. 与子单交付清单的偏离

- 模块目录是 `apps/server/src/modules/data-lifecycle-service/`。子单写的是 `data-lifecycle/`，但 S001 注册表与 `packages/contracts` 的模块名都是 `DataLifecycleService`，所以沿用已有目录（与 Q10 的处理方式一致）。
- 子单清单没有列出的文件：`packages/contracts/src/ports/data-request.ts` 与 `index.ts`；`db/data-request-store.ts`、`db/subject-read.ts`；`db/schema/data-requests.ts`；迁移 0004 与快照；`docs/data-dictionary.md`；`auth/data-routes.ts`；`app.ts`；`types.ts`、`validate.ts`、`change-row.ts`；web 的 `flow.ts`。原因：模块不能引用数据库，必须经端口；登记需要存储类别；HTTP 绑定必须在组合层或鉴权层完成。
- 子单的 web 测试路径与清单一致（`pages/data/__tests__/`）。服务端测试路径偏离，见第 2 节。

## 14. 来源缺口

- 提案没有规定定位键。自定：频道内稳定主体引用。
- 提案没有规定核验方式的取值。自定：`ACCOUNT_OWNERSHIP`、`REQUEST_AUTHORIZATION`。
- 提案没有规定核验证据的形式与保存。自定：不入库，只存方式与结论。
- 「删除并加入名单」中例外标记的建立时点。§11.2 叙述的是一个事务，但没有说明与核验的先后关系。自定：归 STORY-019 在核验通过后执行。
- 访问、更正、停止计分的执行规则未定义。本包只登记。
- 材料格式未定义。自定：第 9 节的最小 JSON。
- S003 的矩阵中 `CHANNEL_OWNER` 不含 `data.handle`。这与提案 §11.2「面向主播及获授权的数据管理员」略有出入。本包沿用 S003 的自定，不改矩阵。
- 外部处理状态（YouTube 侧删除）本实例无法查询，界面只能显示固定说明。
