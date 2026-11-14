# 第 m7d 批判断（总表第 7 批第四部分：S021 返工 1 复验）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7d` 上的 `d8ed897`（含 `P-S021-fix1` 合并提交 `ad484f7`）。
- 范围：3 张工单、35 行复验（`VOXWARD-STORY-021` rev 5 11 行、`VOXWARD-SUB-039` rev 4 12 行、`VOXWARD-SUB-040` rev 4 12 行）。**satisfied 35 行，failed 0 行，unverified 0 行（全部通过）**。逐条依据见 `.kiro/specs/voxward-batch-m7d/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。`VOXWARD-SUB-049` 已在 `7400f39` 关单 `done`，经核对 `git diff 7400f39..d8ed897 -- bench/` 为空，本轮不重出证据行。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；复验、判断与 lessons 一次完成。

| 工单 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-021 | **通过** | 11/11 satisfied | 无 | 第 m7b 批 `VW-S021-INHERIT-018`（`B7`）已修复并通过实测，其余 10 行重跑全绿 |
| VOXWARD-SUB-039 | **通过** | 12/12 satisfied | 无 | 含 `N1`（`preClose`）与 `N3`（`maxPayload: 4096`）改动重跑全绿 |
| VOXWARD-SUB-040 | **通过** | 12/12 satisfied | 无 | 第 m7b 批 `VW-SUB040-INHERIT-018`（`B7`）及 `N2`/`N4` 文档对齐全部通过实测 |

- rejection 计数：本轮复验通过，新增 rejections=0（S021 组累计打回保持第 m7b 批的 1 次）。
- 门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`（含 bench）、`pnpm check:deps`（219 文件 0 违规 + 负面对照 6/6 检出）及拦截下 `pnpm test`（149 文件 1886 项，其中 S021 相关 10 文件 62 项）全部通过；`tools/smoke.sh` 在清除 `VOXWARD_*` 环境变量后分别验证 `pnpm dev` 与 `node apps/server/dist/main.js`，`/healthz` 返回 200，仅绑 `127.0.0.1`，停止后 `:3000`、`:5173` 均 0 监听；全量测试与全部探针经 `guarded.sh` 预加载拦截并在预加载后执行 `net/selfcheck.mjs`（`guardLoaded: true`），外部主机与本机既有监听端口连接 0 次，`kiro-cli`/`kirocrew`/`kiro` 垫片调用 0 次（`acceptance.md` E02–E11、E60–E63）。
- Spec：`.kiro/specs/voxward-s021-output` 经 `kiro-specs.mjs check` 核验为 `SPEC_CURRENT`（rev 5，不改文件，E10），`design.md` 与 `tasks.md`（`R1.1`–`R1.6`）与实现一致。

## 第 m7b 批阻断与建议收口核验（B7、N1–N4）

| 编号 | 第 m7b 批问题 | `d8ed897`（`ad484f7`）核验结论 | 实测依据 |
| --- | --- | --- | --- |
| **B7** | 投递泵每轮只调一次 `readSendable`，慢写让出事件循环期间后续行被改判 `BLOCK` 或标 `CANCELLED` 仍发出原文，`markSent` 不核对 `is_current = 1` | **已关闭**。`OutputDeliveryPort` 新增同步单行重查 `readSendableRow`（`PENDING`、`valid_until > nowIso`、`verdicts.is_current = 1`），`delivery.ts` 在每行 `sendRow` 前同一同步段重查（与 `ws.send` 之间无 `await`），`markSent` 短事务联表校验 `verdicts.is_current = 1`。慢写挂起期间改判 `BLOCK`、标 `CANCELLED` 或过期均不再发出原文；在途行自身被改判时不标 `SENT`、下一轮绝不重发，并下发同 `platformOrder` 的 `WARD_BLOCKED`。 | `E61` `R1–R4`（4/4，含 `R1b=false`）；`E63` `X2`、`X3`；`pump.test.ts`（14/14） |
| **N1** | `startNativeOutput` 使用 `onClose`，有在线消费者时 Fastify `server.close()` 先等升级连接导致 `app.close()` 卡住不返回 | **已关闭**。`app.ts:147` 改为 `preClose` 钩子先停定时器并 `endpoint.close()` 终止全部 WebSocket 连接。双消费者在线及 6 MiB 慢写中途调用 `app.close()` 均在 `0 ms` 内返回、0 未捕获异常。 | `E60 Z1`（`closeResolvedAtMs=0`）；`E63 X4`；`socket.test.ts`（12/12） |
| **N2** | 已展示消息被改判 `BLOCK` 时收到同一 `platformOrder` 的 `WARD_BLOCKED`，协议文档未写明下游撤回行为 | **协议层已关闭**。`docs/protocol/output-native-v1.md` §3（第 70 行）已明确下游收到同 `platformOrder` 的 `WARD_BLOCKED` 应撤回或隐藏此前对应展示内容；覆盖层 UI 侧具体动画/渲染仍由 S023 实现。 | `docs/protocol/output-native-v1.md` §3；`E63 X3` |
| **N3** | `WebSocketServer` 未设 `maxPayload`（默认 100 MiB），客户端可发大帧占内存再被 4400 关闭 | **传输层已关闭**。`socket.ts:77` 已设 `maxPayload: 4096`。`<=4096 B` 客户端帧以 `4400` 断开；`>4096 B` 单帧（4097B、16 MiB）或分片消息（2500+2500B）在 `ws` 帧头层立即以 RFC 6455 标准码 `1009` 断开（4097B 仅 `3 ms`），日志仅含 `WS_ERR_UNSUPPORTED_MESSAGE_LENGTH`（无凭据与载荷），健康订阅者不受影响。反代不记录 `Sec-WebSocket-Protocol` 头仍归 S029。 | `E60 M1`（`1009`）；`E63 X1` |
| **N4** | 协议文档 §10 关于 S003 `auth_output_tokens` 的表述、`dedupe.mjs` 注释及 `design.md` §3 漏列 `auth/output-grants.ts` | **文档层已关闭**。三处均已修正一致；S003 输出令牌后续去留仍由 S023 决定。 | `docs/protocol/output-native-v1.md` §10、`dedupe.mjs`、`design.md` §3 |

## 非阻断观察

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N11 | `socket.ts` 设置 `maxPayload: 4096` 后，`<=4096 B` 客户端数据帧返回协议自定义码 `4400 CLIENT_DATA_NOT_ACCEPTED`，而 `>4096 B` 超限客户端帧/分片消息由 `ws` 在协议层直接返回 RFC 6455 标准码 `1009`（Message Too Big）；`docs/protocol/output-native-v1.md` §4/§5 目前只提了 `4400`。不影响任何验收行或正常只回 pong 的消费者，S023 接入覆盖层客户端时如顺手触碰协议说明可补一句 `>4096 B -> 1009`。 | `E60 M1`、`E63 X1`；`socket.ts:77`；`docs/protocol/output-native-v1.md` §4–§5 | S023 顺带说明即可（可选） |

## 问题清单（Q 项）状态

- **`Q18`、`Q56`**：在 `d8ed897` 上完全成立，**随 S021 关单一并关闭**。
- **`Q16`、`Q25`**：S021 负责的后端与协议部分在 `d8ed897` 上完全成立并收口；浏览器/OBS 页面 `#` 片段读取清除（`Q16` 前端侧）与前端路由侧核验（`Q25` S023 部分）按原归属留给 `VOXWARD-STORY-023`。

## 需 Owner 决定

无。本批无新增阻断，无涉及产品方向的未决项。

## 关单与后续复用说明

- **关单**：`VOXWARD-SUB-039`（12 行）、`VOXWARD-SUB-040`（12 行）、`VOXWARD-STORY-021`（11 行）共 35 行在 `d8ed897` 上全部 `satisfied`，主线程可直接用 `DONE_KEYS=VOXWARD-SUB-039,VOXWARD-SUB-040,VOXWARD-STORY-021` 运行 `close-batch.cjs` 以 `codeVersion: "d8ed897"` 链写证据并完成关单（脚本自动按先子单后 Story 排序，保留 `7400f39` 首次验收记录并追加 `d8ed897` 通过记录）。
- 本轮探针脚本（`probe-m7b-s021.mts`、`probe-m7b-s021-race.mts`、`probe-m7b-s021-example.mts`、`probe-m7d-s021-rework1.mts`）、生成校验脚本与原始输出保存在交付目录 `probes/`。
