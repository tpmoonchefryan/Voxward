<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:40166e96c2ab9f8c9746a73a revision=4 sha256=e498f3f8608b9a41024d54686a3c68cc953dfe51e0fc1bd8192d29b68d369f24 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 建立 SQLite 模型、迁移与事务边界
  - Work item: `work:40166e96c2ab9f8c9746a73a` revision 4.
  - Goal from the current formal source: 在服务器本地持久卷建立可迁移的 SQLite WAL 数据层与短事务仓储。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S002-AC001@1 [work:40166e96c2ab9f8c9746a73a/VW-S002-R001@1] 并发请求写入、提交中断、迁移重跑和业务服务重启。: 唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 (迁移演练、事务回滚/并发测试和数据字典核验。) VW-S002-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R002@1] 并发请求写入、提交中断、迁移重跑和业务服务重启。: 唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；迁移演练、事务回滚/并发测试和数据字典核验。) VW-S002-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 并发请求写入、提交中断、迁移重跑和业务服务重启。（本单对 VW-R-001 的贡献）: 唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-001 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (迁移演练、事务回滚/并发测试和数据字典核验。) VW-S002-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 核对本单与 VW-R-003 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-003 承载。) VW-S002-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 核对本单与 VW-R-004 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-004 承载。) VW-S002-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S002-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S002-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 并发请求写入、提交中断、迁移重跑和业务服务重启。（本单对 VW-R-011 的贡献）: 唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (迁移演练、事务回滚/并发测试和数据字典核验。) VW-S002-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S002-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S002-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 并发请求写入、提交中断、迁移重跑和业务服务重启。（本单对 VW-R-017 的贡献）: 唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (迁移演练、事务回滚/并发测试和数据字典核验。)
  - Original work notes and delivery details from the current formal source: 交付物：频道、权限、主体、评分账本、规则、任务/裁决/投递、数据请求和日志所需表/索引；迁移及事务接口；敏感凭据只存受控引用。 前置：VOXWARD-STORY-001 根需求关联：VW-R-001,VW-R-011,VW-R-017。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 频道、权限、主体、评分账本、规则、任务/裁决/投递、数据请求和日志所需表/索引；迁移及事务接口；敏感凭据只存受控引用。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R002@requirement@1 [complete] 在服务器本地持久卷建立可迁移的 SQLite WAL 数据层与短事务仓储。 交付：频道、权限、主体、评分账本、规则、任务/裁决/投递、数据请求和日志所需表/索引；迁移及事务接口；敏感凭据只存受控引用。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S002-R001@1: 在服务器本地持久卷建立可迁移的 SQLite WAL 数据层与短事务仓储。 交付：频道、权限、主体、评分账本、规则、任务/裁决/投递、数据请求和日志所需表/索引；迁移及事务接口；敏感凭据只存受控引用。 behavior: 并发请求写入、提交中断、迁移重跑和业务服务重启。 预期：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# S002 实施步骤（本地内容，不在受管段内）

按顺序做。每张子单单独 commit，提交信息含子单编号。Q1、Q2 按批次要求各自单独 commit。

- [x] 1. 本包 spec：VOXWARD-STORY-002 的 `design.md` 与 `tasks.md` 本地段，提交 `033bfe2`（`VOXWARD-STORY-002: add S002 spec`）
- [x] 2. Q1：`scripts/check-deps.mjs` 增加 db 分区与规则，提交 `de7189a`
  - [x] 2.1 分区 `db`、白名单包 `drizzle-orm`、`better-sqlite3`，组合层可引用 `db`
  - [x] 2.2 负面对照：4 个临时违规文件各自报错，删除后 `pnpm check:deps` 为 0 违规
- [x] 3. VOXWARD-SUB-004：数据表、索引、初始迁移与数据字典，提交 `468c382`
  - [x] 3.1 依赖与构建许可：`drizzle-orm`、`better-sqlite3`、`drizzle-kit`、`@types/better-sqlite3`；`db:generate` 脚本；`drizzle.config.ts`
  - [x] 3.2 `apps/server/src/db/schema/*.ts`：24 张表、索引、唯一约束、CHECK
  - [x] 3.3 `drizzle-kit generate --name initial` 生成 `apps/server/src/db/migrations/`
  - [x] 3.4 `docs/data-dictionary.md` 逐表核对
- [x] 4. VOXWARD-SUB-005：WAL 连接、迁移执行与短事务仓储，提交 `d1847ff`、`29bbec5`
  - [x] 4.1 配置键 `databaseFile` 与环境变量映射，并更新配置测试
  - [x] 4.2 `apps/server/src/db/client.ts`、`migrate.ts`、`transaction.ts`、`repository.ts`
  - [x] 4.3 `apps/server/test/db/`：schema、迁移、事务、仓储、约束、并发与中断
- [x] 5. Q2：`main.ts` 监听失败时输出一行受控错误并以非 0 退出，提交 `e459879`
  - [x] 5.1 捕获 listen 错误，写一行 stderr，退出码 1
  - [x] 5.2 `apps/server/test/app/startup-errors.test.ts`
- [x] 6. 自测与证据：`.kiro/specs/voxward-s002-storage/evidence/self-check.md`，随本包最后一个提交保存
