<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:e5f4bbecea9a82b6068a9ca7 revision=4 sha256=c02aa4814c75cca7c0e29e0d69d826b8fcf4da88f808c019ea15c66f704c81bb -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现兼容输出验证与下游接入指引
  - Work item: `work:e5f4bbecea9a82b6068a9ca7` revision 4.
  - Goal from the current formal source: 提供版本化支持矩阵和可复现接入步骤，完成可行的 blivechat 适配验证。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S024-AC001@1 [work:e5f4bbecea9a82b6068a9ca7/VW-S024-R001@1] 按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。: 通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 (实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。) VW-S024-PARENT@1 [work:1f83883cd1373011cf0f8b49/VW-E005-R024@1] 按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。: 通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。) VW-S024-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S024-INHERIT-006@1 [work:8bd4977aa0770aa2f41229a2/VW-R-006@1] 核对本单与 VW-R-006 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。) VW-S024-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S024-INHERIT-010@1 [work:8bd4977aa0770aa2f41229a2/VW-R-010@1] 核对本单与 VW-R-010 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。) VW-S024-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S024-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S024-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S024-INHERIT-018@1 [work:8bd4977aa0770aa2f41229a2/VW-R-018@1] 按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-018 的贡献）: 通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。) VW-S024-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-019 的贡献）: 通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。)
  - Original work notes and delivery details from the current formal source: 交付物：blivechat 指定版本握手/房间/帧/译文验证；OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面。 前置：VOXWARD-STORY-021 根需求关联：VW-R-018,VW-R-019。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 blivechat 指定版本握手/房间/帧/译文验证；OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面。 S-PARENT work:1f83883cd1373011cf0f8b49#VW-E005-R024@requirement@1 [complete] 提供版本化支持矩阵和可复现接入步骤，完成可行的 blivechat 适配验证。 交付：blivechat 指定版本握手/房间/帧/译文验证；OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S024-R001@1: 提供版本化支持矩阵和可复现接入步骤，完成可行的 blivechat 适配验证。 交付：blivechat 指定版本握手/房间/帧/译文验证；OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面。 behavior: 按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。 预期：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


---

## 本地实施任务（受管段之外）

### Spec-First（D2）
- [x] S0.1 初始化 `.kiro/specs/voxward-s024-compat` 并补齐 `requirements.md`、`design.md`、`tasks.md`
- [ ] S0.2 运行 `kiro-specs.mjs check` 确认 `SPEC_CURRENT` 并单独提交 `VOXWARD-STORY-024: add spec`

### VOXWARD-SUB-044（blivechat 适配与 E2E 验证）
- [ ] 1.1 `apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}` 与 `apps/server/src/modules/output/index.ts`（纯模块层，零 `ws`/`node:*`/跨模块导入）
- [ ] 1.2 `apps/server/src/adapters/native-output/socket.ts` 增加 `ignoredPaths?: ReadonlySet<string>` 实现 upgrade 路由共存
- [ ] 1.3 `apps/server/src/adapters/blivechat/socket.ts` 实现 WS 升级端点、子协议鉴权、`OutputSubscriberRegistry` 注册与撤销 `4403` 断开
- [ ] 1.4 `apps/server/src/app.ts` 组合 `modules/output` 与 `adapters/blivechat/socket.ts` 并与 `attachNativeOutput` 共存
- [ ] 1.5 `apps/server/test/output/blivechat/` 单元测试 + 真实 loopback HTTP+WS 端到端测试
- [ ] 1.6 `docs/integrations/blivechat.md` 文档并提交 `VOXWARD-SUB-044`

### VOXWARD-SUB-045（OneComme/VTS 调研、支持矩阵与 `/guides` 页面）
- [ ] 2.1 `docs/integrations/{support-matrix.md,onecomme.md,vts.md}`
- [ ] 2.2 `apps/web/src/pages/guides/{route.tsx,GuidesPage.tsx,api.ts,__tests__/GuidesPage.test.tsx}`（不修改 `apps/web/src/routes.tsx`）
- [ ] 2.3 `.kiro/specs/voxward-s024-compat/evidence/self-check.md` 并提交 `VOXWARD-SUB-045`

### 门禁与收尾
- [ ] 3.1 `pnpm build`、`pnpm typecheck && pnpm run bench:typecheck`、`node scripts/check-deps.mjs`
- [ ] 3.2 `guarded.sh` 包裹 `pnpm test`、冒烟脚本 `smoke.sh`、`kiro-specs.mjs check` -> `SPEC_CURRENT`
