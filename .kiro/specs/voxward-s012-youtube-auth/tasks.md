<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:c3303265b2af4669b243c34b revision=4 sha256=e1857618599d763b1bf135d138c4053c35abb448822c2b7ee1c738fd3ac4c2b6 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现 YouTube 凭据配置与授权状态
  - Work item: `work:c3303265b2af4669b243c34b` revision 4.
  - Goal from the current formal source: 部署方可配置只读/写操作所需凭据，主播可按需授权并看见失效状态。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S012-AC001@1 [work:c3303265b2af4669b243c34b/VW-S012-R001@1] 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。: 失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 (凭据状态契约测试；真实授权环境可用时联调，否则明确未验证。) VW-S012-PARENT@1 [work:16305a483e701a8d6d794886/VW-E003-R012@1] 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。: 失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；凭据状态契约测试；真实授权环境可用时联调，否则明确未验证。) VW-S012-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S012-INHERIT-002@1 [work:8bd4977aa0770aa2f41229a2/VW-R-002@1] 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。（本单对 VW-R-002 的贡献）: 失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (凭据状态契约测试；真实授权环境可用时联调，否则明确未验证。) VW-S012-INHERIT-007@1 [work:8bd4977aa0770aa2f41229a2/VW-R-007@1] 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。（本单对 VW-R-007 的贡献）: 失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (凭据状态契约测试；真实授权环境可用时联调，否则明确未验证。) VW-S012-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S012-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S012-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。（本单对 VW-R-012 的贡献）: 失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (凭据状态契约测试；真实授权环境可用时联调，否则明确未验证。) VW-S012-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：API key/OAuth 能力区分；准确回调配置、权限和配额说明；凭据加密/引用、撤销与到期；独立部署及 Testing 状态注意项。 前置：VOXWARD-STORY-003 根需求关联：VW-R-002,VW-R-007,VW-R-012。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 API key/OAuth 能力区分；准确回调配置、权限和配额说明；凭据加密/引用、撤销与到期；独立部署及 Testing 状态注意项。 S-PARENT work:16305a483e701a8d6d794886#VW-E003-R012@requirement@1 [complete] 部署方可配置只读/写操作所需凭据，主播可按需授权并看见失效状态。 交付：API key/OAuth 能力区分；准确回调配置、权限和配额说明；凭据加密/引用、撤销与到期；独立部署及 Testing 状态注意项。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S012-R001@1: 部署方可配置只读/写操作所需凭据，主播可按需授权并看见失效状态。 交付：API key/OAuth 能力区分；准确回调配置、权限和配额说明；凭据加密/引用、撤销与到期；独立部署及 Testing 状态注意项。 behavior: 缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期。 预期：失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

## 本地实施任务（本地进度，不代表正式完成）

勾选只表示本地进度，不改变工单状态，也不构成完成证据。

- [x] S1. 写 spec：设计与任务（受管段之外），`kiro-specs.mjs check` 应为 SPEC_CURRENT
- [ ] S2. 凭据能力区分、部署级客户端配置与回调地址校验：`credentials.ts`（子单 AC：不偷偷提升权限、回调配置错误）
- [ ] S3. OAuth 客户端与 state 存储：`oauth.ts`（端点、授权参数、授权码交换、刷新、撤销、错误映射）
- [ ] S4. 状态推导与在线核验映射：`auth-status.ts`（缺失、无效、过期、撤销、权限不足、回调错误）
- [ ] S5. 路由处理器与持久化装配：`routes.ts`、`index.ts` 导出（授权记录封存、credential_refs 登记、撤销仅在 200 时标记）
- [ ] S6. 部署指引：`docs/deployment/youtube-credentials.md`（需平台申请的步骤标注未完成）
- [ ] S7. 测试：`apps/server/test/platform-source/youtube-credentials/`（全部合成数据，不访问网络）
- [ ] S8. 自测与证据：六项命令、`pnpm dev` 冒烟、`evidence/self-check.md` 随最后一个 commit 提交
