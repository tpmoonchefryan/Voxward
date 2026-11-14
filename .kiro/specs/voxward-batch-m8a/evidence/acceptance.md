# VoxWard Batch m8a 独立验收证据（候选 `1d259d3`）

## 1. 验收元数据与独立门禁总览

- **候选提交**：`1d259d3`（完整 SHA `1d259d3464ed9c2b924bb6dc7698de61185f780a`，只读检出工作树 `.worktrees/verify-m8a`）
- **涵盖工单（5 张首次验收，共 58 行验收判据）**：
  - `VOXWARD-STORY-023`（`work:4cf6a15287447d5046c0df9c`，`rev=4`，11 行）：OBS 透明 Overlay、双语 SC 卷轴、结界拦截动画/短音效与断连恢复（合入提交 `dc04481`：规格 `755adfc` 先于实现 `73a61b6`）
  - `VOXWARD-SUB-043`（`work:ca0be638bce1de65b0964274`，`rev=3`，12 行）：S023 唯一实施子单
  - `VOXWARD-STORY-024`（`work:e5f4bbecea9a82b6068a9ca7`，`rev=4`，11 行）：版本化第三方集成支持矩阵、`/guides` 接入指引与 `blivechat` v1.x 协议适配验证（合入提交 `1d259d3`：规格 `1cb4f44` 先于实现 `a2de73d`、`540c003`、`49a7bcb`）
  - `VOXWARD-SUB-044`（`work:5e629e36f0bfb2e4327c7a39`，`rev=3`，12 行）：`blivechat` v1.x 协议适配与 loopback 端到端验证
  - `VOXWARD-SUB-045`（`work:364a7a1320c5d0a5388fd171`，`rev=3`，12 行）：`OneComme` / `VTS` 官方能力调研、版本化支持矩阵与 `/guides` 指引页
- **工单快照基准（E01）**：`libraryVersion=21554`，`headEventHash=6faaac90a5d80312de619e61a0fa14582e4e9382bae7535cbfcd68b2f3397755`，5 张工单既有 `content.evidence` 均为空（首次独立验收）。
- **总体结论**：**5 张工单 58/58 行全部 `satisfied`（`failed=0`，`unverified=0`；其中 `machine=23`、`source-behavior-review=35`）**；主规格 `Q16` 与 `Q25` 在 `1d259d3` 上完整闭环。

### 1.1 独立门禁与行为探针登记表

| 编号 | 命令 / 探针 | 退出码 | 关键观测结果 |
| --- | --- | --- | --- |
| `E01` | 实时工单快照核对（`VOXWARD-{STORY-023,SUB-043,STORY-024,SUB-044,SUB-045}.json`） | `0` | 5 单共 `11+12+11+12+12=58` 行，`rev` 分别为 `4/3/4/3/3`，均无历史证据残留 |
| `D2` | Git DAG 规格先行核查（`git log --graph` on `1d259d3`） | `0` | `S023` 规格 `755adfc` 先于实现 `73a61b6`；`S024` 规格 `1cb4f44` 先于实现 `a2de73d`/`540c003`/`49a7bcb` |
| `E03` | `pnpm build`（`.worktrees/verify-m8a`） | `0` | `@voxward/contracts`、`@voxward/server`、`@voxward/web` 全量构建零警告通过（产包 `dist/assets/index-B7WkbU5T.js`） |
| `E04` | `pnpm typecheck && pnpm run bench:typecheck` | `0` | 全仓与基准套件 TypeScript 严格检查全部 0 错误通过 |
| `E05` | `guarded.sh` 下定向 Vitest（`s023-q16-q25.test.ts`、`frames.test.ts`、`socket.test.ts`、`overlay.test.tsx`、`GuidesPage.test.tsx`） | `0` | **5 文件 16/16 用例全绿**；主线程同 SHA `1d259d3` 全量 `guarded.sh pnpm test` 基线 **160/160 文件、1918/1918 用例全绿**，默认配置 `smoke.sh` 双 `/healthz` 返回 `200` 且 `:3000/:5173` 残留监听为 `0` |
| `E06` | `pnpm check:deps` | `0` | `check-deps: ok, 249 files checked, 0 violations` |
| `E09` | 架构门负向控制（独立临时副本注入 4 类跨层违规：`adapter->module`、`module->ws`、`module->node:http`、`web->adapter`） | `1` | 准确检出 `4 violation(s) across 4 files` 并以非零退出码阻断，验证门禁无空放 |
| `E10` | `kiro-specs.mjs check`（`voxward-s023-overlay` & `voxward-s024-compat`） | `0` | 两份子规格均返回 `status: "SPEC_CURRENT"`（`workRevision: 4`） |
| `E80` | `guarded.sh` 下独立综合探针 `probe-m8a.mts`（`S1`–`S5`） | `0` | `{"total":5,"allPassed":true}`：覆盖路由自动发现、CC0 资产/WAV PCM 头与零外链、Q16 fragment 擦除与 query 拒连、`<bdi>` 防 XSS、`WARD_BLOCKED` 同 `platformOrder` 回缩、55 帧突发 + 断连去重 + 过期过滤 + `4400`/`4413`/`4403`、Q25 400/414 防反射与日志 `[REDACTED]`、`blivechat` 与原生端点共存 + `JOIN_ROOM` 防跨频道伪造 + `WARD_BLOCKED` 零泄漏、`/guides` 诚实支持矩阵 |
| `Q58` | 外网阻断与命令垫片审计（`q58-audit.json`） | `0` | `e05-s023-s024-vitest` 与 `e80-m8a` 均 `guardLoaded: true`，5 个哨兵外部域名全部 `ECONNREFUSED`/`ENOTFOUND`，测试期间违规外连 `0`、`shim.log` 触发 `0` 行 |

### 1.2 诚实外部边界声明（Honest External Boundaries）

1. **桌面 OBS Studio 宿主 GUI 联调边界（S023 / SUB-043）**：本轮在无图形桌面的 Linux 验收环境中完成了构建产物、React SSR/JSDOM 组件行为、真实本地临时端口 HTTP/WebSocket 协议流、CC0 SVG/WAV 资产格式与浏览器安全边界实测；**未启动桌面版 OBS Studio GUI 客户端进行 Browser Source / Custom Dock 实机渲染截图或混音器录屏**。各相关验收行均如实记录该外部环境边界，不冒充桌面 GUI 实机录屏。
2. **独立第三方 `blivechat` 上游进程边界（S024 / SUB-044 / SUB-045）**：本轮通过真实本地 WebSocket 客户端完整实测了 `/output/blivechat/v1/chat` 的 `blivechat-v1.x-json-ws` 子协议握手、`JOIN_ROOM`/`HEARTBEAT`/`ADD_TEXT`/`ADD_SUPER_CHAT` 帧结构、跨频道隔离、`WARD_BLOCKED` 抑制与吊销断连；**未在验收机启动独立上游 `blivechat` Python/桌面可执行程序做跨进程 GUI 联调**。代码与文档本身亦严格遵守此诚实边界，将该项标为 `VERIFIED_LOOPBACK`（协议适配已验证，限本机 loopback E2E）而非 `SUPPORTED`。
3. **`OneComme` 与 `VTube Studio` 本机 API 拓扑边界（S024 / SUB-045）**：两者官方接口均监听主播本机 `localhost`（`127.0.0.1:11180` 与 `ws://localhost:8001`），云端自托管的 VoxWard 服务端无法直连主播电脑回环地址；按项目硬约束不开发新本机代理、不以浏览器反向上传替代平台接入，故诚实标为 `UNSUPPORTED`。

### 1.3 主规格关联问题闭环（Q16、Q25）与非阻塞建议（N13、N14）

- **`Q16`（只读输出凭据传输面与禁用 URL query）**：**CLOSED（已在 `1d259d3` 闭环）**。S021 完成了服务端 `Sec-WebSocket-Protocol: vw-cred.<cred>` 握手与 query 拒绝；本批 S023 在 `apps/web/src/pages/overlay/api.ts` 与 `Stage.tsx` 完成了 `#fragment` 解析、建连前 `history.replaceState` 立即擦除 fragment，以及对含 `?cred=/token=/credential=` URL 的前端主动拒连，S024 `blivechat` 端点同样强制走 `Sec-WebSocket-Protocol`。
- **`Q25`（WebSocket 背压、反向上传拒绝与畸形 URL/Host 日志脱敏）**：**CLOSED（已在 `1d259d3` 闭环）**。`apps/server/src/app.ts` 的 `frameworkErrorReply` 与 `serializeRequest` 对畸形路由返回固定 `400 {"error":"BAD_REQUEST"}`、超长 URI 返回 `414 {"error":"URI_TOO_LONG"}` 且不回显路径，对 URL 与异常 `Host` 头中直接或百分号编码的 `vwo_` 凭据统一脱敏为 `[REDACTED]`；原生与 `blivechat` WebSocket 均实施 `4400` 禁上行与 `4413` 背压断连保护。
- **非阻塞建议 `N13`（供后续 S026 全链路装配参考）**：`apps/server/src/db/output-store.ts:151-152` 直接将 `technical_log_evidence` 中 `TRANSLATION` 的 `payload` 字符串原样赋给 `display.translation`，而 S022 `apps/server/src/db/channel-panel-read.ts:116-130` 支持解析 JSON 结构 `{ translation, notes, acknowledgement, safeAlias }`；建议 S026 装配实时 SC 精翻落库时统一输出投影格式（避免 `/overlay` 或 `blivechat` 直接显示原始 JSON 串），并注意 `native-v1.ts` 的 `DisplayPayload` 当前仅含 `{ label, text, translation }`（梗注若需上屏应拼入译文展示串或保持在主播端 `/dock` 侧展示）。
- **非阻塞建议 `N14`（S024 设计文档细微措辞对齐）**：`.kiro/specs/voxward-s024-compat/design.md:82` 将 `blivechat-v1.x-json-ws` 子协议写成「可选同时提供」，而实际实现 `apps/server/src/adapters/blivechat/socket.ts:62` 及面向用户的 `docs/integrations/blivechat.md:12`、`GuidesPage.tsx:50` 均正确要求同时提供 `blivechat-v1.x-json-ws` 与 `vw-cred.<credential>`（符合 RFC 6455 子协议回显约束）；后续若归档修订规格可顺手对齐该句描述。

---

## 2. 逐单逐行验收记录（58 行）

### VOXWARD-STORY-023（`work:4cf6a15287447d5046c0df9c`，`rev=4`，11 行）

- **目标**：OBS Browser Source/Custom Dock 可从远端显示获准双语 SC 和拦截舞台事件。

<a id="vw-s023-ac001"></a>
##### VW-S023-AC001（v1 · `VW-S023-R001@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上独立实测 VOXWARD-STORY-023：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。满足 VW-S023-AC001 全部判据。

<a id="vw-s023-parent"></a>
##### VW-S023-PARENT（v1 · `VW-E005-R023@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上独立实测 VOXWARD-STORY-023：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。同候选版本 1d259d3 的前端/协议组件与文档材料已联调保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R023）。

<a id="vw-s023-inherit-001"></a>
##### VW-S023-INHERIT-001（v1 · `VW-R-001@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单产出的接口、说明及依赖方向。
- **预期**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 路由、组件与依赖边界（E03/E04/E06/E09、E80 S1）：apps/web/src/routes.tsx 零改动自动发现 /overlay/:roomId；Overlay 通过只读 WebSocket 契约 packages/contracts/src/output/native-v1.ts 通信，pnpm check:deps 扫描 249 文件 0 违规（E09 负控注入 4 类跨层违规均准确检出 exit 1）；无新本机代理、生产托管依赖或供应商 SDK 对象穿透业务层。

<a id="vw-s023-inherit-006"></a>
##### VW-S023-INHERIT-006（v1 · `VW-R-006@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **实际观测与核验结论**：核对与 VW-R-006（实时审核与输出流水线）的接口衔接：Overlay 只消费服务端已落库的 native-v1 DELIVER / WARD_BLOCKED / HEARTBEAT 帧，不介入审核裁决或绕过服务端门控；E80 S2/S3 验证先发后审或重判 WARD_BLOCKED 时同 platformOrder 已展示卡片立即回缩；全链路容量与端到端门控仍由责任单及 INIT VW-AC-006 承载。

<a id="vw-s023-inherit-009"></a>
##### VW-S023-INHERIT-009（v1 · `VW-R-009@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **预期**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 接触的数据字段与日志材料（E80 S1–S3）：Overlay 不调用任何 AI 接口，仅接收 OutputEventFrame 最小展示载荷（label、text、translation、reasonClass），不触碰完整会话/提示/工具轨迹或观众原始身份；Q25 请求日志序列化器对含凭据 URL 与异常 Host 做 [REDACTED] 脱敏，docs/obs/setup.md 未宣称应用清理等于外部平台删除。

<a id="vw-s023-inherit-010"></a>
##### VW-S023-INHERIT-010（v1 · `VW-R-010@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **实际观测与核验结论**：核对与 VW-R-010（故障退化、背压与安全降级）的衔接（E80 S3）：WebSocket 断连后进入指数退避重连并展示「连接中断，正在重连」状态条，4403/4400 终态错误停止盲目重连；服务端慢消费者背压以 4413 隔离慢连接且不拖垮同房间正常订阅者，过期帧（validUntil <= now）重连后不补播；完整退化演练继续由 INIT VW-AC-010 承载。

<a id="vw-s023-inherit-011"></a>
##### VW-S023-INHERIT-011（v1 · `VW-R-011@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。
- **预期**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 数据与存储边界（源码审查 + E80 S3）：/overlay/:roomId 纯前端只读订阅页面，不直写数据库、不缓存持久化观众正文（仅内存 Map 去重，刷新或关闭即释放），客户端向 /output/v1/room 发送任何上行帧均被服务端以 4400 CLIENT_UPLOAD_FORBIDDEN 关闭；服务端写入仍统一由单后端 SQLite 短事务承载。

<a id="vw-s023-inherit-012"></a>
##### VW-S023-INHERIT-012（v1 · `VW-R-012@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。
- **预期**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 凭据、权限与防注入边界（E05、E80 S1–S3）：输出凭据通过 #fragment 传入并在建连前 history.replaceState 擦除，禁止 query 传参（Q16），输出凭据访问管理接口返回 401，撤销后活跃连接立即收到 4403；不可信文本经 <bdi class="vw-untrusted"> 纯文本渲染，0 处 dangerouslySetInnerHTML，不把待审或获准文本当脚本或工具指令执行；docs/obs/setup.md 全部使用占位符示例。

<a id="vw-s023-inherit-017"></a>
##### VW-S023-INHERIT-017（v1 · `VW-R-017@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **预期**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 与数据生命周期/过期边界（源码审查 + E80 S2/S3）：Overlay 不建立本地持久化副本（无 localStorage/IndexedDB 正文缓存），重连回放严格过滤 validUntil 过期帧，收到吊销（4403）或 WARD_BLOCKED 回缩事件即刻清除对应舞台状态；docs/obs/setup.md 明确标注保护范围仅限经 VoxWard 审核通道展示的内容。

<a id="vw-s023-inherit-018"></a>
##### VW-S023-INHERIT-018（v1 · `VW-R-018@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。（本单对 VW-R-018 的贡献）
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上独立实测 VOXWARD-STORY-023：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。遵守 VW-R-018 远端接入与诚实边界，无新本机代理；INIT 全量验收仍由责任单承载。

<a id="vw-s023-inherit-019"></a>
##### VW-S023-INHERIT-019（v1 · `VW-R-019@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。（本单对 VW-R-019 的贡献）
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上独立实测 VOXWARD-STORY-023：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。遵守 VW-R-019 只读输出与安全展示边界；INIT 全量验收仍由责任单承载。

### VOXWARD-SUB-043（`work:ca0be638bce1de65b0964274`，`rev=3`，12 行）

- **目标**：OBS Browser Source 与 Custom Dock 可从远端加载透明 Overlay，显示获准双语 SC 卷轴、梗注与安全称呼，以及不泄露原文/身份的拦截结界动画与短音效，断连恢复与过期展示正确。

<a id="vw-sub043-ac001"></a>
##### VW-SUB043-AC001（v1 · `VW-SUB043-R001@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。满足 VW-S023-AC001 全部判据。

<a id="vw-sub043-story"></a>
##### VW-SUB043-STORY（v1 · `VW-S023-R001@1` · `machine` · `satisfied`）

- **场景**：本单承担 VW-S023-R001@1 中「透明 Overlay、双语卷轴/梗注/安全称呼、结界动画和短音效；OBS 配置说明；断连/恢复与过期展示；来源/保护范围提示」：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。 本单只证明所承担部分；VOXWARD-STORY-023 的完整判据（VW-S023-AC001@1）保持。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。本子单交付与实测证据完整支撑 VOXWARD-STORY-023 对应要求，Story 完整判据保持。

<a id="vw-sub043-parent"></a>
##### VW-SUB043-PARENT（v1 · `VW-E005-R023@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。（继承自 VOXWARD-STORY-023 VW-S023-PARENT@1）
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。同候选版本 1d259d3 的前端/协议组件与文档材料已联调保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R023）。

<a id="vw-sub043-inherit-001"></a>
##### VW-SUB043-INHERIT-001（v1 · `VW-R-001@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-001@1）
- **预期**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 路由、组件与依赖边界（E03/E04/E06/E09、E80 S1）：apps/web/src/routes.tsx 零改动自动发现 /overlay/:roomId；Overlay 通过只读 WebSocket 契约 packages/contracts/src/output/native-v1.ts 通信，pnpm check:deps 扫描 249 文件 0 违规（E09 负控注入 4 类跨层违规均准确检出 exit 1）；无新本机代理、生产托管依赖或供应商 SDK 对象穿透业务层。

<a id="vw-sub043-inherit-006"></a>
##### VW-SUB043-INHERIT-006（v1 · `VW-R-006@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-006@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **实际观测与核验结论**：核对与 VW-R-006（实时审核与输出流水线）的接口衔接：Overlay 只消费服务端已落库的 native-v1 DELIVER / WARD_BLOCKED / HEARTBEAT 帧，不介入审核裁决或绕过服务端门控；E80 S2/S3 验证先发后审或重判 WARD_BLOCKED 时同 platformOrder 已展示卡片立即回缩；全链路容量与端到端门控仍由责任单及 INIT VW-AC-006 承载。

<a id="vw-sub043-inherit-009"></a>
##### VW-SUB043-INHERIT-009（v1 · `VW-R-009@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-009@1）
- **预期**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 接触的数据字段与日志材料（E80 S1–S3）：Overlay 不调用任何 AI 接口，仅接收 OutputEventFrame 最小展示载荷（label、text、translation、reasonClass），不触碰完整会话/提示/工具轨迹或观众原始身份；Q25 请求日志序列化器对含凭据 URL 与异常 Host 做 [REDACTED] 脱敏，docs/obs/setup.md 未宣称应用清理等于外部平台删除。

<a id="vw-sub043-inherit-010"></a>
##### VW-SUB043-INHERIT-010（v1 · `VW-R-010@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-010@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **实际观测与核验结论**：核对与 VW-R-010（故障退化、背压与安全降级）的衔接（E80 S3）：WebSocket 断连后进入指数退避重连并展示「连接中断，正在重连」状态条，4403/4400 终态错误停止盲目重连；服务端慢消费者背压以 4413 隔离慢连接且不拖垮同房间正常订阅者，过期帧（validUntil <= now）重连后不补播；完整退化演练继续由 INIT VW-AC-010 承载。

<a id="vw-sub043-inherit-011"></a>
##### VW-SUB043-INHERIT-011（v1 · `VW-R-011@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-011@1）
- **预期**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 数据与存储边界（源码审查 + E80 S3）：/overlay/:roomId 纯前端只读订阅页面，不直写数据库、不缓存持久化观众正文（仅内存 Map 去重，刷新或关闭即释放），客户端向 /output/v1/room 发送任何上行帧均被服务端以 4400 CLIENT_UPLOAD_FORBIDDEN 关闭；服务端写入仍统一由单后端 SQLite 短事务承载。

<a id="vw-sub043-inherit-012"></a>
##### VW-SUB043-INHERIT-012（v1 · `VW-R-012@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-012@1）
- **预期**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 凭据、权限与防注入边界（E05、E80 S1–S3）：输出凭据通过 #fragment 传入并在建连前 history.replaceState 擦除，禁止 query 传参（Q16），输出凭据访问管理接口返回 401，撤销后活跃连接立即收到 4403；不可信文本经 <bdi class="vw-untrusted"> 纯文本渲染，0 处 dangerouslySetInnerHTML，不把待审或获准文本当脚本或工具指令执行；docs/obs/setup.md 全部使用占位符示例。

<a id="vw-sub043-inherit-017"></a>
##### VW-SUB043-INHERIT-017（v1 · `VW-R-017@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-017@1）
- **预期**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S023 与数据生命周期/过期边界（源码审查 + E80 S2/S3）：Overlay 不建立本地持久化副本（无 localStorage/IndexedDB 正文缓存），重连回放严格过滤 validUntil 过期帧，收到吊销（4403）或 WARD_BLOCKED 回缩事件即刻清除对应舞台状态；docs/obs/setup.md 明确标注保护范围仅限经 VoxWard 审核通道展示的内容。

<a id="vw-sub043-inherit-018"></a>
##### VW-SUB043-INHERIT-018（v1 · `VW-R-018@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。（本单对 VW-R-018 的贡献）（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-018@1）
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。遵守 VW-R-018 远端接入与诚实边界，无新本机代理；INIT 全量验收仍由责任单承载。

<a id="vw-sub043-inherit-019"></a>
##### VW-SUB043-INHERIT-019（v1 · `VW-R-019@1` · `machine` · `satisfied`）

- **场景**：远端 OBS 连接、获准 SC、WARD_BLOCKED、断连重连及不可信文本。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-023 VW-S023-INHERIT-019@1）
- **预期**：拦截动画不泄露原文/身份；无过时自动补播、TTS 或语音第二裁决；原文和生成内容区分，文本不执行脚本。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际 OBS/浏览器联调、截图/录像和字段/过期测试。
- **实际观测与核验结论**：在 1d259d3（S023 合入提交 dc04481）上核验 VOXWARD-SUB-043 承担的透明 Overlay、双语卷轴/安全称呼、结界动画与短音效、OBS 配置说明、断连/恢复与过期展示及保护范围提示：（1）Q16 URL fragment 与握手（E05 overlay.test.tsx + s023-q16-q25.test.ts、E80 S2/S3）：Stage.tsx 仅从 #vwo_... 或 #cred=vwo_... 读取凭据并在建连前调用 history.replaceState 清掉 fragment，URL 含 ?cred=/token=/credential=（即使同时带 #vwo_...）一律拒连报错；WebSocket 以 Sec-WebSocket-Protocol: ["vw-output.v1","vw-cred.<cred>"] 建连且服务端只回显 vw-output.v1，不带子协议仅靠 query 的升级请求返回 401，输出凭据调管理端点 /channels/:id/dock 返回 401。（2）双语卷轴、不可信文本与防注入（E05、E80 S1/S2）：ScScroll.tsx 将观众原文（标「观众原文（原始输入）」）与译文（标「AI 精翻（生成内容）」）分块渲染，label 为 null 时回退「匿名观众」，label/text/translation 与 Stage roomId 全部包裹 UntrustedText（<bdi class="vw-untrusted">，S2 实测 3 处 bdi 且 <img onerror=alert(1)> 原样转义不执行），apps/web/src/pages/overlay/ 全目录 0 处 dangerouslySetInnerHTML、0 处 speechSynthesis/TTS/语音第二裁决。（3）WARD_BLOCKED 结界与回缩、短音效与 CC0 资产（E05、E80 S1/S2）：WardBarrier.tsx 仅显示「结界已拦截一条异常内容」与 reasonClass 标签，0 原文/身份字段；对已展示的同 platformOrder=43 DELIVER 帧收到 WARD_BLOCKED 时立即从舞台移除；短音效默认开启且可静音切换，public/overlay/ 仅含 LICENSE.md、scroll-frame.svg、ward-barrier.svg、ward-chime.wav（PCM 22050Hz 16-bit mono 0.25s CC0 原创合成），0 外部 URL。（4）断连恢复、过期过滤、Q25 防爆与撤销（E80 S3）：断连重连后按 deliveryId 去重不重播旧帧、仅展示新增 s3-del-3，已过 validUntil 的历史帧跳过不补播；55 条突发 DELIVER 顺序到达无崩溃，客户端反向上传以 4400 关闭，背压超限以 4413 SUBSCRIBER_BACKPRESSURE 断开且不影响健康连接，凭据撤销以 4403 关闭并停止重连；Q25 畸形路径返回固定 400 BAD_REQUEST、超长 URL 返回 414 URI_TOO_LONG，序列化器对 URL/Host 中百分号编码的 vwo_ 凭据脱敏为 [REDACTED]。（5）OBS 指引与外部边界诚实记录：docs/obs/setup.md 完整说明 Browser Source/Custom Dock 配置、保护范围横幅与吊销恢复；受限于无桌面 Linux 验收环境，未启动桌面 OBS Studio GUI 实机截图/录屏，已在 acceptance.md 明确标注该外部边界。遵守 VW-R-019 只读输出与安全展示边界；INIT 全量验收仍由责任单承载。

### VOXWARD-STORY-024（`work:e5f4bbecea9a82b6068a9ca7`，`rev=4`，11 行）

- **目标**：提供版本化支持矩阵和可复现接入步骤，完成可行的 blivechat 适配验证。

<a id="vw-s024-ac001"></a>
##### VW-S024-AC001（v1 · `VW-S024-R001@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。满足 VW-S024-AC001 全部判据。

<a id="vw-s024-parent"></a>
##### VW-S024-PARENT（v1 · `VW-E005-R024@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。同候选版本 1d259d3 的协议适配、/guides 页面与支持矩阵材料均已核验保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R024）。

<a id="vw-s024-inherit-001"></a>
##### VW-S024-INHERIT-001（v1 · `VW-R-001@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单产出的接口、说明及依赖方向。
- **预期**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 模块边界、路由与依赖方向（E03/E04/E06/E09、E80 S1/S4）：纯协议映射位于 apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}（零 ws、零 node:* 依赖），WebSocket 传输隔离在 apps/server/src/adapters/blivechat/socket.ts，前端 /guides 由 routes.tsx 自动发现且不引用后端实现；pnpm check:deps 检查 249 文件 0 违规（E09 负控 4 项跨层违规均检出 exit 1），未引入任何新本机代理或生产托管依赖。

<a id="vw-s024-inherit-006"></a>
##### VW-S024-INHERIT-006（v1 · `VW-R-006@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **实际观测与核验结论**：核对与 VW-R-006（实时审核与输出门控）的接口边界（源码审查 + E80 S4）：blivechat 适配器与 OutputHub 共享同一 OutputStore 已裁决事件源，只将 verdict=ALLOW 的 DELIVER 帧映射下发，WARD_BLOCKED 在 blivechat 通道完全抑制不输出原文/身份，不影响原生 /output/v1/room 通道正常接收 WARD_BLOCKED；上游审核流水线职责不变，完整验证由 INIT VW-AC-006 承载。

<a id="vw-s024-inherit-009"></a>
##### VW-S024-INHERIT-009（v1 · `VW-R-009@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **预期**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 接触的数据字段与日志边界（源码审查 + E80 S3/S4）：S024 不调用 AI 模型、不新增数据库表或会话/提示副本；ADD_TEXT / ADD_SUPER_CHAT 帧仅投影已获准文本与译文，authorName 固定为空串且 uid 置 0，不附带观众真实 uid、信誉分或审核证据；服务端日志沿用 Q25 脱敏且文档不宣称清理等于外部平台删除。

<a id="vw-s024-inherit-010"></a>
##### VW-S024-INHERIT-010（v1 · `VW-R-010@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **实际观测与核验结论**：核对与 VW-R-010（背压、故障隔离与安全退化）的衔接（源码审查 + E80 S4）：/output/blivechat/v1/chat 复用与原生输出一致的 maxBufferedBytes 背压阈值（超限以 4413 断开慢客户端）与心跳机制，单连接异常或吊销（4403）不影响同房间其它订阅者与原生 Overlay；完整退化演练继续由 INIT VW-AC-010 承载。

<a id="vw-s024-inherit-011"></a>
##### VW-S024-INHERIT-011（v1 · `VW-R-011@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。
- **预期**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 存储与写入边界（源码审查 + E80 S4）：S024 零新增数据库迁移、零新增写库路径，仅只读调用既有 OutputStore.readInitialSnapshot 与 InvalidationBus 通知，不在适配器内存中复制持久化队列；客户端通过 WebSocket 发送非 JOIN_ROOM/HEARTBEAT 的上行聊天帧一律以 4400 拒绝，浏览器与外部兼容客户端均无法直写后端存储。

<a id="vw-s024-inherit-012"></a>
##### VW-S024-INHERIT-012（v1 · `VW-R-012@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。
- **预期**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 凭据权限、频道隔离与示例安全（E05、E80 S4/S5）：/output/blivechat/v1/chat 强制通过 Sec-WebSocket-Protocol 子协议校验只读输出凭据（拒绝 URL query 传参，Q16），忽略 JOIN_ROOM 中客户端传入的 roomId 而严格绑定凭据授权 channelId（跨频道订阅 0 泄漏），撤销凭据后立即 4403 断连；/guides 页面与 docs/integrations/*.md 全部使用占位符示例，未硬编码任何真实凭据。

<a id="vw-s024-inherit-017"></a>
##### VW-S024-INHERIT-017（v1 · `VW-R-017@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **预期**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 与数据生命周期/清理边界（源码审查 + E80 S4/S5）：blivechat 适配层不新增任何持久化表、缓存表面或主体副本，连接初始回放复用 OutputStore 既有 validUntil 过滤与删除后快照，凭据吊销即时断连；docs/integrations/*.md 与 /guides 明确说明输出端外部软件一旦接收帧即超出 VoxWard 撤回控制面（因此 blivechat 不发预展示撤回帧，仅推送已 ALLOW 帧并静默丢弃 WARD_BLOCKED）。

<a id="vw-s024-inherit-018"></a>
##### VW-S024-INHERIT-018（v1 · `VW-R-018@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-018 的贡献）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-018 诚实兼容与零本机代理约束；本单贡献不替代 INIT 对 VW-R-018 的全量验收。

<a id="vw-s024-inherit-019"></a>
##### VW-S024-INHERIT-019（v1 · `VW-R-019@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-019 的贡献）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-019 只读输出、禁反向上传与撤销即时断连约束；本单贡献不替代 INIT 对 VW-R-019 的全量验收。

### VOXWARD-SUB-044（`work:5e629e36f0bfb2e4327c7a39`，`rev=3`，12 行）

- **目标**：对指定版本 blivechat 完成握手、房间、帧与译文字段的适配验证，只有端到端通过才在支持矩阵标为支持。

<a id="vw-sub044-ac001"></a>
##### VW-SUB044-AC001（v1 · `VW-SUB044-R001@1` · `machine` · `satisfied`）

- **场景**：按指引接入指定版本 blivechat 并测试授权输出。
- **预期**：通过端到端才标支持；不把云服务器 localhost 当主播电脑；不以反向上传取代平台接入。
- **方法**：实际版本联调记录；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上独立实测 VOXWARD-SUB-044 blivechat v1.x 协议适配（E05 frames.test.ts + socket.test.ts、E06/E09 check-deps、E80 S4）：（1）架构与共存：modules/output/blivechat/{frames.ts,adapter.ts} 零 ws/node:* 依赖（check-deps 249 文件 0 违规），adapters/blivechat/socket.ts 挂载 /output/blivechat/v1/chat 并通过 native-output ignoredPaths 与 /output/v1/room 在同一 HTTP Server 无冲突共存，未知路径仍回 404。（2）握手、房间隔离与心跳：仅接受同时携带 vw-cred.<credential> 与 blivechat-v1.x-json-ws 子协议的有效未撤销凭据（缺失或 query 传参一律 401）；客户端发 cmd=1 JOIN_ROOM 尝试跨频道伪造 roomId="channel-b" 时，服务端强制绑定凭据所属 channel-a，channel-b 事件 0 泄漏；cmd=0 HEARTBEAT 正常返回 cmd=0 HEARTBEAT_REPLY。（3）帧映射、非泄漏、禁反向上传与吊销：ALLOW DELIVER 文本与 SC 分别映射为 cmd=2 ADD_TEXT（data[1]=原文、data[14]=译文、data[2]="" 匿名、0 uid/分数/审计字段）与 cmd=3 ADD_SUPER_CHAT（content + translation + authorName:""）；WARD_BLOCKED 在协议层静默丢弃（E80 S4 实测 blivechat 收到 0 帧而同房间原生 /output/v1/room 正常收到 WARD_BLOCKED）；客户端发 cmd=2 反向上传被 4400 拒绝，凭据撤销立即以 4403 GRANT_REVOKED 断开。（4）诚实边界：仅完成本机 loopback 协议契约与双端点共存实测，未运行独立第三方上游 blivechat 桌面/Python 进程，因此在矩阵与文档中标为 VERIFIED_LOOPBACK 而非 SUPPORTED，不把云服务器 localhost 当主播电脑。满足 VW-SUB044-AC001 全部判据。

<a id="vw-sub044-story"></a>
##### VW-SUB044-STORY（v1 · `VW-S024-R001@1` · `machine` · `satisfied`）

- **场景**：本单承担 VW-S024-R001@1 中「blivechat 指定版本握手/房间/帧/译文验证」：按指引接入指定版本 blivechat 并测试授权输出。
- **预期**：通过端到端才标支持；不把云服务器 localhost 当主播电脑；不以反向上传取代平台接入。 本单只证明所承担部分；VOXWARD-STORY-024 的完整判据（VW-S024-AC001@1）保持。
- **方法**：实际版本联调记录；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上独立实测 VOXWARD-SUB-044 blivechat v1.x 协议适配（E05 frames.test.ts + socket.test.ts、E06/E09 check-deps、E80 S4）：（1）架构与共存：modules/output/blivechat/{frames.ts,adapter.ts} 零 ws/node:* 依赖（check-deps 249 文件 0 违规），adapters/blivechat/socket.ts 挂载 /output/blivechat/v1/chat 并通过 native-output ignoredPaths 与 /output/v1/room 在同一 HTTP Server 无冲突共存，未知路径仍回 404。（2）握手、房间隔离与心跳：仅接受同时携带 vw-cred.<credential> 与 blivechat-v1.x-json-ws 子协议的有效未撤销凭据（缺失或 query 传参一律 401）；客户端发 cmd=1 JOIN_ROOM 尝试跨频道伪造 roomId="channel-b" 时，服务端强制绑定凭据所属 channel-a，channel-b 事件 0 泄漏；cmd=0 HEARTBEAT 正常返回 cmd=0 HEARTBEAT_REPLY。（3）帧映射、非泄漏、禁反向上传与吊销：ALLOW DELIVER 文本与 SC 分别映射为 cmd=2 ADD_TEXT（data[1]=原文、data[14]=译文、data[2]="" 匿名、0 uid/分数/审计字段）与 cmd=3 ADD_SUPER_CHAT（content + translation + authorName:""）；WARD_BLOCKED 在协议层静默丢弃（E80 S4 实测 blivechat 收到 0 帧而同房间原生 /output/v1/room 正常收到 WARD_BLOCKED）；客户端发 cmd=2 反向上传被 4400 拒绝，凭据撤销立即以 4403 GRANT_REVOKED 断开。（4）诚实边界：仅完成本机 loopback 协议契约与双端点共存实测，未运行独立第三方上游 blivechat 桌面/Python 进程，因此在矩阵与文档中标为 VERIFIED_LOOPBACK 而非 SUPPORTED，不把云服务器 localhost 当主播电脑。本子单交付与 loopback 联调证据完整支撑 VOXWARD-STORY-024 中「blivechat 指定版本握手/房间/帧/译文验证」部分，Story 完整判据保持。

<a id="vw-sub044-parent"></a>
##### VW-SUB044-PARENT（v1 · `VW-E005-R024@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（继承自 VOXWARD-STORY-024 VW-S024-PARENT@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。同候选版本 1d259d3 的协议适配、/guides 页面与支持矩阵材料均已核验保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R024）。

<a id="vw-sub044-inherit-001"></a>
##### VW-SUB044-INHERIT-001（v1 · `VW-R-001@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-001@1）
- **预期**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 模块边界、路由与依赖方向（E03/E04/E06/E09、E80 S1/S4）：纯协议映射位于 apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}（零 ws、零 node:* 依赖），WebSocket 传输隔离在 apps/server/src/adapters/blivechat/socket.ts，前端 /guides 由 routes.tsx 自动发现且不引用后端实现；pnpm check:deps 检查 249 文件 0 违规（E09 负控 4 项跨层违规均检出 exit 1），未引入任何新本机代理或生产托管依赖。

<a id="vw-sub044-inherit-006"></a>
##### VW-SUB044-INHERIT-006（v1 · `VW-R-006@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-006@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **实际观测与核验结论**：核对与 VW-R-006（实时审核与输出门控）的接口边界（源码审查 + E80 S4）：blivechat 适配器与 OutputHub 共享同一 OutputStore 已裁决事件源，只将 verdict=ALLOW 的 DELIVER 帧映射下发，WARD_BLOCKED 在 blivechat 通道完全抑制不输出原文/身份，不影响原生 /output/v1/room 通道正常接收 WARD_BLOCKED；上游审核流水线职责不变，完整验证由 INIT VW-AC-006 承载。

<a id="vw-sub044-inherit-009"></a>
##### VW-SUB044-INHERIT-009（v1 · `VW-R-009@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-009@1）
- **预期**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 接触的数据字段与日志边界（源码审查 + E80 S3/S4）：S024 不调用 AI 模型、不新增数据库表或会话/提示副本；ADD_TEXT / ADD_SUPER_CHAT 帧仅投影已获准文本与译文，authorName 固定为空串且 uid 置 0，不附带观众真实 uid、信誉分或审核证据；服务端日志沿用 Q25 脱敏且文档不宣称清理等于外部平台删除。

<a id="vw-sub044-inherit-010"></a>
##### VW-SUB044-INHERIT-010（v1 · `VW-R-010@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-010@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **实际观测与核验结论**：核对与 VW-R-010（背压、故障隔离与安全退化）的衔接（源码审查 + E80 S4）：/output/blivechat/v1/chat 复用与原生输出一致的 maxBufferedBytes 背压阈值（超限以 4413 断开慢客户端）与心跳机制，单连接异常或吊销（4403）不影响同房间其它订阅者与原生 Overlay；完整退化演练继续由 INIT VW-AC-010 承载。

<a id="vw-sub044-inherit-011"></a>
##### VW-SUB044-INHERIT-011（v1 · `VW-R-011@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-011@1）
- **预期**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 存储与写入边界（源码审查 + E80 S4）：S024 零新增数据库迁移、零新增写库路径，仅只读调用既有 OutputStore.readInitialSnapshot 与 InvalidationBus 通知，不在适配器内存中复制持久化队列；客户端通过 WebSocket 发送非 JOIN_ROOM/HEARTBEAT 的上行聊天帧一律以 4400 拒绝，浏览器与外部兼容客户端均无法直写后端存储。

<a id="vw-sub044-inherit-012"></a>
##### VW-SUB044-INHERIT-012（v1 · `VW-R-012@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-012@1）
- **预期**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 凭据权限、频道隔离与示例安全（E05、E80 S4/S5）：/output/blivechat/v1/chat 强制通过 Sec-WebSocket-Protocol 子协议校验只读输出凭据（拒绝 URL query 传参，Q16），忽略 JOIN_ROOM 中客户端传入的 roomId 而严格绑定凭据授权 channelId（跨频道订阅 0 泄漏），撤销凭据后立即 4403 断连；/guides 页面与 docs/integrations/*.md 全部使用占位符示例，未硬编码任何真实凭据。

<a id="vw-sub044-inherit-017"></a>
##### VW-SUB044-INHERIT-017（v1 · `VW-R-017@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-017@1）
- **预期**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 与数据生命周期/清理边界（源码审查 + E80 S4/S5）：blivechat 适配层不新增任何持久化表、缓存表面或主体副本，连接初始回放复用 OutputStore 既有 validUntil 过滤与删除后快照，凭据吊销即时断连；docs/integrations/*.md 与 /guides 明确说明输出端外部软件一旦接收帧即超出 VoxWard 撤回控制面（因此 blivechat 不发预展示撤回帧，仅推送已 ALLOW 帧并静默丢弃 WARD_BLOCKED）。

<a id="vw-sub044-inherit-018"></a>
##### VW-SUB044-INHERIT-018（v1 · `VW-R-018@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-018 的贡献）（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-018@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-018 诚实兼容与零本机代理约束；本单贡献不替代 INIT 对 VW-R-018 的全量验收。

<a id="vw-sub044-inherit-019"></a>
##### VW-SUB044-INHERIT-019（v1 · `VW-R-019@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-019@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-019 只读输出、禁反向上传与撤销即时断连约束；本单贡献不替代 INIT 对 VW-R-019 的全量验收。

### VOXWARD-SUB-045（`work:364a7a1320c5d0a5388fd171`，`rev=3`，12 行）

- **目标**：记录 OneComme 与 VTS 的官方能力及现成桥接调研结论，形成版本化支持矩阵，并提供包含配置、拓扑、权限、测试事件、撤销与故障排查的接入指引页面。

<a id="vw-sub045-ac001"></a>
##### VW-SUB045-AC001（v1 · `VW-SUB045-R001@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件；遇到只能依靠新本机代理的路径。
- **预期**：不可行/未测明确标注；不以新本机代理扩大范围；矩阵每项附版本与证据。
- **方法**：指引复现与调研证据核对。
- **实际观测与核验结论**：在 1d259d3 上独立核验 VOXWARD-SUB-045 支持矩阵、调研证据与 /guides 指引页面（E05 GuidesPage.test.tsx、E80 S1/S5 及 docs/integrations/*.md 核对）：（1）版本化支持矩阵与诚实分级：apps/web/src/pages/guides/{api.ts,GuidesPage.tsx} 与 docs/integrations/support-matrix.md 对齐 4 项集成并逐项附版本、拓扑、实测证据路径与限制说明——仅「VoxWard 原生 OBS Overlay（native-v1）」标 SUPPORTED；「blivechat v1.x WebSocket 兼容输出（v1.9.x 协议族）」诚实标为 VERIFIED_LOOPBACK（协议适配已验证，限本机 loopback E2E，明确声明未跑独立上游二进制）；「OneComme（v5.x–v8.x HTTP Comment API）」与「VTube Studio（v1.28+ WebSocket Plugin API）」明确标为 UNSUPPORTED。（2）拒绝新本机代理与 localhost 混淆：docs/integrations/{onecomme.md,vts.md} 与 /guides 页面明确指出云端 VoxWard 的 127.0.0.1 并非主播电脑本机（127.0.0.1:11180 / ws://localhost:8001 不可直连），且受项目范围约束不开发客户端守护进程/新本机代理，也不以浏览器反向上传取代平台接入。（3）完整指引闭环：/guides 路由由 routes.tsx 自动发现，页面与文档完整覆盖配置步骤、网络拓扑、最小只读输出凭据权限、测试事件触发与核对、凭据吊销（4403）及常见故障排查（401/4400/4403/4413）。满足 VW-SUB045-AC001 全部判据。

<a id="vw-sub045-story"></a>
##### VW-SUB045-STORY（v1 · `VW-S024-R001@1` · `machine` · `satisfied`）

- **场景**：本单承担 VW-S024-R001@1 中「OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面」：按指引接入候选软件；遇到只能依靠新本机代理的路径。
- **预期**：不可行/未测明确标注；不以新本机代理扩大范围；矩阵每项附版本与证据。 本单只证明所承担部分；VOXWARD-STORY-024 的完整判据（VW-S024-AC001@1）保持。
- **方法**：指引复现与调研证据核对。
- **实际观测与核验结论**：在 1d259d3 上独立核验 VOXWARD-SUB-045 支持矩阵、调研证据与 /guides 指引页面（E05 GuidesPage.test.tsx、E80 S1/S5 及 docs/integrations/*.md 核对）：（1）版本化支持矩阵与诚实分级：apps/web/src/pages/guides/{api.ts,GuidesPage.tsx} 与 docs/integrations/support-matrix.md 对齐 4 项集成并逐项附版本、拓扑、实测证据路径与限制说明——仅「VoxWard 原生 OBS Overlay（native-v1）」标 SUPPORTED；「blivechat v1.x WebSocket 兼容输出（v1.9.x 协议族）」诚实标为 VERIFIED_LOOPBACK（协议适配已验证，限本机 loopback E2E，明确声明未跑独立上游二进制）；「OneComme（v5.x–v8.x HTTP Comment API）」与「VTube Studio（v1.28+ WebSocket Plugin API）」明确标为 UNSUPPORTED。（2）拒绝新本机代理与 localhost 混淆：docs/integrations/{onecomme.md,vts.md} 与 /guides 页面明确指出云端 VoxWard 的 127.0.0.1 并非主播电脑本机（127.0.0.1:11180 / ws://localhost:8001 不可直连），且受项目范围约束不开发客户端守护进程/新本机代理，也不以浏览器反向上传取代平台接入。（3）完整指引闭环：/guides 路由由 routes.tsx 自动发现，页面与文档完整覆盖配置步骤、网络拓扑、最小只读输出凭据权限、测试事件触发与核对、凭据吊销（4403）及常见故障排查（401/4400/4403/4413）。本子单交付完整支撑 VOXWARD-STORY-024 中「OneComme/VTS 官方能力及现成桥接调研；配置、拓扑、权限、测试事件、撤销和故障指引页面」部分，Story 完整判据保持。

<a id="vw-sub045-parent"></a>
##### VW-SUB045-PARENT（v1 · `VW-E005-R024@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（继承自 VOXWARD-STORY-024 VW-S024-PARENT@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。同候选版本 1d259d3 的协议适配、/guides 页面与支持矩阵材料均已核验保留，支撑父 Epic VOXWARD-EPIC-005（VW-E005-R024）。

<a id="vw-sub045-inherit-001"></a>
##### VW-SUB045-INHERIT-001（v1 · `VW-R-001@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-001@1）
- **预期**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 模块边界、路由与依赖方向（E03/E04/E06/E09、E80 S1/S4）：纯协议映射位于 apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}（零 ws、零 node:* 依赖），WebSocket 传输隔离在 apps/server/src/adapters/blivechat/socket.ts，前端 /guides 由 routes.tsx 自动发现且不引用后端实现；pnpm check:deps 检查 249 文件 0 违规（E09 负控 4 项跨层违规均检出 exit 1），未引入任何新本机代理或生产托管依赖。

<a id="vw-sub045-inherit-006"></a>
##### VW-SUB045-INHERIT-006（v1 · `VW-R-006@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-006@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **实际观测与核验结论**：核对与 VW-R-006（实时审核与输出门控）的接口边界（源码审查 + E80 S4）：blivechat 适配器与 OutputHub 共享同一 OutputStore 已裁决事件源，只将 verdict=ALLOW 的 DELIVER 帧映射下发，WARD_BLOCKED 在 blivechat 通道完全抑制不输出原文/身份，不影响原生 /output/v1/room 通道正常接收 WARD_BLOCKED；上游审核流水线职责不变，完整验证由 INIT VW-AC-006 承载。

<a id="vw-sub045-inherit-009"></a>
##### VW-SUB045-INHERIT-009（v1 · `VW-R-009@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-009@1）
- **预期**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 接触的数据字段与日志边界（源码审查 + E80 S3/S4）：S024 不调用 AI 模型、不新增数据库表或会话/提示副本；ADD_TEXT / ADD_SUPER_CHAT 帧仅投影已获准文本与译文，authorName 固定为空串且 uid 置 0，不附带观众真实 uid、信誉分或审核证据；服务端日志沿用 Q25 脱敏且文档不宣称清理等于外部平台删除。

<a id="vw-sub045-inherit-010"></a>
##### VW-SUB045-INHERIT-010（v1 · `VW-R-010@1` · `source-behavior-review` · `satisfied`）

- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-010@1）
- **预期**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **实际观测与核验结论**：核对与 VW-R-010（背压、故障隔离与安全退化）的衔接（源码审查 + E80 S4）：/output/blivechat/v1/chat 复用与原生输出一致的 maxBufferedBytes 背压阈值（超限以 4413 断开慢客户端）与心跳机制，单连接异常或吊销（4403）不影响同房间其它订阅者与原生 Overlay；完整退化演练继续由 INIT VW-AC-010 承载。

<a id="vw-sub045-inherit-011"></a>
##### VW-SUB045-INHERIT-011（v1 · `VW-R-011@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-011@1）
- **预期**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 存储与写入边界（源码审查 + E80 S4）：S024 零新增数据库迁移、零新增写库路径，仅只读调用既有 OutputStore.readInitialSnapshot 与 InvalidationBus 通知，不在适配器内存中复制持久化队列；客户端通过 WebSocket 发送非 JOIN_ROOM/HEARTBEAT 的上行聊天帧一律以 4400 拒绝，浏览器与外部兼容客户端均无法直写后端存储。

<a id="vw-sub045-inherit-012"></a>
##### VW-SUB045-INHERIT-012（v1 · `VW-R-012@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-012@1）
- **预期**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 凭据权限、频道隔离与示例安全（E05、E80 S4/S5）：/output/blivechat/v1/chat 强制通过 Sec-WebSocket-Protocol 子协议校验只读输出凭据（拒绝 URL query 传参，Q16），忽略 JOIN_ROOM 中客户端传入的 roomId 而严格绑定凭据授权 channelId（跨频道订阅 0 泄漏），撤销凭据后立即 4403 断连；/guides 页面与 docs/integrations/*.md 全部使用占位符示例，未硬编码任何真实凭据。

<a id="vw-sub045-inherit-017"></a>
##### VW-SUB045-INHERIT-017（v1 · `VW-R-017@1` · `source-behavior-review` · `satisfied`）

- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-017@1）
- **预期**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **实际观测与核验结论**：核对 S024 与数据生命周期/清理边界（源码审查 + E80 S4/S5）：blivechat 适配层不新增任何持久化表、缓存表面或主体副本，连接初始回放复用 OutputStore 既有 validUntil 过滤与删除后快照，凭据吊销即时断连；docs/integrations/*.md 与 /guides 明确说明输出端外部软件一旦接收帧即超出 VoxWard 撤回控制面（因此 blivechat 不发预展示撤回帧，仅推送已 ALLOW 帧并静默丢弃 WARD_BLOCKED）。

<a id="vw-sub045-inherit-018"></a>
##### VW-SUB045-INHERIT-018（v1 · `VW-R-018@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-018 的贡献）（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-018@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-018 诚实兼容与零本机代理约束；本单贡献不替代 INIT 对 VW-R-018 的全量验收。

<a id="vw-sub045-inherit-019"></a>
##### VW-SUB045-INHERIT-019（v1 · `VW-R-019@1` · `machine` · `satisfied`）

- **场景**：按指引接入候选软件并测试授权输出；遇到只能依靠新本机代理的路径。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-024 VW-S024-INHERIT-019@1）
- **预期**：通过端到端才标支持；不可行/未测明确标注，不把云服务器 localhost 当主播电脑，不以反向上传取代平台接入。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **方法**：实际版本联调记录与指引复现；无可用接口时提交具体限制证据而非虚构兼容。
- **实际观测与核验结论**：在 1d259d3 上联合核验 VOXWARD-STORY-024（含 SUB-044 协议适配与 SUB-045 支持矩阵/指引，E05、E06/E09、E80 S4/S5）：（1）blivechat v1.x 兼容端点 /output/blivechat/v1/chat 与原生 /output/v1/room 同服共存，握手强制校验 vw-cred.<cred> + blivechat-v1.x-json-ws，JOIN_ROOM 忽略客户端伪造 roomId 强制绑定授权频道，HEARTBEAT 正常应答，ALLOW DELIVER 正确映射 ADD_TEXT/ADD_SUPER_CHAT（含原文与译文、匿名作者、无内部 uid/分数），WARD_BLOCKED 静默抑制 0 泄漏，客户端反向上传以 4400 拒绝，凭据吊销以 4403 立即断开。（2）支持矩阵与 /guides 页面严格按实测证据分级：仅原生 OBS Overlay 标 SUPPORTED；blivechat 因仅完成本机 loopback 契约实测而未启动独立上游 blivechat 进程，诚实标为 VERIFIED_LOOPBACK 并写明原因；OneComme 与 VTS 因云端服务端无法直连主播本机 localhost API 且不引入新本机代理，明确标为 UNSUPPORTED，不把云服务器 localhost 当主播电脑，也不以反向上传取代平台接入。严格遵守 VW-R-019 只读输出、禁反向上传与撤销即时断连约束；本单贡献不替代 INIT 对 VW-R-019 的全量验收。
