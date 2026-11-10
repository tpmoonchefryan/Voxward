<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:c07537a238d62efa3b9779f6 revision=4 sha256=80d7e41968257f16670313aa84f9abd42376eb8c150c3d489133224958cd887a -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现频道评分、身份差额与幂等账本
  - Work item: `work:c07537a238d62efa3b9779f6` revision 4.
  - Goal from the current formal source: 每个频道独立执行可解释的计分、冷却、钳制和有效身份变化。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S005-AC001@1 [work:c07537a238d62efa3b9779f6/VW-S005-R001@1] 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。: 账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 (确定性状态转换、并发幂等和账本一致性测试。) VW-S005-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R005@1] 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。: 账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；确定性状态转换、并发幂等和账本一致性测试。) VW-S005-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S005-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 核对本单与 VW-R-003 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-003 承载。) VW-S005-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。（本单对 VW-R-004 的贡献）: 账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (确定性状态转换、并发幂等和账本一致性测试。) VW-S005-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S005-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S005-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。（本单对 VW-R-011 的贡献）: 账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (确定性状态转换、并发幂等和账本一致性测试。) VW-S005-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S005-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。（本单对 VW-R-014 的贡献）: 账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (确定性状态转换、并发幂等和账本一致性测试。) VW-S005-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：ScoringEngine；基础/行为分语义；actualDelta 账本；最大适用扣分、身份事件幂等和故障不扣分；例外统一守卫；人工补偿所需账本接口。 前置：VOXWARD-STORY-002 根需求关联：VW-R-004,VW-R-011,VW-R-014。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 ScoringEngine；基础/行为分语义；actualDelta 账本；最大适用扣分、身份事件幂等和故障不扣分；例外统一守卫；人工补偿所需账本接口。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R005@requirement@1 [complete] 每个频道独立执行可解释的计分、冷却、钳制和有效身份变化。 交付：ScoringEngine；基础/行为分语义；actualDelta 账本；最大适用扣分、身份事件幂等和故障不扣分；例外统一守卫；人工补偿所需账本接口。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S005-R001@1: 每个频道独立执行可解释的计分、冷却、钳制和有效身份变化。 交付：ScoringEngine；基础/行为分语义；actualDelta 账本；最大适用扣分、身份事件幂等和故障不扣分；例外统一守卫；人工补偿所需账本接口。 behavior: 上下限/冷却边界、多规则命中、重复会员事件、跨频道主体和例外用户。 预期：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# S005 逐步任务（本地清单，勾选只代表本地进度）

顺序不可变：先 SUB-010，再 SUB-011。每张子单各自提交一个 commit，提交信息含子单编号。

- [x] 0. 初始化 spec（`kiro-specs.mjs init`，`SPEC_INITIALIZED`，工单 rev 4）
- [x] 1. 写实施设计与任务（design.md、tasks.md 的本地段）。`kiro-specs.mjs check` 得 `SPEC_CURRENT`。提交 `VOXWARD-STORY-005: add spec`。
- [ ] 2. VOXWARD-SUB-010：计分纯逻辑与引擎入口（假端口测试）
  - [x] 2.1 `packages/contracts/src/ports/scoring-ledger.ts` 与导出
  - [x] 2.2 `config.ts`、`clamp.ts`、`rules.ts`、`identity-delta.ts`、`errors.ts`
  - [x] 2.3 `engine.ts`、`index.ts`（`createScoringEngine`，`applyVerdict`，未接线占位）
  - [x] 2.4 测试：`clamp`、`rules`、`identity-delta`、`engine`（含配置校验与分量不变量）、`index`（假端口）
  - [x] 2.5 自测：`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps` 退出 0。提交 `VOXWARD-SUB-010: ...`
- [x] 3. VOXWARD-SUB-011：账本端口、守卫、身份事件、人工补偿
  - [x] 3.1 `apps/server/src/db/scoring-ledger.ts`（端口的数据库实现）
  - [x] 3.2 `exception-guard.ts`、`ledger.ts`、`identity-events.ts`、`compensation.ts`，扩展 `index.ts`
  - [x] 3.3 测试：`ledger-port`、`identity-events`、`compensation`、`concurrency`（子进程）、`contract-consistency`
  - [x] 3.4 自测全部退出 0。提交 `VOXWARD-SUB-011: ...`
- [ ] 4. 证据：`.kiro/specs/voxward-s005-scoring/evidence/self-check.md`，随最后一个提交
- [ ] 5. 交付报告（模型、commit、改动文件、自测结果、AC001 逐条结果、自定选择、偏离、缺口、未验证项、合并风险）
