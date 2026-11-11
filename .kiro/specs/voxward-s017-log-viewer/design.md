<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:df1b9e57f926fbd8f7302a95 revision=4 sha256=18a74aabdfa73085376cdb4c4e62ba34f01693b6eb81fa544e75b496f7b94e9b -->

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

## 实施设计（本段位于受管段之外，由实施子代理写入）

本段记录实施方案。受管段中的需求、来源与验收文本未改动。简报禁止写引擎工单，所以引擎中的工单状态与交付清单没有更新。自定的选择在对应小节标注「自定」。

### 1. 范围与不做的事

本包覆盖 VOXWARD-STORY-017 的两张子单：

- VOXWARD-SUB-031（服务端）：内部查询接口（Change Log 与 Technical Log 列表、条目详情、关联链分页）、字段与对象级权限、删除与到期后的可见性、查看器缓存及其失效。
- VOXWARD-SUB-032（前端）：日志页面的两个入口、完整关联链、上一条/下一条/直接选择、JSON 折叠并标出模型/任务/契约版本、不可信文本隔离（问题清单 Q15 的查看器部分）。

不做的事：

- 公开或下游通用日志 API，原始日志批量下载，任何 `/api/logs` 类的新路径（提案 §11.2、§12.2）。
- 删除的写入路径。`removeSubject` 由 S016 提供，接线属于 STORY-019/020。本包用测试发布失效事件，验证缓存与查询的效果。
- 保留期清理任务（STORY-020）、登录页面、成员管理页面。
- 数据库迁移与新索引（见第 9 节）。
- 修改 ServerConfig、配置 schema、分区规则 `scripts/check-deps.mjs`。

### 2. 依赖方向

分区规则不改。新增文件的导入关系都在 `scripts/check-deps.mjs` 现有允许表之内：

| 分区 | 允许导入 | 本包新增或修改的文件 |
|---|---|---|
| 契约 `packages/contracts/src` | 无运行时依赖 | `ports/audit-log.ts`（读端口扩展）；`viewer/log-viewer.ts`（视图类型与 `LogViewer` 接口，新增） |
| 模块 `modules/audit-store/viewer` | `@voxward/contracts`、同模块文件 | `viewer/paging.ts`、`viewer/evidence-view.ts`、`viewer/cache.ts`、`viewer/queries.ts`（新增）；`index.ts`（导出） |
| 数据库 `db` | `@voxward/contracts`、`drizzle-orm` | `audit-log.ts`（实现读方法） |
| 认证 `auth` | 契约、认证、数据库、`fastify`、`zod` | `members.ts`、`permissions.ts`（只读辅助）；`log-viewer-access.ts`、`log-viewer-routes.ts`（新增） |
| 组合 `app.ts` | 模块、认证、数据库、契约 | 装配查看器，注册路由 |
| 网页 `apps/web/src` | 网页内部、`@voxward/contracts`、外部包 | `pages/logs/*`（新增） |

HTTP 绑定放在认证分区，与 `auth/routes.ts` 一致。模块分区不导入 `fastify`，也不导入认证分区的代码。查看器判断频道能力时，经 `AuditAccess` 接口读取，实现由组合层提供。模块不直接读成员表。

### 3. 布局与交付清单偏离

工单 SUB-031 的交付清单写的是 `apps/server/src/modules/audit/...`。仓库里负责 Change Log 与 Technical Log 的模块是 `apps/server/src/modules/audit-store/`（S016）。提案第 5 节也把「受权限约束的查看器查询」归在 AuditStore 下。因此：

- 查看器代码放在 `apps/server/src/modules/audit-store/viewer/`。（偏离，自定）
- 不新建 `apps/server/src/modules/audit/`。工单中的 `audit/index.ts` 对应现有的 `audit-store/index.ts`。（偏离，自定）
- 测试放在 `apps/server/test/audit-store/viewer/` 与 `apps/server/test/auth/log-viewer-routes.test.ts`。

工单 SUB-032 的交付清单之外，新增两处：`apps/web/package.json`（声明对 `@voxward/contracts` 的工作区依赖，网页需要契约中的视图类型）和 `apps/web/vite.config.ts`（开发代理转发 `/internal`）。（自定，理由见第 8 节）

### 4. 接口

#### 4.1 读端口（契约 `ports/audit-log.ts` 新增方法）

| 方法 | 作用 | 排序与边界 |
|---|---|---|
| `pageChangeLogs(channelId, query)` | 一页 Change Log 行，可按 `correlationId` 过滤 | `occurred_at DESC, id DESC`；只返回 `expires_at > notExpiredAt` 的行 |
| `pageTechnicalLogs(channelId, query)` | 一页 Technical Log 元数据行，不含证据 | `created_at DESC, id DESC`；未到期 |
| `readTechnicalLog(channelId, logId, notExpiredAt)` | 单条元数据及其全部证据行 | 只返回属于该频道的行；未到期 |
| `pageChain(channelId, correlationId, afterSequence, limit, notExpiredAt)` | 关联链的一页元数据行，不含证据 | `sequence ASC`，且 `sequence > afterSequence`；未到期 |

查询参数形如 `{ after, limit, notExpiredAt }`。Change Log 另有 `correlationId`。`after` 为上一页最后一行的排序键，首页为 `null`。

#### 4.2 查看器（契约定义接口，模块实现）

```ts
interface LogViewer {
  listChanges(actorRef: string, channelId: string, query: LogListQuery): ViewerResult<LogPage<LogViewerChangeItem>>;
  listTechnical(actorRef: string, channelId: string, query: LogListQuery): ViewerResult<LogPage<LogViewerTechnicalItem>>;
  readTechnical(actorRef: string, channelId: string, logId: string): ViewerResult<LogViewerTechnicalDetail>;
  readChain(actorRef: string, channelId: string, correlationId: string, query: LogListQuery): ViewerResult<LogPage<LogViewerTechnicalItem>>;
}
type ViewerResult<T> = { ok: true; value: T } | { ok: false; code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_REQUEST" };
```

`LogListQuery` 为 `{ cursor: string | null; limit: number | null; correlationId?: string | null }`。`limit` 为 `null` 时取默认值。`LogPage<T>` 为 `{ items: T[]; nextCursor: string | null }`。

视图类型放在契约中：`LogViewerChangeItem`；`LogViewerTechnicalItem`（不含 `data` 与证据）；`LogViewerTechnicalDetail`（在条目上增加 `data` 与 `evidence`）；`LogViewerEvidence` 为 `{ kind, state: "AVAILABLE" | "EXPIRED", payload: string | null }`。

#### 4.3 HTTP（认证分区的插件，只注册 GET）

| 路径 | 查询参数 | 200 响应 |
|---|---|---|
| `/internal/channels/:channelId/logs/change` | `cursor`、`limit`、`correlationId` | `LogPage<LogViewerChangeItem>` |
| `/internal/channels/:channelId/logs/technical` | `cursor`、`limit` | `LogPage<LogViewerTechnicalItem>` |
| `/internal/channels/:channelId/logs/technical/:logId` | 无 | `LogViewerTechnicalDetail` |
| `/internal/channels/:channelId/logs/chains/:correlationId` | `cursor`、`limit` | `LogPage<LogViewerTechnicalItem>` |

错误码：没有会话 401 `UNAUTHENTICATED`；下游令牌，或在该频道没有 `logs.view` 403 `FORBIDDEN`；对象不在该频道、不存在或已到期 404 `NOT_FOUND`；游标或参数格式不合格 400 `INVALID_REQUEST`。错误体只含固定代码。所有 200 响应带 `cache-control: no-store`。

关联链在该频道内为空时，返回 200 与空页。空页不区分「关联 ID 不存在」和「属于别的频道」，两种情况都拿不到任何条目。

### 5. 可见性规则

| 规则 | 实现位置 |
|---|---|
| 能否进入查看器 | 模块先读 `access.capabilitiesFor(actor, channel)`，不含 `logs.view` 时返回 `FORBIDDEN`。频道不存在与无权限同样返回 403，不泄露频道是否存在 |
| 对象归属 | 所有读取都带路径中的 `channelId`。别的频道的 `logId` 返回 `NOT_FOUND` |
| 元数据保留 | 查询时过滤 `expires_at > now`。到期的条目从列表、详情和链中消失 |
| 内容字段 | `MESSAGE_TEXT`、`TRANSLATION` 需要 `message.original`；`ITEM_ID_MAP`、`VALIDATED_JSON` 需要 `subject.evidence`（沿用 S016 的 `EVIDENCE_CAPABILITIES`） |
| 无权限的内容字段 | 整段从响应中去掉，不返回 kind，也不返回占位 |
| 内容到期 | 有权限但证据 `expires_at <= now`：返回 `state: "EXPIRED"`，`payload: null`。这是唯一允许显示「已到期」状态的情况 |
| 关联关系 | 不延长保留期限，也不由链读取重建已删除的数据 |

### 6. 分页与稳定排序

- 游标格式：列表为 `时间|标识`（如 `2026-11-10T10:00:00.000Z|id-1`），链为序号字符串。游标经 URL 编码。服务端按格式校验，不合格返回 400。
- 每页默认 50 条，最多 100 条（自定）。多取一条判断是否还有下一页，所以不会出现空的尾页。
- 排序键都是唯一的（`created_at` 或 `occurred_at` 加 `id`，或链内的 `sequence`），翻页时不重复也不漏项。
- 关联链的「完整」由前端循环翻页到 `nextCursor` 为空来保证，没有只取当前页的快捷路径。

### 7. 缓存与失效

- `createViewerCache(bus, maxEntries)` 只缓存单条详情的原始行。链页与列表不缓存：关联链可能随时新增条目，本模块没有写入事件可以失效它们。权限在每次请求时先于缓存判断，缓存不保存已裁剪的结果。（自定）
- 缓存在创建时订阅 S016 的 `InvalidationBus`。收到事件后，删除 `logIds` 或 `correlationIds` 与条目相交的缓存项。
- 每个缓存项的过期时间取其中最早的 `expires_at`（元数据或证据）。到期后不再命中，也不返回旧值。
- 超过 `maxEntries`（默认 256，自定）时，淘汰最早写入的项。
- 缓存没有独立的 TTL，因为到期时间已由数据决定，不需要引入未测量的数字。
- 缓存只在授权通过后读取。缓存键包含频道，不会跨频道命中。

### 8. 前端（SUB-032）

- 路由为 `/logs/:channelId`（自定）。页面位于 `apps/web/src/pages/logs/`，由 `routes.tsx` 的目录扫描自动注册。
- 两个入口：Change Log 列表与 Technical Log 列表，按服务端顺序显示，有「下一页」。Change Log 的条目带「处理链」按钮，按其 `correlationId` 打开关联链。
- 关联链：翻页加载全部条目，按 `sequence` 列出，高亮当前项。提供「上一条」「下一条」、点选任意条目、「返回列表」。选中项以 `logId` 保存，切换条目时保持。
- JSON 面板：默认折叠（`<details>` 不带 `open`）。显示模型（`modelRef`）、任务（`taskId`）、契约版本（`contractVersion`）和规则模板版本（`ruleTemplateVersion`）。证据为校验后的 JSON 时，解析后缩进显示。解析失败时原文显示，并注明「未通过 JSON 解析」（自定）。证据缺失（无权限）时整个 JSON 区不渲染。
- 不可信文本（摘要、错误代码、模型引用、JSON 正文等）统一经 S003 的 `UntrustedText` 渲染，外层加 `<bdi>`。`UntrustedText` 只删除 C0/C1 控制字符，零宽字符与 bidi 控制字符保留在文本中，`<bdi>` 负责隔离它们对周围排版的影响（Q15）。
- 前端依赖 `@voxward/contracts` 的类型（仅类型导入，运行时不引入）。`apps/web/package.json` 为此增加工作区依赖，锁文件随之更新。
- 开发模式下，`vite.config.ts` 把 `/internal` 代理到 `http://127.0.0.1:3000`，与 `/healthz` 的代理方式相同。

### 9. 不做的事及理由

- 不新增数据库迁移或索引。`technical_logs` 现有唯一索引覆盖 `(channel_id, correlation_id, sequence)`，链查询可以使用。按频道和时间排序的列表没有专用索引，数据量增大后可能变慢。量级未测，记为未验证项。
- 不改 ServerConfig 与配置 schema。
- 不改 AuditStore 契约的写方法（`append`、`findByCorrelationId`）。

### 10. 测试与验收行对应

| 验收行 | 场景 | 测试位置 | 证据性质 |
|---|---|---|---|
| VW-SUB031-AC001、VW-S017-AC001（父级） | 关联链跨页；越权 correlationId；删除与到期条目；微批不串正文 | `apps/server/test/audit-store/viewer/queries.test.ts`、`permissions.test.ts`、`cache.test.ts`；`apps/server/test/auth/log-viewer-routes.test.ts` | 实际运行的服务端测试 |
| VW-SUB032-AC001 | 两个入口；跨页链内切换；不同权限角色；JSON 折叠与版本字段；无权限字段不显示 | `apps/web/src/pages/logs/__tests__/*` | 单元级：静态标记与纯函数。未启动真实浏览器 |
| VW-SUB031-STORY、VW-SUB032-STORY、VW-SUB031-PARENT | 承担部分，与上面同一组测试 | 同上 | 同上 |
| VW-SUB031-INHERIT-001、-009、-011、-013、-014 | 接口形状、依赖方向、不写入正文、与 EPIC-001/004/006 的边界 | 第 2 节的依赖表；`check:deps`；查看器只读，不含写路径 | 设计与代码审查。完整验证属于 EPIC-006 |
| VW-SUB031-INHERIT-012、-015、-016、-019 | 对 VW-R-012/015/016/019 的贡献：关联链、权限、内容隔离 | 与 AC001 同一组测试 | 本单贡献，不替代 INIT 的全量验收 |
| VW-SUB031-INHERIT-017 | 删除代次、到期与失败状态有去向，缓存不保留旧值 | `cache.test.ts`、`queries.test.ts` 的到期用例 | 删除写路径由 STORY-019/020 完成 |

### 11. 自定选择汇总

- 查看器放在 `audit-store/viewer/`，见第 3 节。
- 频道不存在与无权限都返回 403，且空链返回 200 与空页，见第 4 节。
- 分页默认 50，最多 100；游标格式见第 6 节。
- 缓存只存单条详情的原始行，不设 TTL，见第 7 节。
- 访问适配器 `databaseViewerAccess` 只实现 `capabilitiesFor`，因为查看器只读这一项，不需要频道列表。（自定）
- 前端路由 `/logs/:channelId`；JSON 解析失败时原文显示；开发代理，见第 8 节。
- 枚举值（如 `changeKind`、`stage`）原样显示，不翻译。

### 12. 来源缺口与未验证项

- 工单交付清单未在引擎中更新（简报禁止写引擎工单）。本节第 3 条为准。
- 问题清单 Q15 登记的处理位置是 S022。简报把它分给本包，本包处理日志查看器页面。S022 中如有其它页面的同类问题，仍在 S022 处理。
- 真实浏览器中的点击与切换未运行。前端测试只覆盖静态标记和纯函数。
- 列表在大量数据下的性能未测。
- 删除写路径未在本包实现。失效事件由测试直接发布，或由测试中的 S016 服务发布。
- 第三方平台与 AI 提供方的留存不在范围内，见提案 §12.4。
