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

## 2. VOXWARD-STORY-009 组（35 行，全部 satisfied）

<a id="s009-summary"></a>
### 2.0 S009 实测摘要（必验项 1–3）

E30 沿用第 5b 批的自写替身：时钟、事务型事实端口（`commitIfCurrent` 在一个同步调用里比对已删除、代次、版本、已结算，再执行 `apply`）、技术日志接收器（每条交给审计库 `prepareTechnicalWrite` 校验）与 Crew 替身。E34 另写了一个按会话控制的 Crew 替身：会话从 start 返回句柄起算打开，到 done 结束或取消被接受为止；可分别让某个会话或全部会话的 start、cancel、done 永不结束，start 也可以晚到；每次打开会话时记下当时读到的上限。pump 与 cancelEvent 是否「按时返回」用 1 s 的真实计时器判定（协调器的时钟是假的）。除注明者外 `maxBatchWaitMs` 为 0、`maxBatchItems` 为 1。同一份 E30、E34 在 `5ce5bee` 的导出副本上各跑一次作对照。

**E30 的第 5b 批失败项**

| 项 | 5ce5bee | 0b929d3 |
| --- | --- | --- |
| F1 运行中的任务到期后、扫描之前结果先到（直接调用） | DISCARDED | PENDING_REVIEW（DEADLINE_EXCEEDED），提交返回 discarded，日志 `COMMIT/TIMED_OUT` |
| F1 经执行器：会话在截止时间后 500 ms 结束，其间没有 pump | DISCARDED | PENDING_REVIEW，写入 0 次 |
| F2 同频道更早的 BACKGROUND 任务仍在排队，REALTIME 结果提交 | waiting | committed |
| PAID 结果提交，同频道更早的 REALTIME 任务仍在运行（本轮改为期望通过） | waiting | committed，REALTIME 任务仍为 RUNNING |
| F3 Crew 的 cancel 不返回：之后的 pump、另一频道的任务 | 不返回、QUEUED | 返回、RUNNING |
| 资源端口 `read()` 抛异常：takeBatch 与上限（本轮改为期望通过） | 抛出 | 不抛出，上限为 1 |

其余 91 项在两个版本上结果相同（资源端口一行含 2 项检查）。80153 条技术日志条目全部通过 `prepareTechnicalWrite`（E30）。

<a id="b4"></a>
### 2.1 B4 复验：保序门控按车道限定

| 场景（同一频道，E34 §A） | 0b929d3 | 5ce5bee |
| --- | --- | --- |
| A1 BACKGROUND（order 1，排队，截止 10 分钟）→ REALTIME（order 2）提交 | committed | waiting |
| A2 BACKGROUND（order 1，运行中）→ REALTIME（order 2）提交 | committed | waiting |
| A3 BACKGROUND 排队 → PAID 提交 | committed | waiting |
| A4 BACKGROUND 运行中 → PAID 提交 | committed | waiting |
| A5 REALTIME（order 1，排队；PAID 按优先级先派工）→ PAID 提交 | committed | waiting |
| A6 REALTIME 运行中 → PAID 提交 | committed | waiting |
| A7–A9 同车道（REALTIME、PAID、BACKGROUND 各一组）：后一条等前一条；前一条截止时间到（尚未扫描）后提交，记 `PREDECESSOR_UNFINISHED:<前一条>` | 三组都符合 | 三组都符合 |
| A10 REALTIME（1）、BACKGROUND（2）、REALTIME（3）：第 3 条只等第 1 条；第 1 条提交后第 3 条提交 | 符合 | 第 3 条改为等 BACKGROUND |
| A11 不同频道 | 不等待 | 不等待 |

- `orderGate` 先按 `channelId` 与 `lane` 过滤，再比较 `platformOrder`；`orderedTasksOf` 只读未结任务索引（`openByChannel`），任务记录带车道（E33）。E30 §5 的 F2 与 PAID 场景改为期望通过后符合。
- 反方向（运行中的 REALTIME 之后的 BACKGROUND 任务）同样不等待（E34 A11 观察），与设计 §8「不同车道互不等待」一致。

<a id="b5"></a>
### 2.2 B5 复验：Crew 调用不返回时调度不停

| 场景（E34 §B，除注明者外上限 3） | 0b929d3 | 5ce5bee |
| --- | --- | --- |
| B1 ch-a 会话的 cancel 不返回：ch-a 到期后的 pump | 返回；ch-a 转 PENDING_REVIEW；只发 1 次 cancel | 不返回 |
| B1 之后入队 ch-b、ch-c、ch-d，pump | 返回，启动 2 个（ch-a 的槽位仍保留），ch-d 排队；完成后再 pump 启动 ch-d；三者都 DONE | 不返回，三者 QUEUED |
| B1 只完成其它频道的会话，ch-a 的会话仍打开、取消仍待定时调用执行器 cancelEvent | 返回 | 不返回（此时已发出 3 次 cancel） |
| B1 Crew 迟迟接受那个 cancel 后 | ch-a 的槽位释放，下一次 pump 启动 3 个 | 0 个 |
| B2 上限 2：对运行中的 ch-a 调用执行器 cancelEvent，cancel 不返回 | 返回；ch-a 为 DISCARDED（CANCELLED）；ch-b 随后派工并 DONE；被取消任务写入 0 次 | 不返回，ch-b QUEUED |
| B3 全部 cancel 都不返回：驱动方逐次 await pump，24 步后再推进到最后一个截止时间 | 25 次 pump 都按时返回；前 3 个会话占满上限后不再启动；12 个任务全部按截止时间转 PENDING_REVIEW | 25 次中 22 次超时 |
| B4 上限 2：ch-a 的 start 不返回，ch-b 派工；ch-a 到期 | pump 都返回；ch-a 转 PENDING_REVIEW，槽位立即给 ch-c | — |
| B4 之后 ch-a 的 start 晚到 | 执行器立即取消该会话；取消被接受之前 Crew 侧有 3 个会话，上限 2（设计 §9 写明的残留） | — |
| B5 上限 2：所有 start 都不返回，10 个截止周期 | pump 都按时返回，20 个任务全部转人工；未返回的 start 调用累积到 20 个 | — |
| B6 上限 1：ch-a 的 done 不返回，cancel 被接受 | pump 返回，ch-a 转人工，槽位给 ch-b，ch-b DONE；done 挂起时 cancelEvent 也返回 | — |
| B7 上限 1：cancel 第一次被拒 | 槽位保留，下一次 pump 重发，被接受后 ch-b 派工并 DONE | — |

- 除 B4 的晚到 start 外，替身记录的同时打开会话数从未超过上限（E34 B1–B7）；E30 §6 的随机 400 步与「每次启动时打开数小于当时的上限」仍成立。B4–B7 在 5ce5bee 上结果与候选相同（start、done 不返回由截止时间兜底，第 5b 批已如此），表中记为「—」。
- `reapIdle` 只登记待定取消并在后台发出，不 await；槽位在 Crew 接受取消、或会话已报告后才释放；被拒绝的取消由下一次 pump 重发；start 未返回的空闲批次立即释放槽位，晚到的 start 立即取消（E33，设计 §9）。E30 F3 与 E31 改为期望通过后符合。
- 残余（设计 §9、§13 与返工自测已写明，判断见 judgment N1）：Crew 一直不接受取消时，该批次的槽位一直保留；上限为 1 或全部取消都挂起时，AI 派工停止，新任务按截止时间转人工（B3）。start 一直不返回时，每个截止周期都会再发起新的 start，未返回的调用与它们持有的作业（含正文）随时间累积（B5）。晚到的 start 让 Crew 侧短暂多出 1 个会话（B4）。

<a id="s009-n"></a>
### 2.3 第 5b 批 N 组复验（按实际行为判定）

| 第 5b 批编号 | 问题 | 0b929d3 的实际行为 | 结论 |
| --- | --- | --- | --- |
| N1 | 到期后、扫描之前先到的结果把任务转 DISCARDED | 两种顺序都转 PENDING_REVIEW（DEADLINE_EXCEEDED），提交返回 discarded，不写裁决（E30 F1 两例）；设计 §3、§7 同步 | 已修复 |
| N2 | 结算后记录与正文不释放，调度调用遍历全部历史 | 8 种结算方式各 50 条、正文各带唯一标记，强制 GC 后写堆快照检索：0b929d3 上已结算的 400 条正文 0 条残留，仍在排队的 50 条都在；5ce5bee 上 400 条全部残留（E34 §C）。结算 6 万条后单次 commit、sweep、takeBatch 为 1、0、2 µs（E31），8 万条后 takeBatch 22 µs（E30 §8；5ce5bee 3416 µs）。结算后的轻量记录仍约 514 字节/条（E34 §C；5ce5bee 575 字节/条，正文为 56 个字符） | 已修复（释放正文、只读未结索引）；记录增长为残余，见 judgment N2 |
| N3 | 设计 §8 写放行时记 PREDECESSOR_UNFINISHED，经执行器时不记 | 行为不变（E32）；设计 §8 改为写明前序已被扫描时后一条不记，前序自己的 TIMED_OUT 条目记下原因 | 已按选定方案（改设计）处理 |
| N6 | completed 报告须先经 S007 整批校验、Crew 端清理只在注释里隐含 | `CrewReport`、`CrewPort` 注释与设计 §9 写明，归 S029（E33） | 已处理（文档项） |
| N7 | 资源端口 `read()` 抛异常时 takeBatch 抛出 | 视为 CRITICAL，上限收缩到下限 1，takeBatch 照常（E30 §7） | 已修复 |
| N8 | 设计 §5「最小并发时后台暂停」只在上限为 1 时成立 | 行为不变，上限 2 时后台可启动（E30 §5 观察）；设计 §5 改为与代码一致 | 已按选定方案（改设计）处理 |

### 2.4 VOXWARD-STORY-009 本单行

<a id="vw-s009-ac001"></a>
**VW-S009-AC001@1：satisfied**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。task-coordinator 的 8 个测试文件 104 项通过（E05）。实测只用进程内替身（E30–E32、E34）：无无限积压：每个车道排队有上限，满了转人工 QUEUE_FULL，单条正文超过批字节上限转人工 INPUT_TOO_LARGE（E30 §1）。无全局无限屏障：Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 都在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限（E34 B1–B7、E30 F3、E31；第 5b 批 B5 已修复）；保序门控只等同频道同车道的前序，且只等到前序截止时间，同频道更早的后台任务不论排队还是运行都不挡实时与付费，付费也不被同频道实时挡（E30 §5、E34 A1–A10；B4 已修复）。超时不默认放行或扣分：排队或运行中的任务到期都转 PENDING_REVIEW（DEADLINE_EXCEEDED），扫描与结果谁先到都一样（E30 F1 两例；第 5b 批 N1 已修复），重试耗尽、不可重试错误、提交异常都转人工，事实端口 apply 0 次（E30 §2–§4）。过期任务不恢复为有效输出：到期、取消、代次变化、版本被人工裁决替代、已结算、重启后未知任务的结果都被丢弃，不写裁决、不写证据（E30 §4、§7）。同一批用例在上一候选 5ce5bee 上 E30 有 7 项、E34 有 17 项不符。残余：Crew 一直不接受取消时该批次的槽位一直保留，全部取消都挂起时派工在占满上限后停止，新任务到截止时间转人工（E34 B3）；有界取消归 S029 的真实绑定（judgment N1）。

<a id="vw-s009-parent"></a>
**VW-S009-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 0b929d3 上的同次执行（E02–E08、E30–E34）。无无限积压、无全局无限屏障、超时不默认放行或扣分、过期任务不恢复为有效输出四项都成立；第 5b 批的 B4、B5 与 N1 在本候选上不再复现（E30、E34 各 0 项不符；对照 5ce5bee 分别 7 项、17 项不符）。S009 的贡献是 TaskCoordinator 的有界调度、截止时间、有限重试、代次与提交确认、动态并发和 Crew 执行器。

### 2.5 VOXWARD-SUB-017 本单行

<a id="vw-sub017-ac001"></a>
**VW-SUB017-AC001@1：satisfied**（machine；要求 work:98811c5dc9e7282c8f3ab9b5#VW-SUB017-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。SUB-017 承担的协调器部分成立（task-coordinator 测试 104 项通过，E05；E30 §1–§5、E34 §A、§C）：无无限积压，各车道排队有上限（默认 PAID 50、REALTIME 200、BACKGROUND 500；上限 3 时 10 条入队 3 条排队、7 条转人工 QUEUE_FULL），单条超过 8192 字节转人工；无全局无限屏障：保序门控只等同频道同车道的前序，且只等到前序截止时间，同频道更早的后台任务不论排队还是运行都不挡实时与付费，付费也不被同频道实时挡（E30 §5、E34 A1–A10；B4 已修复），跨频道、跨车道都不等待（E34 A11）；超时不默认放行或扣分：排队或运行中的任务到期都转 PENDING_REVIEW（DEADLINE_EXCEEDED），扫描与结果谁先到都一样（E30 F1 两例；第 5b 批 N1 已修复），重试耗尽、不可重试错误、提交异常都转人工，事实端口 apply 0 次（E30 §2–§4）；过期任务不恢复为有效输出：到期、取消、代次变化、版本被人工裁决替代、已结算、重启后未知任务的结果都被丢弃，不写裁决、不写证据（E30 §4、§7）。结算后释放正文，未结任务按车道与频道建索引，调度调用不再遍历历史（E34 §C、E31；第 5b 批 N2 已修复）。残余：结算后的轻量记录仍随累计任务数增长，约 514 字节/条（E34 §C，judgment N2）。

<a id="vw-sub017-story"></a>
**VW-SUB017-STORY@1：satisfied**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 本单只证明所承担部分；VOXWARD-STORY-009 的完整判据（VW-S009-AC001@1）保持。
- 依据：复用 VW-SUB017-AC001 的同次执行（E05、E30–E34）。SUB-017 承担的「微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序」都成立：微批四种取批条件、后台余量、有限重试退避、取消与代次（E30 §1–§5）；付费优先与按车道有限保序在提交环节成立（E30 §5、E34 A1–A10；B4 已修复）。本行只证明 SUB-017 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 satisfied。

<a id="vw-sub017-parent"></a>
**VW-SUB017-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 0b929d3 上的同次执行（E02–E08、E30–E34）。无无限积压、无全局无限屏障、超时不默认放行或扣分、过期任务不恢复为有效输出四项都成立；第 5b 批的 B4、B5 与 N1 在本候选上不再复现（E30、E34 各 0 项不符；对照 5ce5bee 分别 7 项、17 项不符）。SUB-017 承担的协调器部分见 VW-SUB017-AC001。

### 2.6 VOXWARD-SUB-018 本单行

<a id="vw-sub018-ac001"></a>
**VW-SUB018-AC001@1：satisfied**（machine；要求 work:69b0cc08690c31022d613fc1#VW-SUB018-R001@1）

- expected：并发随资源收缩且不突破上限；Crew 不可用时任务明确失败而非默认放行；Crew 会话状态不作为业务最终裁决。
- 依据：并发随资源收缩且不突破上限成立：createDynamicConcurrency({min 1, max 4}) 对 NORMAL、两种 TIGHT、两种 CRITICAL、三种不可用读数、恢复 NORMAL 依次给出 4、2、2、1、1、1、1、1、4，资源读取抛异常时为 1（E30 §6–§7；第 5b 批 N7 已修复）；经执行器实测每次启动时打开的会话数都小于当时读到的上限，随机 400 步从未超过上限 6（E30 §6）；cancel、start、done 分别挂起的 7 组场景中，替身记录的同时打开会话数都不超过上限（E34 B1–B7）。唯一的例外是 start 晚于任务截止时间才返回：执行器在它返回时立即发起取消，取消被接受之前 Crew 侧比上限多 1 个（E34 B4；设计 §9 已写明，5ce5bee 行为相同）。Crew 不可用时任务明确失败而非默认放行：拒绝作业、会话中途失联转人工 CREW_UNAVAILABLE；cancel、start、done 不返回时 pump 与 cancelEvent 按时返回，任务到截止时间转人工（E30 §7、E34 B1–B7、E31；B5 已修复）。Crew 会话状态不作为业务最终裁决：completed 但缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，裁决只来自条目并经事实端口写入（E30 §7）。固定版本的真实 Crew 实测按方法标为未验证：简报不允许连接真实 Crew，本轮只用进程内替身（E08）。残余见 judgment N1。

<a id="vw-sub018-story"></a>
**VW-SUB018-STORY@1：satisfied**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：并发随资源收缩且不突破上限；Crew 不可用时任务明确失败而非默认放行；Crew 会话状态不作为业务最终裁决。 本单只证明所承担部分；VOXWARD-STORY-009 的完整判据（VW-S009-AC001@1）保持。
- 依据：复用 VW-SUB018-AC001 的同次执行（E30–E34）。SUB-018 承担的「TaskCoordinator/Crew 适配」中，动态并发的上下限与随资源收缩、会话状态不作为裁决、Crew 拒绝与失联时明确失败成立；Crew 的 cancel、start、done 不返回时执行器不再停止派工（B5 已修复，E34 §B）。固定版本真实 Crew 实测按方法未验证。本行只证明 SUB-018 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 satisfied。

<a id="vw-sub018-parent"></a>
**VW-SUB018-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 0b929d3 上的同次执行（E02–E08、E30–E34）。无无限积压、无全局无限屏障、超时不默认放行或扣分、过期任务不恢复为有效输出四项都成立；第 5b 批的 B4、B5 与 N1 在本候选上不再复现（E30、E34 各 0 项不符；对照 5ce5bee 分别 7 项、17 项不符）。Crew 的 cancel 不返回时 pump 与 cancelEvent 按时返回，其它频道照常派工（E30 F3、E31、E34 B1–B3）。SUB-018 承担的动态并发与 Crew 执行器部分见 VW-SUB018-AC001。

### 2.7 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-001"></a>
**VW-S009-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E33）；check:deps 178 个文件 0 违规（E06），副本中给 task-coordinator 加入导入 db 与 @anthropic-ai/sdk 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。自 6d395c9 起契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json、锁文件与 scripts/ 都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。

<a id="vw-sub017-inherit-001"></a>
**VW-SUB017-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E33）；check:deps 178 个文件 0 违规（E06），副本中给 task-coordinator 加入导入 db 与 @anthropic-ai/sdk 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。自 6d395c9 起契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json、锁文件与 scripts/ 都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是协调器部分（coordinator.ts、ordering.ts 及纯函数文件）。

<a id="vw-sub018-inherit-001"></a>
**VW-SUB018-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E33）；check:deps 178 个文件 0 违规（E06），副本中给 task-coordinator 加入导入 db 与 @anthropic-ai/sdk 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。自 6d395c9 起契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json、锁文件与 scripts/ 都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 crew/adapter.ts 与 crew/capacity.ts。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s009-inherit-005"></a>
**VW-S009-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：返工只改 task-coordinator 模块文件、测试与 S009 设计（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；同频道更早的后台任务不论排队还是运行，都不再挡实时与付费结果的提交（E30 §5 F2、E34 A1–A4；B4 已修复）。提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub017-inherit-005"></a>
**VW-SUB017-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：返工只改 task-coordinator 模块文件、测试与 S009 设计（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；同频道更早的后台任务不论排队还是运行，都不再挡实时与付费结果的提交（E30 §5 F2、E34 A1–A4；B4 已修复）。提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub018-inherit-005"></a>
**VW-SUB018-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：返工只改 task-coordinator 模块文件、测试与 S009 设计（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；同频道更早的后台任务不论排队还是运行，都不再挡实时与付费结果的提交（E30 §5 F2、E34 A1–A4；B4 已修复）。提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。完整判据由 INIT 的 VW-AC-005 承载。

#### VW-R-006@1（INHERIT-006）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-006"></a>
**VW-S009-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中本单触及的各项成立：微批、大小、容量和等待均有界（E30 §1–§2）；按宿主资源动态约束，资源读取抛异常时按 CRITICAL 收缩到下限（E30 §6–§7；第 5b 批 N7 已修复）；付费优先、复盘让出实时容量：门控只比较同频道同车道的前序，同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 与 PAID，PAID 不被同频道 REALTIME 挡（E30 §5 F2 与 PAID 场景、E34 A1–A6）；有限保序：同车道内仍保序，只等到前序截止时间并记 PREDECESSOR_UNFINISHED（E34 A7–A10，三个车道各一组）；删除优先失效旧任务（E30 §4）。共享的前半句也成立：无全局无限屏障：Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 都在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限（E34 B1–B7、E30 F3、E31；第 5b 批 B5 已修复）。上一候选 5ce5bee 上 A1–A6、A10 与 B1–B3 都不符（E34 对照）。

<a id="vw-sub017-inherit-006"></a>
**VW-SUB017-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中本单触及的各项成立：微批、大小、容量和等待均有界（E30 §1–§2）；按宿主资源动态约束，资源读取抛异常时按 CRITICAL 收缩到下限（E30 §6–§7；第 5b 批 N7 已修复）；付费优先、复盘让出实时容量：门控只比较同频道同车道的前序，同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 与 PAID，PAID 不被同频道 REALTIME 挡（E30 §5 F2 与 PAID 场景、E34 A1–A6）；有限保序：同车道内仍保序，只等到前序截止时间并记 PREDECESSOR_UNFINISHED（E34 A7–A10，三个车道各一组）；删除优先失效旧任务（E30 §4）。共享的前半句也成立：无全局无限屏障：Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 都在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限（E34 B1–B7、E30 F3、E31；第 5b 批 B5 已修复）。上一候选 5ce5bee 上 A1–A6、A10 与 B1–B3 都不符（E34 对照）。B4 的修复在本单的 ordering.ts 与 coordinator.ts。

<a id="vw-sub018-inherit-006"></a>
**VW-SUB018-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中本单触及的各项成立：微批、大小、容量和等待均有界（E30 §1–§2）；按宿主资源动态约束，资源读取抛异常时按 CRITICAL 收缩到下限（E30 §6–§7；第 5b 批 N7 已修复）；付费优先、复盘让出实时容量：门控只比较同频道同车道的前序，同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 与 PAID，PAID 不被同频道 REALTIME 挡（E30 §5 F2 与 PAID 场景、E34 A1–A6）；有限保序：同车道内仍保序，只等到前序截止时间并记 PREDECESSOR_UNFINISHED（E34 A7–A10，三个车道各一组）；删除优先失效旧任务（E30 §4）。共享的前半句也成立：无全局无限屏障：Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 都在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限（E34 B1–B7、E30 F3、E31；第 5b 批 B5 已修复）。上一候选 5ce5bee 上 A1–A6、A10 与 B1–B3 都不符（E34 对照）。本单承担的「按宿主资源动态约束」与 B5 的修复在 crew/capacity.ts、crew/adapter.ts。

#### VW-R-008@1（INHERIT-008）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s009-inherit-008"></a>
**VW-S009-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。第 5b 批 N6 已写进契约注释与设计 §9：completed 报告须先经 S007 的整批校验（VW-R-008），由 S029 的真实绑定实现与验证，本包未验证。完整判据由 INIT 的 VW-AC-008 承载。

<a id="vw-sub017-inherit-008"></a>
**VW-SUB017-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。第 5b 批 N6 已写进契约注释与设计 §9：completed 报告须先经 S007 的整批校验（VW-R-008），由 S029 的真实绑定实现与验证，本包未验证。完整判据由 INIT 的 VW-AC-008 承载。

<a id="vw-sub018-inherit-008"></a>
**VW-SUB018-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。第 5b 批 N6 已写进契约注释与设计 §9：completed 报告须先经 S007 的整批校验（VW-R-008），由 S029 的真实绑定实现与验证，本包未验证。完整判据由 INIT 的 VW-AC-008 承载。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-009"></a>
**VW-S009-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。任务结算时释放正文：完成、取消（排队与运行）、提交时被判过期、失败、到期、晚到与入队被拒共 8 种结算方式各 50 条，强制 GC 后的堆快照里 0 条正文残留，仍在排队的 50 条都在（E34 §C；同一检查在 5ce5bee 上 400 条全部残留；第 5b 批 N2 已修复）。证据只在提交成功时写入技术日志，80153 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。残余：Crew 的 start 或 done 一直不返回时，执行器为该会话保留作业（含正文）直到 Crew 应答（E34 B5、B6，judgment N1）。Crew 端内容残留的清理由 S029 的真实绑定承担（契约注释已写明），本包未验证。

<a id="vw-sub017-inherit-009"></a>
**VW-SUB017-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。任务结算时释放正文：完成、取消（排队与运行）、提交时被判过期、失败、到期、晚到与入队被拒共 8 种结算方式各 50 条，强制 GC 后的堆快照里 0 条正文残留，仍在排队的 50 条都在（E34 §C；同一检查在 5ce5bee 上 400 条全部残留；第 5b 批 N2 已修复）。证据只在提交成功时写入技术日志，80153 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。残余：Crew 的 start 或 done 一直不返回时，执行器为该会话保留作业（含正文）直到 Crew 应答（E34 B5、B6，judgment N1）。Crew 端内容残留的清理由 S029 的真实绑定承担（契约注释已写明），本包未验证。

<a id="vw-sub018-inherit-009"></a>
**VW-SUB018-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。任务结算时释放正文：完成、取消（排队与运行）、提交时被判过期、失败、到期、晚到与入队被拒共 8 种结算方式各 50 条，强制 GC 后的堆快照里 0 条正文残留，仍在排队的 50 条都在（E34 §C；同一检查在 5ce5bee 上 400 条全部残留；第 5b 批 N2 已修复）。证据只在提交成功时写入技术日志，80153 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。残余：Crew 的 start 或 done 一直不返回时，执行器为该会话保留作业（含正文）直到 Crew 应答（E34 B5、B6，judgment N1）。Crew 端内容残留的清理由 S029 的真实绑定承担（契约注释已写明），本包未验证。

#### VW-R-010@1（INHERIT-010）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-010"></a>
**VW-S009-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。共享的前半句成立：Crew 的 cancel 不返回时 pump、之后的 pump 与执行器的 cancelEvent 都返回，其它频道照常派工，到期任务照常转人工（E30 F3、E31、E34 B1–B3；B5 已修复）；start、done 不返回时同样（E34 B4–B6）。真实 Kiro Crew 未验证（S029）。

<a id="vw-sub017-inherit-010"></a>
**VW-SUB017-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。共享的前半句成立：Crew 的 cancel 不返回时 pump、之后的 pump 与执行器的 cancelEvent 都返回，其它频道照常派工，到期任务照常转人工（E30 F3、E31、E34 B1–B3；B5 已修复）；start、done 不返回时同样（E34 B4–B6）。真实 Kiro Crew 未验证（S029）。按候选整体判定；本单的协调器部分不涉及 Crew 调用。

<a id="vw-sub018-inherit-010"></a>
**VW-SUB018-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。共享的前半句成立：Crew 的 cancel 不返回时 pump、之后的 pump 与执行器的 cancelEvent 都返回，其它频道照常派工，到期任务照常转人工（E30 F3、E31、E34 B1–B3；B5 已修复）；start、done 不返回时同样（E34 B4–B6）。真实 Kiro Crew 未验证（S029）。B5 的修复在本单的 crew/adapter.ts。

#### VW-R-011@1（INHERIT-011）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-011"></a>
**VW-S009-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后不再保留正文（E34 §C），调度调用只读未结任务：结算 6 万条后单次 commit、sweep、takeBatch 为 1、0、2 µs（E31；第 5b 批为 2433、633、2031 µs），8 万条时 takeBatch 22 µs（E30 §8；5ce5bee 3416 µs）。共享的前半句「无全局无限屏障」成立（E34 §B、E31；B5 已修复）。真实数据库版事实端口不在本包，事务原子性只在替身上验证。

<a id="vw-sub017-inherit-011"></a>
**VW-SUB017-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后不再保留正文（E34 §C），调度调用只读未结任务：结算 6 万条后单次 commit、sweep、takeBatch 为 1、0、2 µs（E31；第 5b 批为 2433、633、2031 µs），8 万条时 takeBatch 22 µs（E30 §8；5ce5bee 3416 µs）。共享的前半句「无全局无限屏障」成立（E34 §B、E31；B5 已修复）。真实数据库版事实端口不在本包，事务原子性只在替身上验证。按候选整体判定；事务提交与未结任务索引在本单的 coordinator.ts。

<a id="vw-sub018-inherit-011"></a>
**VW-SUB018-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后不再保留正文（E34 §C），调度调用只读未结任务：结算 6 万条后单次 commit、sweep、takeBatch 为 1、0、2 µs（E31；第 5b 批为 2433、633、2031 µs），8 万条时 takeBatch 22 µs（E30 §8；5ce5bee 3416 µs）。共享的前半句「无全局无限屏障」成立（E34 §B、E31；B5 已修复）。真实数据库版事实端口不在本包，事务原子性只在替身上验证。B5 的修复在本单的 crew/adapter.ts。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-012"></a>
**VW-S009-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：返工不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

<a id="vw-sub017-inherit-012"></a>
**VW-SUB017-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：返工不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

<a id="vw-sub018-inherit-012"></a>
**VW-SUB018-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：返工不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

#### VW-R-017@1（INHERIT-017）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-017"></a>
**VW-S009-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。删除流程不再卡在执行器：Crew 的 cancel 不返回时，执行器的 cancelEvent 在协调器取消完成后返回，任务为 DISCARDED（CANCELLED），被取消任务写入 0 次（E34 B2、E31；B5 已修复）；被取消任务的正文随结算释放（E34 §C）。共享的前半句「无全局无限屏障」成立（E34 §B）。

<a id="vw-sub017-inherit-017"></a>
**VW-SUB017-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。删除流程不再卡在执行器：Crew 的 cancel 不返回时，执行器的 cancelEvent 在协调器取消完成后返回，任务为 DISCARDED（CANCELLED），被取消任务写入 0 次（E34 B2、E31；B5 已修复）；被取消任务的正文随结算释放（E34 §C）。共享的前半句「无全局无限屏障」成立（E34 §B）。按候选整体判定；本单的取消与代次部分成立。

<a id="vw-sub018-inherit-017"></a>
**VW-SUB018-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。删除流程不再卡在执行器：Crew 的 cancel 不返回时，执行器的 cancelEvent 在协调器取消完成后返回，任务为 DISCARDED（CANCELLED），被取消任务写入 0 次（E34 B2、E31；B5 已修复）；被取消任务的正文随结算释放（E34 §C）。共享的前半句「无全局无限屏障」成立（E34 §B）。B5 的修复在本单的 crew/adapter.ts。

## 3. VOXWARD-STORY-013 组（29 行，全部 satisfied）

<a id="s013-summary"></a>
### 3.0 S013 实测摘要（必验项 4–6）

三份探针都不用实施者的测试辅助文件。E40 自写假 Google 令牌端点：授权请求带 S256 挑战时，授权码只能用匹配的 verifier 兑换（RFC 7636 4.6），可选兑换失败时是否作废授权码；凭据行表在内存里，保险箱、凭据存储、state 存储与 OAuth 路由都是检出里的真实代码。E41 在迁移后的真实 SQLite 文件上运行真实计分引擎与计分端口。E42 用脚本化传输按官方 liveChatMessage 资源的形状给出条目（Super Chat 的留言放在 `superChatDetails.userComment`，不带 `textMessageDetails`，见 R1），S3 再接上真实 SQLite 与计分引擎。对照副本是 `6d395c9` 的 `apps/server/src`（Q28、Q20 修复之前）。

<a id="q28"></a>
### 3.1 Q28：授权码绑定 PKCE，state 不被他人消耗，重新授权淘汰旧凭据

| 检查（E40） | 0b929d3 | 6d395c9 |
| --- | --- | --- |
| 授权 URL 带 `code_challenge_method=S256` 与 43 字符的挑战；URL 与响应里都没有 verifier | 符合 | 没有挑战 |
| 主播自己完成回调；兑换请求带 43 字符的 verifier，其 SHA-256 等于挑战，字符在 RFC 7636 允许范围内；同一 state 不能用第二次 | 符合 | 没有 verifier |
| 另一频道的所有者用自己的 state 加主播尚未兑换的授权码回调 | 两个频道都没有授权（假端点回 invalid_grant，页面状态 REAUTHORIZATION_REQUIRED） | 攻击者频道得到授权（AUTHORIZED） |
| 之后主播自己的回调 | 假端点在兑换失败时作废授权码则失败，否则成功：取决于提供方，不是 VoxWard 的选择 | — |
| verifier 为空：直接兑换 | 发请求之前返回 invalid_request，令牌端点 0 次请求 | 照样发请求 |
| verifier 为空：经回调（强行写入一个 verifier 为空的待决记录） | 没有授权，令牌端点 0 次请求 | 得到授权 |
| verifier 不对：经回调 | 提供方拒绝，没有授权 | 得到授权 |
| 他人账号带码、他人账号带 `error=access_denied`、同频道房管、无角色账号用主播的 state 回调 | 都返回 400 STATE_INVALID，令牌端点 0 次请求；主播随后用同一 state 完成授权 | 主播随后的回调返回 400（state 已被耗掉） |
| 重新授权两次 | 第一行 revokedAt 已写、第二行有效；旧密文 reveal 报 CredentialNotFoundError，describe 与 list 都没有它；readGrant 读到新 refresh token；状态探测用新令牌 | 两行都有效，旧密文仍可读 |
| 保险箱 remove：用途不符 / 未知引用 | CredentialPurposeError 且保留 / 返回 false | 没有删除接口 |
| 假端点上旧 refresh token 是否仍有效，撤销请求次数 | 仍有效，0 次 | 仍有效，0 次 |

- 回调在 `peek` 之后核对账号与角色，三者之间没有 await，核对通过后才 `consume`（E33）；他人的失败尝试拿不到也耗不掉主播的 state。state 存储在每次 `issue` 时清掉过期条目。
- PKCE 能否阻止注入取决于提供方按 RFC 7636 校验 verifier；Google 的真实行为未验证（S029）。

<a id="q20"></a>
### 3.2 Q20：身份基准分全额记录，只钳制最终分

| 场景（E41，真实 SQLite；上限 100） | 0b929d3 | 6d395c9 |
| --- | --- | --- |
| Q20-1 分数 100（行为 100）：升级会员（+10）再到期 | 升级 delta 0，基准 10 落库，行为 100；到期 delta 0，分数 100，基准 0，行为 100 | 升级时基准不落库；到期扣 10，分数 90 |
| Q20-2 实施方的残余：100 → 升级会员 → BLOCK（−5）→ 到期 | BLOCK 立即生效，分数 95（基准 10、行为 95，两者之和 105）；到期 delta 0，仍为 95；没有会员经历的同一序列也是 95 | 到期后 85 |
| Q20-3 100 → 升级房管（+30）→ BLOCK → 降为会员（−20）→ 到期（−10） | 各步 delta 为 0、−5、+5、−5，分数 95、100、95；账本记 requested −20、actual +5 | 0、−5、−20、−10，分数最后 65 |
| Q20-4 下限：会员、分数 −100（行为 −110）→ 到期 → 再升级 | 两步 delta 都是 0，分数 −100，基准 0 → 10 | 再升级时凭空加 10，分数 −90 |
| Q20-5 同一来源事件重放、同身份新事件 | 只加一次 10 | — |

- 身份路径：`nextIdentityBaseScore = 基准 + requested`，`nextCurrentScore = clamp(基准 + 行为)`；裁决计分与人工补偿仍按 §5.1 的运行钳制，行为分累计实际生效值（E33）。账本在基准分变化而当前分不变时也写分数行与账本行（E41 Q20-1 的账本行 requested 10、actual 0）。
- 判断见 judgment「必验项 5」：残余不违反提案 §5.2，不阻断。

<a id="s013-main"></a>
### 3.3 S013 主体

| 检查（E42） | 结果 |
| --- | --- |
| S1 同批重复帧、断网后重连补发、再次补发 | sc1、t1、t2、t3 各投递一次，重复 4 次；游标为 null、tok-1、tok-2；offlineAt 到达后进入 ENDED |
| S2 初连补发：10 分钟前与 2 分钟前的 Super Chat、一条新消息 | 10 分钟前的不投递（staleReplay 1），另两条各投递一次；同一去重存储再次初连只投递新增的一条 |
| S2 进程重启后（新的进程内去重存储）再次初连 | 2 分钟前的 Super Chat 与新消息再次投递（观察） |
| S3 两次运行（第二次模拟重启）都接到真实计分引擎 | 账本只有 2 条奖励与 1 条身份变化，分数不变：已生效的计分与身份变化按平台消息 ID 幂等 |
| S3b 冷却 60 s：同一观众两条消息首次只有第一条得分；61 s 后重启重放 | 第二条在重放时得分（账本 `event:ch-s3:cool-2` 一条，actual 1）：首次没有效果的裁决不留幂等记录（第 3 批 Q19①），重放带新的 receivedAt（观察） |
| S4 身份 | isChatSponsor 为 true 时为 PAID_MEMBER、确定、来源 isChatSponsor；字段缺失为不确定的 UNKNOWN；四个字段都为 false 为确定的 UNKNOWN；字符串 "true"、数字 1 不当作 true；只有 isVerified 时为 VERIFIED_ACCOUNT；订阅固定 NOT_PROVIDED；IdentityKind 没有订阅者；跟踪器只在确定且变化时发出：会员、重复（无）、字段缺失（无）、全部为 false（UNKNOWN） |
| S5 终止状态 | offlineAt、liveChatEnded → ENDED；forbidden → PERMISSION_LOST；quotaExceeded → QUOTA_EXHAUSTED；liveChatDisabled、liveChatNotFound → CHAT_UNAVAILABLE；invalidArgument → REQUEST_REJECTED；都不再连接。连续 8 次网络失败 → GAVE_UP，间隔 1、2、4、8、16、32、60 s；rateLimitExceeded 至少等 30 s |
| S5 配额 | 预算 12 单位时付两次 5 单位的连接，第三次不连接即进入 QUOTA_EXHAUSTED，快照 EXHAUSTED、已用 10；平台答复 quotaExceeded 后快照 EXHAUSTED、serverReportedExhausted=true、不再允许连接；用到 80% 时 WARNING |
| S6 官方来源 | kind 为列表响应、缺 kind、缺 publishedAt、缺 authorDetails、非对象 5 种全部丢弃并计数，ok1、ok2 通过 |
| S6 轮询 | pageTokenInvalid：清空游标立即以初连重连一次，再次 pageTokenInvalid 按退避等 1 s；平台每批之后都关闭连接时，每次重连等 1 s（观察） |
| S7 业务事件 | 输出 `{contractVersion, kind: "CHANNEL_MESSAGE", event, identity}`，event 的键与 ChannelEvent 契约一致；序列化结果没有平台作者 ID、snippet、authorDetails、etag；身份变化的来源为 `youtube:m1`；文本消息正文为原文，按资源形状给出的 Super Chat 正文为空字符串（观察） |
| S8 sink 抛异常 | 投递 r2 时抛异常，runStreamList 拒绝（不返回状态与游标），r1 已投递；同一存储下平台重发 r1–r3，只投递 r3：r2 的 ID 在投递前已占用，永远不再投递 |
| S8 去重容量 | 容量 2 时 e1 被挤出，补发时再次投递（容量 10 000 为自定默认值） |
| S9 补发年龄 | 同一连接的第二批里 6 分钟前发布的消息被当作过时补发丢弃；本机时钟比平台快 6 分钟时，两条新消息都被丢弃，只体现在 staleReplay 计数（观察） |

<a id="s013-residual"></a>
### 3.4 实施方列出的残余与本轮补充

- sink 抛异常时消息 ID 已被占用（最多投递一次），去重存储在进程内：两点都实测成立（E42 S2、S8）。它们不违反本组任何验收行：各行要求的是不重复计分、不重复投递、不重播过时卡片，最多一次正是不重复；跨进程重启不在任何一行的场景里，计分端对已生效的条目也幂等（E42 S3）。但它们与提案 §16「可恢复性：重启后依据持久业务状态恢复…避免恢复即重播旧消息」和 §6.3 的投递语义有关，要在接线时解决，见 judgment N3。
- Google 侧旧 token 没有调用撤销接口：实测确认（E40 Q28-5 的观察），判断见 judgment「必验项 4」。
- Q20 的残余：见 §3.2 与 judgment「必验项 5」。
- 本轮补充的三处观察不改变任何行的判定：Super Chat 留言没有进入事件正文（E42 S7，judgment N4）；补发年龄按本机时钟作用于全部批次（E42 S9，judgment N5）；平台每批之后关闭连接时每秒重连一次，由配额门兜底（E42 S6，judgment N5）。

### 3.5 VOXWARD-STORY-013 本单行

<a id="vw-s013-ac001"></a>
**VW-S013-AC001@1：satisfied**（machine；要求 work:5fd9e2a6d536e627b7e4bf13#VW-S013-R001@1）

- expected：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。
- 依据：候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。platform-source 相关测试：youtube-credentials 50 项、youtube-stream 42 项、youtube-identity 20 项，保险箱删除 3 项，身份计分路径 17 项（E05）。实测只用替身（E40–E42），没有连接真实 YouTube 或 Google。不重复计分/投递：按平台消息 ID 去重，同批重复帧与重连后的补发只投递一次（sc1、t1、t2、t3 各一次，重复 4 次，游标按 null、tok-1、tok-2 续接）；初连时平台补发的 2 分钟前的 Super Chat 投递一次，同一去重存储下再次初连不再投递（E42 S1–S2）。不重播过时卡片：发布时间早于补发年龄 5 分钟的 Super Chat 不投递，计为 staleReplay（E42 S2）。缺失订阅标记不伪造：身份只来自 isChatOwner、isChatModerator、isChatSponsor、isVerified 四个布尔字段，订阅固定为 NOT_PROVIDED，字段缺失或不是布尔值时为不确定的 UNKNOWN，不产生降级；未知身份按无身份处理（E42 S4）。只接受官方上游来源：只有 kind 为 youtube#liveChatMessage 且有 id、publishedAt、authorDetails.channelId 的条目通过，其余 5 种丢弃并计数；模块不导入 db 或供应商 SDK，不直接联网（E42 S6、E09、E33）。直播结束、配额不足、权限失效、聊天不可用都有明确的终止状态（E42 S5）。Q28 与 Q20 也在本候选上实测通过（E40、E41）。真实 streamList 接入按方法标为未验证：没有凭据，简报也不允许连接真实 YouTube。范围说明：进程重启后默认的进程内去重存储为空，2 分钟前的消息会再次投递（E42 S2）；计分账本对已生效的条目幂等（E42 S3），首次没有效果的条目会在重放时生效（E42 S3b）；设计 §5 把跨重启去重定为组合层绑定 channel_events_dedupe_uq，本包不接线，这一场景依赖接线，未验证（judgment N3）。另有三处发现不改变本行判定：Super Chat 的留言没有进入事件正文（judgment N4）、补发年龄按本机时钟作用于全部批次（N5）、sink 抛异常时消息最多投递一次（N3）。

<a id="vw-s013-parent"></a>
**VW-S013-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R013@1）

- expected：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。
- 依据：复用 VW-S013-AC001 在 0b929d3 上的同次执行（E02–E08、E40–E42）。不重复计分/投递或重播过时卡片、缺失订阅标记不伪造、只接受官方上游来源三项在模块层成立；跨进程重启的去重依赖组合层接线，未验证（judgment N3）；真实接入未验证。S013 的贡献是 streamList 接入（连接、恢复、结束、平台消息 ID 去重、补发年龄、退避、配额门）、身份能力映射、配额监测、版本化业务事件，以及 Q28、Q20 两项修复。

### 3.6 VOXWARD-SUB-024 本单行

<a id="vw-sub024-ac001"></a>
**VW-SUB024-AC001@1：satisfied**（machine；要求 work:51b064d4e4de6db30a47de8b#VW-SUB024-R001@1）

- expected：不重复计分/投递或重播过时卡片；只接受官方上游来源；不出现无条件高频轮询。
- 依据：候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。youtube-stream 测试 42 项通过（E05）。SUB-024 承担的接入部分成立（E42 S1、S2、S5、S6，替身传输）：不重复计分/投递：按平台消息 ID 先占用后处理，同批重复帧与重连补发都只投递一次，断开后从最后的 nextPageToken 续接，pageTokenInvalid 时清空游标重建并依靠去重；初连时 2 分钟前的 Super Chat 投递一次，再次初连不再投递。不重播过时卡片：发布时间早于 5 分钟的补发不投递。只接受官方上游来源：只有带 id、publishedAt、authorDetails.channelId 的 youtube#liveChatMessage 条目通过，其余丢弃并计数；模块不直接联网，只经 StreamListTransport。不出现无条件高频轮询：不使用 list 轮询，只在连接结束后重连，间隔 1 s 起翻倍到 60 s，限流答复至少 30 s，连续 8 次失败进入 GAVE_UP；每次连接先过配额门。直播结束（offlineAt 或 liveChatEnded）进入 ENDED，不再连接。真实 streamList 接入按方法标为未验证。范围说明：进程重启后默认的进程内去重存储为空，2 分钟前的消息会再次投递（E42 S2）；计分账本对已生效的条目幂等（E42 S3），首次没有效果的条目会在重放时生效（E42 S3b）；设计 §5 把跨重启去重定为组合层绑定 channel_events_dedupe_uq，本包不接线，这一场景依赖接线，未验证（judgment N3）。另有两处观察不改变本行判定：平台每批之后都关闭连接时重连间隔为 1 s，由配额门兜底（E42 S6）；补发年龄按本机时钟作用于全部批次（E42 S9，judgment N5）。

<a id="vw-sub024-story"></a>
**VW-SUB024-STORY@1：satisfied**（machine；要求 work:5fd9e2a6d536e627b7e4bf13#VW-S013-R001@1）

- expected：不重复计分/投递或重播过时卡片；只接受官方上游来源；不出现无条件高频轮询。 本单只证明所承担部分；VOXWARD-STORY-013 的完整判据（VW-S013-AC001@1）保持。
- 依据：复用 VW-SUB024-AC001 的同次执行（E05、E42）。SUB-024 承担的「streamList 连接/恢复/结束；平台 ID 去重与补发年龄；不无条件高频轮询」成立；跨进程重启的去重依赖组合层接线（judgment N3）。本行只证明 SUB-024 承担的部分；VOXWARD-STORY-013 的完整判据 VW-S013-AC001 另行判定为 satisfied。

<a id="vw-sub024-parent"></a>
**VW-SUB024-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R013@1）

- expected：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。
- 依据：复用 VW-S013-AC001 在 0b929d3 上的同次执行（E02–E08、E40–E42）。不重复计分/投递或重播过时卡片、缺失订阅标记不伪造、只接受官方上游来源三项在模块层成立；跨进程重启的去重依赖组合层接线，未验证（judgment N3）；真实接入未验证。S013 的贡献是 streamList 接入（连接、恢复、结束、平台消息 ID 去重、补发年龄、退避、配额门）、身份能力映射、配额监测、版本化业务事件，以及 Q28、Q20 两项修复。SUB-024 承担的接入部分见 VW-SUB024-AC001。

### 3.7 VOXWARD-SUB-025 本单行

<a id="vw-sub025-ac001"></a>
**VW-SUB025-AC001@1：satisfied**（machine；要求 work:238d2a9a1ca4a1486d6f8091#VW-SUB025-R001@1）

- expected：缺失订阅标记不伪造；配额不足可见；进入流水线的是版本化业务事件而非平台原始响应。
- 依据：候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。youtube-identity 测试 20 项通过（E05）。缺失订阅标记不伪造：YouTube 不提供订阅字段，subscription 固定为 NOT_PROVIDED，IdentityKind 没有订阅者一类；身份按 CHANNEL_OWNER、MODERATOR、PAID_MEMBER、VERIFIED_ACCOUNT 的顺序取第一个为 true 的布尔字段，并记下来源字段；字段缺失或不是布尔值时为不确定的 UNKNOWN，不产生身份变化，四个字段都明确为 false 时才是确定的 UNKNOWN（E42 S4）。配额不足可见：每次连接计 5 单位，预算不够下一次连接时不连接并进入 QUOTA_EXHAUSTED；平台答复 quotaExceeded 时监测器立即为 EXHAUSTED，快照可查；用量达 80% 为 WARNING（E42 S5）。进入流水线的是版本化业务事件：输出 {contractVersion, kind: CHANNEL_MESSAGE, event, identity}，event 的键与 ChannelEvent 契约一致，发送者是组合层派生的 senderRef，序列化结果里没有平台作者 ID、snippet、authorDetails 或 etag；身份变化以 youtube:<消息ID> 为幂等来源（E42 S7）。真实接入记录按方法未补：没有凭据。发现：按官方资源形状给出的 Super Chat 事件正文为空字符串，留言没有进入流水线（E42 S7、R1，judgment N4）；本行 expected 不涉及正文内容，不改变判定。

<a id="vw-sub025-story"></a>
**VW-SUB025-STORY@1：satisfied**（machine；要求 work:5fd9e2a6d536e627b7e4bf13#VW-S013-R001@1）

- expected：缺失订阅标记不伪造；配额不足可见；进入流水线的是版本化业务事件而非平台原始响应。 本单只证明所承担部分；VOXWARD-STORY-013 的完整判据（VW-S013-AC001@1）保持。
- 依据：复用 VW-SUB025-AC001 的同次执行（E05、E42）。SUB-025 承担的「能力来源/unknown；配额监控」成立，官方消息以版本化业务事件交给组合层；Super Chat 留言的映射见 judgment N4。本行只证明 SUB-025 承担的部分；VOXWARD-STORY-013 的完整判据 VW-S013-AC001 另行判定为 satisfied。

<a id="vw-sub025-parent"></a>
**VW-SUB025-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R013@1）

- expected：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。
- 依据：复用 VW-S013-AC001 在 0b929d3 上的同次执行（E02–E08、E40–E42）。不重复计分/投递或重播过时卡片、缺失订阅标记不伪造、只接受官方上游来源三项在模块层成立；跨进程重启的去重依赖组合层接线，未验证（judgment N3）；真实接入未验证。S013 的贡献是 streamList 接入（连接、恢复、结束、平台消息 ID 去重、补发年龄、退避、配额门）、身份能力映射、配额监测、版本化业务事件，以及 Q28、Q20 两项修复。SUB-025 承担的身份、配额与业务事件部分见 VW-SUB025-AC001。

### 3.8 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s013-inherit-001"></a>
**VW-S013-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：platform-source 只导入 @voxward/contracts 与本模块文件；新文件没有 require、动态导入、node: 模块、fetch 或子进程，散列与随机数用全局 crypto（E33）；check:deps 178 个文件 0 违规（E06），副本中给 platform-source/youtube 加入导入 db 与 googleapis 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件没有改动（E33）；streamList 只经端口 StreamListTransport 进入，模块向流水线输出版本化 ChannelEvent，不带平台原始响应或平台作者 ID（E42 S7）。OAuth 路由仍未挂载。远端部署本单未触及。

<a id="vw-sub024-inherit-001"></a>
**VW-SUB024-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：platform-source 只导入 @voxward/contracts 与本模块文件；新文件没有 require、动态导入、node: 模块、fetch 或子进程，散列与随机数用全局 crypto（E33）；check:deps 178 个文件 0 违规（E06），副本中给 platform-source/youtube 加入导入 db 与 googleapis 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件没有改动（E33）；streamList 只经端口 StreamListTransport 进入，模块向流水线输出版本化 ChannelEvent，不带平台原始响应或平台作者 ID（E42 S7）。OAuth 路由仍未挂载。远端部署本单未触及。本单交付的是 stream-list.ts、dedup.ts、replay-age.ts 与 config.ts（config.ts 偏离交付清单，已在设计 §2 记录）。

<a id="vw-sub025-inherit-001"></a>
**VW-SUB025-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：platform-source 只导入 @voxward/contracts 与本模块文件；新文件没有 require、动态导入、node: 模块、fetch 或子进程，散列与随机数用全局 crypto（E33）；check:deps 178 个文件 0 违规（E06），副本中给 platform-source/youtube 加入导入 db 与 googleapis 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件没有改动（E33）；streamList 只经端口 StreamListTransport 进入，模块向流水线输出版本化 ChannelEvent，不带平台原始响应或平台作者 ID（E42 S7）。OAuth 路由仍未挂载。远端部署本单未触及。本单交付的是 identity.ts、quota.ts 与 to-business-event.ts。

#### VW-R-002@1（INHERIT-002）

expected：不重复计分/投递或重播过时卡片；缺失订阅标记不伪造；只接受官方上游来源。 继续遵守 VW-R-002 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s013-inherit-002"></a>
**VW-S013-INHERIT-002@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：VW-R-002 中本单触及的部分成立：输入只来自 streamList 端口，去重、重连补发、结束、配额都有实测（E42 S1–S2、S5）；凭据或权限失效由传输层映射为 forbidden，进入 PERMISSION_LOST，不再重连（E42 S5），401 等答复到 forbidden 的映射在尚未实现的传输适配器里，未验证；API key 与 OAuth 的能力区分沿用 S012 的操作表，本包的传输端口不区分。身份按平台字段映射并保留来源字段名，unknown 不冒充订阅关系（E42 S4、S7）。真实接入按方法未验证。跨进程重启的补发依赖组合层绑定持久去重（judgment N3）。

<a id="vw-sub024-inherit-002"></a>
**VW-SUB024-INHERIT-002@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：VW-R-002 中本单触及的部分成立：输入只来自 streamList 端口，去重、重连补发、结束、配额都有实测（E42 S1–S2、S5）；凭据或权限失效由传输层映射为 forbidden，进入 PERMISSION_LOST，不再重连（E42 S5），401 等答复到 forbidden 的映射在尚未实现的传输适配器里，未验证；API key 与 OAuth 的能力区分沿用 S012 的操作表，本包的传输端口不区分。身份按平台字段映射并保留来源字段名，unknown 不冒充订阅关系（E42 S4、S7）。真实接入按方法未验证。跨进程重启的补发依赖组合层绑定持久去重（judgment N3）。本单承担连接、恢复、结束、去重与补发年龄。

<a id="vw-sub025-inherit-002"></a>
**VW-SUB025-INHERIT-002@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：VW-R-002 中本单触及的部分成立：输入只来自 streamList 端口，去重、重连补发、结束、配额都有实测（E42 S1–S2、S5）；凭据或权限失效由传输层映射为 forbidden，进入 PERMISSION_LOST，不再重连（E42 S5），401 等答复到 forbidden 的映射在尚未实现的传输适配器里，未验证；API key 与 OAuth 的能力区分沿用 S012 的操作表，本包的传输端口不区分。身份按平台字段映射并保留来源字段名，unknown 不冒充订阅关系（E42 S4、S7）。真实接入按方法未验证。跨进程重启的补发依赖组合层绑定持久去重（judgment N3）。本单承担身份映射与配额。

#### VW-R-007@1（INHERIT-007）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s013-inherit-007"></a>
**VW-S013-INHERIT-007@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：对照交付边界：本包新增 platform-source/youtube 下的接入、身份、配额与业务事件文件，修改 OAuth 三个文件与保险箱（Q28），以及 scoring-engine 的身份路径与 db/scoring-ledger.ts 的落库条件（Q20）（E33）。Q20 只改身份路径：裁决计分与人工补偿仍按提案 §5.1 的运行钳制，engine.ts、compensation.ts 未改（E33、E41）。VW-R-007 的人工裁决、晚到覆盖与重复结算由其它 Story 实现；本包提供的平台消息 ID 去重与身份事件的 youtube:<消息ID> 幂等来源，使同一平台消息在一个进程内只投递一次、计分端只结算一次（E42 S1、S3、S7）。「拒绝并从平台删除」本单未触及。完整判据由 INIT 的 VW-AC-007 承载。

<a id="vw-sub024-inherit-007"></a>
**VW-SUB024-INHERIT-007@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：对照交付边界：本包新增 platform-source/youtube 下的接入、身份、配额与业务事件文件，修改 OAuth 三个文件与保险箱（Q28），以及 scoring-engine 的身份路径与 db/scoring-ledger.ts 的落库条件（Q20）（E33）。Q20 只改身份路径：裁决计分与人工补偿仍按提案 §5.1 的运行钳制，engine.ts、compensation.ts 未改（E33、E41）。VW-R-007 的人工裁决、晚到覆盖与重复结算由其它 Story 实现；本包提供的平台消息 ID 去重与身份事件的 youtube:<消息ID> 幂等来源，使同一平台消息在一个进程内只投递一次、计分端只结算一次（E42 S1、S3、S7）。「拒绝并从平台删除」本单未触及。完整判据由 INIT 的 VW-AC-007 承载。

<a id="vw-sub025-inherit-007"></a>
**VW-SUB025-INHERIT-007@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：对照交付边界：本包新增 platform-source/youtube 下的接入、身份、配额与业务事件文件，修改 OAuth 三个文件与保险箱（Q28），以及 scoring-engine 的身份路径与 db/scoring-ledger.ts 的落库条件（Q20）（E33）。Q20 只改身份路径：裁决计分与人工补偿仍按提案 §5.1 的运行钳制，engine.ts、compensation.ts 未改（E33、E41）。VW-R-007 的人工裁决、晚到覆盖与重复结算由其它 Story 实现；本包提供的平台消息 ID 去重与身份事件的 youtube:<消息ID> 幂等来源，使同一平台消息在一个进程内只投递一次、计分端只结算一次（E42 S1、S3、S7）。「拒绝并从平台删除」本单未触及。完整判据由 INIT 的 VW-AC-007 承载。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s013-inherit-009"></a>
**VW-S013-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：本包不调用 AI，不创建会话、提示或工具轨迹。进入流水线的事件只带正文、内部频道 ID、平台消息 ID、顺序号与组合层派生的 senderRef，不带平台作者 ID、显示名或原始响应（E42 S7）。进程内只保留平台消息 ID（有界，默认 10 000）、每个 senderRef 最近一次确定身份（有界）和 10 分钟内有效的授权 state 与 PKCE verifier（E33、E40）。

<a id="vw-sub024-inherit-009"></a>
**VW-SUB024-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：本包不调用 AI，不创建会话、提示或工具轨迹。进入流水线的事件只带正文、内部频道 ID、平台消息 ID、顺序号与组合层派生的 senderRef，不带平台作者 ID、显示名或原始响应（E42 S7）。进程内只保留平台消息 ID（有界，默认 10 000）、每个 senderRef 最近一次确定身份（有界）和 10 分钟内有效的授权 state 与 PKCE verifier（E33、E40）。

<a id="vw-sub025-inherit-009"></a>
**VW-SUB025-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：本包不调用 AI，不创建会话、提示或工具轨迹。进入流水线的事件只带正文、内部频道 ID、平台消息 ID、顺序号与组合层派生的 senderRef，不带平台作者 ID、显示名或原始响应（E42 S7）。进程内只保留平台消息 ID（有界，默认 10 000）、每个 senderRef 最近一次确定身份（有界）和 10 分钟内有效的授权 state 与 PKCE verifier（E33、E40）。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s013-inherit-011"></a>
**VW-S013-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查与实测：Q20 的落库改动仍在 commitInTransaction 的短事务内：身份基准分在上限处变化、当前分不变时也写分数行与账本行，在迁移后的真实 SQLite 上实测（E41）。接入层不写数据库，不建队列，不复制正文：消息经 sink 立即交给组合层，去重存储只记平台消息 ID（E33、E42）。浏览器与 AI 不直写。跨重启去重绑定 channel_events_dedupe_uq（schema 已有该唯一索引）由组合层实现，本包未接线。

<a id="vw-sub024-inherit-011"></a>
**VW-SUB024-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查与实测：Q20 的落库改动仍在 commitInTransaction 的短事务内：身份基准分在上限处变化、当前分不变时也写分数行与账本行，在迁移后的真实 SQLite 上实测（E41）。接入层不写数据库，不建队列，不复制正文：消息经 sink 立即交给组合层，去重存储只记平台消息 ID（E33、E42）。浏览器与 AI 不直写。跨重启去重绑定 channel_events_dedupe_uq（schema 已有该唯一索引）由组合层实现，本包未接线。

<a id="vw-sub025-inherit-011"></a>
**VW-SUB025-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查与实测：Q20 的落库改动仍在 commitInTransaction 的短事务内：身份基准分在上限处变化、当前分不变时也写分数行与账本行，在迁移后的真实 SQLite 上实测（E41）。接入层不写数据库，不建队列，不复制正文：消息经 sink 立即交给组合层，去重存储只记平台消息 ID（E33、E42）。浏览器与 AI 不直写。跨重启去重绑定 channel_events_dedupe_uq（schema 已有该唯一索引）由组合层实现，本包未接线。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s013-inherit-012"></a>
**VW-S013-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查与实测：OAuth 开始与查看状态只允许频道所有者；回调的 state 绑定发起账号与频道，他人账号、同频道房管、无角色账号用主播的 state 回调都返回 400 且不消耗 state（E40 Q28-4）；授权码绑定 S256 PKCE，verifier 只在服务端、只随兑换请求发送，不出现在 URL 或响应里（E40 Q28-1）；他人 state 加主播授权码、缺失或错误的 verifier 都不产生授权（E40 Q28-2、Q28-3）；保险箱删除按用途校验，用途不符时拒绝并保留（E40 Q28-5）。配置错误只报键名（YouTubeConfigError）。消息正文作为不可信数据进入事件，不作为指令。输出凭据本单未触及。

<a id="vw-sub024-inherit-012"></a>
**VW-SUB024-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查与实测：OAuth 开始与查看状态只允许频道所有者；回调的 state 绑定发起账号与频道，他人账号、同频道房管、无角色账号用主播的 state 回调都返回 400 且不消耗 state（E40 Q28-4）；授权码绑定 S256 PKCE，verifier 只在服务端、只随兑换请求发送，不出现在 URL 或响应里（E40 Q28-1）；他人 state 加主播授权码、缺失或错误的 verifier 都不产生授权（E40 Q28-2、Q28-3）；保险箱删除按用途校验，用途不符时拒绝并保留（E40 Q28-5）。配置错误只报键名（YouTubeConfigError）。消息正文作为不可信数据进入事件，不作为指令。输出凭据本单未触及。

<a id="vw-sub025-inherit-012"></a>
**VW-SUB025-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查与实测：OAuth 开始与查看状态只允许频道所有者；回调的 state 绑定发起账号与频道，他人账号、同频道房管、无角色账号用主播的 state 回调都返回 400 且不消耗 state（E40 Q28-4）；授权码绑定 S256 PKCE，verifier 只在服务端、只随兑换请求发送，不出现在 URL 或响应里（E40 Q28-1）；他人 state 加主播授权码、缺失或错误的 verifier 都不产生授权（E40 Q28-2、Q28-3）；保险箱删除按用途校验，用途不符时拒绝并保留（E40 Q28-5）。配置错误只报键名（YouTubeConfigError）。消息正文作为不可信数据进入事件，不作为指令。输出凭据本单未触及。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s013-inherit-017"></a>
**VW-S013-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：失败与结束状态都有明确去向：ENDED、CHAT_UNAVAILABLE、PERMISSION_LOST、QUOTA_EXHAUSTED、REQUEST_REJECTED、GAVE_UP 为运行结果的终止状态，过时补发计为 staleReplay，配额状态可查询（E42 S5）；重新授权后旧授权行撤销，旧密文从保险箱删除并清零，旧值不可读（E40 Q28-5）。本单新增的进程内数据：平台消息 ID（有界）、每个 senderRef 最近一次确定身份（有界）、10 分钟内有效的授权 state；都随进程结束消失，不落盘、不进日志。删除请求目前不会清掉身份缓存里对应的 senderRef；进程重启后平台补发的 5 分钟内消息会再次投递，若含已删除观众的消息，接线后会重新进入流水线。设计没有写明这两点与删除流程的关系（judgment N3、N7，交 STORY-019 与接线 Story）。删除编排本单未触及，没有实测删除路径。

<a id="vw-sub024-inherit-017"></a>
**VW-SUB024-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：失败与结束状态都有明确去向：ENDED、CHAT_UNAVAILABLE、PERMISSION_LOST、QUOTA_EXHAUSTED、REQUEST_REJECTED、GAVE_UP 为运行结果的终止状态，过时补发计为 staleReplay，配额状态可查询（E42 S5）；重新授权后旧授权行撤销，旧密文从保险箱删除并清零，旧值不可读（E40 Q28-5）。本单新增的进程内数据：平台消息 ID（有界）、每个 senderRef 最近一次确定身份（有界）、10 分钟内有效的授权 state；都随进程结束消失，不落盘、不进日志。删除请求目前不会清掉身份缓存里对应的 senderRef；进程重启后平台补发的 5 分钟内消息会再次投递，若含已删除观众的消息，接线后会重新进入流水线。设计没有写明这两点与删除流程的关系（judgment N3、N7，交 STORY-019 与接线 Story）。删除编排本单未触及，没有实测删除路径。

<a id="vw-sub025-inherit-017"></a>
**VW-SUB025-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：失败与结束状态都有明确去向：ENDED、CHAT_UNAVAILABLE、PERMISSION_LOST、QUOTA_EXHAUSTED、REQUEST_REJECTED、GAVE_UP 为运行结果的终止状态，过时补发计为 staleReplay，配额状态可查询（E42 S5）；重新授权后旧授权行撤销，旧密文从保险箱删除并清零，旧值不可读（E40 Q28-5）。本单新增的进程内数据：平台消息 ID（有界）、每个 senderRef 最近一次确定身份（有界）、10 分钟内有效的授权 state；都随进程结束消失，不落盘、不进日志。删除请求目前不会清掉身份缓存里对应的 senderRef；进程重启后平台补发的 5 分钟内消息会再次投递，若含已删除观众的消息，接线后会重新进入流水线。设计没有写明这两点与删除流程的关系（judgment N3、N7，交 STORY-019 与接线 Story）。删除编排本单未触及，没有实测删除路径。

## 4. 未验证与范围说明

- 真实 Kiro Crew：未验证。简报不允许启动真实 Crew 队列或连接本机网关；S009 的测试与本轮探针只用进程内替身（E08、E30、E34）。VW-SUB018-AC001 方法中的「固定版本实测」按方法标为未验证，由 STORY-029 的部署演练承接。Crew 的 start、cancel、done 在真实环境下多久返回、取消后会话是否真的结束，都没有测量。
- 真实 YouTube 与 Google：未验证。没有凭据，简报也不允许连接。streamList 的真实传输适配器没有实现（设计 §9）；`quotaExceeded` 的原因字符串、每日配额的重置时区、`chatEndedEvent`、401 等认证失败到 `forbidden` 的映射、Google 是否对带挑战的授权码强制校验 verifier、兑换失败后授权码是否作废、撤销接口对同一授权的影响，本轮都只按文档、搜索摘录或替身判断（R1、R2），由 STORY-029 的真实接入演练确认。
- 真实 Kiro 账号与 kiro-cli：本轮没有运行 kiro-cli，没有推理。
- 数据库版 `TaskFactsPort`、任务持久化、`MessageIdStore` 的持久绑定、PlatformSource 到审核路由与计分的接线：都不在本批（S009 设计 §11，S013 设计 §5、§6）。提交的事务确认只在替身上验证；S013 的跨重启行为只在模块层观察（E42 S2、S3、S3b）。
- 删除路径：本批没有实现或实测删除编排；进程内去重与身份缓存和删除的关系见 judgment N3、N7。
- 性能：资源信号的真实来源、微批默认值、配额预算与补发年龄的默认值都是自定，未测量；E31、E34 的耗时与堆数字是单次测量。
- 浏览器与页面：本批没有前端改动，未做浏览器验收。
