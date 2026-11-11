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

## 2. VOXWARD-STORY-006 组（23 行，全部 satisfied）

<a id="s006-summary"></a>
### 2.0 S006 实测摘要（必验项 1）

E20、E21 原样复跑第 5a 批的探针；E22 是本轮新写的探针，用真实检查器（`createModerationChecker`，昵称源固定返回 Viewer，另有昵称用例）对每组输入建一条规则，断言路由与每个命中的原文区间（`范围:字段[起,止)`，UTF-16 偏移）。对照列：`f4808fb` 是 S004 基线，`b1a1471` 是第 5a 批被打回的候选，最后一列为 `5ce5bee`。

**E20、E21　第 5a 批的全部输入**

- E20：66/66 符合（上一轮 62/66）。第 4 批 B1 的对照输入全部保持：归一化 `badword` 对 `ba` + U+0301 + `dword` 与预组合 `bádword` 为 BLOCK；`ばか` 不命中 `はかまいりにいく`，`バカ` 不命中 `ハカセ`；正则 `ばか`、`バカ`、`café` 命中原文，`café` 也命中 `cafe` + U+0301；反向 `はか`/`ばか`、`ハカ`/`バカ`、`ぱん`/`はん` 不互相命中。真值表与流程图 96/96，路由器场景、Q12 提示、转写表 `{が: ga, か: ka}` 全部符合。观察项中只有「归一化 `はか` 对 `は` + U+200B + U+3099 + `か`」由 BLOCK 变为 PASS（B3 反向已修），其余观察（韩文兼容字母、越南语声调与 й/ё 折叠、tatweel）与上一轮相同。
- E21：

| 规则 → 正文 | f4808fb | b1a1471 | 5ce5bee | 期望 |
| --- | --- | --- | --- | --- |
| 归一化 `バカ` → `ﾊﾞｶ` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `ブス` → `ﾌﾞｽ` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `デブ` → `ﾃﾞﾌﾞ` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `ハゲ` → `ﾊｹﾞ` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `ポンコツ` → `ﾎﾟﾝｺﾂ` | PASS | PASS | BLOCK | BLOCK |
| 正则 `バカ` → `ﾊﾞｶ` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `ハカ` → `ﾊﾞｶ` | BLOCK | BLOCK | PASS | PASS |
| 归一化 `バカ` → `ハ゛カ`（U+309B） | PASS | PASS | BLOCK | BLOCK |
| 归一化 `ばか` → `は` + U+200B + U+3099 + `か` | PASS | PASS | BLOCK | BLOCK |
| 归一化 `バカ` → `バカ` | BLOCK | BLOCK | BLOCK | BLOCK |

（E21 原表的第二列是 `fa5dc19`，这里换成 `b1a1471`，取自 E22 的同一输入。）匹配副本：`ﾊﾞｶ`→`バカ`、`ﾌﾞｽ`→`ブス`、`ﾎﾟﾝｺﾂ`→`ポンコツ`、`ハ゛カ`→`バカ`。扣分规则 `カス`（扣 5）：「ガス代が高い」PASS/0，「ｶﾞｽ代が高い」PASS/0（上一轮 REVIEW/5），「カスタード」REVIEW/5（规则本身的真命中）。转写表 `{ガ: ga, カ: ka}`：`ガカ` 与 `ｶﾞｶ` 都读作 gaka，complete=true。

**E22 §1　五个词的半角、独立浊点与格式字符隔开写法（区间都只覆盖该词）**

每个词 15 种写法：半角（归一化、正则）、独立浊点 U+309B/U+309C（归一化）、组合浊点前夹 U+200B、U+2060、U+00AD、U+FEFF、U+200D（归一化）、半角浊点前夹同样五种格式字符（归一化）、组合浊点前夹 U+200B 与半角浊点前夹 U+2060（正则）。正文为 `x ` + 写法 + ` y`。

| 词 | 写法数 | 5ce5bee | 区间示例 | b1a1471 |
| --- | --- | --- | --- | --- |
| バカ | 15 | 全部 BLOCK | `ﾊﾞｶ` [2,5)；`ハ` + U+2060 + U+3099 + `カ` [2,6) | 全部 PASS |
| ブス | 15 | 全部 BLOCK | `ﾌﾞｽ` [2,5)；`ﾌ` + U+00AD + `ﾞｽ` [2,6) | 全部 PASS |
| デブ | 15 | 全部 BLOCK | `ﾃﾞﾌﾞ` [2,6)；两处浊点各夹 U+FEFF [2,8) | 全部 PASS |
| ハゲ | 15 | 全部 BLOCK | `ﾊｹﾞ` [2,5)；`ハケ` + U+200D + U+3099 [2,6) | 全部 PASS |
| ポンコツ | 15 | 全部 BLOCK | `ﾎﾟﾝｺﾂ` [2,7)；`ホ` + U+200B + U+309A + `ンコツ` [2,8) | 全部 PASS |

反向（误伤）：无浊点的规则 `ハカ`、`フス`、`テフ`、`ハケ`、`ホンコツ` 对各词的半角、独立浊点、夹 U+200B 的组合浊点、夹 U+00AD 的半角浊点四种写法共 20 项全部 PASS；`b1a1471` 上其中 16 项为 BLOCK（独立浊点写法只有 `ハケ゛` 误伤：浊点在词尾，上一轮副本为 `ハケ ` 仍含 `ハケ`）。另有 `ハカ`/`ﾊﾞｶ`、扣分 `カス`/`ｶﾞｽ代が高い` 与 `ｶ` + U+200B + U+3099 + `ス代` 均 PASS/0。

**E22 §1b　第 4 批 B1 的 15 个对照输入（带区间）**

全部符合，区间与 `b1a1471` 相同：如归一化 `badword` 对 `ba` + U+0301 + `dword` 为 [0,8)、对 `bádword` 为 [0,7)；正则 `café` 对 `cafe` + U+0301 为 [0,5)；归一化与正则 `ばか` 对 `は` + U+3099 + `か` 为 [0,3)；五个反向输入 PASS。

**E22 §2　新组合（简报要求至少 5 种，本轮 12 类、69 个用例，其中 1 个只观察）**

| 组合 | 代表输入（规则 → 正文） | 5ce5bee | b1a1471 |
| --- | --- | --- | --- |
| 全角半角混排 | 归一化 `バカ` → `ﾊﾞカ`；`ポンコツ` → `ﾎﾟﾝコツ`；`ばか` → `は` + `ﾞ` + `か`；正则 `デブ` → `ﾃﾞブ` | 全部 BLOCK，区间只含该词 | PASS |
| 全角半角混排（不误伤） | 归一化 `バカ` → `ﾊｶｾ` | PASS | PASS |
| 半浊点 ﾊﾟ | 归一化与正则 `パン` → `ﾊﾟﾝ`；`パン` → `ハ゜ン`、`ﾊ` + U+200B + `ﾟﾝ` | BLOCK | PASS |
| 半浊点（不误伤） | `ハン`、`バン` → `ﾊﾟﾝ`；`パン` → `ﾊﾞﾝ` | PASS | `ハン` 为 BLOCK |
| 多个格式字符连写 | `ﾊ` + U+200B U+2060 U+FEFF U+00AD + `ﾞｶ`；`は` + U+200B U+200D U+2060 + U+3099 + `か`；`ﾊﾞ` + U+200B U+200B + `ｶ`；正则 `ﾊ` + U+2060 U+2060 + `ﾞｶ`；`は` + U+202E + U+3099 + `か` | BLOCK，区间 [2,9)、[2,8)、[2,7)、[2,7)、[2,6) | PASS |
| 组合标记加变体选择符 | `は` + U+FE0F + U+3099 + `か`；`は` + U+3099 + U+FE0F + `か`；`は` + U+034F（CGJ）+ U+3099 + `か`；`ﾊ` + U+FE0E + `ﾞｶ`；正则 `は` + U+E0100 + U+3099 + `か`；`ba` + U+0301 + U+FE0F + `dword`；正则 `café` → `cafe` + U+FE0F/U+034F + U+0301 | 全部 BLOCK；U+E0100 占两个单位，区间 [2,7) | 8 项中 5 项 PASS |
| 拉丁重音加零宽字符 | 正则 `café` → `cafe` + U+200B + U+0301；正则 `naïve` → `nai` + U+2060 + U+0308 + `ve`；归一化 `badword` → `b` + U+200B + `ádword` | BLOCK | 正则两项 PASS |
| 拉丁（不误伤） | 正则 `café` → `cafe` + U+200B、`cafe` + U+200B + U+0300 | PASS | PASS |
| 韩文 | 归一化 `바보` → `ᄇ` + U+200B + `ᅡ보`；正则 `바보` → `ᄇ` + U+2060 + `ᅡ보`（分解字母）；`밥` → `바` + U+200B + `ᆸ`；`바보` → `바` + U+00AD + `보` | BLOCK | 前三项 PASS |
| 韩文（不误伤） | `바보` → `파` + U+200B + `보`、`바` + U+200B + `부` | PASS | PASS |
| 越南语 | 正则 `tiếng` → `tie` + U+200B + U+0302 + U+0301 + `ng`、`tiê` + U+2060 + U+0301 + `ng`；归一化 `tieng` → `tiếng` | BLOCK | 正则两项 PASS |
| 越南语（不误伤） | 正则 `tiếng` → `tiềng`；正则 `má` → `ma` | PASS | PASS |
| 其它日文写法 | `ヴ` → `ｳﾞ`、`ウ゛`；`バーカ` → `ﾊﾞｰｶ`；`ばか` → `は` + U+200B + `゛` + `か`；反向 `ウ` → `ｳﾞ`、`はか` → `は` + U+2060 + U+3099 + `か`、`ハカ` → `ハ` + U+200B + U+3099 + `カ`、`ばか` → `はか` | 前四项 BLOCK，后四项 PASS | 前四项 PASS，反向三项 BLOCK |
| 偏移 | `😀ﾊﾞｶ ﾊﾞｶ` 两处 [2,5)、[6,9)；`ﾊﾞｶ` + U+200B + `x` [0,4)；`あ` + U+200B + `ﾊﾞｶ` [2,5)；U+200B + `ﾊﾞｶ` [1,4)；精确规则 `ﾊﾞｶ` 命中原文 [1,4)，精确 `バカ` 不命中 `ﾊﾞｶ` | 符合 | 归一化四项 PASS |
| 昵称与正文 | 昵称 `ﾊﾞ` + 正文 `ｶ`：组合范围 `nickname[0,2)+body[0,1)`；昵称 `ﾊﾞｶ`：昵称范围 [0,3) | BLOCK | PASS |
| 读音 | 表 {ガ, カ, パ, ハ}：读音规则 `gaka` → `ｶﾞｶ` [0,3)、`ｶ` + U+200B + U+3099 + `カ` [0,4)；`paha` → `ﾊﾟﾊ`；`kaka` → `ｶﾞｶ` 不命中 | REVIEW 三项，PASS 一项 | 反过来 |
| 关闭 stripCombiningMarks | `バカ` → `ﾊﾞｶ`；`ばか` → `は` + U+200B + U+3099 + `か` | BLOCK | PASS |

**E22 §4、§5　逐单元与整段一致，随机区间**

- 字母表含全角与半角假名、三种写法的浊点与半浊点（组合 U+3099/U+309A、独立 U+309B/U+309C、半角 U+FF9E/U+FF9F）、U+200B/U+200C/U+200D/U+2060/U+FEFF/U+00AD/U+202E/U+2066、U+FE0F/U+FE0E/U+E0100、U+034F、拉丁字母与 U+0300/U+0301/U+0302/U+0308/U+0323、预组合 é/ế、谚文分解字母与音节、汉字、空格、emoji、ﬁ、㋕、U+20DD。20 万个 1–8 字符的随机串，两种 `stripCombiningMarks` 选项，候选 `normalizeText` 与参照（先删 `\p{Cf}` 与默认可忽略标记、独立浊点转组合浊点、再整段归一化）40 万次比较 0 处不同。字母表不含韩文兼容字母（第 5a 批 N11，整段 NFKC 会把它们组成音节，逐单元不会，行为与以前相同）。
- 3000 条随机正文，把 7 种 `バカ` 写法之一嵌在 `x`、`y`、`z`、空格、数字、U+200B、😀、é、U+0301 组成的随机前后缀之间：路由全部 BLOCK，命中区间全部恰好是该写法所在的 [起,止)。

**E22 §3　观察：谚文填充字符（不属 B3 同类）**

| 规则 → 正文 | f4808fb | b1a1471 | 5ce5bee |
| --- | --- | --- | --- |
| 归一化 `badword` → `bad` + U+3164 / U+FFA0 / U+115F / U+1160 + `word` | PASS | PASS | PASS |
| 归一化 `バカ` → `ﾊﾞ` + 同上四种之一 + `ｶ` | PASS | PASS | PASS |

这四个码点是 `\p{Default_Ignorable_Code_Point}` 中的字母（`\p{Lo}`），不是 `\p{Cf}` 也不是 `\p{M}`，不在删除范围内；NFKC 把 U+3164、U+FFA0 变成 U+1160，仍留在副本里。三个版本相同，见 judgment N4。

**E23、E24**

- 噪声判定（`routing/classification.ts` 也调用 `normalizeText`）：`ﾊﾞﾊﾟﾊ` 是三个不同的假名，由 NOISE 改为 UNCERTAIN；`ハ゛ハ゛ハ゛` 读作 `バババ`，改为 NOISE，与全角写法一致；`www`、`ｗｗｗ`、`草草草`、`８８８`、`😂😂😂`、`ﾊﾊﾊ`、`ﾊﾞﾊﾞﾊﾞ` 仍为 NOISE（E23）。
- 设计 4.11 例子表的 `ba\uFF9Edword` 与 `\uFF9Eｶ` 两行：BLOCK [0,8)、BLOCK [1,2)（E24）。

<a id="b3-recheck"></a>
### 2.1 B3 复验结论

- 第 5a 批 B3 的全部复验要求在 `5ce5bee` 上成立：半角与格式字符隔开的写法对 バカ、ブス、デブ、ハゲ、ポンコツ 判为 BLOCK；ハカ 不命中 ﾊﾞｶ；カス 不命中 ｶﾞｽ；ｶﾞｶ 读作 gaka；B1 的对照输入保持通过；每个命中的原文区间都落在该写法上（E20、E21、E22、E24）。
- 第 3 轮的同类缺陷检查：逐单元副本与整段参照在随机语料上 0 处不同，三种写法的浊点与半浊点、格式字符、变体选择符、CGJ、bidi 控制符与谚文分解字母、拉丁组合标记的组合都不再丢标记或误合并（E22 §2、§4）。没有发现 B3 同类缺陷（日文浊点在 NFKC 等价写法下丢失），不需要改成整段 NFKC 再映射回原文。逐单元与整段 NFKC 仍有一处已知差异：韩文兼容字母（`ㅂㅏㅂㅗ`）逐个成单元，整段 NFKC 会把兼容元音并到前一个辅音上组成音节。它与 B3 的机制相同，但各版本行为一致，第 5a 批已记为 N11，S006 设计 4.11 写明不在本修法内；兼容字母逐个显示，与 `바보` 外观不同，也不是评估语种。若以后要覆盖，在 `splitUnits` 里把兼容元音并入前一单元即可，同样不需要整段 NFKC。谚文填充字符与单元边界无关，整段 NFKC 同样保留（N4）。
- 修复范围：只有 `rules/normalize.ts` 的 `ATTACHES_TO_PREVIOUS`、`INVISIBLE`、`SPACING_SOUND_MARK` 与 `normalizeUnit` 的处理顺序；`engine.ts`、`groups.ts`、`transliterate.ts`、`span-map.ts` 未改（E33）。实施者先在未修代码上跑新测试，自报 249 项失败（`95b7997` 提交说明）；本轮独立复现：E22 的 182 个有期望用例在 `b1a1471` 上 140 处路由不符。

### 2.2 VOXWARD-STORY-006 本单行

<a id="vw-s006-ac001"></a>
**VW-S006-AC001@1：satisfied**（machine；要求 work:685ad243ec946eb7f628c93e#VW-S006-R001@1）

- expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。
- 依据：候选 5ce5bee 检出：install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。相对上一候选 b1a1471，路由、真值表、例外队列、处理状态与计分代码没有改动，本轮只改了 rules/normalize.ts（E33）。原样复跑第 5a 批 E20 探针（66/66）：真值表 96 种组合（基础 PASS/REVIEW/BLOCK × 例外 × 付费 × 白名单 × 噪声 × 达到阈值）与按提案 §4.2 流程图建立的期望 96/96 一致；快速放行从不出现在例外、付费或基础未通过的组合；评分达阈值者标 UNSETTLED_FAST_PASS，白名单与噪声标 NONE。路由器接真实基础检查与真实计分引擎：例外消息在基础检查之前已登记；例外加基础 BLOCK 直接终结，队列项 BASE_BLOCK，计分 REFUSED；例外加噪声、白名单、分数 99 仍为 REVIEW；例外加付费为 REALTIME_REVIEW，模型完成后下游 ALLOW、计分 REFUSED、账本 0 行；普通付费文本在白名单、分数 99 时仍进入 PAID_TEXT_REVIEW；噪声、白名单、高分三种快速放行下发 ALLOW 且账本调用 0 次，分数 9 进入审核；系统失败不产生裁决、不计分，可 RETRY 与 ESCALATE；人工接管后模型完成被拒（PROCESSING_TRANSITION_INVALID），人工 BLOCK 记 −5；丢弃以 DISCARDED 结算队列项（E20 §3–4；router.test 15 项、states.test 19 项、exception-queue.test 6 项、truth-table.test 106 项）。噪声判定改读带浊点的副本：ﾊﾞﾊﾟﾊ 不再被当成 ハハハ 判为 NOISE，ｗｗｗ、草草草、８８８、😂😂😂 仍为 NOISE（E23）。下游只有 ALLOW 或 BLOCK，未决项 downstream 为 null。expected 各部分在 5ce5bee 上成立。

<a id="vw-s006-parent"></a>
**VW-S006-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R006@1）

- expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。
- 依据：复用 VW-S006-AC001 在 5ce5bee 上的同次执行（E02–E08、E20、E23）。例外每条登记、基础拒绝可终结、其余进入 AI/人工、快速放行不预先加分、下游只有 ALLOW/BLOCK 均成立；例外 ∧ 付费 的分支顺序与提案 §4 流程图一致（96/96）。S006 的贡献是统一路由真值表、例外队列、处理状态与 Q22 计分接线，本轮未改。

### 2.3 VOXWARD-SUB-012 本单行

<a id="vw-sub012-ac001"></a>
**VW-SUB012-AC001@1：satisfied**（machine；要求 work:a52cf35dff7b3e04ede8e970#VW-SUB012-R001@1）

- expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。
- 依据：候选 5ce5bee 检出：install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。相对上一候选 b1a1471，路由、真值表、例外队列、处理状态与计分代码没有改动，本轮只改了 rules/normalize.ts（E33）。原样复跑第 5a 批 E20 探针（66/66）：真值表 96 种组合（基础 PASS/REVIEW/BLOCK × 例外 × 付费 × 白名单 × 噪声 × 达到阈值）与按提案 §4.2 流程图建立的期望 96/96 一致；快速放行从不出现在例外、付费或基础未通过的组合；评分达阈值者标 UNSETTLED_FAST_PASS，白名单与噪声标 NONE。路由器接真实基础检查与真实计分引擎：例外消息在基础检查之前已登记；例外加基础 BLOCK 直接终结，队列项 BASE_BLOCK，计分 REFUSED；例外加噪声、白名单、分数 99 仍为 REVIEW；例外加付费为 REALTIME_REVIEW，模型完成后下游 ALLOW、计分 REFUSED、账本 0 行；普通付费文本在白名单、分数 99 时仍进入 PAID_TEXT_REVIEW；噪声、白名单、高分三种快速放行下发 ALLOW 且账本调用 0 次，分数 9 进入审核；系统失败不产生裁决、不计分，可 RETRY 与 ESCALATE；人工接管后模型完成被拒（PROCESSING_TRANSITION_INVALID），人工 BLOCK 记 −5；丢弃以 DISCARDED 结算队列项（E20 §3–4；router.test 15 项、states.test 19 项、exception-queue.test 6 项、truth-table.test 106 项）。噪声判定改读带浊点的副本：ﾊﾞﾊﾟﾊ 不再被当成 ハハハ 判为 NOISE，ｗｗｗ、草草草、８８８、😂😂😂 仍为 NOISE（E23）。下游只有 ALLOW 或 BLOCK，未决项 downstream 为 null。SUB-012 是 STORY-006 唯一的子单，承担全部交付。expected 各部分在 5ce5bee 上成立。

<a id="vw-sub012-story"></a>
**VW-SUB012-STORY@1：satisfied**（machine；要求 work:685ad243ec946eb7f628c93e#VW-S006-R001@1）

- expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 本单只证明所承担部分；VOXWARD-STORY-006 的完整判据（VW-S006-AC001@1）保持。
- 依据：复用 VW-SUB012-AC001 的同次执行（E02–E08、E20–E24）。SUB-012 承担的名单与例外队列登记、付费文本审核不可跳过、meaningful/noise 内部分类、UNSETTLED_FAST_PASS、系统失败与人工接管状态都成立；本轮修改的匹配副本归一化（B3）复验通过。本行只证明 SUB-012 承担的部分；VOXWARD-STORY-006 的完整判据 VW-S006-AC001 另行判定为 satisfied。

<a id="vw-sub012-parent"></a>
**VW-SUB012-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R006@1）

- expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。
- 依据：复用 VW-S006-AC001 在 5ce5bee 上的同次执行（E02–E08、E20、E23）。例外每条登记、基础拒绝可终结、其余进入 AI/人工、快速放行不预先加分、下游只有 ALLOW/BLOCK 均成立；例外 ∧ 付费 的分支顺序与提案 §4 流程图一致（96/96）。S006 的贡献是统一路由真值表、例外队列、处理状态与 Q22 计分接线，本轮未改。SUB-012 是 STORY-006 唯一的子单，承担全部交付。

### 2.4 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s006-inherit-001"></a>
**VW-S006-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 5ce5bee 审查：b1a1471..5ce5bee 中 S006 返工只改 moderation-engine/rules/normalize.ts 与测试；没有改 package.json、锁文件、check-deps 分区或契约（E33），模块只导入 @voxward/contracts 与本模块文件（check:deps 171 个文件 0 违规，E06）；CONTRACT_VERSION 仍为 1。归一化只用 String.prototype.normalize 与 Unicode 属性正则，不调用外部服务或语言库。HTTPS/WSS 远端部署本单未触及。

<a id="vw-sub012-inherit-001"></a>
**VW-SUB012-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 5ce5bee 审查：b1a1471..5ce5bee 中 S006 返工只改 moderation-engine/rules/normalize.ts 与测试；没有改 package.json、锁文件、check-deps 分区或契约（E33），模块只导入 @voxward/contracts 与本模块文件（check:deps 171 个文件 0 违规，E06）；CONTRACT_VERSION 仍为 1。归一化只用 String.prototype.normalize 与 Unicode 属性正则，不调用外部服务或语言库。HTTPS/WSS 远端部署本单未触及。

#### VW-R-003@1（INHERIT-003）

expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s006-inherit-003"></a>
**VW-S006-INHERIT-003@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：路由部分成立，同 VW-S006-AC001（E20）。B3 复验：第 5a 批 E20 与 E21 的全部输入在 5ce5bee 上符合期望（E20 66/66，E21 10/10）：归一化规则 バカ、ブス、デブ、ハゲ、ポンコツ 对半角 ﾊﾞｶ、ﾌﾞｽ、ﾃﾞﾌﾞ、ﾊｹﾞ、ﾎﾟﾝｺﾂ 为 BLOCK，正则 バカ 对 ﾊﾞｶ 为 BLOCK，归一化 バカ 对 ハ゛カ 为 BLOCK，归一化 ばか 对 U+200B、U+2060、U+00AD 夹在假名与浊点之间的写法为 BLOCK；ハカ 不命中 ﾊﾞｶ；扣分规则 カス 对「ｶﾞｽ代が高い」为 PASS、不扣分；转写表 {ガ: ga, カ: ka} 把 ｶﾞｶ 读作 gaka 且标为完整。E22 用真实检查器逐条断言路由与原文区间（185 项，0 不符）：五个词各 15 种写法（半角、独立浊点、组合浊点或半角浊点前夹 U+200B、U+2060、U+00AD、U+FEFF、U+200D，归一化与正则）全部 BLOCK，区间只覆盖该词；对应的无浊点规则（ハカ、フス、テフ、ハケ、ホンコツ）对这些写法全部 PASS；第 4 批 B1 的 15 个对照输入路由与区间不变；新组合 12 类 69 例（全角半角混排、ﾊﾟ 与 ハ゜、多个格式字符连写与 bidi 控制符、组合标记加变体选择符 U+FE0F/U+FE0E/U+E0100 与 CGJ、拉丁重音加零宽字符、被格式字符隔开的韩文字母、越南语叠加声调、ヴ 与长音符、补充平面偏移与重复命中、昵称与正文组合范围、读音 ｶﾞｶ 与 ﾊﾟﾊ、关闭 stripCombiningMarks）既没有漏拦也没有误伤。逐单元副本与整段归一化参照在 20 万个随机串、两种选项下 40 万次比较 0 处不同；3000 条随机嵌入写法的命中区间全部恰好落在该写法上；设计 4.11 例子表 14 行全部复现（E22、E24）。同一批有期望的用例在 b1a1471 上 140 处路由不符，说明这些用例能检出 B3。剩余观察：谚文填充字符 U+3164、U+FFA0、U+115F、U+1160 夹在字母之间时三个版本都不命中（judgment N4，不属 B3 同类）。expected 与 VW-R-003 的原始要求在 5ce5bee 上成立。B3 的修改在提交 95b7997（VOXWARD-SUB-012）。

<a id="vw-sub012-inherit-003"></a>
**VW-SUB012-INHERIT-003@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：路由部分成立，同 VW-S006-AC001（E20）。B3 复验：第 5a 批 E20 与 E21 的全部输入在 5ce5bee 上符合期望（E20 66/66，E21 10/10）：归一化规则 バカ、ブス、デブ、ハゲ、ポンコツ 对半角 ﾊﾞｶ、ﾌﾞｽ、ﾃﾞﾌﾞ、ﾊｹﾞ、ﾎﾟﾝｺﾂ 为 BLOCK，正则 バカ 对 ﾊﾞｶ 为 BLOCK，归一化 バカ 对 ハ゛カ 为 BLOCK，归一化 ばか 对 U+200B、U+2060、U+00AD 夹在假名与浊点之间的写法为 BLOCK；ハカ 不命中 ﾊﾞｶ；扣分规则 カス 对「ｶﾞｽ代が高い」为 PASS、不扣分；转写表 {ガ: ga, カ: ka} 把 ｶﾞｶ 读作 gaka 且标为完整。E22 用真实检查器逐条断言路由与原文区间（185 项，0 不符）：五个词各 15 种写法（半角、独立浊点、组合浊点或半角浊点前夹 U+200B、U+2060、U+00AD、U+FEFF、U+200D，归一化与正则）全部 BLOCK，区间只覆盖该词；对应的无浊点规则（ハカ、フス、テフ、ハケ、ホンコツ）对这些写法全部 PASS；第 4 批 B1 的 15 个对照输入路由与区间不变；新组合 12 类 69 例（全角半角混排、ﾊﾟ 与 ハ゜、多个格式字符连写与 bidi 控制符、组合标记加变体选择符 U+FE0F/U+FE0E/U+E0100 与 CGJ、拉丁重音加零宽字符、被格式字符隔开的韩文字母、越南语叠加声调、ヴ 与长音符、补充平面偏移与重复命中、昵称与正文组合范围、读音 ｶﾞｶ 与 ﾊﾟﾊ、关闭 stripCombiningMarks）既没有漏拦也没有误伤。逐单元副本与整段归一化参照在 20 万个随机串、两种选项下 40 万次比较 0 处不同；3000 条随机嵌入写法的命中区间全部恰好落在该写法上；设计 4.11 例子表 14 行全部复现（E22、E24）。同一批有期望的用例在 b1a1471 上 140 处路由不符，说明这些用例能检出 B3。剩余观察：谚文填充字符 U+3164、U+FFA0、U+115F、U+1160 夹在字母之间时三个版本都不命中（judgment N4，不属 B3 同类）。expected 与 VW-R-003 的原始要求在 5ce5bee 上成立。B3 的修改在提交 95b7997（VOXWARD-SUB-012）。

#### VW-R-004@1（INHERIT-004）

expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s006-inherit-004"></a>
**VW-S006-INHERIT-004@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：VW-R-004 中本单触及的部分成立（E20 §4；scoring-engine 自 b1a1471 未改，E33）：Q22 让 BLOCK 携带命中的扣分组，两组扣分 9 与 2、违规分 5 时记 −9；人工完成的 BLOCK 记 −5；noise 与三种快速放行不调用计分；系统失败不计分。第 5a 批记下的误扣已消失：扣分规则 カス 对半角「ｶﾞｽ代が高い」与「ｶ + U+200B + U+3099 + ス代」为 PASS、扣分 0，「カスタード」仍按规则命中并扣 5（E21、E22 §1r）。

<a id="vw-sub012-inherit-004"></a>
**VW-SUB012-INHERIT-004@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：VW-R-004 中本单触及的部分成立（E20 §4；scoring-engine 自 b1a1471 未改，E33）：Q22 让 BLOCK 携带命中的扣分组，两组扣分 9 与 2、违规分 5 时记 −9；人工完成的 BLOCK 记 −5；noise 与三种快速放行不调用计分；系统失败不计分。第 5a 批记下的误扣已消失：扣分规则 カス 对半角「ｶﾞｽ代が高い」与「ｶ + U+200B + U+3099 + ス代」为 PASS、扣分 0，「カスタード」仍按规则命中并扣 5（E21、E22 §1r）。

#### VW-R-005@1（INHERIT-005）

expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s006-inherit-005"></a>
**VW-S006-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：VW-R-005 中本单触及的部分成立：UNSETTLED_FAST_PASS 只标在评分达阈值的普通消息上，白名单与噪声短路不标；例外主体从不快速放行，不会成为复盘对象（E20 §3–4）。Q8：持久表 subject_nickname_checks 不存在；apps/server/src/db 与数据字典自 b1a1471 未改（E33），第 5a 批迁移实测 E60 的结论仍适用；昵称检查保留 S004 的进程内缓存。复盘结算、跨条别名与候选词确认本单未触及，由 STORY-011 承接。

<a id="vw-sub012-inherit-005"></a>
**VW-SUB012-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：VW-R-005 中本单触及的部分成立：UNSETTLED_FAST_PASS 只标在评分达阈值的普通消息上，白名单与噪声短路不标；例外主体从不快速放行，不会成为复盘对象（E20 §3–4）。Q8：持久表 subject_nickname_checks 不存在；apps/server/src/db 与数据字典自 b1a1471 未改（E33），第 5a 批迁移实测 E60 的结论仍适用；昵称检查保留 S004 的进程内缓存。复盘结算、跨条别名与候选词确认本单未触及，由 STORY-011 承接。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s006-inherit-009"></a>
**VW-S006-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：路由与基础检查不构造 AI 输入，不保存会话、提示或工具轨迹；例外队列项只含（channelId, platformMessageId）键、correlationId 与结算结果，不含正文（routing/ 自 b1a1471 未改，E33）。本轮的归一化改动只在内存中生成匹配副本，不写库、不写日志。AI 输入与会话清理本单未触及，由 STORY-008 承接。

<a id="vw-sub012-inherit-009"></a>
**VW-SUB012-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：路由与基础检查不构造 AI 输入，不保存会话、提示或工具轨迹；例外队列项只含（channelId, platformMessageId）键、correlationId 与结算结果，不含正文（routing/ 自 b1a1471 未改，E33）。本轮的归一化改动只在内存中生成匹配副本，不写库、不写日志。AI 输入与会话清理本单未触及，由 STORY-008 承接。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s006-inherit-011"></a>
**VW-S006-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：路由不读写数据库，处理状态经 toStoredTaskStatus 映射到 tasks.status 现有取值；例外队列不复制正文；Q8 删除持久昵称检查表（db/ 自 b1a1471 未改，第 5a 批 E60 的空库与各前驱状态升级结论仍适用）。短事务提交、verdicts 与 deliveries 写入本单未触及，由 STORY-014 承接。

<a id="vw-sub012-inherit-011"></a>
**VW-SUB012-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：路由不读写数据库，处理状态经 toStoredTaskStatus 映射到 tasks.status 现有取值；例外队列不复制正文；Q8 删除持久昵称检查表（db/ 自 b1a1471 未改，第 5a 批 E60 的空库与各前驱状态升级结论仍适用）。短事务提交、verdicts 与 deliveries 写入本单未触及，由 STORY-014 承接。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s006-inherit-012"></a>
**VW-S006-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：路由只消费调用方给出的事实，不暴露接口、页面或运行权限，不把待审正文交给任何工具；频道范围取自事件本身。Q12 的准入错误为 RULE_SET_INVALID: REGEX_GROUP_ALTERNATION 加固定提示，不回显模式原文（E20 §4）。鉴权与输出凭据本单未触及（STORY-003 已验收）。

<a id="vw-sub012-inherit-012"></a>
**VW-SUB012-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：路由只消费调用方给出的事实，不暴露接口、页面或运行权限，不把待审正文交给任何工具；频道范围取自事件本身。Q12 的准入错误为 RULE_SET_INVALID: REGEX_GROUP_ALTERNATION 加固定提示，不回显模式原文（E20 §4）。鉴权与输出凭据本单未触及（STORY-003 已验收）。

#### VW-R-014@1（INHERIT-014）

expected：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s006-inherit-014"></a>
**VW-S006-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：VW-R-014 中本单触及的部分成立：例外消息在任何短路之前登记；基础明确拒绝可直接结束；其余进入 REVIEW，例外 ∧ 付费按流程图走 REALTIME_REVIEW；白名单、噪声、高分对例外一律无效（96 组合与路由实测，E20 §3–4）；实时 BLOCK 与模型完成的计分都被例外守卫拒绝（REFUSED）。身份、复盘与人工调分的守卫属 STORY-005（已验收），恢复计分本单未触及。

<a id="vw-sub012-inherit-014"></a>
**VW-SUB012-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：VW-R-014 中本单触及的部分成立：例外消息在任何短路之前登记；基础明确拒绝可直接结束；其余进入 REVIEW，例外 ∧ 付费按流程图走 REALTIME_REVIEW；白名单、噪声、高分对例外一律无效（96 组合与路由实测，E20 §3–4）；实时 BLOCK 与模型完成的计分都被例外守卫拒绝（REFUSED）。身份、复盘与人工调分的守卫属 STORY-005（已验收），恢复计分本单未触及。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s006-inherit-017"></a>
**VW-S006-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查与实测：DISCARD 用于过期代次或已删除，非终态可转 DISCARDED，不产生裁决，例外队列项以 DISCARDED 结算；系统失败有 RETRY 与 ESCALATE 两个去向；终态拒绝后续步骤（E20 §4；states.test 19 项）。例外队列只有进程内实现，重启后丢失，S006 设计 §9 已列为缺口。删除编排、到期与恢复本单未触及，由 STORY-019、STORY-020 承接。

<a id="vw-sub012-inherit-017"></a>
**VW-SUB012-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查与实测：DISCARD 用于过期代次或已删除，非终态可转 DISCARDED，不产生裁决，例外队列项以 DISCARDED 结算；系统失败有 RETRY 与 ESCALATE 两个去向；终态拒绝后续步骤（E20 §4；states.test 19 项）。例外队列只有进程内实现，重启后丢失，S006 设计 §9 已列为缺口。删除编排、到期与恢复本单未触及，由 STORY-019、STORY-020 承接。

## 3. VOXWARD-STORY-009 组（35 行：17 行 satisfied，18 行 failed）

<a id="s009-summary"></a>
### 3.0 S009 实测摘要（必验项 2）

E30 不用实施者的测试辅助文件，自写了时钟、事务型事实端口（`commitIfCurrent` 在一个同步调用里比对已删除、代次、版本、已结算，再执行 `apply`；裁决写入器检查自己是否在事务内）、技术日志接收器（每条条目都交给审计库的 `prepareTechnicalWrite` 校验）与 Crew 替身（记录每次启动时已打开的会话数和当时读到的并发上限，可让 start、done、cancel 拒绝或永不返回）。除注明者外 `maxBatchWaitMs` 设为 0。

**有界队列：队列满了怎么处理**

- 车道上限 PAID 2、REALTIME 3、BACKGROUND 2 时，同一车道入队 10 条：3 条 QUEUED，7 条 PENDING_REVIEW、原因 QUEUE_FULL，每条记一条 `INGEST/FAILED/ERROR/QUEUE_FULL` 技术日志；REALTIME 满了不影响 PAID 入队；同一事件再入队返回原任务。默认上限下 REALTIME 入队 205 条，排队 200 条。取走 8 条后全部按限流退回，排队数仍为 200，之后再到 3 条也不超过 200。单条 9000 字节（3000 个「あ」）的正文转 PENDING_REVIEW、原因 INPUT_TOO_LARGE。上述路径 `apply` 0 次（E30 §1）。
- 过载即转人工，不静默丢弃、不放行；被拒的任务有记录、可以查询状态与原因。

**截止时间：到期就停止等待，并记录未完成的原因**

- 没有空槽时排队的任务到期：`takeBatch` 先扫描，任务转 PENDING_REVIEW、原因 DEADLINE_EXCEEDED，日志 `ERROR/TIMED_OUT/WARN`，`data` 为 `{reason: DEADLINE_EXCEEDED}`。运行中的任务到期后扫描同样转人工；之后到达的结果被丢弃，状态仍为 PENDING_REVIEW，不写裁决。入队时截止时间已过直接转人工；截止时间无法解析时拒绝入队并只报字段名。微批在等待满 `maxBatchWaitMs` 或距截止时间不足 `deadlineMarginMs` 时取批（E30 §2）。
- 执行器路径：会话在截止时间之后仍未结束，下一次 pump 扫描使任务转人工并取消该会话，槽位释放后下一批可以启动；start 不返回时同样在截止时间释放槽位（E30 §7）。
- 不一致（N1）：运行中的任务到期后、下一次扫描之前结果先到，`commitResult` 把任务转为 **DISCARDED**（原因 DEADLINE_EXCEEDED），不进人工队列。直接调用与经执行器（会话在截止时间后 500 ms 完成，其间没有 pump）都复现（E30 §2、§7）。实施者的 `acceptance.test.ts` 把这一结果写成了断言（slow request 第一例与 predecessor timeout）。
- 前序等待只到前序的截止时间，之后提交并在后一条记 `PREDECESSOR_UNFINISHED:<taskId>`（直接调用，E30 §5）；经执行器时 pump 先扫描，前序先转人工、记自己的 TIMED_OUT，后一条提交时不记这条说明（E32，N3）。

**有限重试**

- RATE_LIMITED：第 1、2 次失败后分别退避 1000 ms、2000 ms，`notBefore` 之前取不到该任务；第 3 次失败后 RETRY_EXHAUSTED 转人工，派工次数 1、2、3。退避会越过截止时间时不重试，转人工 DEADLINE_EXCEEDED；不可重试的 INVALID_OUTPUT 直接转人工；格式不合法的错误码拒绝；退避期间取消后不再派工，迟到的失败报告被忽略（原因 CANCELLED）（E30 §3）。Crew 报 RATE_LIMITED 时任务回到 QUEUED（E30 §7）。

**结果提交：事务确认、晚到与过期代次的结果、人工裁决**

- 正常提交写一次，且在事务内；重复提交 ALREADY_SETTLED，不再写；证据只随成功的提交写入技术日志（E30 §4）。
- 运行中数据被删除（DATA_DELETED）、处理代次变化（GENERATION_CHANGED）、房管在运行中作出人工裁决使事件版本前进（VERSION_SUPERSEDED）、另一写入方已结算（ALREADY_SETTLED）：四种情况都返回 discarded，事务内 0 次写入，人工裁决原样保留，任务 DISCARDED，技术日志无证据（E30 §4）。
- 取消后的结果 CANCELLED；事务异常转人工 COMMIT_FAILED；重启后的新协调器对旧任务的结果返回 UNKNOWN_TASK，不写入（E30 §4、§7）。
- 80152 条技术日志条目全部通过审计库 `prepareTechnicalWrite` 的校验（E30）。真实数据库版事实端口不在本包（设计 §11），事务原子性只在替身上验证。

**动态并发：上下限与按资源信号收缩**

- `createDynamicConcurrency({min: 1, max: 4})`：NORMAL、TIGHT（空闲内存 0.2 或每核负载 1.0）、CRITICAL（0.05 或 2.5）、不可用读数（NaN、比例 1.5、负载 −1）、恢复 NORMAL，依次为 4、2、2、1、1、1、1、1、4；min 0、max 小于 min、小数被拒；min 2、max 7 在 TIGHT 时为 3（E30 §6）。
- 经执行器：NORMAL 时启动 4 个会话；转 CRITICAL 后，打开的会话降到 1 以下之前不再启动，降到 0 时仍启动 1 个；TIGHT 时最多 2 个；恢复后回到 4。每次启动时打开的会话数都小于当时读到的上限。随机 400 步（入队、换信号、随机完成、pump 交替）共启动 85 个会话，同时打开的会话从未超过上限 6（E30 §6）。
- 资源端口 `read()` 抛异常时异常直接从 `takeBatch` 抛出，不按「不可用读数」收缩到下限（E30 §7 观察，N7）。

**Crew 适配只用替身**

- Crew 拒绝作业：任务转人工 CREW_UNAVAILABLE，不写裁决，槽位释放；会话中途失联（done 被拒绝）同样 CREW_UNAVAILABLE；completed 但缺某任务条目：该任务 INVALID_OUTPUT，其余任务按条目提交；同一任务两条条目 INVALID_OUTPUT；错误码不合法记 CREW_FAILED；取消事件后 Crew 会话被取消、槽位释放、该任务不写入；重启后新进程不启动旧作业，旧会话的结果交给新协调器得到 UNKNOWN_TASK（E30 §7）。交给 Crew 的作业每项只有 `taskId`、`correlationId`、`text` 三个键。
- 全量测试与本轮探针都没有连接本机任何已有服务，也没有调用 kiro-cli 或 kirocrew（E08）。真实 Crew 的会话语义、取消与资源信号来源按方法标为未验证（S029）。

**模块不直接导入 db，也不导入供应商 SDK**

成立（E06、E09、E33，见 §1.4）。

<a id="b4"></a>
### 3.1 B4：保序门控不区分车道，后台复盘挡住同频道的实时提交

| 场景（E30 §5） | 结果 |
| --- | --- |
| 同频道：BACKGROUND 任务（platformOrder 1，截止 10 分钟，仍在排队）与 REALTIME 任务（platformOrder 2，截止 5 s）；先取走 REALTIME 批次，REALTIME 结果提交 | `waiting`，等待对象为 BACKGROUND 任务 |
| 5 s 后扫描 | REALTIME 任务 PENDING_REVIEW（DEADLINE_EXCEEDED），BACKGROUND 任务仍 QUEUED |
| 同频道：REALTIME（platformOrder 1，运行中）之后到达 PAID（platformOrder 2）；PAID 先派工（优先级），PAID 结果提交 | `waiting`，等待对象为 REALTIME 任务 |
| 不同频道 | 不等待（符合） |

- 原因：`orderGate` 只按 `channelId` 与 `platformOrder` 选前序，`orderedOf` 不带车道；前序只要 QUEUED 或 RUNNING 就挡住后面的提交，直到它结束或到它自己的截止时间。后台复盘对象是先前已快速放行的消息，platformOrder 必然更小，截止时间可以很长，而且后台车道只用剩余容量，上限为 1 时整体暂停。
- 触发与影响见 judgment B4。

<a id="b5"></a>
### 3.2 B5：Crew 的 cancel 不返回时，pump 与 cancelEvent 停住，所有频道停止派工

| 场景（E30 §7、E31，Crew 替身的 cancel 返回永不结束的 Promise） | 结果 |
| --- | --- |
| ch-a 的任务运行中到期，调用 pump | 扫描把任务转人工，随后在回收空闲批次时 await cancel，这次 pump 不返回 |
| 入队 ch-b（另一频道）后再调用 pump | 同样卡在 ch-a 那个会话的 cancel 上，不返回；ch-b 一直 QUEUED，没有新会话启动 |
| 入队 ch-c 后调用执行器的 cancelEvent(ch-c) | 协调器先把 ch-c 转为 DISCARDED（CANCELLED），然后 cancelEvent 也卡在同一个 cancel 上，不返回 |
| ch-b 到期后再调用 pump | 扫描把 ch-b 转为 PENDING_REVIEW（DEADLINE_EXCEEDED），这次 pump 仍不返回 |

- 原因：`reapIdle` 对每个空闲批次依次 `await crew.cancel(...)`，`pump` 在取新批次之前 await `reapIdle`，执行器的 `cancelEvent` 也 await `reapIdle`。拒绝的 cancel 有处理（保留槽位，下次再试），不返回的 cancel 没有。
- 触发与影响见 judgment B5。

<a id="s009-other"></a>
### 3.3 其它发现

- 结算后的任务记录一直留在内存（N2）：`tasks` 与 `taskByEvent` 只增不减，每条记录保留整份事件（含正文）。结算 8 万条（每条正文 56 个字符）后堆增长约 87 MB，约 1.1 KB/条；`takeBatch`、`commitResult`、`sweep`、`cancelEvent`、`idleBatchIds` 每次都遍历全部记录：结算 2 万条时单次提交 542 µs、takeBatch 723 µs，6 万条时 2433 µs、2031 µs，8 万条时 takeBatch 1858 µs，随记录数线性增长（E30 §8、E31）。`cancelEvent` 只改状态，删除请求之后正文仍留在进程内存里，直到重启。
- 设计 §5「并发降到最小值时后台暂停」只在上限为 1 时成立，上限为 2 时后台批次仍可启动（E30 §5，N8）。
- S009 实施子代理结束时留下了在跑的 `pnpm dev`：它的证据写明停止命令被安全策略拦截（规则 self-protection-kill），13 个进程仍在、3000 与 5173 仍在监听；主线程之后停掉了这些进程。本轮开始时 3000、5173 无监听，本轮冒烟结束后同样无监听（E07，N5）。

### 3.4 VOXWARD-STORY-009 本单行

<a id="vw-s009-ac001"></a>
**VW-S009-AC001@1：failed**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：候选 5ce5bee 检出：install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。task-coordinator 的 8 个测试文件 88 项通过（E05）。实测只用进程内替身（E30–E32）：车道排队有上限，满了明确转人工（QUEUE_FULL，不丢弃、不放行），单条正文超过批字节上限转人工（INPUT_TOO_LARGE）；排队或运行中的任务到期由扫描转 PENDING_REVIEW 并记 TIMED_OUT/DEADLINE_EXCEEDED；可重试错误按 1000、2000 ms 退避，3 次耗尽或退避越过截止时间即转人工，不可重试错误直接转人工；迟到、代次变化、版本被人工裁决替代、已结算、数据删除、取消后以及重启后未知任务的结果都被丢弃，不写裁决、不写证据；没有任何路径放行或扣分（E30 §1–§4、§7）。「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。另两处问题不改变本行判定：同频道里更早的 BACKGROUND 任务会挡住 REALTIME 提交，直到后台任务自己的截止时间（B4，判在 INHERIT-006）；运行中的任务到期后、扫描之前结果先到，任务转为 DISCARDED 而不进人工队列（N1）。

<a id="vw-s009-parent"></a>
**VW-S009-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。无无限积压、超时不默认放行或扣分、过期任务不恢复为有效输出成立；「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。S009 的贡献是 TaskCoordinator 的有界调度、截止时间、有限重试、代次与提交确认、动态并发和 Crew 执行器。

### 3.5 VOXWARD-SUB-017 本单行

<a id="vw-sub017-ac001"></a>
**VW-SUB017-AC001@1：satisfied**（machine；要求 work:98811c5dc9e7282c8f3ab9b5#VW-SUB017-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：候选 5ce5bee 检出：install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。SUB-017 承担的协调器部分成立（task-coordinator 测试 88 项通过，E05；E30 §1–§5）：无无限积压，每个车道的排队数有上限（默认 PAID 50、REALTIME 200、BACKGROUND 500；上限 3 时 10 条入队 3 条排队、7 条转人工 QUEUE_FULL；默认上限下 205 条入队 200 条排队，重试回队也不超过），单条超过 8192 字节转人工；无全局无限屏障，保序门控只在同一频道内，且只等到前序任务的截止时间，跨频道不等待；超时不默认放行或扣分，排队或运行中的任务到期转 PENDING_REVIEW 并记 TIMED_OUT，重试耗尽、退避越过截止时间、不可重试错误、提交异常都转人工，事实端口 apply 0 次；过期任务不恢复为有效输出，到期、取消、代次变化、版本被替代、已结算、重启后未知任务的结果都被丢弃，不写裁决。本单代码中有三处问题不使本行不成立，但随返工处理：保序门控不区分车道（B4，判在 INHERIT-006）；到期后、扫描之前到达的结果把任务转为 DISCARDED 而不进人工队列，与提案 §6.2 和本单设计 §3 不符（N1）；结算后的任务记录不释放，每次调度调用都遍历全部记录（N2）。

<a id="vw-sub017-story"></a>
**VW-SUB017-STORY@1：satisfied**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 本单只证明所承担部分；VOXWARD-STORY-009 的完整判据（VW-S009-AC001@1）保持。
- 依据：复用 VW-SUB017-AC001 的同次执行（E05、E30–E32）。SUB-017 承担的「微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序」中，微批四种取批条件、后台余量、有限重试退避、取消与代次成立；付费优先与有限保序在提交环节被跨车道门控削弱（B4，判在 INHERIT-006）。本行只证明 SUB-017 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 failed（B5，不在 SUB-017 部分）。

<a id="vw-sub017-parent"></a>
**VW-SUB017-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。SUB-017 承担的协调器部分见 VW-SUB017-AC001。

### 3.6 VOXWARD-SUB-018 本单行

<a id="vw-sub018-ac001"></a>
**VW-SUB018-AC001@1：failed**（machine；要求 work:69b0cc08690c31022d613fc1#VW-SUB018-R001@1）

- expected：并发随资源收缩且不突破上限；Crew 不可用时任务明确失败而非默认放行；Crew 会话状态不作为业务最终裁决。
- 依据：并发随资源收缩且不突破上限成立：createDynamicConcurrency({min 1, max 4}) 对 NORMAL、两种 TIGHT、两种 CRITICAL、三种不可用读数（NaN、比例 1.5、负负载）、恢复 NORMAL 依次给出 4、2、2、1、1、1、1、1、4；min 0、max 小于 min、小数被拒；经执行器实测，CRITICAL 时已开的会话不被打断，打开的会话降到 1 以下之前不再启动，降到 0 时仍启动 1 个（无零并发屏障），恢复后回到 4；随机 400 步中同时打开的会话从未超过上限 6，每次启动时打开数都小于当时读到的上限（E30 §6）。Crew 会话状态不作为业务最终裁决成立：completed 但缺某任务条目时该任务转人工 INVALID_OUTPUT，同一任务两条条目同样转人工，裁决只来自条目并经事实端口写入（E30 §7）。「Crew 不可用时任务明确失败」只在 Crew 拒绝作业、会话中途失联或 start 不返回时成立：任务转人工 CREW_UNAVAILABLE 或到期转人工，槽位释放（E30 §7）。Crew 接下作业后不再响应、cancel 不返回时，执行器在回收空闲批次时 await 这个 cancel，pump 与 cancelEvent 都不返回，其它频道的新任务一直 QUEUED、不派工；按返回值逐次 await pump 的驱动方从此不再扫描，之后到期的任务也进不了人工队列；不 await 的驱动方每次 pump 都再挂起一个，任务到期才转人工（E30 §7、E31；B5，归属 SUB-018）。固定版本的真实 Crew 实测按方法标为未验证：简报不允许连接真实 Crew，本轮只用进程内替身（E08：对本机已有监听端口 0 次连接，垫片 0 次调用）。

<a id="vw-sub018-story"></a>
**VW-SUB018-STORY@1：failed**（machine；要求 work:ac2a8c1b963085361cf086f0#VW-S009-R001@1）

- expected：并发随资源收缩且不突破上限；Crew 不可用时任务明确失败而非默认放行；Crew 会话状态不作为业务最终裁决。 本单只证明所承担部分；VOXWARD-STORY-009 的完整判据（VW-S009-AC001@1）保持。
- 依据：复用 VW-SUB018-AC001 的同次执行（E30–E32）。SUB-018 承担的「TaskCoordinator/Crew 适配」中，动态并发的上下限与随资源收缩、会话状态不作为裁决、Crew 拒绝与失联时明确失败成立；Crew 的 cancel 不返回时执行器停止派工，pump 与 cancelEvent 不返回（B5，在 SUB-018 部分）。固定版本真实 Crew 实测按方法未验证。本行只证明 SUB-018 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 failed。

<a id="vw-sub018-parent"></a>
**VW-SUB018-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R009@1）

- expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。
- 依据：复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。SUB-018 承担的动态并发与 Crew 执行器部分见 VW-SUB018-AC001。

### 3.7 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-001"></a>
**VW-S009-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件（E33；check:deps 171 个文件 0 违规，E06）；在副本中加入导入 db 与供应商 SDK 的临时文件时 check:deps 报 2 处违规并退出 1，删除后恢复（E09）。契约包、CONTRACT_VERSION（仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。

<a id="vw-sub017-inherit-001"></a>
**VW-SUB017-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件（E33；check:deps 171 个文件 0 违规，E06）；在副本中加入导入 db 与供应商 SDK 的临时文件时 check:deps 报 2 处违规并退出 1，删除后恢复（E09）。契约包、CONTRACT_VERSION（仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是协调器部分（coordinator.ts 及纯函数文件）。

<a id="vw-sub018-inherit-001"></a>
**VW-SUB018-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：task-coordinator 只导入 @voxward/contracts 与本模块文件（E33；check:deps 171 个文件 0 违规，E06）；在副本中加入导入 db 与供应商 SDK 的临时文件时 check:deps 报 2 处违规并退出 1，删除后恢复（E09）。契约包、CONTRACT_VERSION（仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 crew/adapter.ts 与 crew/capacity.ts。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s009-inherit-005"></a>
**VW-S009-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：本包只新增 task-coordinator 模块文件与测试，不改其它模块（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。BACKGROUND 任务对同频道实时提交的影响见 B4，判在 INHERIT-006。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub017-inherit-005"></a>
**VW-SUB017-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：本包只新增 task-coordinator 模块文件与测试，不改其它模块（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。BACKGROUND 任务对同频道实时提交的影响见 B4，判在 INHERIT-006。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub018-inherit-005"></a>
**VW-SUB018-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：本包只新增 task-coordinator 模块文件与测试，不改其它模块（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。BACKGROUND 任务对同频道实时提交的影响见 B4，判在 INHERIT-006。完整判据由 INIT 的 VW-AC-005 承载。

#### VW-R-006@1（INHERIT-006）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-006"></a>
**VW-S009-INHERIT-006@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中「微批、大小、容量和等待均有界」「按宿主资源动态约束」「删除优先失效旧任务」成立（E30 §1–§2、§4、§6）。「付费优先、复盘让出实时容量」与「有限保序…保证实时可用性」不成立：保序门控只按 channelId 比较 platformOrder，不区分车道。同频道里一条更早的 BACKGROUND 任务（截止 10 分钟、仍在排队）使 REALTIME 结果的提交一直返回 waiting，直到实时任务自己到期转人工，后台任务仍在排队；付费结果也要等同频道更早的 REALTIME 任务（E30 §5；B4，归属 SUB-017）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。

<a id="vw-sub017-inherit-006"></a>
**VW-SUB017-INHERIT-006@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中「微批、大小、容量和等待均有界」「按宿主资源动态约束」「删除优先失效旧任务」成立（E30 §1–§2、§4、§6）。「付费优先、复盘让出实时容量」与「有限保序…保证实时可用性」不成立：保序门控只按 channelId 比较 platformOrder，不区分车道。同频道里一条更早的 BACKGROUND 任务（截止 10 分钟、仍在排队）使 REALTIME 结果的提交一直返回 waiting，直到实时任务自己到期转人工，后台任务仍在排队；付费结果也要等同频道更早的 REALTIME 任务（E30 §5；B4，归属 SUB-017）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。B4 在本单的 ordering.ts 与 coordinator.ts。

<a id="vw-sub018-inherit-006"></a>
**VW-SUB018-INHERIT-006@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：VW-R-006 中「微批、大小、容量和等待均有界」「按宿主资源动态约束」「删除优先失效旧任务」成立（E30 §1–§2、§4、§6）。「付费优先、复盘让出实时容量」与「有限保序…保证实时可用性」不成立：保序门控只按 channelId 比较 platformOrder，不区分车道。同频道里一条更早的 BACKGROUND 任务（截止 10 分钟、仍在排队）使 REALTIME 结果的提交一直返回 waiting，直到实时任务自己到期转人工，后台任务仍在排队；付费结果也要等同频道更早的 REALTIME 任务（E30 §5；B4，归属 SUB-017）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。按候选整体判定；本单承担的「按宿主资源动态约束」成立（E30 §6），B5 在本单的 crew/adapter.ts。

#### VW-R-008@1（INHERIT-008）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s009-inherit-008"></a>
**VW-S009-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。VW-R-008 要求初版整批受控失败，completed 报告须先经 S007 的整批校验，这由 S029 的真实绑定承担，本包未验证（judgment N6）。完整判据由 INIT 的 VW-AC-008 承载。

<a id="vw-sub017-inherit-008"></a>
**VW-SUB017-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。VW-R-008 要求初版整批受控失败，completed 报告须先经 S007 的整批校验，这由 S029 的真实绑定承担，本包未验证（judgment N6）。完整判据由 INIT 的 VW-AC-008 承载。

<a id="vw-sub018-inherit-008"></a>
**VW-SUB018-INHERIT-008@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。VW-R-008 要求初版整批受控失败，completed 报告须先经 S007 的整批校验，这由 S029 的真实绑定承担，本包未验证（judgment N6）。完整判据由 INIT 的 VW-AC-008 承载。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-009"></a>
**VW-S009-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。证据（ITEM_ID_MAP、VALIDATED_JSON）只在提交成功时写入技术日志，被丢弃的结果不留内容副本；80152 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。结算后的任务记录在进程内存里保留正文直到重启（judgment N2）。Crew 端内容残留的清理由 S029 的真实绑定承担，本包未验证。

<a id="vw-sub017-inherit-009"></a>
**VW-SUB017-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。证据（ITEM_ID_MAP、VALIDATED_JSON）只在提交成功时写入技术日志，被丢弃的结果不留内容副本；80152 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。结算后的任务记录在进程内存里保留正文直到重启（judgment N2）。Crew 端内容残留的清理由 S029 的真实绑定承担，本包未验证。

<a id="vw-sub018-inherit-009"></a>
**VW-SUB018-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。证据（ITEM_ID_MAP、VALIDATED_JSON）只在提交成功时写入技术日志，被丢弃的结果不留内容副本；80152 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。结算后的任务记录在进程内存里保留正文直到重启（judgment N2）。Crew 端内容残留的清理由 S029 的真实绑定承担，本包未验证。

#### VW-R-010@1（INHERIT-010）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-010"></a>
**VW-S009-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。真实 Kiro Crew 未验证（S029）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。

<a id="vw-sub017-inherit-010"></a>
**VW-SUB017-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。真实 Kiro Crew 未验证（S029）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。按候选整体判定；B5 不在 SUB-017 部分。

<a id="vw-sub018-inherit-010"></a>
**VW-SUB018-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。真实 Kiro Crew 未验证（S029）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。B5 在本单的 crew/adapter.ts。

#### VW-R-011@1（INHERIT-011）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-011"></a>
**VW-S009-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后的任务记录在进程内存里保留正文（judgment N2）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。

<a id="vw-sub017-inherit-011"></a>
**VW-SUB017-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后的任务记录在进程内存里保留正文（judgment N2）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。按候选整体判定；本单的事务提交部分成立，B5 不在 SUB-017 部分。

<a id="vw-sub018-inherit-011"></a>
**VW-SUB018-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后的任务记录在进程内存里保留正文（judgment N2）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。B5 在本单的 crew/adapter.ts。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s009-inherit-012"></a>
**VW-S009-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：本包不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

<a id="vw-sub017-inherit-012"></a>
**VW-SUB017-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：本包不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

<a id="vw-sub018-inherit-012"></a>
**VW-SUB018-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：本包不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。

#### VW-R-017@1（INHERIT-017）

expected：无无限积压/全局无限屏障；超时不默认放行或扣分；过期任务不恢复为有效输出。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s009-inherit-017"></a>
**VW-S009-INHERIT-017@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。Crew 的 cancel 不返回时执行器的 cancelEvent 也不返回，删除流程会停在这里，尽管任务已先转 DISCARDED（E31）。

<a id="vw-sub017-inherit-017"></a>
**VW-SUB017-INHERIT-017@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。Crew 的 cancel 不返回时执行器的 cancelEvent 也不返回，删除流程会停在这里，尽管任务已先转 DISCARDED（E31）。按候选整体判定；本单的取消与代次部分成立，B5 不在 SUB-017 部分。

<a id="vw-sub018-inherit-017"></a>
**VW-SUB018-INHERIT-017@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。共享的前半句「无全局无限屏障」不成立：Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。Crew 的 cancel 不返回时执行器的 cancelEvent 也不返回，删除流程会停在这里，尽管任务已先转 DISCARDED（E31）。B5 在本单的 crew/adapter.ts。

## 4. 未验证与范围说明

- 真实 Kiro Crew：未验证。简报不允许启动真实 Crew 队列或连接本机网关；S009 的测试与本轮探针只用进程内替身（E08、E30）。VW-SUB018-AC001 方法中的「固定版本实测」按方法标为未验证，由 STORY-029 的部署演练承接。
- 真实 Kiro 账号与 kiro-cli：本轮没有运行 kiro-cli（连 `--version` 也没有），没有推理。
- 数据库版 `TaskFactsPort`、任务持久化与重启恢复：不在本包（S009 设计 §0、§11）。提交的事务确认只在本轮的事务型替身上验证，真实原子性由接线 Story（S011、S014）承接。
- 资源信号的真实来源、真实模型与消息量下的微批默认值、提案中的 250 ms 与 2 ms：未测量（S009 设计 §13）。
- 归一化耗时：本轮没有重测；实施者自报 300–500 字符正文修复后每次 0.06–0.20 ms（S006 设计 §10）。
- 其它文字的同形异码（如西里尔字母冒充拉丁字母）与空格、标点插入：不在 B3 范围，三个版本都不处理，本轮未测。
- 浏览器与页面：本批没有前端改动，未做浏览器验收。
- 第 5a 批 E60 的迁移实测：`apps/server/src/db/` 与数据字典自 `b1a1471` 未改（E33），复用其结论；本轮没有重跑迁移探针。
