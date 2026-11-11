# 第 m7b 批判断（总表第 7 批第二部分：S021 首次验收、S027 SUB-049 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `7400f39`（`8687bb4` 之上依次合入 `voxward/s021-output`、`voxward/s027-bench`，均无冲突）。
- 范围：4 张工单、58 行验收（S021 组 35 行、SUB-049 23 行，都是首次验收）。satisfied 56 行，failed 2 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch-m7b/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。STORY-027 与 SUB-050 按简报不判（Q60）。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；按小轮处理，验收、判断与 lessons 一次完成。普通判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| Story | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-021 | **打回** | 33/35 satisfied（STORY 10/11、SUB-039 12/12、SUB-040 11/12） | B7（新） | failed：VW-S021-INHERIT-018、VW-SUB040-INHERIT-018。其余必验项成立 |
| VOXWARD-STORY-027（只判 SUB-049） | **SUB-049 通过** | 23/23 satisfied | 无 | STORY-027 与 SUB-050 等 Owner 账号（Q60），本轮不判 |

- rejection 计数：P-S021 首次验收打回 1 次，记在 SUB-040（B7 出在它交付的投递泵）。P-S027 的 SUB-049 首次通过，rejections=0。
- 门禁：install --frozen-lockfile、build、typecheck（含 bench）、test（1860/1860）、check:deps（213 个文件 0 违规）通过；`tools/smoke.sh` 起 `pnpm dev` 与 `node dist/main.js`，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试、全部探针与基准运行在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（acceptance.md E02–E11）。
- 拦截自检：每次运行前在同一环境里先自检，自检脚本没有拦截标记就不发起任何连接。本轮没有 Q58 那样的执行偏差。
- Spec：两份都是 `SPEC_CURRENT`（rev 4）。设计与代码的不一致见 B7、N1、N4、N5。

## 必验项结论

### 必验项 1：S021

- 凭据只读、可撤销，撤销后已建立的连接真的断开，订阅按 `output_grants` 与 `credential_refs` 判定（Q18）：成立。两表任一撤销或范围不符，新连接 401、在线连接一个心跳内 4403；撤销路由立即 4403，对关闭帧不应答的连接在宽限后被断开 TCP；消费者发数据帧 4400；原生凭据打不开 HTTP 路由（E60 G2、G6–G10、C2）。
- 凭据不走查询串，也不走 Authorization 头（Q16）；URL、日志和错误体里都不出现凭据：成立（G5、G11、Q3、Q4）。
- 400、414 不回显 URL，日志里百分号编码的令牌与 Host 已脱敏（Q25）：成立（Q1–Q4）。双重编码的令牌解一次后原样入日志，只作观察（Q5）。
- 握手拒绝与关闭码 401、4400、4403、4408、4413：成立（G5、C1–C5）。
- 统一 ALLOW/BLOCK，拦截只发不带原文与身份的 `WARD_BLOCKED`：常规路径成立（D1–D5）；**一轮投递之中被改判为拦截的行仍以原文发出，不成立（B7）**。
- 投递 ID 稳定；只发 PENDING 且未过期的行；发送后在同一短事务里比较状态标为 SENT；EXPIRED 不发；SENT 后补发被拒（Q56）；发送有上限；过期 SC 不自动补播：成立（S1–S9、C4），「只发 PENDING」在读行时成立、发送时不再核对，见 B7（R3）。
- `docs/protocol/output-native-v1.md` 与 `examples/consumer-dedup/` 在本机复现：成立（E62）。文档两处不准确见 N4。
- dist 能启动（`ws` external）：成立（E07）。关闭见 N1。

### 必验项 2：S027 SUB-049

- 样本来源合法：全部合成，来源与许可写在 `bench/samples/SOURCES.md`，没有真实观众数据（E71 V1–V3）。成立。
- 覆盖中、日、英、混合、谐音、昵称组合、跨条：成立（另有噪声、规避、误报近似词）。跨条整体期望只计数，原因已写明。
- 默认只跑合成适配器与假 CLI，能复现：质量输出两次与直接运行 sha256 相同，也与实施自测的值相同；真实模型要显式开启，而本包两者都给也拒绝（E70）。成立。
- 本轮没有跑任何真实模型，没有写 `docs/reports/`：成立（E70）。

### 必验项 3：Spec

两份都跑了 `kiro-specs.mjs check`，都是 `SPEC_CURRENT`（rev 4），check 不改文件（E10）。S021 设计 §6、§8、§13 与代码不一致（B7、N1），§3 漏列 `auth/output-grants.ts`；协议文档 §10 与样例注释有误（N4）。S027 设计 §6、§7、§10 与 README 的闸门描述有出入（N5）。

### 必验项 4：阻断发现

B7 有当前行为（E61 R1 在真实应用上复现）、明确契约（设计 §6、协议文档 §6、提案 §13.1、VW-R-018）、触发条件与影响，判为阻断。N1–N6 都有依据，但不违反验收行的 expected，判为非阻断。

## 阻断发现

### B7（新，归 SUB-040）：投递泵按轮次开头的读数发送，改判为拦截后仍发出原文

- 当前行为：`createDeliveryPump` 每轮对一个频道只调用一次 `readSendable`（`apps/server/src/modules/output-adapter/delivery.ts:62`），然后逐行 `await sendRow`（`:66`）；每行发送前只按新时钟检查有效期（`:65`），不再核对状态与所属裁决是否仍是当前裁决。`markSent` 的比较条件只有 `status = 'PENDING'` 与 `valid_until > now`（`apps/server/src/db/output-store.ts:231`）。
- 触发条件：一轮之中有一次发送不能同步写完（任一消费者慢、网络拥塞、帧较大），同时这一轮读到的后面的行被改判、取消或删除。积压后重连、远端 OBS 网络不稳时都会慢写；房管改判正在排队的消息是常见操作。
- 实测：E61 R1（真实 `buildApp`、真实投递泵、真实 ws、S014 真实决策服务）：房管把第 2 行改判为 BLOCK 并提交后 26 ms，正常读取的消费者收到第 2 行的 DELIVER 与被拦截的原文，该行标为 SENT，之后才收到 WARD_BLOCKED。R2（受控）相同；R3：被标 CANCELLED 的行也照样发出。R4 对照：越过有效期的行会被跳过。副本中每行发送前重读一次可发送行（`fix-recheck`）后 R1–R3 都成立，E60 其它检查不变。
- 影响：房管已经提交的拦截没有拦住下游，被拦截的原文出现在舞台上并被记为 SENT。违反设计 §6 与协议文档 §6「只发送 PENDING、validUntil 未过、且属于当前裁决的行」、提案 §13.1「输出适配器只能读取已批准的展示事件」与 VW-R-018。S019 接入删除后，R3 的路径会让已取消的投递在同一轮里发出。
- 不成立的行：VW-S021-INHERIT-018、VW-SUB040-INHERIT-018。SUB-039 的帧构造与传输正确，VW-SUB039-INHERIT-018 判 satisfied（同第 m6r1 批 B6 的判法）。
- 修复方向：每行发送前在同一同步段里重读该行是否仍可发送（状态 PENDING、未过期、所属裁决 `is_current = 1`），不可发送就跳过；可以给 `OutputDeliveryPort` 加按 ID 读一行的方法，或每行重读。`markSent` 的条件建议同时要求裁决仍是当前裁决。测试：一个挂起发送的假订阅者，挂起期间改判后面的行（以及标 CANCELLED），断言后面的行不发出；`pump.test.ts` 现有的「in flight」用例只覆盖正在发送的那一行。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | 有消费者在线时 `app.close()` 不返回。`startNativeOutput` 用 `onClose` 停投递泵、关端点（`app.ts:128–131`）；avvio 的 onClose 按登记逆序执行，Fastify 关 HTTP 服务器的处理在 `preReady` 时最后登记、最先执行，`server.close()` 要等升级后的 WebSocket 连接结束，于是停泵与关端点的钩子轮不到。实测 3 s 后仍未完成，期间投递泵照样发送；消费者自己断开后 1 ms 内完成。`main.ts` 收到 SIGINT/SIGTERM 时就是 `app.close()`，有 OBS 在线时进程不会自行退出。设计 §8、§13 写的是「关闭应用时停止计时器并断开连接」。`socket.test.ts` 的 `afterEach` 先 terminate 客户端，测不出来。 | E60 Z1；`fix-preclose` 变体 Z1 成立；avvio `index.js:312`（`_closeQ.unshift`）；Fastify `fastify.js:409–442` | S021 返工包（同包修正自身改动）：钩子改为 `preClose`，加一个「消费者在线时关闭应用」的端点测试 |
| N2 | 已显示的消息被改判为拦截时，下游收到同一 `platformOrder` 的 WARD_BLOCKED，但协议没有说它要撤下之前的 DELIVER。S014 的注释写「A block is sent at once, so the output can take the old content off」。 | E61 R1 的帧序；`decision-service/compensation.ts` 注释；协议文档 §3 | S021 返工包写进协议文档与样例，或 S023 定义舞台行为 |
| N3 | 加固：`WebSocketServer` 没有设 `maxPayload`，仍是 ws 默认的 100 MiB，持有凭据的消费者可以让服务端先缓存一整个大帧再被 4400 关闭；同一授权的连接数不限。凭据放在 `Sec-WebSocket-Protocol` 头里，部署时反向代理不能记录这个头。 | E60 M1（16 MiB，663 ms 后才 4400）、M2（20 个连接）；ws 8.22.2 默认值 | S021 返工包（`maxPayload` 设很小，可选每授权连接上限）；代理日志注意事项归 S029 |
| N4 | 文档：协议文档 §10 说 S003 的 Bearer 只读令牌「仍服务既有接口」，但没有路由要求 `output.feed`，这种令牌现在打不开任何接口；两种输出凭据同用 `vwo_` 前缀。`dedupe.mjs` 注释写「The protocol promises at-least-once delivery」，协议没有这个承诺。S021 设计 §3 分区表漏了 `auth/output-grants.ts`。 | E60 G3、G5；`auth/permissions.ts`、`auth/guard.ts`；acceptance §1.2 | 文档在 S021 返工包顺带改；S003 输出令牌留用还是并入原生授权，由 S023 决定 |
| N5 | S027 文档出入：设计 §10 说只给其中之一时「只运行替身」，README 说「同样拒绝运行」，实测只给 `--real-model` 拒绝、只设环境变量照常跑替身；设计 §6 写 BLOCK 组「归一化两条」，实际三条；设计 §7 的模型名 `bench-synthetic-model` 与代码的 `bench-declared-model` 不同。两种闸门行为都不会调用真实模型。 | E70；`bench/lib/gate.ts`、`rule-set.json`、`lib/doubles.ts` | SUB-050 改 bench 时一并修正 |
| N6 | SUB-050 的输入：假 CLI 没有限流模式（PARENT 场景列了限流），费用与配额没有采集位置，队列最老消息年龄要等任务协调器接线。质量输出与环境记录分开、sha256 可复现（`a50a0c39…9463`），SUB-050 保留这一拆分，真实结果另存。 | E70；`fake-kiro-cli.mjs` 的模式；quality 与 latency 的 `notMeasured` | SUB-050（Q60），与 S029 演练一起 |

问题清单的状态（主线程 `tasks.md`）：Q18、Q25、Q56 在本候选上成立，可以随 S021 关单关闭（Q25 的 S023 验证部分保留）；Q16 的 S021 部分成立，浏览器与 OBS 的片段流程归 S023；Q58 本轮按简报执行，自检脚本已改为没有拦截标记就不运行；Q59、Q60 不变。建议登记 B7 与 N1–N6，归属如上表。

## 需 Owner 决定

无。B7 是明确的缺陷，修法在现有范围内；N1–N6 都按已有来源归到返工包或后续 Story，不涉及产品方向。S003 输出令牌的去留是接口设计，由 S023 在现有授权内决定。

## 下一轮拆分（S021 第 1 次返工）

只有一个返工包，基于本候选 `7400f39`。SUB-049 不需要返工。

| 包 | 子单 | 处理 | 改动文件 | 依赖与注意 |
| --- | --- | --- | --- | --- |
| P-S021-fix1 | SUB-040（N1、N3 的端点改动属 SUB-039 的文件，同包顺序做） | B7；N1；N3 的 `maxPayload`；N2、N4 的文档 | `apps/server/src/modules/output-adapter/delivery.ts`、`apps/server/src/db/output-store.ts`（如加按 ID 读行或改 `markSent` 条件，契约在 `packages/contracts/src/ports/output-port.ts`）、`apps/server/src/app.ts`（`preClose`）、`apps/server/src/adapters/native-output/socket.ts`（`maxPayload`）、`apps/server/test/output-adapter/delivery/pump.test.ts`、`apps/server/test/output-adapter/protocol/socket.test.ts`、`docs/protocol/output-native-v1.md`、`examples/consumer-dedup/dedupe.mjs`、`.kiro/specs/voxward-s021-output/design.md` 受管段之外 | 不改 `decision-service/`、`db/schema/`、`db/decision-store.ts`、`bench/`，这样 SUB-049 与 S014 的证据不失效。交付前在包内跑 E61（R1–R3 期望成立）与 E60（Z1 期望成立），探针在本轮交付目录 `probes/` |

## 复验范围

- 关单：SUB-049 可以按本轮证据以 `7400f39` 链写（23 行）；STORY-027 不关（SUB-050 未做）。S021 组不能以 `7400f39` 关单，四单的 `content.evidence` 现在为空。
- S021 返工后的新候选：35 行都要重新判定。重跑 E60、E61、E62 与 E02–E11。本轮 satisfied 的 33 行，若 `socket.ts`、`output-store.ts`、`app.ts`、`auth/routes.ts`、`auth/output-grants.ts`、`security/redaction.ts`、`modules/output-adapter/`、契约包、`docs/protocol/`、`examples/` 在新候选上有改动，以重跑结果为准；没有改动的路径可复用本轮结论并重新盖 codeVersion。
- 若主线程改在之后的新候选上关 SUB-049，先确认 `bench/`、根 `package.json` 的 `bench:*` 与 `typecheck` 脚本、`apps/server/src/modules/moderation-engine/`、`apps/server/src/modules/inference-provider/`、`apps/server/src/adapters/synthetic/`、`apps/server/src/adapters/kiro-cli/`、`packages/contracts/` 相对 `7400f39` 无改动，再复用本轮 E70、E71；有改动则重跑（质量输出的 sha256 应仍为 `a50a0c39…9463`，规则或替身变了要说明原因）。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08，自检与命令同一环境）、check-deps 负面对照（E09）、两份 spec 的 check（E10）、静态核对（E11）。
- 探针、拦截脚本、对照变体 diff、生成脚本与原始输出的副本在交付目录 `probes/`（见 `probes/README.md`；需要检出里的 `apps/server/node_modules/.bin/tsx`）。
