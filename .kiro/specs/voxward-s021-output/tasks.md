<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:26274628cbb8f691b6cf430c revision=4 sha256=a308b90f072f7658b40e147284f48a5430f406a696db45b3ac8e0861b096b993 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现只读输出协议与投递状态
  - Work item: `work:26274628cbb8f691b6cf430c` revision 4.
  - Goal from the current formal source: 下游经可撤销凭据订阅获准展示事件，重连和补发遵守去重与有效期。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S021-AC001@1 [work:26274628cbb8f691b6cf430c/VW-S021-R001@1] 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。: 不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 (协议与字段断言、断连/过期/撤销测试和消费者去重样例。) VW-S021-PARENT@1 [work:1f83883cd1373011cf0f8b49/VW-E005-R021@1] 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。: 不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；协议与字段断言、断连/过期/撤销测试和消费者去重样例。) VW-S021-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S021-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。（本单对 VW-R-006 的贡献）: 不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (协议与字段断言、断连/过期/撤销测试和消费者去重样例。) VW-S021-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S021-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 核对本单与 VW-R-010 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。) VW-S021-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S021-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。（本单对 VW-R-012 的贡献）: 不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (协议与字段断言、断连/过期/撤销测试和消费者去重样例。) VW-S021-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S021-INHERIT-018@1 [work:8bd4977aa0770aa2f41229a2/VW-R-018@1] 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。（本单对 VW-R-018 的贡献）: 不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (协议与字段断言、断连/过期/撤销测试和消费者去重样例。) VW-S021-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 核对本单与 VW-R-019 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。)
  - Original work notes and delivery details from the current formal source: 交付物：OutputAdapter 原生协议、字段/版本/鉴权/心跳断连说明；投递 ID 和状态；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED；有限发送与补发契约。 前置：VOXWARD-STORY-002,VOXWARD-STORY-003,VOXWARD-STORY-006,VOXWARD-STORY-009,VOXWARD-STORY-010,VOXWARD-STORY-014 根需求关联：VW-R-018,VW-R-006,VW-R-012。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 OutputAdapter 原生协议、字段/版本/鉴权/心跳断连说明；投递 ID 和状态；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED；有限发送与补发契约。 S-PARENT work:1f83883cd1373011cf0f8b49#VW-E005-R021@requirement@1 [complete] 下游经可撤销凭据订阅获准展示事件，重连和补发遵守去重与有效期。 交付：OutputAdapter 原生协议、字段/版本/鉴权/心跳断连说明；投递 ID 和状态；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED；有限发送与补发契约。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S021-R001@1: 下游经可撤销凭据订阅获准展示事件，重连和补发遵守去重与有效期。 交付：OutputAdapter 原生协议、字段/版本/鉴权/心跳断连说明；投递 ID 和状态；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED；有限发送与补发契约。 behavior: 违规消息、重复投递、断连、过期 SC、人工补发和凭据撤销。 预期：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


---

## 本地实施任务（受管段之外，实施子代理维护）

顺序：先 SUB-039，再 SUB-040。每张子单单独提交，提交信息含子单编号。勾选只表示本地进度，不改变正式工单状态。

### SUB-039（VOXWARD-SUB-039）协议契约、凭据授权、心跳与撤销

- [ ] 1.1 契约：`packages/contracts/src/output/native-v1.ts` 与 `packages/contracts/src/ports/output-port.ts`，导出到 `index.ts`。
- [ ] 1.2 帧与字段白名单：`apps/server/src/modules/output-adapter/native-protocol.ts`（DELIVER、WARD_BLOCKED、HELLO；白名单字段；BLOCK 不含原文）。
- [ ] 1.3 授权存储：`apps/server/src/db/output-store.ts`（签发、撤销、凭据解析、授权有效性、已批准文本读取；只用既有表 `credential_refs`、`output_grants`）。
- [ ] 1.4 订阅策略：`apps/server/src/modules/output-adapter/subscription.ts`（心跳周期、授权复查、关闭码判定）。
- [ ] 1.5 传输：`apps/server/src/adapters/native-output/socket.ts`（ws、升级鉴权、子协议、pong 与 4400/4403/4408/4413）。
- [ ] 1.6 签发与撤销路由：`apps/server/src/auth/routes.ts`（POST／DELETE `/channels/:channelId/output-grants`）。
- [ ] 1.7 组合：`apps/server/src/app.ts` 挂载升级处理、撤销回调与 Q25 固定错误体；`apps/server/package.json` 增加 `ws`、`@types/ws` 与 `--external:ws`。
- [ ] 1.8 Q25：`apps/server/src/security/redaction.ts` 的 `redactUrlText`，并测试。
- [ ] 1.9 测试：`test/output-adapter/protocol/frames.test.ts`、`test/output-adapter/protocol/socket.test.ts`、`test/db/output-store.test.ts`、`test/security/url-redaction.test.ts`、`test/app/error-responses.test.ts`。

### SUB-040（VOXWARD-SUB-040）投递 ID、状态、有限发送与补发契约

- [ ] 2.1 投递泵：`apps/server/src/modules/output-adapter/delivery.ts`（读取可发送行、过期、CAS 为 SENT、失败计数与 FAILED、顺序保持）。
- [ ] 2.2 数据库端口实现：`apps/server/src/db/output-store.ts` 增加投递状态方法（同事务比较状态）。
- [ ] 2.3 补发契约：`apps/server/src/modules/output-adapter/resend.ts`（只发送 PENDING 且未过期；SENT 与 EXPIRED 不自动重发）。
- [ ] 2.4 模块入口：`apps/server/src/modules/output-adapter/index.ts`（`createOutputAdapter`，`deliver` 为唤醒；保留合成适配器绑定）。
- [ ] 2.5 文档：`docs/protocol/output-native-v1.md`（字段、版本、鉴权、心跳、断连、去重、过期与补发）。
- [ ] 2.6 样例：`examples/consumer-dedup/`（按投递 ID 去重；只连 127.0.0.1；凭据只从环境变量读取）。
- [ ] 2.7 测试：`test/output-adapter/delivery/pump.test.ts`、`resend-contract.test.ts`、`consumer-dedup.test.ts`（ALREADY_SENT 经真实决策存储）。
- [ ] 2.8 自测与证据：`.kiro/specs/voxward-s021-output/evidence/self-check.md`，随最后一个提交。

### 自测门禁（两张子单完成后）

- [ ] 3.1 `pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps` 退出 0。
- [ ] 3.2 `kiro-specs.mjs check` 返回 SPEC_CURRENT。
- [ ] 3.3 `tools/smoke.sh` 冒烟通过（不设 `VOXWARD_DATABASE_FILE`）。
