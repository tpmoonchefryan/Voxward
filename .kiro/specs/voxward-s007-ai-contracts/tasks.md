<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:05e6184a65712b369d65bba7 revision=4 sha256=d3f3a612813e76a764f1f1eb8f9e20f6cbefc85f40394af039555356fb890a98 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 定义并验证三类 AI 业务 JSON
  - Work item: `work:05e6184a65712b369d65bba7` revision 4.
  - Goal from the current formal source: 普通审核、SC 和复盘输出均被版本化 Schema 和业务规则严格校验。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S007-AC001@1 [work:05e6184a65712b369d65bba7/VW-S007-R001@1] 缺项、重复/批外 ID、额外字段、越界区间、BLOCK/NONE 冲突和违规译文。: 无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 (Schema 负例、批契约与输出内容检查测试。) VW-S007-PARENT@1 [work:8980504408e4d156c130a8f9/VW-E002-R007@1] 缺项、重复/批外 ID、额外字段、越界区间、BLOCK/NONE 冲突和违规译文。: 无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；Schema 负例、批契约与输出内容检查测试。) VW-S007-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S007-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S007-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 核对本单与 VW-R-006 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。) VW-S007-INHERIT-008@1 [work:8bd4977aa0770aa2f41229a2/VW-R-008@1] 缺项、重复/批外 ID、额外字段、越界区间、BLOCK/NONE 冲突和违规译文。（本单对 VW-R-008 的贡献）: 无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (Schema 负例、批契约与输出内容检查测试。) VW-S007-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 缺项、重复/批外 ID、额外字段、越界区间、BLOCK/NONE 冲突和违规译文。（本单对 VW-R-009 的贡献）: 无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (Schema 负例、批契约与输出内容检查测试。) VW-S007-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 核对本单与 VW-R-010 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。) VW-S007-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S007-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S007-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：普通 Schema；SC/复盘扩展契约；批内 ID 完整唯一、字段/长度/枚举/Unicode 半开区间校验；生成文本输出检查；校验错误定位。 前置：VOXWARD-STORY-001,VOXWARD-STORY-004 根需求关联：VW-R-008,VW-R-009。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 普通 Schema；SC/复盘扩展契约；批内 ID 完整唯一、字段/长度/枚举/Unicode 半开区间校验；生成文本输出检查；校验错误定位。 S-PARENT work:8980504408e4d156c130a8f9#VW-E002-R007@requirement@1 [complete] 普通审核、SC 和复盘输出均被版本化 Schema 和业务规则严格校验。 交付：普通 Schema；SC/复盘扩展契约；批内 ID 完整唯一、字段/长度/枚举/Unicode 半开区间校验；生成文本输出检查；校验错误定位。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S007-R001@1: 普通审核、SC 和复盘输出均被版本化 Schema 和业务规则严格校验。 交付：普通 Schema；SC/复盘扩展契约；批内 ID 完整唯一、字段/长度/枚举/Unicode 半开区间校验；生成文本输出检查；校验错误定位。 behavior: 缺项、重复/批外 ID、额外字段、越界区间、BLOCK/NONE 冲突和违规译文。 预期：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S007 实施步骤（本地内容，不在受管段内）

按顺序做。每张子单单独 commit，提交信息含子单编号。Q3 放在 SUB-013 的 commit 中。

- [x] 1. 本包 spec：`design.md` 与 `tasks.md` 本地段，提交 `VOXWARD-STORY-007: add spec`
- [x] 2. VOXWARD-SUB-013：普通审核、SC 与复盘的版本化 Schema
  - [x] 2.1 `packages/contracts/src/ai/batch.ts`：Q3 的 itemId 与映射类型
  - [x] 2.2 `src/ai/validation.ts`，以及 `moderation-result.ts`、`sc-result.ts`、`review-result.ts`
  - [x] 2.3 `src/ai/index.ts` 与 `src/index.ts` 导出
  - [x] 2.4 `packages/contracts/test/ai/`：正例、负例、Q3 类型测试
- [x] 3. VOXWARD-SUB-014：批内唯一、区间、生成文本检查与错误定位
  - [x] 3.1 `unicode-span.ts`、`errors.ts`、`output-text-check.ts`
  - [x] 3.2 `batch-contract.ts` 与模块 `index.ts` 导出
  - [x] 3.3 `apps/server/test/inference-provider/validation/`：批校验、码点区间、规则引擎端口
- [x] 4. 自测与证据：`evidence/self-check.md`，随最后一个 commit 提交
