# 第 m7d 批独立复验记录（总表第 7 批第四部分：S021 返工 1 复验）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7d` 上的 `d8ed897`（完整提交 `d8ed8972f8c6264ca6d2149d2e58ef23cfcb50d0`），含 `P-S021-fix1` 合并提交 `ad484f7`（规范更新 `86b45cb`、修复提交 `0a3f910`、自测记录 `05f92f7`）。相对第 m7b 批候选 `7400f39`，`P-S021-fix1` 共改动 15 个文件：`packages/contracts/src/ports/output-port.ts`（新增 `readSendableRow`，`CONTRACT_VERSION` 仍为 `"1"`）、`apps/server/src/db/output-store.ts`（实现 `readSendableRow` 并在 `markSent` 短事务内校验 `verdicts.is_current = 1`）、`apps/server/src/modules/output-adapter/delivery.ts`（每行 `sendRow` 前同步调用 `readSendableRow`）、`apps/server/src/app.ts`（`startNativeOutput` 关闭钩子由 `onClose` 改为 `preClose`）、`apps/server/src/adapters/native-output/socket.ts`（`WebSocketServer` 设置 `maxPayload: 4096`）、测试 `pump.test.ts`/`helpers.ts`/`socket.test.ts`、文档 `docs/protocol/output-native-v1.md` §3/§10、样例 `examples/consumer-dedup/dedupe.mjs` 及 `.kiro/specs/voxward-s021-output/{design.md,tasks.md,requirements.md,source.json,evidence/rework1-self-check.md}`（E11）。核验 `git diff 7400f39..d8ed897 -- bench/` 为 0 行（`VOXWARD-SUB-049` 已在 `7400f39` 关单 `done`，本轮不重复出证据行）。
- 检出与隔离：全程在 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7d` 只读复验，未修改或提交任何跟踪文件（默认配置冒烟临时生成的未跟踪 `apps/server/data/` 已在冒烟后清理，`git status --porcelain` 为 0 行），结束时 `:3000` 与 `:5173` 均为 0 监听。全部测试与探针均经 `guarded.sh` 加载 `net/preload.mjs` 并在预加载后执行 `net/selfcheck.mjs`（Q58），外部主机与本机既有监听端口连接 0 次，`kiro-cli`/`kirocrew`/`kiro` 垫片调用 0 次。
- 工单读数（E01）：读取预取快照 `m7d-show/{VOXWARD-STORY-021,VOXWARD-SUB-039,VOXWARD-SUB-040}.json`，库版本 `21521`，`headEventHash` `e3fe1c909fbe6795ade6e025e2d310deed08c3bc08808d3b45aa466c0d762042`。三单状态均为 `active`，已落有第 m7b 批候选 `7400f39` 的首次验收证据（STORY-021 10 satisfied / 1 failed、SUB-039 12 satisfied、SUB-040 11 satisfied / 1 failed）：`VOXWARD-STORY-021`（rev 5，11 行）、`VOXWARD-SUB-039`（rev 4，12 行）、`VOXWARD-SUB-040`（rev 4，12 行），合计 **35 行**；同一 INHERIT 行在 Story 与两张子单上的 `expected`、`method`、`requirement` 逐字一致。
- 验收人：独立验收兼判断代理（main 档 `@verifier`），未参与实现。全部结论来自本轮独立门禁、源码核查与实测探针。
- 结果：**35 行：satisfied 35 行，failed 0 行，unverified 0 行（全部通过）**。第 m7b 批阻断 `B7` 与非阻断建议 `N1`–`N4` 在 `d8ed897` 上全部核验通过，无新增阻断，详见 `judgment.md`。

## 0. 执行记录

所有探针脚本副本、拦截记录与门禁原始日志保存在本批交付目录 `probes/`。

| 编号 | 命令（默认工作目录为 `verify-m7d`） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | `node -e` 解析 `m7d-show/VOXWARD-{STORY-021,SUB-039,SUB-040}.json` 并核对 `git diff 7400f39..d8ed897 -- bench/` | 0 | 库版本 21521；STORY-021 rev 5（11 行）、SUB-039 rev 4（12 行）、SUB-040 rev 4（12 行），共 35 行；`bench/` 差异 0 行。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | 锁文件一致，`pnpm-lock.yaml` 无变更。 |
| E03 | `pnpm build` | 0 | `@voxward/contracts`、`@voxward/server`（`dist/main.js` 带 `--external:ws`）、`@voxward/web` 全部构建通过。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 与 `bench:typecheck` 均 0 个 `error TS`。 |
| E05 | `CI=1 guarded.sh .../e05-s021-vitest pnpm --filter @voxward/server exec vitest run <S021 全部 10 个测试文件>` | 0 | 10 个文件、62 项测试全部通过（`socket.test.ts` 12、`pump.test.ts` 14、`resend-contract.test.ts` 4、`consumer-dedup.test.ts` 5、`frames.test.ts` 5、`subscription-registry.test.ts` 3、`output-store.test.ts` 8、`output-grants.test.ts` 3、`url-redaction.test.ts` 4、`error-responses.test.ts` 4）。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 219 files checked, 0 violations`。 |
| E07 | `env -u VOXWARD_DATABASE_FILE -u VOXWARD_ADAPTERS -u VOXWARD_PORT -u VOXWARD_HOST bash .../voxward-master/tools/smoke.sh .../verify-m7d .../probes/smoke`（事后清理未跟踪默认库） | 0 | `dev healthz ok=1 code=200 after 2s`；`dist healthz ok=1 code=200 after 1s`；停止后 `no listeners`，`:3000` 与 `:5173` 均 0 监听。 |
| E08 | `CI=1 bash .../guarded.sh .../probes/e08-test pnpm test` | 0 | **149 个测试文件、1886 项测试全部通过**。`selfcheck.txt` 在 preload 后执行（`guardLoaded: true`）；179 个 Node 进程加载拦截，外部主机连接 0 次、既有回环端口拒绝 0 次（回环 36 次、fetch-loopback 17 次、IPC 36 次、测试内受拦 DNS 1 次），`shim.log` 0 字节。 |
| E09 | 临时副本 `check-deps` 负面对照（不触碰检出）：向 `adapters/native-output`、`modules/output-adapter`、`contracts/output`、`db` 注入 6 处跨区导入运行 `scripts/check-deps.mjs`，删除后复核 | 0、1、0 | 基线 219 文件 0 违规；注入后精确报出 6 处违规（退出码 1）；清理后恢复 219 文件 0 违规。 |
| E10 | `node .../mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id work:26274628cbb8f691b6cf430c --spec-dir .kiro/specs/voxward-s021-output` | 0 | `reasonCode: "SPEC_CURRENT"`，`workRevision: 5`，`sourceDigest` 与 `previousSourceDigest` 均为 `64cb9883…a45469`；`.kiro/specs/**` 未被修改。 |
| E11 | 静态核对 `ad484f7` 15 个改动文件与全部探针拦截日志汇总 | 0 | 分区导入、短事务边界、`design.md`/`tasks.md`（`R1.1`–`R1.6`）与代码逐项一致；`e11-guard-audit.json` 确认全部 6 次受控执行 `guardLoaded=true`、`shimBytes=0`、外连 0 次。 |
| E60 | `CI=1 bash .../guarded.sh .../e60-s021 .../tsx .../probe-m7b-s021.mts .../verify-m7d` | 0 | **`checks 35, failures 0`**：`G1–G11`、`Q1–Q4`、`C1–C5`、`D1–D5`、`S1–S9`、**`Z1`**（双消费者在线下 `app.close()` `0 ms` 完成并断开，收口 `N1`）全部通过；观察 `M1` 中 16 MiB 客户端帧在 `159 ms` 内以 `1009` 断开（收口 `N3`）。 |
| E61 | `CI=1 bash .../guarded.sh .../e61-s021-race .../tsx .../probe-m7b-s021-race.mts .../verify-m7d` | 0 | **`checks 4, failures 0`**：**`R1`–`R4` 全部通过**（`R1` 真实应用慢消费者阻塞第 1 行期间改判第 2 行为 `BLOCK`：正常消费者与慢消费者均未收到第 2 行原文，只收到 `DELIVER:row-1` 与 `WARD_BLOCKED:overturn-delivery:channel-a:op-block-2`；`R2` 受控挂起改判、`R3` 挂起标 `CANCELLED`、`R4` 挂起过期全部跳过不发，收口 `B7`）。 |
| E62 | `CI=1 bash .../guarded.sh .../e62-s021-example .../tsx .../probe-m7b-s021-example.mts .../verify-m7d` | 0 | **`checks 5, failures 0`**：`E1–E5` 原样运行 `examples/consumer-dedup/consumer.mjs` 全部通过。 |
| E63 | `CI=1 bash .../guarded.sh .../e63-s021-rework1 .../tsx .../probe-m7d-s021-rework1.mts .../verify-m7d` | 0 | **`checks 4, failures 0`**：`X1`（4096B->4400，4097B 与 2500+2500 分片->3 ms 内 1009，日志干净且健康订阅者照常收帧）、`X2`（4 行混合改判 `BLOCK` + S019 `CANCELLED` 同轮精确跳过）、`X3`（在途行自身改判拒标 `SENT`、绝不二次重发且下发同 `platformOrder=77` 的 `WARD_BLOCKED`）、`X4`（6 MiB 慢写中途 `app.close()` `0 ms` 完成且 0 个未捕获拒绝）全部通过。 |

## 1. 共同检查与返工核验

<a id="recheck"></a>
### 1.1 复验范围

相对于第 m7b 批候选 `7400f39`，本候选 `d8ed897` 合入了 S019 初版（`d047636`，`app.ts` 增加数据请求路由挂载，不动 `startNativeOutput` 内部逻辑）与 `P-S021-fix1`（`ad484f7`，修改 `output-port.ts`、`output-store.ts`、`delivery.ts`、`app.ts`、`socket.ts`、协议文档、去重样例及测试）。由于 `socket.ts`、`output-store.ts`、`app.ts`、`delivery.ts`、`output-port.ts`、`docs/protocol/`、`examples/` 在新候选上均有改动，按第 m7b 批 `judgment.md`「复验范围」要求，本轮在 `d8ed897` 上完整重跑了 `E02–E11` 与 `E60–E62`，并新增边界探针 `E63`，对 S021 组全部 35 行在 `d8ed897` 上重新判定并盖新 `codeVersion`。`VOXWARD-SUB-049` 已在 `7400f39` 关单且 `bench/` 0 改动（E01），本轮不重出证据行。

<a id="spec"></a>
### 1.2 Spec 状态与 P-S021-fix1（B7、N1–N4）逐项核对

- **Spec（E10）**：`kiro-specs.mjs check` 对 `.kiro/specs/voxward-s021-output` 返回 `SPEC_CURRENT`（`workRevision: 5`）；`design.md`（§3、§6、§8、§13）与 `tasks.md`（`R1.1`–`R1.6`）均已与代码对齐。
- **B7 修复核验（通过）**：
  - `packages/contracts/src/ports/output-port.ts:52` 新增 `readSendableRow({ deliveryId, nowIso })`；`apps/server/src/db/output-store.ts:215-231` 同步查询 `deliveries.id = deliveryId AND status = 'PENDING' AND valid_until > nowIso AND verdicts.is_current = 1`；`apps/server/src/modules/output-adapter/delivery.ts:65-68` 在每行进入 `sendRow` 前同一同步段调用 `readSendableRow`，从重查到 `ws.send` 之间无任何 `await` 让出事件循环。
  - `output-store.ts:253-278` 的 `markSent` 在短事务内联表核验 `verdicts.is_current = 1`，在途行自身若在写出期间被改判，写完后不会被标为 `SENT`，下一轮因 `is_current = 0` 也不会重发，且补发被拒（E63 `X3`）。
  - `E61` `R1–R4`（4/4）与 `E63` `X2–X3`（2/2）全部通过。
- **N1 修复核验（通过）**：`apps/server/src/app.ts:147` 将 `startNativeOutput` 的清理钩子由 `onClose` 改为 `preClose`，在 Fastify 关闭 HTTP 服务器等待升级套接字之前先停定时器并 `terminate()` 全部 WebSocket 客户端。`E60 Z1`（双消费者在线 `0 ms` 返回）、`E63 X4`（6 MiB 慢写中途 `0 ms` 返回且 0 未捕获异常）与 `socket.test.ts` 新增用例全部通过。
- **N2 修复核验（通过）**：`docs/protocol/output-native-v1.md` §3（第 70 行）明确写明：当已下发 `DELIVER` 的消息被改判为 `BLOCK` 时，服务端下发同一 `platformOrder` 的 `WARD_BLOCKED` 帧，下游消费者应据此撤回或隐藏此前对应同一 `platformOrder` 的展示内容（与 `E63 X3` 实测帧序一致）。
- **N3 修复核验（通过）**：`apps/server/src/adapters/native-output/socket.ts:77` 为 `WebSocketServer` 配置 `maxPayload: 4096`。实测 `4096 B` 客户端帧走应用层 `4400 CLIENT_DATA_NOT_ACCEPTED`；`4097 B` 单帧、`2500+2500 B` 分片消息及 `16 MiB` 大帧均在 `ws` 帧头层立即以标准关闭码 `1009` 断开（4097B 耗时 `3 ms`，16 MiB 耗时 `159 ms`），日志只记 `{ errorCode: "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH" }`，无凭据或载荷泄露，同房间健康消费者继续正常收帧（E60 `M1`、E63 `X1`）。
- **N4 修复核验（通过）**：`docs/protocol/output-native-v1.md` §10（第 153 行）已修正为 S003 `auth_output_tokens` 与原生凭据共用 `vwo_` 前缀、当前无任何 HTTP 路由要求 `output.feed` 且不能订阅原生端点；`examples/consumer-dedup/dedupe.mjs`（第 1–5 行）已去掉「promises at-least-once delivery」表述；`design.md` §3（第 91 行）已补齐 `auth/output-grants.ts`。
- **Q16、Q18、Q25、Q56 状态**：四项在本候选上的 S021 责任部分均持续成立（E60 `G1–G11`、`Q1–Q4`、`S5–S6`）。

## 2. VOXWARD-STORY-021 组逐行判定（35 行：35 satisfied，0 failed）

### 2.1 VOXWARD-STORY-021 本单行

<a id="vw-s021-ac001"></a>
##### VW-S021-AC001

**VW-S021-AC001@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：候选 d8ed897 检出（含 P-S021-fix1 合并提交 ad484f7）：install --frozen-lockfile、build、typecheck（含 bench）、check:deps（219 个文件 0 违规）及网络/CLI 拦截下全量 pnpm test（149 个文件 1886 项）均退出 0（E02–E06、E08），默认配置冒烟 dev 与 dist 均返回 200 且停止后 3000/5173 无监听（E07）；S021 相关 10 个测试文件 62 项全部通过（E05，新增 B7 慢订阅者并发改判/取消与 markSent 当前裁决校验 3 项、N1 在线消费者 app.close() 1 项）。实测探针（全部经 guarded.sh 预加载拦截并通过 selfcheck）：E60（probe-m7b-s021.mts）35/35 项全绿（含 Z1 在线双消费者下 app.close() 0 ms 完成并断开连接）；E61（probe-m7b-s021-race.mts）R1–R4 4/4 项全绿（真实应用与受控夹具下第 1 行慢写挂起期间第 2 行改判 BLOCK 或标 CANCELLED 均不再发出原文，慢消费者 R1b 亦未收到原文）；E62（probe-m7b-s021-example.mts）5/5 项全绿；E63（probe-m7d-s021-rework1.mts）X1–X4 4/4 项全绿（maxPayload=4096 边界 4096B->4400 / 4097B 与分片 5000B->1009 且健康订阅者不受影响、4 行混合改判+S019 CANCELLED 同轮跳过、在途行自身改判不标 SENT 且下发同 platformOrder 的 WARD_BLOCKED、慢写中途 app.close() 0 ms 无未捕获拒绝）。不输出稳定用户 ID、分数、名单、审核理由或对话：DELIVER、WARD_BLOCKED、HELLO 的键与 NATIVE_FRAME_FIELDS 逐一相同，display 只有 label（恒为 null）、text、translation，帧里无主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：4096 B 以内文本或二进制数据帧一律 4400 断开（E60 C2、E63 X1），超过 maxPayload=4096 B 的单帧或分片消息由传输层立即 1009 断开且不缓存整包（E60 M1、E63 X1）。不承诺严格只展示一次：协议文档 §6、§9、样例 README 与 dedupe.mjs 注释一致写明，消费者按 deliveryId 去重（E62）。场景：违规消息只发 WARD_BLOCKED、原文不进帧，且一轮投递中并发改判为 BLOCK 的后续行绝不发出原文、已展示消息改判后下发同 platformOrder 的 WARD_BLOCKED 供下游撤回（E60 D2/S1、E61 R1/R2、E63 X2/X3、协议文档 §3）；重复投递时同一 deliveryId 被重发、样例只显示一次（E60 S9/C4b、E62 E2）；断连覆盖 4408、4413、4403 与 preClose 主动关闭，重连只收到 HELLO（E60 C3/C4/G8/S3/Z1、E63 X4）；过期 SC 不补播（E60 S1/S3/S7）；人工补发只有明确操作产生新行且只发一次，SENT 行补发被拒 ALREADY_SENT（E60 S5/S6，Q56）；凭据撤销后连接 4403 断开、重连 401（E60 G6/G8/G9，Q18）。

<a id="vw-s021-parent"></a>
##### VW-S021-PARENT

**VW-S021-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在候选 d8ed897 上的同次执行（E02–E08、E60–E63）。expected 的三项全部成立（同 AC001）。S021 的贡献为原生协议与白名单帧、凭据签发与两表实时/心跳判定、WebSocket 传输（含 maxPayload=4096 与 preClose 关闭）与心跳断连、每行发送前同步复核当前裁决的投递泵与补发契约、协议文档与去重样例；OBS 页面、显示昵称与付费展示信息不在本单（design.md §1、§11）。

### 2.2 VOXWARD-SUB-039 本单行

<a id="vw-sub039-ac001"></a>
##### VW-SUB039-AC001

**VW-SUB039-AC001@1：satisfied**（machine；要求 work:ac327b9a81a9326b33711ffb#VW-SUB039-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效。
- 依据：候选 d8ed897 检出（含 P-S021-fix1 合并提交 ad484f7）：install --frozen-lockfile、build、typecheck（含 bench）、check:deps（219 个文件 0 违规）及网络/CLI 拦截下全量 pnpm test（149 个文件 1886 项）均退出 0（E02–E06、E08），默认配置冒烟 dev 与 dist 均返回 200 且停止后 3000/5173 无监听（E07）；S021 相关 10 个测试文件 62 项全部通过（E05，新增 B7 慢订阅者并发改判/取消与 markSent 当前裁决校验 3 项、N1 在线消费者 app.close() 1 项）。实测探针（全部经 guarded.sh 预加载拦截并通过 selfcheck）：E60（probe-m7b-s021.mts）35/35 项全绿（含 Z1 在线双消费者下 app.close() 0 ms 完成并断开连接）；E61（probe-m7b-s021-race.mts）R1–R4 4/4 项全绿（真实应用与受控夹具下第 1 行慢写挂起期间第 2 行改判 BLOCK 或标 CANCELLED 均不再发出原文，慢消费者 R1b 亦未收到原文）；E62（probe-m7b-s021-example.mts）5/5 项全绿；E63（probe-m7d-s021-rework1.mts）X1–X4 4/4 项全绿（maxPayload=4096 边界 4096B->4400 / 4097B 与分片 5000B->1009 且健康订阅者不受影响、4 行混合改判+S019 CANCELLED 同轮跳过、在途行自身改判不标 SENT 且下发同 platformOrder 的 WARD_BLOCKED、慢写中途 app.close() 0 ms 无未捕获拒绝）。不输出稳定用户 ID、分数、名单、审核理由或对话：帧字段严格匹配白名单 NATIVE_FRAME_FIELDS，不含主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：<=4096 B 数据帧以 4400 断开（E60 C2、E63 X1），>4096 B 单帧或分片消息以 1009 立即断开且不影响同房间健康订阅者（E60 M1、E63 X1，收口 N3）。撤销后订阅失效：所有者撤销后该授权连接立即 4403 断开，其它授权不受影响，重连 401（G8）；两表任一撤销或范围不符时一个心跳内 4403、重连 401（G6）；不应答关闭帧的连接在宽限后断开 TCP（G9）；应用 preClose 时立即终止升级连接并停泵，不阻塞停机（E60 Z1、E63 X4，收口 N1）；原生凭据打不开 HTTP 路由（G10）。

<a id="vw-sub039-story"></a>
##### VW-SUB039-STORY

**VW-SUB039-STORY@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效。 本单只证明所承担部分；VOXWARD-STORY-021 的完整判据（VW-S021-AC001@1）保持。
- 依据：复用 VW-SUB039-AC001 在 d8ed897 上的同次执行（E02–E08、E60、E63）。本单承担的「原生协议、字段/版本/鉴权/心跳断连说明；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED」成立：子协议 vw-output.v1、版本 1，凭据只在子协议列表且不回显（E60 G4、G5），HELLO 先于投递帧（G4），心跳 ping 与 4408（C1、C3），4400/4403/4413 各有固定原因且 maxPayload=4096 拦截超限客户端帧（C2、C4、C5、E63 X1），preClose 优雅停机（Z1、X4）；ALLOW 与 ALLOW_NOISE 统一映射 DELIVER、BLOCK 映射无原文/身份的 WARD_BLOCKED（D1–D5）。VOXWARD-STORY-021 的完整判据 VW-S021-AC001 在本候选上亦判定为 satisfied。

<a id="vw-sub039-parent"></a>
##### VW-SUB039-PARENT

**VW-SUB039-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。expected 的三项全部成立（同 VW-S021-AC001）；SUB-039 承担的协议、鉴权、心跳断连、撤销、maxPayload=4096 与 preClose 部分见 VW-SUB039-AC001。

### 2.3 VOXWARD-SUB-040 本单行

<a id="vw-sub040-ac001"></a>
##### VW-SUB040-AC001

**VW-SUB040-AC001@1：satisfied**（machine；要求 work:a86848777f015b0c0a1d9611#VW-SUB040-R001@1）

- expected：重复投递可按投递 ID 去重；过期 SC 不自动补播；补发须明确动作且受有效期限制；不承诺不可控消费者网络严格只展示一次。
- 依据：候选 d8ed897 检出（含 P-S021-fix1 合并提交 ad484f7）：install --frozen-lockfile、build、typecheck（含 bench）、check:deps（219 个文件 0 违规）及网络/CLI 拦截下全量 pnpm test（149 个文件 1886 项）均退出 0（E02–E06、E08），默认配置冒烟 dev 与 dist 均返回 200 且停止后 3000/5173 无监听（E07）；S021 相关 10 个测试文件 62 项全部通过（E05，新增 B7 慢订阅者并发改判/取消与 markSent 当前裁决校验 3 项、N1 在线消费者 app.close() 1 项）。实测探针（全部经 guarded.sh 预加载拦截并通过 selfcheck）：E60（probe-m7b-s021.mts）35/35 项全绿（含 Z1 在线双消费者下 app.close() 0 ms 完成并断开连接）；E61（probe-m7b-s021-race.mts）R1–R4 4/4 项全绿（真实应用与受控夹具下第 1 行慢写挂起期间第 2 行改判 BLOCK 或标 CANCELLED 均不再发出原文，慢消费者 R1b 亦未收到原文）；E62（probe-m7b-s021-example.mts）5/5 项全绿；E63（probe-m7d-s021-rework1.mts）X1–X4 4/4 项全绿（maxPayload=4096 边界 4096B->4400 / 4097B 与分片 5000B->1009 且健康订阅者不受影响、4 行混合改判+S019 CANCELLED 同轮跳过、在途行自身改判不标 SENT 且下发同 platformOrder 的 WARD_BLOCKED、慢写中途 app.close() 0 ms 无未捕获拒绝）。重复投递可按投递 ID 去重：某个消费者发送失败时，该行在下一轮以同一 deliveryId 重发给在线消费者（E60 S9 3 次、C4b 2 次），样例 consumer.mjs 按 deliveryId 只打印一次（E62 E2），dedupe.mjs 跳过 validUntil 已过的帧且注释与协议承诺一致（consumer-dedup.test.ts 5 项，收口 N4）。过期 SC 不自动补播：EXPIRED 与过期的 PENDING 行不发并标 EXPIRED，重连不补播（S1–S3）；改判放行写为 EXPIRED 不自动发出（S7）。补发须明确动作且受有效期限制：仅经 S014 resendDelivery，SENT 行有效期内 NOT_EXPIRED、过期后 ALREADY_SENT（Q56），EXPIRED 行补发生成新 deliveryId 与 60 s 有效期且只发一次，重复操作为 duplicate，数据管理员 denied，超过 10 分钟 WINDOW_CLOSED（S5、S6）。不承诺严格只展示一次：协议文档 §6、§9 与样例一致写明（E62）。

<a id="vw-sub040-story"></a>
##### VW-SUB040-STORY

**VW-SUB040-STORY@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：重复投递可按投递 ID 去重；过期 SC 不自动补播；补发须明确动作且受有效期限制；不承诺不可控消费者网络严格只展示一次。 本单只证明所承担部分；VOXWARD-STORY-021 的完整判据（VW-S021-AC001@1）保持。
- 依据：复用 VW-SUB040-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。本单承担的「投递 ID 和状态；有限发送与补发契约」及 B7 返工修复全部成立：deliveryId 即 deliveries.id，重发不换 ID（E60 S9）；每轮批量读行与每行 sendRow 前同步重查 readSendableRow 均要求 PENDING、未过期、所属裁决 is_current=1（E60 S1、E61 R1–R4、E63 X2），全部在线消费者接受后 markSent 在单短事务内校验 PENDING、未过期与 is_current=1 置 SENT（E60 S2、E63 X3）；无在线消费者保持 PENDING 且 0 次尝试（S4）；每轮每频道上限 50 行（S8），失败 3 次置 FAILED 且后续行保序等待（S9）；补发规则同 AC001（S5–S7）；协议文档 §3、§10 与样例注释已收口 N2、N4。VOXWARD-STORY-021 的完整判据 VW-S021-AC001 亦判定为 satisfied。

<a id="vw-sub040-parent"></a>
##### VW-SUB040-PARENT

**VW-SUB040-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。expected 的三项全部成立（同 VW-S021-AC001）；SUB-040 承担的投递状态、发送前同步重查当前裁决、有限发送、补发契约、协议文档与去重样例部分见 VW-SUB040-AC001 与 VW-SUB040-STORY。

### 2.4 INHERIT 行（Story 与两张子单对照）

同一 INHERIT 行在 VOXWARD-STORY-021、VOXWARD-SUB-039、VOXWARD-SUB-040 上的 expected、method、requirement 逐字相同（E01），expected 只列一次；P-S021-fix1 合入后全部 INHERIT 行（含 INHERIT-018）均成立。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-001"></a>
##### VW-S021-INHERIT-001

**VW-S021-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查与门禁核对（E06、E07、E09、E11）：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 contracts、db 与 builtin（design.md §3 已补齐该行）。pnpm check:deps 检查 219 个文件 0 违规（E06）；副本负面对照注入 4 个文件 6 处跨区导入全部检出（E09）。运行时依赖 ws 以 --external:ws 打包，dist 启动冒烟通过（E07）。契约包 OutputDeliveryPort 新增同步单行重查 readSendableRow，CONTRACT_VERSION 仍为 "1"。不引入托管服务或本机代理；远端部署与 WSS 终止由 S029 承接。

<a id="vw-sub039-inherit-001"></a>
##### VW-SUB039-INHERIT-001

**VW-SUB039-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查与门禁核对（E06、E07、E09、E11）：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 contracts、db 与 builtin（design.md §3 已补齐该行）。pnpm check:deps 检查 219 个文件 0 违规（E06）；副本负面对照注入 4 个文件 6 处跨区导入全部检出（E09）。运行时依赖 ws 以 --external:ws 打包，dist 启动冒烟通过（E07）。契约包 OutputDeliveryPort 新增同步单行重查 readSendableRow，CONTRACT_VERSION 仍为 "1"。不引入托管服务或本机代理；远端部署与 WSS 终止由 S029 承接。本单交付契约、帧构造、订阅注册表、WebSocket 传输（含 maxPayload=4096）、preClose 停机挂钩及签发与撤销路由。

<a id="vw-sub040-inherit-001"></a>
##### VW-SUB040-INHERIT-001

**VW-SUB040-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查与门禁核对（E06、E07、E09、E11）：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 contracts、db 与 builtin（design.md §3 已补齐该行）。pnpm check:deps 检查 219 个文件 0 违规（E06）；副本负面对照注入 4 个文件 6 处跨区导入全部检出（E09）。运行时依赖 ws 以 --external:ws 打包，dist 启动冒烟通过（E07）。契约包 OutputDeliveryPort 新增同步单行重查 readSendableRow，CONTRACT_VERSION 仍为 "1"。不引入托管服务或本机代理；远端部署与 WSS 终止由 S029 承接。本单（含 P-S021-fix1）交付投递泵（含发送前 readSendableRow 同步重查）、补发规则、db 端口实现（readSendableRow 与校验 is_current=1 的 markSent）、协议文档与去重样例。

#### VW-R-006@1（INHERIT-006）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-006"></a>
##### VW-S021-INHERIT-006

**VW-S021-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，每行发送前同步重查 readSendableRow（PENDING、未过期、is_current=1），发送成功后 markSent 在短事务内比较状态与当前裁决置 SENT（E60 S1/S2、E61 R1–R4、E63 X2/X3）；有效期，过期行不发、重连不补播，明确补发的新行有效期 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

<a id="vw-sub039-inherit-006"></a>
##### VW-SUB039-INHERIT-006

**VW-SUB039-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。本单承担的心跳与断连成立：答 ping 保持连接（C1），超时 4408（C3），积压 4413（C4），撤销 4403（G8），停机 preClose 断开（Z1、X4）；投递顺序、状态与有效期由 SUB-040 交付并成立：VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，每行发送前同步重查 readSendableRow（PENDING、未过期、is_current=1），发送成功后 markSent 在短事务内比较状态与当前裁决置 SENT（E60 S1/S2、E61 R1–R4、E63 X2/X3）；有效期，过期行不发、重连不补播，明确补发的新行有效期 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

<a id="vw-sub040-inherit-006"></a>
##### VW-SUB040-INHERIT-006

**VW-SUB040-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。本单承担的投递顺序、状态与有效期成立：VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，每行发送前同步重查 readSendableRow（PENDING、未过期、is_current=1），发送成功后 markSent 在短事务内比较状态与当前裁决置 SENT（E60 S1/S2、E61 R1–R4、E63 X2/X3）；有效期，过期行不发、重连不补播，明确补发的新行有效期 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-009"></a>
##### VW-S021-INHERIT-009

**VW-S021-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料（E11、E60 D1/G2/G11、E63 X1）：S021 不调用 AI，不构造模型输入。输出帧只带已批准的正文与译文，发送时从 Technical Log 未过期的 MESSAGE_TEXT、TRANSLATION 证据实时读取，不另存长期副本（output-store.ts readApproved）。日志只记录状态、原因码与错误码（含超限帧 WS_ERR_UNSUPPORTED_MESSAGE_LENGTH），不含正文、客户端帧载荷、URL 查询串或凭据（E60 G11/Q1–Q4、E63 X1）。凭据只存 SHA-256 摘要引用（G2）。不涉及会话、提示或工具轨迹，也不宣称清理等于外部提供方删除。

<a id="vw-sub039-inherit-009"></a>
##### VW-SUB039-INHERIT-009

**VW-SUB039-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料（E11、E60 D1/G2/G11、E63 X1）：S021 不调用 AI，不构造模型输入。输出帧只带已批准的正文与译文，发送时从 Technical Log 未过期的 MESSAGE_TEXT、TRANSLATION 证据实时读取，不另存长期副本（output-store.ts readApproved）。日志只记录状态、原因码与错误码（含超限帧 WS_ERR_UNSUPPORTED_MESSAGE_LENGTH），不含正文、客户端帧载荷、URL 查询串或凭据（E60 G11/Q1–Q4、E63 X1）。凭据只存 SHA-256 摘要引用（G2）。不涉及会话、提示或工具轨迹，也不宣称清理等于外部提供方删除。

<a id="vw-sub040-inherit-009"></a>
##### VW-SUB040-INHERIT-009

**VW-SUB040-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料（E11、E60 D1/G2/G11、E63 X1）：S021 不调用 AI，不构造模型输入。输出帧只带已批准的正文与译文，发送时从 Technical Log 未过期的 MESSAGE_TEXT、TRANSLATION 证据实时读取，不另存长期副本（output-store.ts readApproved）。日志只记录状态、原因码与错误码（含超限帧 WS_ERR_UNSUPPORTED_MESSAGE_LENGTH），不含正文、客户端帧载荷、URL 查询串或凭据（E60 G11/Q1–Q4、E63 X1）。凭据只存 SHA-256 摘要引用（G2）。不涉及会话、提示或工具轨迹，也不宣称清理等于外部提供方删除。

#### VW-R-010@1（INHERIT-010）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s021-inherit-010"></a>
##### VW-S021-INHERIT-010

**VW-S021-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 与返工 P-S021-fix1 均未改动这些模块（E11），全量测试 149 文件 1886 项在拦截下全部通过（E08）。原生输出只读投递表与证据，不经推理适配器。完整判据仍由 INIT 的 VW-AC-010 承载。

<a id="vw-sub039-inherit-010"></a>
##### VW-SUB039-INHERIT-010

**VW-SUB039-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 与返工 P-S021-fix1 均未改动这些模块（E11），全量测试 149 文件 1886 项在拦截下全部通过（E08）。原生输出只读投递表与证据，不经推理适配器。完整判据仍由 INIT 的 VW-AC-010 承载。

<a id="vw-sub040-inherit-010"></a>
##### VW-SUB040-INHERIT-010

**VW-SUB040-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 与返工 P-S021-fix1 均未改动这些模块（E11），全量测试 149 文件 1886 项在拦截下全部通过（E08）。原生输出只读投递表与证据，不经推理适配器。完整判据仍由 INIT 的 VW-AC-010 承载。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-011"></a>
##### VW-S021-INHERIT-011

**VW-S021-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查仓储接口、事务与部署说明（E11、E60 G2/G8/S2/S9、E61 R1–R3）：签发与撤销各在一次短事务内读写 credential_refs 与 output_grants；输出端 expireDue、readSendableRow、markSent（现同时校验 status='PENDING'、valid_until>now 与 verdicts.is_current=1）、recordSendFailure、markFailed 各是一次同步短事务或同步单次查询，绝不跨 await 持有事务；网络发送期间无打开事务。投递队列即 deliveries 表，deliver 只唤醒投递泵，不在队列或额外日志复制正文。消费者不能写（<=4096B 数据帧 4400、>4096B 帧 1009，E60 C2、E63 X1），浏览器与 AI 不直写 SQLite。本单无表结构变更。

<a id="vw-sub039-inherit-011"></a>
##### VW-SUB039-INHERIT-011

**VW-SUB039-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查仓储接口、事务与部署说明（E11、E60 G2/G8/S2/S9、E61 R1–R3）：签发与撤销各在一次短事务内读写 credential_refs 与 output_grants；输出端 expireDue、readSendableRow、markSent（现同时校验 status='PENDING'、valid_until>now 与 verdicts.is_current=1）、recordSendFailure、markFailed 各是一次同步短事务或同步单次查询，绝不跨 await 持有事务；网络发送期间无打开事务。投递队列即 deliveries 表，deliver 只唤醒投递泵，不在队列或额外日志复制正文。消费者不能写（<=4096B 数据帧 4400、>4096B 帧 1009，E60 C2、E63 X1），浏览器与 AI 不直写 SQLite。本单无表结构变更。

<a id="vw-sub040-inherit-011"></a>
##### VW-SUB040-INHERIT-011

**VW-SUB040-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查仓储接口、事务与部署说明（E11、E60 G2/G8/S2/S9、E61 R1–R3）：签发与撤销各在一次短事务内读写 credential_refs 与 output_grants；输出端 expireDue、readSendableRow、markSent（现同时校验 status='PENDING'、valid_until>now 与 verdicts.is_current=1）、recordSendFailure、markFailed 各是一次同步短事务或同步单次查询，绝不跨 await 持有事务；网络发送期间无打开事务。投递队列即 deliveries 表，deliver 只唤醒投递泵，不在队列或额外日志复制正文。消费者不能写（<=4096B 数据帧 4400、>4096B 帧 1009，E60 C2、E63 X1），浏览器与 AI 不直写 SQLite。本单无表结构变更。

#### VW-R-012@1（INHERIT-012）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-012"></a>
##### VW-S021-INHERIT-012

**VW-S021-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。VW-R-012 的本单部分成立：WebSocket 在升级前逐连接鉴权，每个心跳周期重读两表授权（E60 G6，Q18）；凭据只读、可撤销（G8、G9），不走查询串、Authorization、Cookie 或其它头（G5，Q16），日志与错误体不含凭据（G11、Q1–Q4，Q25）；签发与撤销要求频道所有者的 tokens.manage 与 CSRF，房管、数据管理员、外频道所有者被拒（G3、G8）；房间由授权决定，频道隔离（G7）；原生凭据打不开任何 HTTP 路由（G10）；400、414、404 使用固定响应体（Q1–Q3）；WebSocketServer 已设 maxPayload=4096 防止持凭据客户端大帧占内存（E60 M1、E63 X1，N3 已收口），preClose 确保有在线消费者时优雅停机不挂起（E60 Z1、E63 X4，N1 已收口）。WSS 终止与反代头日志配置归 S029。

<a id="vw-sub039-inherit-012"></a>
##### VW-SUB039-INHERIT-012

**VW-SUB039-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。VW-R-012 的本单部分成立：WebSocket 在升级前逐连接鉴权，每个心跳周期重读两表授权（E60 G6，Q18）；凭据只读、可撤销（G8、G9），不走查询串、Authorization、Cookie 或其它头（G5，Q16），日志与错误体不含凭据（G11、Q1–Q4，Q25）；签发与撤销要求频道所有者的 tokens.manage 与 CSRF，房管、数据管理员、外频道所有者被拒（G3、G8）；房间由授权决定，频道隔离（G7）；原生凭据打不开任何 HTTP 路由（G10）；400、414、404 使用固定响应体（Q1–Q3）；WebSocketServer 已设 maxPayload=4096 防止持凭据客户端大帧占内存（E60 M1、E63 X1，N3 已收口），preClose 确保有在线消费者时优雅停机不挂起（E60 Z1、E63 X4，N1 已收口）。WSS 终止与反代头日志配置归 S029。

<a id="vw-sub040-inherit-012"></a>
##### VW-SUB040-INHERIT-012

**VW-SUB040-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。本单部分成立：投递泵只将该频道且仍属当前裁决的 PENDING 行发给该频道的在线订阅者（E60 G7、E61 R1–R3），不接受消费者上传内容；补发要求 review.decide，数据管理员被拒（S6）。凭据、握手、maxPayload=4096 与 CSRF 由 SUB-039 及路由层承担，整体成立。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-017"></a>
##### VW-S021-INHERIT-017

**VW-S021-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查并实测数据到期、失败、取消与恢复去向（E60 S1–S3/S7/S9、E61 R1–R4、E63 X2/X3）：validUntil 已过的 PENDING 行比较状态转为 EXPIRED（S2），发送失败达 3 次转为 FAILED（S9），已批准证据缺失或已过期时转为 FAILED（pump.test.ts；表中无原因列已在 design.md §13 登记）。输出端不存正文副本。重连或重启后只发送仍为 PENDING、未过期且属于当前裁决的行，SENT 与 EXPIRED 不补播（S3），改判放行写为 EXPIRED 不自动发出（S7）。返工修复 B7 后，同一投递轮次内被 S019 删除流程标为 CANCELLED 或被房管改判使旧裁决 is_current=0 的后续行，在 sendRow 前经 readSendableRow 同步复核即被跳过，不再发出已取消或已失效行（E61 R1–R3、E63 X2）。

<a id="vw-sub039-inherit-017"></a>
##### VW-SUB039-INHERIT-017

**VW-SUB039-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查并实测数据到期、失败、取消与恢复去向（E60 S1–S3/S7/S9、E61 R1–R4、E63 X2/X3）：validUntil 已过的 PENDING 行比较状态转为 EXPIRED（S2），发送失败达 3 次转为 FAILED（S9），已批准证据缺失或已过期时转为 FAILED（pump.test.ts；表中无原因列已在 design.md §13 登记）。输出端不存正文副本。重连或重启后只发送仍为 PENDING、未过期且属于当前裁决的行，SENT 与 EXPIRED 不补播（S3），改判放行写为 EXPIRED 不自动发出（S7）。返工修复 B7 后，同一投递轮次内被 S019 删除流程标为 CANCELLED 或被房管改判使旧裁决 is_current=0 的后续行，在 sendRow 前经 readSendableRow 同步复核即被跳过，不再发出已取消或已失效行（E61 R1–R3、E63 X2）。

<a id="vw-sub040-inherit-017"></a>
##### VW-SUB040-INHERIT-017

**VW-SUB040-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查并实测数据到期、失败、取消与恢复去向（E60 S1–S3/S7/S9、E61 R1–R4、E63 X2/X3）：validUntil 已过的 PENDING 行比较状态转为 EXPIRED（S2），发送失败达 3 次转为 FAILED（S9），已批准证据缺失或已过期时转为 FAILED（pump.test.ts；表中无原因列已在 design.md §13 登记）。输出端不存正文副本。重连或重启后只发送仍为 PENDING、未过期且属于当前裁决的行，SENT 与 EXPIRED 不补播（S3），改判放行写为 EXPIRED 不自动发出（S7）。返工修复 B7 后，同一投递轮次内被 S019 删除流程标为 CANCELLED 或被房管改判使旧裁决 is_current=0 的后续行，在 sendRow 前经 readSendableRow 同步复核即被跳过，不再发出已取消或已失效行（E61 R1–R3、E63 X2）。

#### VW-R-018@1（INHERIT-018）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-018"></a>
##### VW-S021-INHERIT-018

**VW-S021-INHERIT-018@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。VW-R-018「输出获准必要展示字段；拦截仅无原文/身份的 WARD_BLOCKED，不输出分值/稳定 ID/审核对话」在常规路径（E60 D1–D5、S1）与并发慢写改判/取消路径（E61 R1–R4、E63 X2–X3）上全部成立。返工 P-S021-fix1（ad484f7）已彻底修复第 m7b 批阻断 B7：OutputDeliveryPort 新增同步单行重查 readSendableRow（校验 status='PENDING'、valid_until>nowIso、verdicts.is_current=1），createDeliveryPump 在每行进入 sendRow 前同步调用 readSendableRow 刷新行状态（与 ws.send 之间无任何 await 让出事件循环），且 markSent 短事务同时要求 verdicts.is_current=1。实测验证：E61 R1（真实 buildApp + 8 MiB 慢消费者阻塞第 1 行期间，房管经 S014 将第 2 行改判为 BLOCK）正常消费者与慢消费者均未收到第 2 行原文（receivedRow2=null、R1b=false），只收到第 1 行 DELIVER 与第 2 行改判后的 WARD_BLOCKED，第 2 行旧投递保持 PENDING（is_current=0）；R2（受控挂起改判 BLOCK）、R3（挂起期间标 CANCELLED）、R4（挂起期间越过有效期）全部跳过不发；E63 X2（4 行同轮混合改判 BLOCK 与 S019 CANCELLED）只发出未改判的合规行与后续 WARD_BLOCKED；E63 X3（在途行自身在写完前被改判 BLOCK）markSent 拒标 SENT，下一轮绝不重发旧行，且发出带相同 platformOrder 的 WARD_BLOCKED 供下游撤回（协议文档 §3 已补齐 N2 说明）。

<a id="vw-sub039-inherit-018"></a>
##### VW-SUB039-INHERIT-018

**VW-SUB039-INHERIT-018@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。本单帧构造 frameFor 对 BLOCK 只生成 WARD_BLOCKED、不读正文，DELIVER 只含白名单字段（E60 D1–D3），且 SUB-040 返工修复 B7 后整条输出链路在并发改判下也不再发出被拦截原文（E61 R1–R4、E63 X2–X3）。

<a id="vw-sub040-inherit-018"></a>
##### VW-SUB040-INHERIT-018

**VW-SUB040-INHERIT-018@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 在 d8ed897 上的同次执行（E02–E08、E60–E63）。前半句成立（同 AC001）。常规路径上投递泵只将 BLOCK 行交由帧构造生成无原文/身份的 WARD_BLOCKED（E60 D2、S1）；并发慢写路径上已修复第 m7b 批阻断 B7。返工 P-S021-fix1（ad484f7）已彻底修复第 m7b 批阻断 B7：OutputDeliveryPort 新增同步单行重查 readSendableRow（校验 status='PENDING'、valid_until>nowIso、verdicts.is_current=1），createDeliveryPump 在每行进入 sendRow 前同步调用 readSendableRow 刷新行状态（与 ws.send 之间无任何 await 让出事件循环），且 markSent 短事务同时要求 verdicts.is_current=1。实测验证：E61 R1（真实 buildApp + 8 MiB 慢消费者阻塞第 1 行期间，房管经 S014 将第 2 行改判为 BLOCK）正常消费者与慢消费者均未收到第 2 行原文（receivedRow2=null、R1b=false），只收到第 1 行 DELIVER 与第 2 行改判后的 WARD_BLOCKED，第 2 行旧投递保持 PENDING（is_current=0）；R2（受控挂起改判 BLOCK）、R3（挂起期间标 CANCELLED）、R4（挂起期间越过有效期）全部跳过不发；E63 X2（4 行同轮混合改判 BLOCK 与 S019 CANCELLED）只发出未改判的合规行与后续 WARD_BLOCKED；E63 X3（在途行自身在写完前被改判 BLOCK）markSent 拒标 SENT，下一轮绝不重发旧行，且发出带相同 platformOrder 的 WARD_BLOCKED 供下游撤回（协议文档 §3 已补齐 N2 说明）。

#### VW-R-019@1（INHERIT-019）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s021-inherit-019"></a>
##### VW-S021-INHERIT-019

**VW-S021-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 与 P-S021-fix1 未改动 apps/web（E11），提供下游只读订阅协议 vw-output.v1、字段白名单与同 platformOrder 的 WARD_BLOCKED 撤回约定（docs/protocol/output-native-v1.md §2–§3）；浏览器地址片段交付凭据的真实页面与 OBS 演练归 S023（design.md §11）。显示昵称（label 恒为 null）与付费展示信息无来源字段。完整判据仍由 INIT 的 VW-AC-019 承载。

<a id="vw-sub039-inherit-019"></a>
##### VW-SUB039-INHERIT-019

**VW-SUB039-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 与 P-S021-fix1 未改动 apps/web（E11），提供下游只读订阅协议 vw-output.v1、字段白名单与同 platformOrder 的 WARD_BLOCKED 撤回约定（docs/protocol/output-native-v1.md §2–§3）；浏览器地址片段交付凭据的真实页面与 OBS 演练归 S023（design.md §11）。显示昵称（label 恒为 null）与付费展示信息无来源字段。完整判据仍由 INIT 的 VW-AC-019 承载。

<a id="vw-sub040-inherit-019"></a>
##### VW-SUB040-INHERIT-019

**VW-SUB040-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 与 P-S021-fix1 未改动 apps/web（E11），提供下游只读订阅协议 vw-output.v1、字段白名单与同 platformOrder 的 WARD_BLOCKED 撤回约定（docs/protocol/output-native-v1.md §2–§3）；浏览器地址片段交付凭据的真实页面与 OBS 演练归 S023（design.md §11）。显示昵称（label 恒为 null）与付费展示信息无来源字段。完整判据仍由 INIT 的 VW-AC-019 承载。

<a id="scope"></a>
## 3. 未验证范围与后续责任边界

- **浏览器覆盖层页面与 OBS Browser Source 片段地址实测（Q16 浏览器侧、N2 舞台渲染、S003 令牌去留）**：由 `VOXWARD-STORY-023` 承接。
- **远端反向代理 WSS 终止与不记录 `Sec-WebSocket-Protocol` 请求头配置（N3 部署侧）**：由 `VOXWARD-STORY-029` 承接。
- **显示昵称安全称呼与付费展示字段**：当前无入库来源，`display.label` 恒为 `null`（`design.md` §11）。
