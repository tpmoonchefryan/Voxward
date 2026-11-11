<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:210958ccce508a7abf314287 revision=4 sha256=8ac27e27d8b107ef077c4a1c9dd83f13eb8afe4215c2e7e7540c948b169ec5d3 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现人工裁决、冲突提示与计分纠错
  - Work item: `work:210958ccce508a7abf314287` revision 4.
  - Goal from the current formal source: 多房管可接管、复核、改判并获得明确冲突状态，晚到结果不能覆盖人工结论。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S014-AC001@1 [work:210958ccce508a7abf314287/VW-S014-R001@1] 双房管并发、人工后 AI 返回、超时重试、钳制后的纠分和删除请求交叉。: 仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 (事务并发、补偿账本、任务代次及补发测试。) VW-S014-PARENT@1 [work:16305a483e701a8d6d794886/VW-E003-R014@1] 双房管并发、人工后 AI 返回、超时重试、钳制后的纠分和删除请求交叉。: 仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；事务并发、补偿账本、任务代次及补发测试。) VW-S014-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S014-INHERIT-002@1 [work:8bd4977aa0770aa2f41229a2/VW-R-002@1] 核对本单与 VW-R-002 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-002 承载。) VW-S014-INHERIT-007@1 [work:8bd4977aa0770aa2f41229a2/VW-R-007@1] 双房管并发、人工后 AI 返回、超时重试、钳制后的纠分和删除请求交叉。（本单对 VW-R-007 的贡献）: 仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (事务并发、补偿账本、任务代次及补发测试。) VW-S014-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S014-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S014-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S014-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：DecisionService API；乐观并发/任务代次；实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作。 前置：VOXWARD-STORY-003,VOXWARD-STORY-005,VOXWARD-STORY-006,VOXWARD-STORY-009 根需求关联：VW-R-007,VW-R-004,VW-R-006,VW-R-014。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 DecisionService API；乐观并发/任务代次；实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作。 S-PARENT work:16305a483e701a8d6d794886#VW-E003-R014@requirement@1 [complete] 多房管可接管、复核、改判并获得明确冲突状态，晚到结果不能覆盖人工结论。 交付：DecisionService API；乐观并发/任务代次；实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S014-R001@1: 多房管可接管、复核、改判并获得明确冲突状态，晚到结果不能覆盖人工结论。 交付：DecisionService API；乐观并发/任务代次；实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作。 behavior: 双房管并发、人工后 AI 返回、超时重试、钳制后的纠分和删除请求交叉。 预期：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# S014 本地任务清单（不在受管段内；勾选只是本地进度，不是正式完成证据）

## VOXWARD-SUB-026：DecisionService 人工接管、复核改判与冲突状态

- [x] 26.1 契约：`DecisionService` 结果类型与 `DecisionStorePort`（packages/contracts）
- [x] 26.2 计分端口：导出 `commitInTransaction`；例外端口拒绝（Q21）；无计分幂等记录（迁移 0005，Q19①）；人工补偿与身份键按频道（Q19②）
- [x] 26.3 `db/decision-store.ts`：裁决 commit 的单一短事务（任务守卫、裁决、投递意图、计分、Change Log）
- [x] 26.4 模块 `service.ts`、`concurrency.ts`、`index.ts`：commit 与冲突结果；权限检查
- [x] 26.5 `routes.ts` 纯函数；测试 `commit.test.ts`、`concurrency.test.ts`、`decision-store.test.ts`
- [ ] 26.6 SUB-026 自测（build、typecheck、test、check:deps）全部退出 0；提交 `VOXWARD-SUB-026`

## VOXWARD-SUB-027：计分纠错补偿、名单/词条权限与过期消息补发

- [ ] 27.1 `compensation.ts`：复核改判（`overturn`）、按账本实际纠分、代次守卫（删除交叉）
- [ ] 27.2 `list-permissions.ts`：名单与词条的 `list.edit` 权限，Change Log 摘要不含分数（Q29）
- [ ] 27.3 `resend.ts`：过期消息显式补发，有效期受限，幂等
- [ ] 27.4 测试 `overturn.test.ts`、`resend.test.ts`、`list-permissions.test.ts`、`outcomes.test.ts`
- [ ] 27.5 SUB-027 自测全部退出 0；提交 `VOXWARD-SUB-027`

## 批末

- [ ] 28.1 `pnpm install`、`build`、`typecheck`、`test`、`check:deps`、`kiro-specs.mjs check` 全部退出 0
- [ ] 28.2 `smoke.sh` 启动冒烟（不设 `VOXWARD_DATABASE_FILE`）通过
- [ ] 28.3 证据 `evidence/self-check.md` 随最后一个 commit 提交
