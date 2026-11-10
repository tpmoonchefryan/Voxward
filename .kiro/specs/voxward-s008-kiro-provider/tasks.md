<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:352ba5df1e0b354ede1a9af0 revision=4 sha256=2ffa5624ca03977e775036b0ae58d33f5566c6f1f27bf3c9ee2df24cf996f6af -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现 Kiro 适配与一次性会话清理
  - Work item: `work:352ba5df1e0b354ede1a9af0` revision 4.
  - Goal from the current formal source: 通过独立受限运行环境调用真实 Kiro，可靠提取业务输出并清理任务内容。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S008-AC001@1 [work:352ba5df1e0b354ede1a9af0/VW-S008-R001@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 (固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。) VW-S008-PARENT@1 [work:8980504408e4d156c130a8f9/VW-E002-R008@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。) VW-S008-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S008-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S008-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 核对本单与 VW-R-006 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。) VW-S008-INHERIT-008@1 [work:8bd4977aa0770aa2f41229a2/VW-R-008@1] 核对本单与 VW-R-008 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。) VW-S008-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。（本单对 VW-R-009 的贡献）: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。) VW-S008-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。（本单对 VW-R-010 的贡献）: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。) VW-S008-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S008-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。（本单对 VW-R-012 的贡献）: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。) VW-S008-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。（本单对 VW-R-017 的贡献）: 无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (固定版本真实 Kiro 调用、输入/文件观察与故障清理演练。)
  - Original work notes and delivery details from the current formal source: 交付物：InferenceProvider 能力声明；headless 运行流与业务 JSON 分离；必要文本/临时编号输入；取消、成功/失败/孤儿清理；Crew 元数据与内容隔离。 前置：VOXWARD-STORY-003,VOXWARD-STORY-007 根需求关联：VW-R-009,VW-R-010,VW-R-012,VW-R-017。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 InferenceProvider 能力声明；headless 运行流与业务 JSON 分离；必要文本/临时编号输入；取消、成功/失败/孤儿清理；Crew 元数据与内容隔离。 S-PARENT work:8980504408e4d156c130a8f9#VW-E002-R008@requirement@1 [complete] 通过独立受限运行环境调用真实 Kiro，可靠提取业务输出并清理任务内容。 交付：InferenceProvider 能力声明；headless 运行流与业务 JSON 分离；必要文本/临时编号输入；取消、成功/失败/孤儿清理；Crew 元数据与内容隔离。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S008-R001@1: 通过独立受限运行环境调用真实 Kiro，可靠提取业务输出并清理任务内容。 交付：InferenceProvider 能力声明；headless 运行流与业务 JSON 分离；必要文本/临时编号输入；取消、成功/失败/孤儿清理；Crew 元数据与内容隔离。 behavior: 成功、失败、取消、异常重启和提示注入；观察输入及运行目录。 预期：无稳定 ID/昵称/密钥默认外发，无业务库直写或任意宿主权限；本地残留按契约清除，Archive/提供方留存边界如实说明。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S008 实施步骤（本地内容，不在受管段内）

按顺序做。每张子单单独 commit，提交信息含子单编号。证据写入 `.kiro/specs/voxward-s008-kiro-provider/evidence/self-check.md`，随最后一个 commit 提交。本段的勾选只是本地进度，不改变正式工单状态或完成证据。

- [x] 1. 本包 spec：`design.md` 与本段，提交 `VOXWARD-STORY-008: add spec`
- [ ] 2. VOXWARD-SUB-015：Kiro CLI InferenceProvider 适配与受限输入（含 Q3、Q24）
  - [ ] 2.1 契约改为批次形状，`batchId` 贯穿 `infer`、`cancel`、`releaseSession`；类型测试
  - [ ] 2.2 批校验：输出条数先于逐条校验截断，错误列表截断，itemId 码点检查（Q24）；测试
  - [ ] 2.3 合成适配器与两个跨模块测试同步到新形状
  - [ ] 2.4 `apps/server/src/adapters/kiro-cli/`：能力声明、固定参数、输入构造、运行流解析、提供方（不含会话清理）
  - [ ] 2.5 假 CLI fixture 与 `apps/server/test/adapters/kiro-cli/` 用例；泄漏扫描范围扩展
  - [ ] 2.6 提交 `VOXWARD-SUB-015: ...`
- [ ] 3. VOXWARD-SUB-016：一次性会话生命周期、清理与独立受限运行环境
  - [ ] 3.1 `session-lifecycle.ts`、`cleanup.ts`、`orphan-sweep.ts`；提供方接入生命周期
  - [ ] 3.2 `deploy/kiro-runtime/`：说明与模板，不安装
  - [ ] 3.3 `docs/security/ai-retention-boundary.md`
  - [ ] 3.4 `apps/server/test/adapters/kiro-cleanup/`：成功、失败、取消、超时、异常重启、清理证明
  - [ ] 3.5 提交 `VOXWARD-SUB-016: ...`
- [ ] 4. 自测与证据：`evidence/self-check.md`，随最后一个 commit 提交
