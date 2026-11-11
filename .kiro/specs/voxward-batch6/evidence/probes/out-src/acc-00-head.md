# 第 6 批独立验收记录（S009 第 2 轮复验；S013 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `0b929d3`（`0b929d3edc9068206cbeac0aeb677cf4ccba5a70`）。`6d395c9` 之上先合入 `voxward/s009-fix`（合并提交 `79394fc`；`cbf6a4f` B4、`c40ef04` B5、`73a78e0` N 组与证据），再合入 `voxward/s013-livestream`（合并提交 `0b929d3`；`d8b2b9a` spec、`6ac7f80` Q28、`aa39f4d` Q20、`70875ce` SUB-024、`cf3e361` SUB-025、`71dce6e` 证据）。相对 `6d395c9`：45 个文件 +3327/−108 行，`.kiro/` 之外 38 个文件 +2618/−98 行。上一候选 `5ce5bee` 到 `6d395c9` 之间只有 `.kiro/` 下的简报与证据改动。契约包（`CONTRACT_VERSION` 仍为 `"1"`）、三个 `package.json`、锁文件、`scripts/`、`app.ts`、`main.ts`、注册表、`config/`、`moderation-engine/`、`audit-store/`、`db/schema/`、迁移、`docs/` 与 `apps/web/` 都没有改动（E33）。
- 检出：`$KIROCREW_SCRATCH/vw-int-b6`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移出，冒烟后放回并核对 sha256。探针、替身、拦截脚本与原始输出都在 `$KIROCREW_SCRATCH/vw-accept-b6-work/`，只按绝对路径导入检出内源码；副本在交付目录 `probes/`。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。所有服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew，没有连接真实 YouTube 或 Google；两处外部资料只经网页搜索摘录核对（R1、R2）。
- 工单读数（E01）：库版本 20986，headEventHash `4f18518e545e45d7…ebcbda771902bac5ecc0d0a`，六单相同。修订号：STORY-009 rev 5、SUB-017 rev 4、SUB-018 rev 4、STORY-013 rev 4、SUB-024 rev 3、SUB-025 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空。共 64 行验收：STORY-009 11、SUB-017 12、SUB-018 12、STORY-013 9、SUB-024 10、SUB-025 10。S009 组三单的 rev 4→5、3→4 来自第 5b 批链写：contentImpact 的 changedMeaning=false，changedAcceptance、changedRequirements 为空；验收行与第 5b 批逐字相同，`content.evidence` 里是 `5ce5bee` 的一批行（11、12、12）。S013 组 `content.evidence` 为空；STORY-013 已把 VW-S013-R001@1 分配给 SUB-024 与 SUB-025（implementation 与 verification），两张子单的 STORY 行生效。子单 PARENT 与 INHERIT 行的 expected、method、requirement 与 Story 对应行逐字相同。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现，也没有做过上一轮验收。两份自测证据与主线程集成日志只作参考，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 4、5a、5b 批）：`satisfied` 表示该行 expected 的每一部分在候选 `0b929d3` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；子单 AC001 与 STORY 行只判本单承担的部分。方法允许替身或写明「无可用环境时标未验证」「具备凭据时」的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：64 行全部 satisfied。STORY-009 组 35/35（第 5b 批的 B4、B5 已修复）；STORY-013 组 29/29。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-b6-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/b6-gate.log`、`b6-smoke/smoke-dev.log`、`smoke-dist.log`（11:42）（复核，不作唯一依据） | 0 ×7 | install、build、typecheck、test 1558/1558、check:deps 178 个文件 0 违规，冒烟两次 200；日志写有检出路径但没有提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <6 个 KEY>`，输出重定向后用 node 提取 | 0 ×6 | 每份 1.56–2.00 MB。读数见文首。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 169.7 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `CI=1 pnpm test` | 0 | 106 个文件、1558 项，约 29 s。本批相关：task-coordinator 8 个文件 104 项（coordinator 30、crew/adapter 20、ordering 13、crew/capacity 11、acceptance 10、micro-batch 8、priority 6、generation 6）；youtube-credentials 50 项（credentials 26、routes 15、pkce 7、reauthorization 2）；youtube-stream 42 项（intake-pieces 23、runner 19）；youtube-identity 20 项（identity 11、quota 5、to-business-event 4）；security/credential-vault-remove 3；scoring-engine 身份路径 identity-events 9、identity-decision 8。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 178 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c` | 0 | 环境中没有 `VOXWARD_*` 变量。`dev healthz ok=1 code=200 after 2s`，`dist healthz ok=1 code=200 after 1s`；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；脚本结束时 `no listeners`，之后 `ss -ltnp` 对 3000、5173 无输出，检出下无残留进程；原库放回后 sha256 OK。本轮没有手工起 `pnpm dev`。 |
| E08 | 外连、本机服务与真实命令拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=<运行前本机已在监听的 22 个端口> NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 106 个文件 1558 项通过。拦截模块在 134 个 Node 进程中加载（改写 `net.Socket.prototype.connect`、`dns.lookup` 与 `fetch`：非回环一律拒绝；回环连接到运行前已存在的监听端口也拒绝，Kiro Crew 网关不论用哪个端口都在其中）。被拒的外部连接 0 次，被拒的本机已有端口连接 0 次，回环连接 16 次与回环 fetch 16 次（全部是测试自己开的临时端口 33913），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截）。PATH 最前的 `kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。拦截先自检：对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 全部被拒；本机已有端口 1053 在发起连接之前被拒；新开的本机端口 33871 可连。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、`apps/server/src`、`apps/web/src`、`packages/contracts/src` 与四个 `package.json` 到 `$W/negctl`；基线运行；加入 `platform-source/youtube/zz-negative.ts`（导入 `../../../db/client.js` 与 `googleapis`）运行；删除后运行；再加入 `task-coordinator/zz-negative.ts`（导入 `../../db/client.js` 与 `@anthropic-ai/sdk`）运行；删除后运行 | 0、1、0、1、0 | 副本基线 `ok, 178 files`；两次加入后各报 2 处违规：`module platform-source may not import "../../../db/client.js" (db)`、`… "googleapis" (package googleapis)`；`module task-coordinator may not import "../../db/client.js" (db)`、`… "@anthropic-ai/sdk"`，`2 violation(s) across 179 files`；删除后恢复 `ok`。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，两份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 1、0 | 各 204 s。`voxward-s009-scheduler`（work:ac2a8c1b…）：SPEC_STALE，rev 5，previousSourceDigest `cdcf67a0…a616` → sourceDigest `e80dada5…4fd8`；`voxward-s013-livestream`（work:5fd9e2a6…）：SPEC_CURRENT，rev 4，`7b3914aa…898d`。两份 tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 243 个文件 sha256 不变。S009 三个受管段（design、requirements、tasks）在 `6d395c9` 与 `0b929d3` 上逐字相同。 |
| E30 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009.mts <检出或对照副本> <work>`（第 5b 批 E30 探针的副本：§5 的 PAID 场景与 §7 的资源端口异常改为带期望的检查，其余行不变；对照副本由 `git archive 5ce5bee` 导出 task-coordinator 与 audit-store） | 0（脚本只统计，不以失败退出） | 0b929d3：98 项检查 0 项不符，16 条观察；5ce5bee：98 项 7 项不符（F1 两项、F2、PAID、F3、资源端口两项）。80153 条技术日志条目全部通过审计库 `prepareTechnicalWrite` 的写入校验。§8 结算 8 万条后 takeBatch 22 µs（5ce5bee 3416 µs）。明细见 §2.0。 |
| E31 | `tsx $W/probe-s009-extra.mts <检出>`（第 5b 批原样） | 0 | Crew 的 cancel 不返回时：第一次 pump、第二次 pump、执行器的 cancelEvent 都返回；ch-c 为 DISCARDED（CANCELLED）；共启动 2 个会话，ch-b 为 RUNNING；ch-b 到期后再调用 pump 也返回，ch-b 转 PENDING_REVIEW（DEADLINE_EXCEEDED）。结算记录累积时的单次耗时：8 条时 commit 6 µs、sweep 1 µs、takeBatch 118 µs；2 万条与 6 万条时都是 1、0、2 µs（第 5b 批 6 万条时 2433、633、2031 µs）。 |
| E32 | `tsx $W/probe-s009-order.mts <检出>`（第 5b 批原样） | 0 | 后一条先完成并暂存；前一条到期后的一次 pump 先扫描，前一条记 `ERROR/TIMED_OUT/DEADLINE_EXCEEDED` 并转 PENDING_REVIEW，后一条随后提交为 DONE，提交日志的 `data` 为 null。与第 5b 批相同，与设计 §8 的新说明一致。 |
| E33 | 静态核对：`git diff --name-only/--shortstat 6d395c9 0b929d3`、按路径逐个 `git diff --name-only`；`grep -rhoE '(from|import)\s+"[^"]+"'` 列出 task-coordinator 与 platform-source 的全部导入；`grep -nE 'require\(|import\(|"node:|fetch\(|child_process'` 查新文件；比对两份 spec 受管段的 sha256 | 0 | 变更范围见文首。task-coordinator 只导入 `@voxward/contracts`（4 处）与本模块文件；platform-source 只导入 `@voxward/contracts`（3 处）与本模块文件；`youtube/*.ts` 没有 `require`、动态导入、`node:` 模块、`fetch` 或子进程，散列与随机数用全局 `crypto` 与 `Buffer`。`scoring-engine/` 只改 `clamp.ts`、`identity-events.ts`，`engine.ts`、`compensation.ts` 未改；`db/` 只改 `scoring-ledger.ts`；`security/` 只改 `credential-vault.ts`。 |
| E34 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009-b6.mts <检出或对照副本> <work> <label>`（本轮新写：车道矩阵、Crew 调用挂起矩阵、结算后正文释放的堆快照检索与轻量记录增长） | 0 | 0b929d3：44 项检查 0 项不符；5ce5bee：44 项 17 项不符（A1–A6、A10、B1 六项、B2 两项、B3、N2）。明细见 §2.0–§2.3。 |
| E40 | `tsx $W/probe-s013-q28.mts <检出或对照副本> <label>`（本轮新写；自写的假 Google 令牌端点按 RFC 7636 4.6 校验 S256，内存凭据行表，真实保险箱、凭据存储、state 存储与 OAuth 路由；对照副本由 `git archive 6d395c9 apps/server/src` 导出） | 0 | 0b929d3：27 项检查 0 项不符；6d395c9：27 项 15 项不符（授权 URL 没有挑战、他人 state 加主播授权码得到授权、他人失败尝试耗掉主播 state、旧授权行未撤销、旧密文仍在等）。明细见 §3.1。 |
| E41 | `tsx $W/probe-s013-q20.mts <检出或对照副本> <scratch> <label>`（本轮新写；迁移后的真实 SQLite 文件，真实计分引擎与计分端口；配置上下限 ±100，会员 10、房管 30，违规 5） | 0 | 0b929d3：6 项检查 0 项不符，另有观察；6d395c9：6 项 4 项不符（上限处到期凭空扣 10、下限处凭空加 10）。明细见 §3.2。 |
| E42 | `tsx $W/probe-s013-stream.mts <检出> <scratch> <label>`（本轮新写；脚本化传输按官方资源形状给出条目；S3 接真实 SQLite 与计分引擎） | 0 | 33 项检查 0 项不符，另有观察。明细见 §3.3–§3.4。 |
| R1 | 网页搜索（不直接访问 Google 页面）：`YouTube Live Streaming API liveChatMessages resource … superChatDetails userComment` | — | YouTube API 库文档摘录：`"superChatDetails": { # Details about the Super Chat event, this is only set if the type is'superChatEvent'.` … `"userComment": … # The comment added by the user to this Super Chat event.`（developers.google.com/resources/api-libraries/documentation/youtube/v3/python/latest/youtube_v3.liveChatMessages.html）。`textMessageDetails` 是否也出现在 Super Chat 条目里，本轮没有找到逐字摘录。 |
| R2 | 网页搜索：Google OAuth 撤销接口对同一授权其它令牌的影响 | — | Stack Overflow 53836992「revoking a single access token … causes all of their other access/refresh tokens become invalidated for the app」、69484763「Revoking 1 token revokes all tokens of same OAuth Client ID + User Consent Pair」（社区报告，非官方说明）；Google 最佳实践页「revoke and delete them when no longer needed」；refresh token 按「客户端-用户」有数量上限，超过后较旧的令牌失效。 |

## 1. 共同检查

<a id="spec"></a>
### 1.1 Spec 状态与设计、代码一致性

- S009 为 SPEC_STALE（rev 5），S013 为 SPEC_CURRENT（rev 4）（E10）。S009 的 rev 4→5 来自第 5b 批链写，含义未变（E01 contentImpact），受管段与 `6d395c9` 逐字相同，返工分支只改本地段；需要继续使用当前 spec 时按 Q11 用 `refresh --approved-in` 刷新。check 没有改动任何 spec 文件。
- S009 设计与代码一致。返工改写的各处都与实测相符：§3、§7 第 3 步写超时与提交时已过截止时间都转 PENDING_REVIEW（E30 F1）；§5 的后台余量说明改为「上限为 1 时后台暂停，上限更高时保留 `limit - reserve`」，与 E30 §5 的「上限 2 时后台可启动」一致；§8 门控按频道加车道，并写明前序已被扫描时后一条不记 PREDECESSOR_UNFINISHED（E34 A1–A10、E32）；§9 写明 pump 与 cancelEvent 不等待取消、槽位保留到 Crew 接受取消、start 晚到时立即取消、资源读取异常按 CRITICAL（E34 §B、E30 §7）；§12 写明结算后释放正文、轻量记录仍增长（E34 §C）。CrewReport、CrewPort 的注释已写入 S007 整批校验与 Crew 端清理的归属（第 5b 批 N6）。`tasks.md` 本地段没有为返工加任务项，S009-SELF、S009-EVID 两项仍未勾选，返工证据已提交（`evidence/rework1-self-check.md`）。
- S013 设计与代码大体一致：§2 布局与交付清单（`config.ts` 为记录在案的偏离）；§3 PKCE、先查看后消费 state、重新授权撤销旧行并删除旧密文（E40）；§4 身份路径基准分全额、最终分钳制（E41）；§6 身份映射、配额、业务事件（E42 S4、S5、S7）；§7 依赖方向（E06、E09、E33）；§9「不做的事」（不挂载路由，不改 `ServerConfig`、`app.ts`、注册表与 `task-coordinator/`，E33）。不一致或需要更正处：
  - §5 状态表写连续失败 8 次进入 FAILED，状态列表为 CONNECTING…QUOTA_EXHAUSTED、FAILED，事件含 CONNECT_OK；代码的终止状态是 GAVE_UP，另有 REQUEST_REJECTED（invalidArgument）与 STOPPED，没有 CONNECT_OK 事件（judgment N9）。
  - §5 写补发年龄只在 INITIAL 或 RESUME 阶段判定；代码与 `replay-age.ts` 的注释对每一批都按本机时钟判定（E42 S9，judgment N5）。
  - §6 写 `body = 消息文本`；对 Super Chat，代码只读 `textMessageDetails.messageText`，留言所在的 `superChatDetails.userComment` 没有读取（E42 S7，judgment N4）。
  - §3、§10 写「是否调用 Google 撤销端点，待 Owner 决定」；判断见 judgment「必验项 4」，不需要 Owner 决定。
  - 设计没有写明进程内去重与身份缓存和删除流程的关系（judgment N3、N7）。

<a id="gates"></a>
### 1.2 门禁与启动冒烟

install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.3 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试在拦截下通过：对外部主机 0 次连接（自检确认 Google 的 OAuth、API 与账号域名都在拦截之内），对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（E08）。S009 的测试与本轮探针只用进程内 Crew 替身；S013 的测试与本轮探针只用替身传输与假令牌端点。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有连接真实 YouTube 或 Google。

<a id="deps"></a>
### 1.4 依赖方向

task-coordinator 与 platform-source 只导入 `@voxward/contracts` 与本模块文件，不导入 `db/`，也不导入任何供应商 SDK 或外部包（E33）；check:deps 0 违规（E06）；同一规则在副本中对两个模块导入 db 与供应商 SDK（`googleapis`、`@anthropic-ai/sdk`）都报违规（E09）。scoring-engine 的改动只用本模块文件与契约包；db 层改动在 `db/scoring-ledger.ts` 内。
