<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:83d8e6716c550b3fa7d657ba revision=4 sha256=73ea0db5b89089c728b4e2733d78e05d61d4d97c97fc2c84895a6886cb76f561 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现可选原生聊天室删除
  - Work item: `work:83d8e6716c550b3fa7d657ba` revision 4.
  - Goal from the current formal source: 房管可明确选择本地拒绝并从平台移除，分别看到两种动作状态。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S015-AC001@1 [work:83d8e6716c550b3fa7d657ba/VW-S015-R001@1] 默认本地拒绝、权限/配额失败及删除请求结果未知。: 默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 (平台动作契约和故障测试；真实受权删除仅在另有适用操作授权时验证。) VW-S015-PARENT@1 [work:16305a483e701a8d6d794886/VW-E003-R015@1] 默认本地拒绝、权限/配额失败及删除请求结果未知。: 默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；平台动作契约和故障测试；真实受权删除仅在另有适用操作授权时验证。) VW-S015-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S015-INHERIT-002@1 [work:8bd4977aa0770aa2f41229a2/VW-R-002@1] 核对本单与 VW-R-002 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-002 承载。) VW-S015-INHERIT-007@1 [work:8bd4977aa0770aa2f41229a2/VW-R-007@1] 默认本地拒绝、权限/配额失败及删除请求结果未知。（本单对 VW-R-007 的贡献）: 默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (平台动作契约和故障测试；真实受权删除仅在另有适用操作授权时验证。) VW-S015-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S015-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S015-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 默认本地拒绝、权限/配额失败及删除请求结果未知。（本单对 VW-R-012 的贡献）: 默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (平台动作契约和故障测试；真实受权删除仅在另有适用操作授权时验证。) VW-S015-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：平台删除适配；本地权限+OAuth 写权限校验；配额/不可删除原因；等待/成功/失败/未知状态。 前置：VOXWARD-STORY-012,VOXWARD-STORY-014 根需求关联：VW-R-007,VW-R-012。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 平台删除适配；本地权限+OAuth 写权限校验；配额/不可删除原因；等待/成功/失败/未知状态。 S-PARENT work:16305a483e701a8d6d794886#VW-E003-R015@requirement@1 [complete] 房管可明确选择本地拒绝并从平台移除，分别看到两种动作状态。 交付：平台删除适配；本地权限+OAuth 写权限校验；配额/不可删除原因；等待/成功/失败/未知状态。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S015-R001@1: 房管可明确选择本地拒绝并从平台移除，分别看到两种动作状态。 交付：平台删除适配；本地权限+OAuth 写权限校验；配额/不可删除原因；等待/成功/失败/未知状态。 behavior: 默认本地拒绝、权限/配额失败及删除请求结果未知。 预期：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

## 本地任务清单（不在受管段内；勾选只代表本地进度，不代表正式完成）

- [x] T1 spec：在 design.md 与 tasks.md 受管段之外写入实施设计与任务，`kiro-specs.mjs check` 为 SPEC_CURRENT。（提交：`VOXWARD-STORY-015: add spec`）
- [ ] T2 VOXWARD-SUB-028：契约端口 `packages/contracts/src/ports/platform-delete.ts` 与 `index.ts` 导出。
- [ ] T3 VOXWARD-SUB-028：YouTube 删除适配 `youtube/delete-message.ts` 与 `test/platform-source/youtube-delete/delete-message.test.ts`。
- [ ] T4 VOXWARD-SUB-028：删除编排 `decision-service/platform-delete.ts` 与 `test/decision-service/platform-delete/orchestration.test.ts`（真实 S014 数据库）。
- [ ] T5 VOXWARD-SUB-028：`platform-source/index.ts` 与 `decision-service/index.ts` 导出。
- [ ] T6 自测与证据：`pnpm install`、`build`、`typecheck`、`test`、`check:deps`、`kiro-specs.mjs check`、`smoke.sh`；证据写入 `evidence/self-check.md`。
- [ ] T7 交付报告：模型、提交、改动文件、自测结果、AC 逐条结果、自定选择、偏离、来源缺口、未验证项、可能的合并冲突。
