# 第 m8a 批判断（Wave 2a：S023 透明舞台 Overlay + S024 第三方兼容与支持矩阵首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m8a` 上的 `1d259d3`（完整 SHA `1d259d3464ed9c2b924bb6dc7698de61185f780a`；含 S023 合并提交 `dc04481` 与 S024 主线提交 `1d259d3`）。
- 范围：5 张工单、58 行首次验收（`VOXWARD-STORY-023` rev 4 11 行、`VOXWARD-SUB-043` rev 3 12 行、`VOXWARD-STORY-024` rev 4 11 行、`VOXWARD-SUB-044` rev 3 12 行、`VOXWARD-SUB-045` rev 3 12 行）。**satisfied 58 行，failed 0 行，unverified 0 行（全部通过：`machine` 23 行、`source-behavior-review` 35 行）**。逐条依据见 `.kiro/specs/voxward-batch-m8a/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。

| 工单 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-023 | **通过** | 11/11 satisfied | 无 | 透明 Overlay、双语卷轴/安全称呼、结界拦截动画/短音效、`Q16` fragment 擦除与 `Q25` 脱敏防爆、断连去重与过期过滤全部实测成立 |
| VOXWARD-SUB-043 | **通过** | 12/12 satisfied | 无 | S023 唯一实施子单，与 Story 联合实测全绿（如实记录未启动桌面 OBS GUI 实机截图/录屏的外部环境边界） |
| VOXWARD-STORY-024 | **通过** | 11/11 satisfied | 无 | `blivechat` v1.x 兼容端点、双端点共存、房间防伪造、`WARD_BLOCKED` 零泄漏及 `/guides` 版本化诚实矩阵全部实测成立 |
| VOXWARD-SUB-044 | **通过** | 12/12 satisfied | 无 | `/output/blivechat/v1/chat` 握手/房间/心跳/帧映射/禁反向上传/吊销断连 loopback E2E 实测全绿，诚实标注 `VERIFIED_LOOPBACK` |
| VOXWARD-SUB-045 | **通过** | 12/12 satisfied | 无 | `OneComme`/`VTS` 官方能力调研、4 项版本化支持矩阵与 `/guides` 指引页面完整闭环，无新本机代理与 localhost 混淆 |

- rejection 计数：本轮 5 张工单首次验收全部通过，新增 rejections=0。
- 门禁：`pnpm build`、`pnpm typecheck`（含 `bench:typecheck`）、`pnpm check:deps`（249 文件 0 违规 + 独立负向对照 4/4 类跨层违规准确拦截 exit 1）、`guarded.sh` 下 S023/S024 定向 Vitest（5 文件 16/16 用例）与独立综合探针 `probe-m8a.mts`（`S1`–`S5` 5/5 全绿）全部通过；复用主线程同 SHA `1d259d3` 全量 `guarded.sh pnpm test`（160/160 文件、1918/1918 用例全绿）与默认配置 `smoke.sh`（双 `/healthz` 返回 200，结束后 `:3000/:5173` 0 监听）；本轮全部测试与探针在 `guarded.sh` 预加载后执行 `net/selfcheck.mjs`（`guardLoaded: true`），外部域名连接全部 `ECONNREFUSED`/`ENOTFOUND`，测试期间违规外连 0 次、`shim.log` 0 行（`acceptance.md` §1.1 `E01`–`E10`、`E80`、`Q58`）。
- Spec：`.kiro/specs/voxward-s023-overlay`（rev 4）与 `.kiro/specs/voxward-s024-compat`（rev 4）经只读 `kiro-specs.mjs check` 核验均为 `SPEC_CURRENT`（`E10`），Git DAG 确认两单均为 spec 提交先于实现提交（`755adfc -> 73a61b6`；`1cb4f44 -> a2de73d -> 540c003 -> 49a7bcb`）。

## 诚实外部边界核验

| 边界项 | 代码与文档口径 | 独立验收判定 |
| --- | --- | --- |
| 桌面 OBS Studio GUI 宿主渲染与混音器（S023） | 提供 CC0 SVG/WAV 静态资产、透明背景 CSS、`<bdi>` 纯文本安全组件与 `docs/obs/setup.md` 指引 | **诚实记录**。无图形桌面环境下已完成构建产物、SSR/JSDOM 行为、WAV PCM 头与真实本地临时端口 HTTP/WS 全链路实测；未启动桌面 OBS Studio GUI 截图/录屏已在 `acceptance.md` 如实声明。 |
| 独立第三方上游 `blivechat` 进程（S024） | 支持矩阵与 `/guides` 标为 `VERIFIED_LOOPBACK`（「协议适配已验证（限本机 loopback E2E）」），未标 `SUPPORTED` | **完全合规**。本轮 loopback WS 完整验证了协议帧与隔离语义；因未运行上游独立 `blivechat` 二进制程序，不虚标为生产全量 `SUPPORTED`。 |
| `OneComme` / `VTube Studio` 本机 localhost 接口（S024） | 支持矩阵与 `/guides` 标为 `UNSUPPORTED`，明确指出云端 `127.0.0.1` 非主播电脑且不开发新本机代理 | **完全合规**。符合 `VW-R-001`/`VW-R-018` 远端自托管与零本机代理约束。 |

## 非阻断观察（N13–N14）

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| **N13** | `apps/server/src/db/output-store.ts:151-152` 直接将 `technical_log_evidence` 中 `TRANSLATION` 的 `payload` 原始字符串读取为 `display.translation`，而 S022 `apps/server/src/db/channel-panel-read.ts:116-130` 按 JSON（`{ translation, notes, acknowledgement, safeAlias }`）解析并回退纯文本；同时 `packages/contracts/src/output/native-v1.ts` 的 `DisplayPayload` 仅含 `{ label, text, translation }`（无独立 `slangNote` 字段）。当前 S023/S024 契约自洽，但后续 S026 接通真实 AI 精翻落库时需统一序列化/投影约定，避免 `/overlay` 或 `blivechat` 直接渲染原始 JSON 串。 | `output-store.ts:151-152`；`channel-panel-read.ts:116-130`；`native-v1.ts:11-15` | `VOXWARD-STORY-026` 端到端流水线装配时统一对齐 |
| **N14** | `.kiro/specs/voxward-s024-compat/design.md:82` 将 `Sec-WebSocket-Protocol` 中的 `blivechat-v1.x-json-ws` 写为「可选同时提供」，而实际服务端实现 `apps/server/src/adapters/blivechat/socket.ts:62` 及面向用户的 `docs/integrations/blivechat.md:12`、`GuidesPage.tsx:50` 均要求同时提供 `blivechat-v1.x-json-ws` 与 `vw-cred.<credential>`（符合 RFC 6455 子协议协商规范）。运行时与用户指引完全一致，仅内部设计稿一处措辞略宽。 | `adapters/blivechat/socket.ts:62`；`docs/integrations/blivechat.md:12`；`s024-compat/design.md:82` | 可选文档微调（无需返工） |

## 问题清单（Q 项）状态

- **`Q16`（输出凭据 `#fragment` 传入与前端擦除、拒绝 URL query）**：S021 后端部分已在 `d8ed897` 完成；S023 前端 `parseOverlayCredential`、`history.replaceState` 建连前擦除与 query 拒连及 S024 `blivechat` 子协议握手已在 `1d259d3` 实测通过，**`Q16` 全量关闭**。
- **`Q25`（WS 背压 `4413`、客户端上行拒绝 `4400`、畸形 URL/Host 400/414 不反射与凭据日志脱敏）**：后端与前端路由侧在 `1d259d3` 经 `s023-q16-q25.test.ts` 与 `E80 S3` 实测通过，**`Q25` 全量关闭**。

## 需 Owner 决定

无。本批无阻断缺陷，无待决范围或架构分歧。

## 关单与后续复用说明

- **关单**：`VOXWARD-SUB-043`（12 行）、`VOXWARD-SUB-044`（12 行）、`VOXWARD-SUB-045`（12 行）、`VOXWARD-STORY-023`（11 行）、`VOXWARD-STORY-024`（11 行）共 58 行在 `1d259d3` 上全部 `satisfied`，主线程可直接用 `DONE_KEYS=VOXWARD-STORY-023,VOXWARD-SUB-043,VOXWARD-STORY-024,VOXWARD-SUB-044,VOXWARD-SUB-045` 运行 `close-batch.cjs` 以 `codeVersion: "1d259d3"` 链写证据并关单（`close-batch.cjs` 自动按先 Subtask 后 Story 排序）。
- 本轮综合探针 `probe-m8a.mts`、交付构建校验脚本 `build-deliverables.mjs` 及门禁与 `Q58` 审计日志均保存在交付目录 `probes/`。
