<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:5fd9e2a6d536e627b7e4bf13 revision=4 sha256=7b3914aafb894f31daac5b7a7c25ae0478c43e63d64fc5fdfeb4b5323a34898d -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现官方直播流、身份能力与重连
  - Work item: `work:5fd9e2a6d536e627b7e4bf13` revision 4.
  - Goal from the current formal source: 官方消息和真实身份能力进入核心流水线，重连与历史补发不重复产生业务事实。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S013-AC001@1 [work:5fd9e2a6d536e627b7e4bf13/VW-S013-R001@1] 初连近期 SC、重复帧、断连恢复、直播结束、配额不足及未知身份。: 不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。 (流式适配器测试及具备凭据/适用条件时的真实接入记录。) VW-S013-PARENT@1 [work:16305a483e701a8d6d794886/VW-E003-R013@1] 初连近期 SC、重复帧、断连恢复、直播结束、配额不足及未知身份。: 不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；流式适配器测试及具备凭据/适用条件时的真实接入记录。) VW-S013-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S013-INHERIT-002@1 [work:8bd4977aa0770aa2f41229a2/VW-R-002@1] 初连近期 SC、重复帧、断连恢复、直播结束、配额不足及未知身份。（本单对 VW-R-002 的贡献）: 不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (流式适配器测试及具备凭据/适用条件时的真实接入记录。) VW-S013-INHERIT-007@1 [work:8bd4977aa0770aa2f41229a2/VW-R-007@1] 核对本单与 VW-R-007 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-007 承载。) VW-S013-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S013-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S013-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S013-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：streamList 连接/恢复/结束；平台 ID 去重与补发年龄；能力来源/unknown；配额监控；不无条件高频轮询。 前置：VOXWARD-STORY-006,VOXWARD-STORY-012 根需求关联：VW-R-002,VW-R-003,VW-R-004,VW-R-006。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 streamList 连接/恢复/结束；平台 ID 去重与补发年龄；能力来源/unknown；配额监控；不无条件高频轮询。 S-PARENT work:16305a483e701a8d6d794886#VW-E003-R013@requirement@1 [complete] 官方消息和真实身份能力进入核心流水线，重连与历史补发不重复产生业务事实。 交付：streamList 连接/恢复/结束；平台 ID 去重与补发年龄；能力来源/unknown；配额监控；不无条件高频轮询。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S013-R001@1: 官方消息和真实身份能力进入核心流水线，重连与历史补发不重复产生业务事实。 交付：streamList 连接/恢复/结束；平台 ID 去重与补发年龄；能力来源/unknown；配额监控；不无条件高频轮询。 behavior: 初连近期 SC、重复帧、断连恢复、直播结束、配额不足及未知身份。 预期：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

## 本地实施清单（非受管段）

勾选只表示本地进度。正式状态与证据仍经引擎的工作转态和证据记录。

- [x] S0 规格：design.md 与本清单的本地段（提交 `VOXWARD-STORY-013: add spec`）
- [x] Q28-1 OAuth 授权码绑定 PKCE、S256 挑战与 code_verifier 兑换（`oauth.ts`）
- [x] Q28-2 回调先查看、校验后消费 state（`routes.ts`）
- [x] Q28-3 重新授权后撤销旧行并删除旧密文（`credentials.ts`、`credential-vault.ts`）
- [x] Q28-4 负面用例：他人 state 加主播授权码、缺失或错误 verifier、重新授权后旧凭据不可用（提交 `VOXWARD-STORY-013 Q28`）
- [x] Q20-1 身份路径：基准分全额、最终分钳制、行为分不变（`identity-events.ts`、`clamp.ts`）
- [x] Q20-2 分数行与账本行在基准分变化时落库（`db/scoring-ledger.ts`）
- [x] Q20-3 上限处升级再到期的测试与既有期望更新（提交 `VOXWARD-STORY-013 Q20`）
- [x] VOXWARD-SUB-024：streamList 连接、恢复、结束、去重、补发年龄、退避与配额门（提交 `VOXWARD-SUB-024: ...`）
- [x] VOXWARD-SUB-025：身份映射、配额监测、版本化业务事件（提交 `VOXWARD-SUB-025: ...`）
- [x] 自测：pnpm install、build、typecheck、test、check:deps、kiro-specs check 全部退出 0；启动冒烟；`evidence/self-check.md` 随最后一个提交
