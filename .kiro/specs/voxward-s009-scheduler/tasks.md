<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:ac2a8c1b963085361cf086f0 revision=4 sha256=cdcf67a029fe854ac47ea20b9afa3f524e781016862fe706b15f8fd5e22ea616 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现有界调度、动态并发和截止时间
  - Work item: `work:ac2a8c1b963085361cf086f0` revision 4.
  - Goal from the current formal source: 实时、付费和后台任务共享受资源约束的并发容量，并有明确过载及超时行为。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S009-AC001@1 [work:ac2a8c1b963085361cf086f0/VW-S009-R001@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 (调度故障注入、优先级、容量和恢复测试。) VW-S009-PARENT@1 [work:8980504408e4d156c130a8f9/VW-E002-R009@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；调度故障注入、优先级、容量和恢复测试。) VW-S009-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S009-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S009-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。（本单对 VW-R-006 的贡献）: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (调度故障注入、优先级、容量和恢复测试。) VW-S009-INHERIT-008@1 [work:8bd4977aa0770aa2f41229a2/VW-R-008@1] 核对本单与 VW-R-008 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-008 承载。) VW-S009-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S009-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。（本单对 VW-R-010 的贡献）: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (调度故障注入、优先级、容量和恢复测试。) VW-S009-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。（本单对 VW-R-011 的贡献）: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (调度故障注入、优先级、容量和恢复测试。) VW-S009-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S009-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。（本单对 VW-R-017 的贡献）: 无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (调度故障注入、优先级、容量和恢复测试。)
  - Original work notes and delivery details from the current formal source: 交付物：TaskCoordinator/Crew 适配；微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序。 前置：VOXWARD-STORY-002,VOXWARD-STORY-007,VOXWARD-STORY-008 根需求关联：VW-R-006,VW-R-010,VW-R-011,VW-R-017。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 TaskCoordinator/Crew 适配；微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序。 S-PARENT work:8980504408e4d156c130a8f9#VW-E002-R009@requirement@1 [complete] 实时、付费和后台任务共享受资源约束的并发容量，并有明确过载及超时行为。 交付：TaskCoordinator/Crew 适配；微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S009-R001@1: 实时、付费和后台任务共享受资源约束的并发容量，并有明确过载及超时行为。 交付：TaskCoordinator/Crew 适配；微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序。 behavior: 慢请求、限流、队列满、进程重启、删除取消与前序任务超时。 预期：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

## 本地任务（S009，本地进度，不在受管段内）

勾选只表示本地进度，正式完成仍以引擎转态和证据为准。

- [x] S009-SPEC 实施设计与规格（design.md 本地段）
- [x] SUB-017 TaskCoordinator 有界调度、截止时间与有限重试（VOXWARD-SUB-017）
  - [x] 微批、车道与后台余量
  - [x] 截止时间与超时转人工
  - [x] 有限重试与退避
  - [x] 结果提交的代次与事务确认
  - [x] 通道内有限保序
  - [x] 测试 VW-SUB017-AC001
- [ ] SUB-018 TaskCoordinator 的 Crew 适配与动态并发（VOXWARD-SUB-018）
  - [ ] 动态并发上限
  - [ ] Crew 执行器、不可用明确失败、取消与回收
  - [ ] 测试 VW-SUB018-AC001
- [ ] S009-SELF 自测：install、build、typecheck、test、check:deps、kiro-specs check，pnpm dev 与 /healthz
- [ ] S009-EVID 证据：evidence/self-check.md
