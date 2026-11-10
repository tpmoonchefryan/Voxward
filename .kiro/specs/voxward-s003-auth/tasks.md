<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:fd4f81864ddb33703517e12f revision=4 sha256=0667e0dbba313d0427d27db04151a40a179e1623f69af28cf9310b2a883b4bde -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现频道身份、角色权限与凭据隔离
  - Work item: `work:fd4f81864ddb33703517e12f` revision 4.
  - Goal from the current formal source: 主播可登录管理所属频道并授权房管/数据管理员，下游仅有可撤销只读权限。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S003-AC001@1 [work:fd4f81864ddb33703517e12f/VW-S003-R001@1] 房管跨频道请求、下游凭据访问后台、撤销会话/订阅、恶意文本进入页面。: 服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 (权限矩阵、会话撤销和 HTTP/WebSocket 安全测试。) VW-S003-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R003@1] 房管跨频道请求、下游凭据访问后台、撤销会话/订阅、恶意文本进入页面。: 服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；权限矩阵、会话撤销和 HTTP/WebSocket 安全测试。) VW-S003-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S003-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 核对本单与 VW-R-003 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-003 承载。) VW-S003-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 核对本单与 VW-R-004 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-004 承载。) VW-S003-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S003-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S003-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 房管跨频道请求、下游凭据访问后台、撤销会话/订阅、恶意文本进入页面。（本单对 VW-R-011 的贡献）: 服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (权限矩阵、会话撤销和 HTTP/WebSocket 安全测试。) VW-S003-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 房管跨频道请求、下游凭据访问后台、撤销会话/订阅、恶意文本进入页面。（本单对 VW-R-012 的贡献）: 服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (权限矩阵、会话撤销和 HTTP/WebSocket 安全测试。) VW-S003-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S003-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF 和安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约。 前置：VOXWARD-STORY-001,VOXWARD-STORY-002 根需求关联：VW-R-012,VW-R-011。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF 和安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R003@requirement@1 [complete] 主播可登录管理所属频道并授权房管/数据管理员，下游仅有可撤销只读权限。 交付：登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF 和安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S003-R001@1: 主播可登录管理所属频道并授权房管/数据管理员，下游仅有可撤销只读权限。 交付：登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF 和安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约。 behavior: 房管跨频道请求、下游凭据访问后台、撤销会话/订阅、恶意文本进入页面。 预期：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# S003 本地任务清单（不在受管段内；打勾只表示本地进度）

提交顺序：spec → SUB-006 → Q9 打包 → SUB-007 → 自测证据（证据随最后一个提交）。

## 第 0 步：spec
- [x] 0.1 `kiro-specs.mjs init` 已生成受管段（SPEC_INITIALIZED，revision 4）。
- [x] 0.2 在 design.md 与 tasks.md 的受管段之外追加实施设计和本清单。
- [x] 0.3 `kiro-specs.mjs check` 结果为 SPEC_CURRENT。
- [x] 0.4 提交 `VOXWARD-STORY-003: add spec`。

## SUB-006：登录会话、频道成员角色与服务端鉴权
- [x] 6.1 `db/schema/auth.ts` 三张表，迁移 `0001`（`drizzle-kit generate`），更新 `migrate.test.ts` 的表数与迁移数。
- [x] 6.2 `permissions.ts`、`session.ts`、`login.ts`、`members.ts`、`downstream-tokens.ts`，以及对应单元测试。
- [x] 6.3 `csrf.ts`、`guard.ts`（含握手同源检查、批量全部拒绝、`checkRoomScope`）及测试。
- [x] 6.4 `routes.ts`，`app.ts` 注册（只做注册），`main.ts` 打开与迁移数据库。HTTP 测试覆盖 VW-SUB006-AC001 的各场景。
- [x] 6.5 `check-deps.mjs` 增加 `auth`、`security` 分区与 composition 的新目标。对 `zz-negative-control.ts` 做负面对照，验证后删除。
- [x] 6.6 提交 `VOXWARD-SUB-006: ...`。

## Q9：数据库接入后的打包
- [x] Q9.1 `build` 脚本对 `better-sqlite3`、`drizzle-orm` 设 external。
- [x] Q9.2 `scripts/copy-migrations.mjs` 把迁移复制到 `dist/migrations`。
- [x] Q9.3 `pnpm build` 后，用 `node dist/main.js` 实测能打开数据库并监听（记录在证据里）。
- [x] Q9.4 提交 `VOXWARD-SUB-006: package the database for the bundled server (Q9)`。

## SUB-007：凭据隔离、不可信文本渲染边界与运行时 AI 最小权限契约
- [x] 7.1 `security/credential-vault.ts`、`redaction.ts`、`untrusted-text.ts` 及测试（`security/`）。
- [x] 7.2 `security/leak-scan.test.ts`：扫描认证接口响应、日志样本、模型输入样本与演示配置。
- [x] 7.3 `apps/web/src/components/untrusted-text/` 与 `apps/web/test/untrusted-text.test.tsx`，`vitest.workspace.ts` 加入 `apps/web`。
- [x] 7.4 `docs/security/runtime-ai-least-privilege.md`，逐条对照提案 §9.2 与 §16。
- [x] 7.5 提交 `VOXWARD-SUB-007: ...`。

## 自测与证据
- [x] 8.1 按顺序运行 `pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check`，记录退出码与关键输出到 `evidence/self-check.md`。
- [x] 8.2 `evidence/self-check.md` 随最后一个提交一起提交。
