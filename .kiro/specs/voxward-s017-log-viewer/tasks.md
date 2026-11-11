<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:df1b9e57f926fbd8f7302a95 revision=4 sha256=18a74aabdfa73085376cdb4c4e62ba34f01693b6eb81fa544e75b496f7b94e9b -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现关联日志查看器与授权查询
  - Work item: `work:df1b9e57f926fbd8f7302a95` revision 4.
  - Goal from the current formal source: 授权人员从任意 Technical Log 打开完整关联链，自由切换条目和校验后 JSON。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S017-AC001@1 [work:df1b9e57f926fbd8f7302a95/VW-S017-R001@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 (浏览器交互、分页/权限、微批及删除后检索测试。) VW-S017-PARENT@1 [work:18aaac72724b30c2ee9be8b6/VW-E004-R017@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；浏览器交互、分页/权限、微批及删除后检索测试。) VW-S017-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S017-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S017-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S017-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。（本单对 VW-R-012 的贡献）: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (浏览器交互、分页/权限、微批及删除后检索测试。) VW-S017-INHERIT-013@1 [work:8bd4977aa0770aa2f41229a2/VW-R-013@1] 核对本单与 VW-R-013 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。) VW-S017-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S017-INHERIT-015@1 [work:8bd4977aa0770aa2f41229a2/VW-R-015@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。（本单对 VW-R-015 的贡献）: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 继续遵守 VW-R-015 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (浏览器交互、分页/权限、微批及删除后检索测试。) VW-S017-INHERIT-016@1 [work:8bd4977aa0770aa2f41229a2/VW-R-016@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。（本单对 VW-R-016 的贡献）: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (浏览器交互、分页/权限、微批及删除后检索测试。) VW-S017-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S017-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。（本单对 VW-R-019 的贡献）: 不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (浏览器交互、分页/权限、微批及删除后检索测试。)
  - Original work notes and delivery details from the current formal source: 交付物：两类日志入口；列表/详情/关联内部接口；跨分页完整链、稳定排序和选中项；上一条/下一条/直接选择；JSON 折叠、模型/任务/契约版本；字段级权限。 前置：VOXWARD-STORY-003,VOXWARD-STORY-016 根需求关联：VW-R-015,VW-R-016,VW-R-012,VW-R-019。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 两类日志入口；列表/详情/关联内部接口；跨分页完整链、稳定排序和选中项；上一条/下一条/直接选择；JSON 折叠、模型/任务/契约版本；字段级权限。 S-PARENT work:18aaac72724b30c2ee9be8b6#VW-E004-R017@requirement@1 [complete] 授权人员从任意 Technical Log 打开完整关联链，自由切换条目和校验后 JSON。 交付：两类日志入口；列表/详情/关联内部接口；跨分页完整链、稳定排序和选中项；上一条/下一条/直接选择；JSON 折叠、模型/任务/契约版本；字段级权限。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S017-R001@1: 授权人员从任意 Technical Log 打开完整关联链，自由切换条目和校验后 JSON。 交付：两类日志入口；列表/详情/关联内部接口；跨分页完整链、稳定排序和选中项；上一条/下一条/直接选择；JSON 折叠、模型/任务/契约版本；字段级权限。 behavior: 关联链跨多页，包含重试/人工/微批；越权 correlationId 和删除/到期条目被访问。 预期：不是仅过滤当前页；未授权正文不可读，批 JSON 不泄露其他消息；删除缓存/索引同步失效，无公开或下游通用查询/原始下载。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

## 本地任务（实施子代理记录，勾选仅为本地进度，不改变引擎状态）

依据 `design.md` 的实施设计。每张子单各自一个提交，提交信息含子单编号。

### 步骤 A：spec

- [x] A1. 读取实时工单（STORY-017、SUB-031、SUB-032）、规范、steering、提案 §11.2/§12、问题清单。
- [x] A2. 读取现有代码：审计模块（S016）、认证、数据库端口、网页不可信文本组件（S003）、测试辅助。
- [x] A3. 运行 `kiro-specs.mjs init`，写入实施设计与本任务清单（受管段之外）。
- [ ] A4. `kiro-specs.mjs check` 返回 SPEC_CURRENT。提交 `VOXWARD-STORY-017: add spec`。

### 步骤 B：VOXWARD-SUB-031（服务端查询、权限、缓存）

- [ ] B1. 契约：扩展 `ports/audit-log.ts` 的读端口；新增 `viewer/log-viewer.ts`（视图类型、`LogViewer`、`ViewerResult`）；从 `index.ts` 导出。
- [ ] B2. 数据库：在 `db/audit-log.ts` 实现 `pageChangeLogs`、`pageTechnicalLogs`、`readTechnicalLog`、`pageChain`，并过滤到期元数据。
- [ ] B3. 模块：`viewer/paging.ts`（游标与页大小）、`viewer/evidence-view.ts`（字段权限与到期状态）、`viewer/cache.ts`（失效订阅）、`viewer/queries.ts`（`createLogViewer`）。从 `audit-store/index.ts` 导出。
- [ ] B4. 认证：`members.ts` 增加按账号列出有效成员关系；`permissions.ts` 增加按成员关系列出能力；新增 `log-viewer-access.ts`（`AuditAccess` 的实现）与 `log-viewer-routes.ts`（四个 GET 路由）。
- [ ] B5. 装配：`app.ts` 接受可选的 `invalidation`，创建查看器并注册路由。
- [ ] B6. 测试：更新 `test/audit-store/helpers.ts` 中的 `recordingPort`；新增 `queries`、`permissions`、`cache`、`log-viewer-routes` 四组测试。覆盖分页、微批、越权、跨频道、到期、删除后失效。
- [ ] B7. 类型检查、测试、分区检查通过。提交 `VOXWARD-SUB-031: ...`，并在本清单打勾。

### 步骤 C：VOXWARD-SUB-032（网页）

- [ ] C1. `apps/web/package.json` 增加 `@voxward/contracts` 工作区依赖，更新锁文件（`pnpm install`，不使用 `--frozen-lockfile`）；`vite.config.ts` 增加 `/internal` 代理。
- [ ] C2. 实现 `pages/logs/api.ts`（分页读取、整链循环翻页、错误映射、形状校验）。
- [ ] C3. 实现 `pages/logs/CorrelationChain.tsx`（导航纯函数、链列表、上一条/下一条）、`JsonPanel.tsx`（折叠、版本字段、无权限不渲染）、`LogViewer.tsx`（两个入口、分页、进入链）、`route.tsx`。所有不可信文本经 `UntrustedText` 并包 `<bdi>`。
- [ ] C4. 测试：`__tests__/api`、`chain-navigation`、`json-panel`、`untrusted-isolation`。
- [ ] C5. 运行完整自测（`pnpm install`、`build`、`typecheck`、`test`、`check:deps`、`kiro-specs.mjs check`，再加 `pnpm dev` 与 `/healthz` 检查）。把结果写入 `evidence/self-check.md`。
- [ ] C6. 提交 `VOXWARD-SUB-032: ...`（证据随最后一个提交一起提交），并在本清单打勾。

### 步骤 D：收尾

- [ ] D1. 确认服务已停止、无残留进程、工作树干净。
- [ ] D2. 交付报告：模型、提交哈希、改动文件、自测结果、各 AC001 的实际结果、自定选择、偏离、未验证项、与同批包的可能冲突。
