<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:4c1238d3c3d98f2cc2f7d756 revision=4 sha256=cd4c9fa17111b306e7b19316552166ff99015adae56fc4b3469371496f1ec61b -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现 Change Log 与 Technical Log 数据层
  - Work item: `work:4c1238d3c3d98f2cc2f7d756` revision 4.
  - Goal from the current formal source: 实际业务变更与处理过程以两类日志记录，受控证据及 JSON 可定位且可删除。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S016-AC001@1 [work:4c1238d3c3d98f2cc2f7d756/VW-S016-R001@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 (日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-PARENT@1 [work:18aaac72724b30c2ee9be8b6/VW-E004-R016@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S016-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S016-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。（本单对 VW-R-011 的贡献）: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S016-INHERIT-013@1 [work:8bd4977aa0770aa2f41229a2/VW-R-013@1] 核对本单与 VW-R-013 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。) VW-S016-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S016-INHERIT-015@1 [work:8bd4977aa0770aa2f41229a2/VW-R-015@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。（本单对 VW-R-015 的贡献）: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 继续遵守 VW-R-015 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-INHERIT-016@1 [work:8bd4977aa0770aa2f41229a2/VW-R-016@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。（本单对 VW-R-016 的贡献）: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。（本单对 VW-R-017 的贡献）: 全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (日志落库、关联索引、字段权限及多主体删除索引测试。) VW-S016-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 核对本单与 VW-R-019 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。)
  - Original work notes and delivery details from the current formal source: 交付物：两类日志 schema/写入接口；logId/correlationId/频道/sequence；task/batch/attempt；内容字段权限/长度；主题删除索引；模型建议与实际采纳分开。 前置：VOXWARD-STORY-002,VOXWARD-STORY-003 根需求关联：VW-R-015,VW-R-016,VW-R-011,VW-R-017。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 两类日志 schema/写入接口；logId/correlationId/频道/sequence；task/batch/attempt；内容字段权限/长度；主题删除索引；模型建议与实际采纳分开。 S-PARENT work:18aaac72724b30c2ee9be8b6#VW-E004-R016@requirement@1 [complete] 实际业务变更与处理过程以两类日志记录，受控证据及 JSON 可定位且可删除。 交付：两类日志 schema/写入接口；logId/correlationId/频道/sequence；task/batch/attempt；内容字段权限/长度；主题删除索引；模型建议与实际采纳分开。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S016-R001@1: 实际业务变更与处理过程以两类日志记录，受控证据及 JSON 可定位且可删除。 交付：两类日志 schema/写入接口；logId/correlationId/频道/sequence；task/batch/attempt；内容字段权限/长度；主题删除索引；模型建议与实际采纳分开。 behavior: 同一消息规则、推理、重试、人工、计分和投递写日志，微批包含多主体。 预期：全程关联稳定，原文不复制到 Change Log/队列，微批结果按消息隔离；无第三类 AI 日志、密钥或完整会话。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# 本地实施清单（不在受管段内）

勾选只表示本地进度，不是正式完成证据。正式状态以引擎为准。

## VOXWARD-SUB-029：写入接口与关联字段

- [x] 29-a. 契约：枚举、记录类型、`AuditLogPort`；`AuditEntry` 改为判别联合；导出新端口
- [x] 29-b. 迁移 `0002_audit_log_fields.sql`（ALTER 写法）与 drizzle-kit 快照；`schema/logs.ts` 从 contracts 取枚举；`docs/data-dictionary.md` 三节更新；`schema.test.ts` 与 `constraints.test.ts` 通过
- [x] 29-c. `db/audit-log.ts`：`insertChangeLog`、`insertTechnicalLog`（分配 sequence）、`readChain`、`readChangeLogs`
- [x] 29-d. 模块写入路径：校验、注入的脱敏、关联 ID、`recordChange`、`recordTechnical`、`append`；测试 `write/chain.test.ts`、`limits.test.ts`、`redaction.test.ts`
- [x] 29-e. 自测（本子单相关的 build、typecheck、test、check:deps）；提交，提交信息含 `VOXWARD-SUB-029`

## VOXWARD-SUB-030：内容字段权限、长度与主体删除索引

- [ ] 30-a. `content-policy.ts`：证据能力映射、读取裁剪、保留期限常量
- [ ] 30-b. `deletion-index.ts`：`locateSubject`、`removeSubject`；`db/audit-log.ts` 的 `locateSubjectLogs`、`removeSubjectLogs`；`invalidation.ts`
- [ ] 30-c. 测试 `deletion-index/subject-removal.test.ts`、`field-permission.test.ts`、`test/db/audit-log.test.ts`
- [ ] 30-d. 提交，提交信息含 `VOXWARD-SUB-030`

## 收尾

- [ ] 自测全集：`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check`，再做 `pnpm dev` 的 `/healthz` 冒烟
- [ ] 写入 `evidence/self-check.md`，单独提交
