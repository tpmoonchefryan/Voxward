<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:029c382b5915050f0c4de600 revision=4 sha256=16932bf7d1fd9630c6c578d985081fa01f15dd2d3b33e3b1a209d55d56b815dd -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现 SC 安全精翻与模型能力设置
  - Work item: `work:029c382b5915050f0c4de600` revision 4.
  - Goal from the current formal source: 付费文本安全审核后生成可选双语小抄，用户分别选择实时/SC/复盘模型。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S010-AC001@1 [work:029c382b5915050f0c4de600/VW-S010-R001@1] 关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查。: 关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 (跨语种 SC 样本、配置能力与错误路径测试。) VW-S010-PARENT@1 [work:8980504408e4d156c130a8f9/VW-E002-R010@1] 关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查。: 关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；跨语种 SC 样本、配置能力与错误路径测试。) VW-S010-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S010-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S010-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 核对本单与 VW-R-006 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。) VW-S010-INHERIT-008@1 [work:8bd4977aa0770aa2f41229a2/VW-R-008@1] 关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查。（本单对 VW-R-008 的贡献）: 关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (跨语种 SC 样本、配置能力与错误路径测试。) VW-S010-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S010-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查。（本单对 VW-R-010 的贡献）: 关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (跨语种 SC 样本、配置能力与错误路径测试。) VW-S010-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S010-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S010-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼；模型及 reasoning 能力配置和错误反馈。 前置：VOXWARD-STORY-007,VOXWARD-STORY-008,VOXWARD-STORY-009 根需求关联：VW-R-008,VW-R-010,VW-R-019。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼；模型及 reasoning 能力配置和错误反馈。 S-PARENT work:8980504408e4d156c130a8f9#VW-E002-R010@requirement@1 [complete] 付费文本安全审核后生成可选双语小抄，用户分别选择实时/SC/复盘模型。 交付：精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼；模型及 reasoning 能力配置和错误反馈。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S010-R001@1: 付费文本安全审核后生成可选双语小抄，用户分别选择实时/SC/复盘模型。 交付：精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼；模型及 reasoning 能力配置和错误反馈。 behavior: 关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查。 预期：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S010 本地检查表（不是正式完成证据）

勾选只表示本地进度。正式状态以 Einzbern 引擎为准。

- [ ] S0. spec：`kiro-specs.mjs init`，本地段写入 design.md 和 tasks.md，`check` 得到 SPEC_CURRENT（commit：`VOXWARD-STORY-010: add spec`）
- [x] S1. Q40：Super Chat 正文读 `superChatDetails.userComment`；替身改为真实形状，覆盖有留言和无留言（commit：`VOXWARD-STORY-010 Q40`）
- [x] S2. VOXWARD-SUB-019：契约最小改动；模型设置的类型、存储端口、能力检查、处理函数；测试（commit：`VOXWARD-SUB-019`）
- [x] S3. Q23：生成文本命中规则只抑制该条；BLOCK 条目不检查（commit：`VOXWARD-STORY-010 Q23`）
- [x] S4. VOXWARD-SUB-020：SC 流水线、小抄结构、精翻关时的安全审核、测试；证据文件随本 commit 提交（commit：`VOXWARD-SUB-020`）
- [x] S5. 自测：`pnpm install`、`build`、`typecheck`、`test`、`check:deps`、`kiro-specs.mjs check` 全部退出 0
- [x] S6. 冒烟：`smoke.sh` 通过，服务已停止
- [ ] S7. 交付报告
