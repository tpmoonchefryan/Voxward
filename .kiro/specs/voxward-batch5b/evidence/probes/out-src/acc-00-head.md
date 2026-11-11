# 第 5b 批独立验收记录（S006 第 3 轮复验；S009 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `5ce5bee`（`5ce5beed518d4d82a0bbe9832d3f3f11876f6f89`）。`4c3b94a` 之上先合入 `voxward/s006-fix2`（合并提交 `c5ecc60`；`95b7997` 为 B3 修复，`00d1b61` 为 spec 与证据），再合入 `voxward/s009-scheduler`（合并提交 `5ce5bee`；`6d12da9`…`9e76d38`）。两个分支都从 `fe93a49` 拉出。相对 `4c3b94a`：38 个文件，+5100/−20 行；`.kiro/` 之外 26 个文件，只有 `moderation-engine/rules/normalize.ts`、新增的 `task-coordinator/` 模块与对应测试；契约包、`CONTRACT_VERSION`（仍为 `"1"`）、注册表、`app.ts`、`main.ts`、`package.json`、锁文件与 `scripts/` 都没有改动（E33）。相对上一候选 `b1a1471`，`.kiro/` 之外同样只有这 26 个文件。
- 检出：`$KIROCREW_SCRATCH/vw-int-b5b`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移出，冒烟后放回并核对 sha256。探针、替身、拦截脚本与原始输出都在 `$KIROCREW_SCRATCH/vw-accept-b5b-work/`，只按绝对路径导入检出内源码；副本在交付目录 `probes/`。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。所有服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew。
- 工单读数（E01）：库版本 20972，headEventHash `63ad570c0fde4403…82537708be1ca4f02ef409`，五单相同。修订号：STORY-006 rev 6、SUB-012 rev 5、STORY-009 rev 4、SUB-017 rev 3、SUB-018 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空。共 58 行验收：STORY-006 11、SUB-012 12、STORY-009 11、SUB-017 12、SUB-018 12。S006 组的验收行与第 5a 批逐字相同，`content.evidence` 里是 `c67db24` 与 `b1a1471` 两批行（11+11、12+12）；S009 组 `content.evidence` 为空。STORY-009 已把 VW-S009-R001@1 分配给 SUB-017 与 SUB-018（implementation 与 verification），两张子单的 STORY 行生效。子单 PARENT 与 INHERIT 行的 expected、method、requirement 与 Story 对应行逐字相同。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现，也没有做过上一轮验收。两份自测证据与主线程集成日志只作参考，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 4、5a 批）：`satisfied` 表示该行 expected 的每一部分在候选 `5ce5bee` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；子单 AC001 与 STORY 行只判本单承担的部分。方法允许替身或写明「无可用环境时标未验证」的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：58 行中 40 行 satisfied、18 行 failed。STORY-006 组 23/23 satisfied（B3 已修复）；STORY-009 组 17 行 satisfied、18 行 failed（B4、B5）。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-b5b-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/vw/int-b5b.log`（06:51）、`smoke-dev.log`、`smoke-dist.log`（06:52）（复核，不作唯一依据） | 0 ×7 | install、build、typecheck、test 1458/1458、check:deps 171 个文件 0 违规，冒烟两次 200；日志不含工作目录与提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <5 个 KEY>`，输出重定向后用 node 提取 | 0 ×5 | 约 53 s，每份 1.88–2.05 MB。读数见文首。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256（`dbdc7d68…120f`）前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 168.6 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、web、server 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `pnpm test` | 0 | 97 个文件、1458 项，约 25 s。本批相关：moderation-engine 的 sound-marks 387、normalize 44、transliterate 19、engine 27、groups 14、bounded-regex 35、regex-cost 11，routing 的 classification 25、truth-table 106、router 15、states 19、exception-queue 6；task-coordinator 8 个文件 88 项（coordinator 25、crew/adapter 14、ordering 10、crew/capacity 10、acceptance 9、micro-batch 8、priority 6、generation 6）。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 171 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c` | 0 | 环境中没有 `VOXWARD_*` 变量。`pnpm dev` 1 s 内 `/healthz` 200，`VOXWARD_ADAPTERS=synthetic node dist/main.js` 1 s 内 200；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；停止后 3000、5173 无监听，检出下无残留进程；原库放回后 sha256 OK。 |
| E08 | 外连、本机服务与真实命令拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=<运行前本机已在监听的 22 个端口> NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 97 个文件 1458 项通过。拦截模块在 126 个 Node 进程中加载（改写 `net.Socket.prototype.connect`、`dns.lookup` 与 `fetch`：非回环一律拒绝；回环连接到运行前已存在的监听端口也拒绝，Kiro Crew 网关不论用哪个端口都在其中）。被拒的外部连接 0 次，被拒的本机已有端口连接 0 次，回环连接 13 次（全部是测试自己开的临时端口 40825），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截返回 ENOTFOUND，启动失败用例照常通过）。PATH 最前的 `kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。拦截先自检：对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 全部被拒；本机已有端口 1053 在发起连接之前被拒；新开的本机端口可连。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、`apps/server/src`、`apps/web/src`、`packages/contracts/src` 与三个 `package.json` 到 `$W/negctl`，运行；再加入 `task-coordinator/zz-negative.ts`（导入 `../../db/index.js` 与 `@anthropic-ai/sdk`）运行；删除后再运行 | 0、1、0 | 副本基线 `ok, 171 files`；加入后 `module task-coordinator may not import "../../db/index.js" (db)` 与 `… "@anthropic-ai/sdk" (package @anthropic-ai/sdk)`，`2 violation(s) across 172 files`；删除后恢复 `ok`。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，两份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 1、0 | 共 174 s。`voxward-s006-routing`（work:685ad243…）：SPEC_STALE，rev 6，previousSourceDigest `831e7e6e…7d15` → sourceDigest `430755e6…ef74d`；`voxward-s009-scheduler`（work:ac2a8c1b…）：SPEC_CURRENT，rev 4，`cdcf67a0…a616`。两份 tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 182 个文件 sha256 不变。 |
| E20 | `apps/server/node_modules/.bin/tsx $W/probes5a/probe-s006.mts <检出> <work>`（第 5a 批 E20 探针原样复跑；对照副本由 `git archive f4808fb`、`git archive fa5dc19` 导出到 work） | 0 | 66 项检查全部符合预期（上一轮 62/66）。第 4 批 B1 对照、半角 ﾊﾞｶ、三种夹格式字符的写法、真值表 96/96、路由器场景、转写表、Q12 全部符合。明细见 §2.0。 |
| E21 | `tsx $W/probes5a/probe-s006-hw.mts <检出> <work>`；`tsx $W/probes5a/hw2.mts <检出> <work>` | 0 ×2 | 第 5a 批 E21 的 10 组输入候选列全部符合期望（上一轮 9 组不符）；扣分规则 カス 对「ｶﾞｽ代が高い」为 PASS/0；转写表 {ガ: ga, カ: ka} 读 ｶﾞｶ 为 gaka 且完整。 |
| E22 | `tsx $W/probe-s006-b5b.mts <检出> <work>`（本轮新写；对照列为 `f4808fb`、`b1a1471` 与候选） | 0 | 185 项检查 0 不符，约 2 s。191 个用例（182 个有期望，9 个只观察）经真实检查器逐条断言路由与原文区间；逐单元副本与整段参照 40 万次比较 0 处不同；3000 条随机嵌入写法区间全对。同一批有期望的用例在 `b1a1471` 上 140 处路由不符，在 `f4808fb` 上 146 处。明细见 §2.0、§2.1。 |
| E23 | `tsx $W/probe-s006-noise.mts <检出> <work>` | 0 | 噪声判定：`ﾊﾞﾊﾟﾊ` 由 NOISE 变为 UNCERTAIN，`ハ゛ハ゛ハ゛` 由 UNCERTAIN 变为 NOISE（与全角 `バババ` 一致）；`www`、`ｗｗｗ`、`草草草`、`８８８`、`😂😂😂`、`ﾊﾊﾊ`、`ﾊﾞﾊﾞﾊﾞ` 仍为 NOISE。 |
| E24 | `tsx $W/probe-s006-design-rows.mts <检出>` | 0 | S006 设计 4.11 例子表中 E22 没有覆盖的两行：归一化 `badword` 对 `ba` + U+FF9E + `dword` 为 BLOCK、区间 [0,8)；归一化 `カ` 对 U+FF9E + `ｶ` 为 BLOCK、区间 [1,2)。 |
| E30 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009.mts <检出> <work>`（本轮新写；自写时钟、事务型事实端口、技术日志接收器与 Crew 替身，不用测试辅助文件） | 0（脚本只统计，不以失败退出） | 94 项检查，90 项符合预期，4 项不符：F1 两项（到期后、扫描前到达的结果把任务转为 DISCARDED）、F2 一项（同频道更早的 BACKGROUND 任务挡住 REALTIME 提交）、F3 一项（Crew 的 cancel 不返回时调度停住）。另有 17 条观察记录。80152 条技术日志条目全部通过审计库 `prepareTechnicalWrite` 的写入校验。约 150 s（大部分是 §8 的 8 万条记录）。明细见 §3.0。 |
| E31 | `tsx $W/probe-s009-extra.mts <检出>` | 0 | Crew 的 cancel 不返回时：第一次 pump、之后的 pump、执行器的 cancelEvent 都不返回；之后入队的 ch-b 任务一直 QUEUED，没有新会话启动；ch-b 到期后再调用 pump，扫描把它转为 PENDING_REVIEW，但这次 pump 同样不返回。结算记录累积时的单次耗时：8 条时 commit 6 µs、sweep 2 µs、takeBatch 50 µs；2 万条时 542、108、723 µs；6 万条时 2433、633、2031 µs。约 98 s。 |
| E32 | `tsx $W/probe-s009-order.mts <检出>` | 0 | 执行器路径的前序超时：后一条先完成并暂存；前一条到期后的一次 pump 先扫描，前一条记 `ERROR/TIMED_OUT/DEADLINE_EXCEEDED` 并转 PENDING_REVIEW，后一条随后提交为 DONE，提交日志的 `data` 为 null，没有 `PREDECESSOR_UNFINISHED`。 |
| E33 | 静态核对：`git diff --name-only/--stat 4c3b94a 5ce5bee`、`git diff --name-only b1a1471 5ce5bee -- <路径>`；`grep -rhoE 'from\s+"[^"]+"'` 列出 task-coordinator 的全部导入 | 0 | 变更范围见文首。task-coordinator 的导入只有 `@voxward/contracts`（4 处）与本模块文件；没有 `require`、动态导入、`node:` 模块、`fetch` 或子进程，只用全局的 `Buffer`、`globalThis.crypto`、`Date`。自 `b1a1471` 起，`apps/server/src/db/`、`docs/data-dictionary.md`、`scoring-engine/`、`moderation-engine/routing/`、`rules/groups.ts`、`rules/engine.ts`、`rules/transliterate.ts`、`moderation-engine/index.ts`、`packages/contracts/` 都没有改动。 |

## 1. 共同检查

<a id="spec"></a>
### 1.1 Spec 状态与设计、代码一致性

- S006 为 SPEC_STALE（rev 6），S009 为 SPEC_CURRENT（rev 4）（E10），与简报预期相同。S006 的 rev 5→6 来自第 5a 批链写；返工分支没有刷新受管段，需要继续使用当前 spec 时按 Q11 用 `refresh --approved-in` 刷新。check 没有改动任何 spec 文件。
- S006 设计 4.11（B3）与代码一致：单元切分把 U+309B、U+309C、U+FF9E、U+FF9F 并入前一单元；`normalizeUnit` 的顺序为删不可见字符（全部 `\p{Cf}` 与默认可忽略的组合标记）、独立浊点转组合浊点、NFKC（或 NFKD → 删附加符号 → NFKC）、小写、删剩余 `\p{M}\p{Cf}`；归一化规则、正则组合副本与转写表读音都调用同一组 `splitUnits` 与 `normalizeUnit`。设计列出的区间规则（命中包含它覆盖的整个单元；命中末字符后的格式字符在区间内，首字符前的不在；零长单元在边界时不计入；按 UTF-16 计）在 E22 §2i 实测成立；例子表 14 行逐行核对：12 行由 E22 的同形用例覆盖（部分带前缀，偏移相应平移），`ba\uFF9Edword` 与 `\uFF9Eｶ` 两行由 E24 单独测，副本与区间都与表中相同。4.8 写明的残余风险（正则 `badword` 不命中 `ba` + U+0301 + `dword`）与第 5a 批相同。4.11「未验证项」写了谚文填充字符未验证，本轮实测见 N4。
- S009 设计与代码大体一致：§1 布局与两张子单的交付清单相同，没有新增源文件；§2 依赖方向（E06、E09、E33）；§4 接口；§5 默认值（8 条、8192 字节、200 ms、1000 ms、50/200/500）与后台余量公式（limit 4 时后台最多 3 个批次）；§6 重试；§7 提交顺序；§9 压力阈值（0.10/2.0、0.25/1.0）与目标并发；§10 测试映射（8 个文件 88 项）；§11「不做的事」（没有数据库版事实端口，没有改注册表与配置模式）都与代码和 E30 一致。不一致或有问题处：
  - §3 写超时转 PENDING_REVIEW，§7 第 3 步写提交时已过截止时间转 DISCARDED；代码两条都实现了，同一个慢请求的终态取决于扫描与结果谁先到（N1）。
  - §8 写「前序任务已过截止时间但仍未结束：门控放行，并在本任务上记录 PREDECESSOR_UNFINISHED」；执行器路径里 pump 先扫描，前序已转 PENDING_REVIEW，门控为 clear，后一条不记录（E32，N3）。
  - §8 的门控按 channelId 跨车道生效，设计与代码一致，但与 VW-R-006 和提案 §6.2、§6.3 不符（B4）。
  - §9 写「pump 不等待会话结束」；Crew 的 cancel 不返回时 pump 一直等这个 cancel（B5）。
  - §5 写「并发降到最小值时后台暂停」，实际只在上限为 1 时暂停，上限为 2 时后台仍可启动（E30 §5，N8）。

<a id="gates"></a>
### 1.2 门禁与启动冒烟

install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.3 外连、真实 CLI 与真实 Crew

全量测试在拦截下通过：对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（E08）。S009 的测试与本轮探针都只用进程内 Crew 替身；本轮没有启动 Kiro Crew 队列，也没有连接本机网关。

<a id="deps"></a>
### 1.4 依赖方向

task-coordinator 只导入 `@voxward/contracts` 与本模块文件，不导入 `db/`，也不导入任何供应商 SDK 或外部包（E33）；check:deps 0 违规（E06）；同一规则在副本中对 db 与供应商 SDK 的导入报违规（E09）。moderation-engine 的导入没有变化。
