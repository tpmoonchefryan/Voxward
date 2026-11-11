# 第 m7b 批独立验收记录（总表第 7 批第二部分：S021 首次验收、S027 SUB-049 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `7400f39`（`7400f392d1ed9ec78678b711d3bfd00fb3c5641c`）。`8687bb4` 之上依次合入 `voxward/s021-output`（合并提交 `3585319`）与 `voxward/s027-bench`（合并提交 `7400f39`），均无冲突。相对 `8687bb4`，`.kiro/` 之外 50 个文件 +4545/−13 行。S021 改 `apps/server`（新增 `adapters/native-output/socket.ts`、`auth/output-grants.ts`、`db/output-store.ts`、`modules/output-adapter/` 的 `delivery.ts`、`native-protocol.ts`、`resend.ts`、`subscription.ts`；修改 `app.ts`、`auth/routes.ts`、`modules/output-adapter/index.ts`、`security/redaction.ts`、`package.json`）、契约包（新增 `output/native-v1.ts`、`ports/output-port.ts`，`index.ts` 加两行导出）、`docs/protocol/`、`examples/consumer-dedup/` 与锁文件。S027 新增 `bench/`，根 `package.json` 加 `bench:*` 脚本并让 `typecheck` 追加 `bench:typecheck`。`decision-service/`、`scoring-engine/`、`task-coordinator/`、`moderation-engine/`、`inference-provider/`、`platform-source/`、`audit-store/`、`data-lifecycle-service/`、`modules/registry.ts`、`db/schema/`、`db/migrations/`、`db/decision-store.ts`、`config/`、`main.ts`、`adapters/kiro-cli/`、`adapters/synthetic/`、`apps/web/`、`scripts/`、契约包 `version.ts` 与 `modules/` 都没有改动；`CONTRACT_VERSION` 仍为 `"1"`（E11）。
- 检出：`$KIROCREW_SCRATCH/vw-int-m7b`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移开，冒烟后放回并核对 sha256。探针与原始输出在 `$KIROCREW_SCRATCH/vw-accept-m7b-work/`，只按绝对路径导入检出内的源码与测试夹具；两个对照变体是 `git archive 7400f39` 导出的副本加一处改动（`probes/README.md`）。副本在交付目录 `probes/`。
- 环境：Linux x86_64（tcrn-platform-dev），AMD Ryzen 7 5800X 8 核，30.3 GiB，Node v24.16.0，pnpm 12.18.0。服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew，没有调用真实 YouTube 或 Google 的接口，没有做网页检索。每次在拦截下运行命令之前，先在同一环境里运行拦截自检；自检脚本先检查拦截模块设置的标记，没有标记就不发起任何连接并退出（`probes/README.md`）。本轮没有出现上一轮 E08 那样未加载拦截就运行自检的偏差。
- 工单读数（E01）：库版本 21103，headEventHash `ccf8d757875e86c8a943a673f00f6b75bac4c927e7f7f1b3ac136f14798905b4`，四单相同。修订号：STORY-021 rev 4，SUB-039、SUB-040 rev 3，SUB-049 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空，`content.evidence` 都为空（首次验收）。STORY-021 的 contentImpact 为 1→2，changedMeaning=false，changedAcceptance 与 changedRequirements 为空，requiresDecision=true，对应内容里已记的需求分配决定 `minutes:be2ce03bcd6fda69f1db9839#D2`；三张子单的 contentImpact 为 null。S021 组 35 行（STORY 11、SUB-039 12、SUB-040 12），SUB-049 23 行，共 58 行；同一 INHERIT 行在 Story 与两张子单上的 expected、method、requirement 逐字相同。STORY-027 与 SUB-050 按简报本轮不判、不出证据行。根需求原文读自 VOXWARD-INIT-001（rev 3）。读数存为 `probes/out-src/cards-m7b.json`。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现。实施自测证据（`.kiro/specs/voxward-s021-output/evidence/self-check.md`、`.kiro/specs/voxward-s027-bench/evidence/self-check.md`）与实施报告（`9bde51f2f1ca0262`、`c763509a37e5c5c5` 的 `result.txt`；简报列出的 `25a9acf1c4dbf1b0/result.txt` 在本机不存在）只作线索，下列结论来自本轮实测与源码、材料审查。两份自测证据都写明实施模型是 claude-haiku-5.5。
- 判定口径（同前几轮）：`satisfied` 表示该行 expected 的每一部分在候选 `7400f39` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；某一子单交付造成的不成立，判在 Story 与该子单的对应行，另一子单写明未触及（同第 m6r1 批 B6 的判法）。子单 AC001 与 STORY 行只判本单承担的部分。行的场景之外的行为不改判该行，按对应的 INHERIT 行或非阻断建议处理。方法与简报写明要真实账号或真实模型的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：58 行，satisfied 56 行，failed 2 行，unverified 0 行。STORY-021 组 33/35：新发现 B7（投递泵按轮次开头的读数发送后面的行，改判为拦截后仍发出原文），VW-S021-INHERIT-018 与 VW-SUB040-INHERIT-018 不成立；SUB-049 23/23。B 编号接前几轮（最后是 B6），N 编号为本轮编号。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-m7b-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/m7b-gate.log`、`m7b-smoke/`（18:37–18:38）（复核，不作唯一依据） | — | install、build、typecheck、test 144 个文件 1860 项、check:deps 213 个文件 0 违规，冒烟两次 200。日志没有逐条退出码与提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <4 个 KEY>`（另读 VOXWARD-INIT-001 的 VW-R-001–020 原文），再用 `extract-cards-m7b.cjs` 提取 | 0 | 四份 1.87、1.93、1.93、3.65 MB。读数见文首；行数 11、12、12、23；Story 与子单的同名 INHERIT 行 0 处不同。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 198.8 kb（带 `--external:ws`）并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 三个 `tsc -p tsconfig.json` 与 `bench:typecheck`（`tsc -p ../../bench/tsconfig.json`），0 个 `error TS`。 |
| E05 | `CI=1 pnpm test` | 0 | 144 个文件、1860 项。S021 的 10 个文件 58 项：`socket.test.ts` 11、`pump.test.ts` 11、`resend-contract.test.ts` 4、`consumer-dedup.test.ts` 5、`frames.test.ts` 5、`subscription-registry.test.ts` 3、`output-store.test.ts` 8、`output-grants.test.ts` 3、`url-redaction.test.ts` 4、`error-responses.test.ts` 4。bench 没有 vitest 用例（设计 §13）。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 213 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c`；再对 `dist/main.js` 做静态核对 | 0 | 环境中没有 `VOXWARD_*` 变量。`dev healthz ok=1 code=200 after 2s`，`dist healthz ok=1 code=200 after 1s`；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；脚本结束时 `no listeners`，之后 3000、5173 无监听、检出下无残留进程；原库放回后 sha256 OK。`dist/main.js` 第 119 行为 `import { WebSocket, WebSocketServer } from "ws";`，`class WebSocketServer`、`Sec-WebSocket-Accept` 与握手 GUID 在包内出现 0 次（ws 没有被打进包里），`/output/v1/room` 与 `vw-output.v1` 在包内。冒烟用的是带数据库的默认配置，所以 `startNativeOutput` 在 dist 启动时已经执行。本轮没有手工起 `pnpm dev`。 |
| E08 | 拦截下的全量测试：`CI=1 guarded.sh <work>/logs/e08 ./node_modules/.bin/vitest run`（运行前在同一环境里做拦截自检与回环自检） | 0 | 144 个文件 1860 项通过。自检：拦截已加载；5 个主机（`oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com`）的 fetch、https、net、DNS 全部被拒。回环自检：运行前已在监听的 1053 端口被拒、新开端口放行。测试中拦截模块在 172 个 Node 进程中加载；对外部主机 0 次连接，对运行前已在监听的 22 个端口 0 次连接，回环连接 31 次与回环 fetch 13 次（都是测试自己开的临时端口），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截）。`kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、三个包的 `src` 与四个 `package.json`；基线运行；加入 `adapters/native-output/zz-negative.ts`（导入 output-adapter 模块与 db）、`modules/output-adapter/zz-negative.ts`（导入 `ws` 与 db）、`packages/contracts/src/output/zz-negative.ts`（导入包外 db 文件）、`db/zz-negative.ts`（导入 output-adapter 模块）后运行；删除后运行 | 0、1、0 | 基线 `ok, 213 files`；加入后报 6 处违规（`adapter may not import "../../modules/output-adapter/index.js"`、`adapter may not import "../../db/output-store.js"`、`module output-adapter may not import "ws"`、`module output-adapter may not import "../../db/output-store.js"`、`contracts may not import …`、`db may not import "../modules/output-adapter/subscription.js"`），`6 violation(s) across 217 files`；删除后恢复 `ok`。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，两份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 0、0 | 共 189 s。`voxward-s021-output`：`SPEC_CURRENT`，workRevision 4，sourceDigest 与 previousSourceDigest 都是 `a308b90f…b993`。`voxward-s027-bench`：`SPEC_CURRENT`，workRevision 4，两者都是 `e6cb46d7…fa66`。两份 tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 592 个文件 sha256 不变。 |
| E11 | 静态核对：`git diff --shortstat/--name-status 8687bb4 7400f39`；对不应改动的路径逐个 `git diff --name-only`；对新增与改动的源文件 `grep -hoE '(from\|import)\s+"[^"]+"'` 与 `grep -nE 'require\(\|import\(\|fetch\(\|child_process\|process\.env\|setTimeout\|setInterval\|node:dns\|node:dgram\|http\.request\|https\|console\.'`；日志调用的字段；bench 的导入 | 0 | 变更范围见文首。`modules/output-adapter/` 只导入 `@voxward/contracts` 与本模块文件；`adapters/native-output/socket.ts` 只导入 contracts、`ws` 与 `node:http`、`node:stream` 的类型；`db/output-store.ts` 只导入 contracts、`drizzle-orm`、`node:crypto` 与 db 分区；契约包两份新文件只在包内互相导入。新增源码里只有 `socket.ts` 的四个计时器与 `app.ts` 的投递泵 `setInterval`（`unref`），没有 `require`、动态导入、`fetch`、子进程、`process.env`、DNS 或 UDP。日志调用只写 `{ status, reason }`、`{ errorCode }`、`{ errorName }`。bench 的导入与设计 §4 所列一致，不导入 `apps/server/test/`。 |
| E60 | `KIROCREW_SCRATCH=<work>/tmp guarded.sh <log> tsx probes/probe-m7b-s021.mts <检出>`（本轮新增） | 0（脚本只统计） | 35 项检查 1 项不符（Z1）。明细见 §2.0。 |
| E61 | `guarded.sh <log> tsx probes/probe-m7b-s021-race.mts <检出>`（本轮新增）；同一探针对变体 `fix-recheck`；E60 对 `fix-recheck` 与 `fix-preclose` | 0、0、0、0 | 候选：4 项 3 项不符（R1–R3）。`fix-recheck`：4 项 0 项不符；E60 在 `fix-recheck` 上 35 项 1 项不符（仍是 Z1）；E60 在 `fix-preclose` 上 35 项 0 项不符。明细见 §2.0、§2.4、§2.7。 |
| E62 | `guarded.sh <log> tsx probes/probe-m7b-s021-example.mts <检出>`（本轮新增） | 0 | 5 项检查 0 项不符。样例在本机端点上的输出见 §2.6。 |
| E70 | 基准脚本，全部在拦截与垫片下、`KIROCREW_SCRATCH=<work>/tmp-bench`：`pnpm bench:quality --out <abs>` 两次；在 `apps/server` 下 `tsx ../../bench/scripts/quality.ts` 直接运行（看 stdout 与退出码），另加只设 `VOXWARD_BENCH_REAL_MODEL=1`、只给 `--real-model`、两者都给、`--bogus` 四种；latency 与 cleanup 两者都给；`pnpm bench:latency --out <abs>`；`pnpm bench:cleanup --out <abs>` | 0、0、0、0、2、2、2、2、2、0、0 | quality 两次的输出与直接运行的 stdout sha256 都是 `a50a0c3968e92914778ad4a9bc08f58aea6cd28671041ba6bd13b51a0d639463`（与实施自测记录的值相同）；只设环境变量时照常只跑替身，输出 sha256 相同；只给参数时 `bench: refused: --real-model also needs VOXWARD_BENCH_REAL_MODEL=1; by default the bench runs only doubles`；两者都给时三个脚本都 `bench: refused: the real-model binding is not part of SUB-049; SUB-050 adds it with the Owner account (Q60)`；`--bogus` 为 `unknown argument`。latency 4 s、cleanup 2 s 完成。运行后 `tmp-bench/bench` 为空，检出 `git status` 0 行，`docs/reports/` 不存在。拦截记录：每次运行只有 IPC，没有任何网络连接；垫片调用 0 次。明细见 §3.0。 |
| E71 | `guarded.sh <log> tsx probes/probe-m7b-s027-samples.mts <检出> <work>/tmp/samples-neg`（本轮新增） | 0 | 3 项检查 0 项不符。 |

## 1. 共同检查

<a id="recheck"></a>
### 1.1 复验范围：首次验收，没有可复用的探针证据

- 两组都是首次验收，四张单的 `content.evidence` 为空，没有上一轮的行可复用。依据方法规范「Acceptance evidence and recheck scope」第 3 条，主线程的集成日志（E00）只作复核：它没有逐条退出码与提交号，所以 E02–E07 都在 `7400f39` 上重跑。E08–E11 是每个新候选都要做的项目，都做了。
- 本批与第 m7 批第一部分（`cb822f0`，S011、S015）之间的代码差异就是这两个分支；S021 与 S027 都没有改 S011、S015 用到的路径（`task-coordinator/`、`moderation-engine/`、`decision-service/`、`platform-source/`、`db/schema/`、`db/decision-store.ts`），这两组的探针本轮没有重跑，全量测试在拦截下照常通过（E05、E08）。S015 设计 §0 登记的契约包冲突点（`index.ts` 导出）在合并提交 `b345e78` 中两边都保留了（E11）。
- S021 的端点与投递泵在 E60–E62 中用真实 `buildApp`、迁移后的临时 SQLite、真实 ws 客户端与手工握手的 TCP 消费者验证；改判与补发经 S014 的决策服务与真实存储。S 节与 E61 R2–R4 需要可设置的时钟，用的是与 `app.ts` 的 `startNativeOutput` 相同的四个部件（`attachNativeOutput`、`createSubscriptionRegistry`、三个 db 端口、`createDeliveryPump`），只把 `now` 换掉。SUB-049 的脚本按 README 的入口在拦截与垫片下复跑（E70、E71）。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性

- 两份都是 `SPEC_CURRENT`（rev 4），受管段头部摘要与引擎一致（E10）。`tasks.md` 的本地段：S021 的 1.1–1.9、2.1–2.8、3.1–3.3 与 S027 的 2.1–2.7 都已勾选，受管段的正式任务未勾选，SUB-050 一项明确不做。
- S021 设计与代码一致的部分：§2 偏离表（模块名 `output-adapter`、没有模块内路由、端口放契约包、存储放 db 分区）；§3 分区（E06、E09）；§4 凭据格式、子协议交付、两表判定、撤销与权限（E60 G 节）；§5 帧与关闭码（C、D 节）；§6 读行条件、每轮 50 行、先过期再发、比较状态的 SENT、无消费者时保持 PENDING、3 次失败为 FAILED（S 节）；§7 补发（S5–S7）；§9 Q25（Q 节）；§13 偏离记录的九条都与代码相符。
- 不一致处：
  - §6 与协议文档 §6 写「只发送 PENDING、validUntil 未过、且属于当前裁决的行」。读行时成立；投递泵一轮只读一次，之后逐行等待发送，发送前不再核对，所以一轮之中被改判或被取消的行仍会发出（E61，B7）。
  - §8 写「`onClose` 时停止计时器并关闭连接」，§13 写「关闭应用时停止计时器并断开连接」。实测有消费者在线时 `app.close()` 一直不返回，投递泵继续发送，消费者自己断开后才完成（E60 Z1，judgment N1）。
  - §3 的分区表没有列新增的 `auth/output-grants.ts`（auth 分区，导入 db），只是遗漏。
- 协议文档与代码不一致处：§10 写 S003 的 Bearer 只读令牌「仍服务既有接口」，但没有任何路由要求 `output.feed`，这种令牌目前打不开任何接口（E60 G3、E11，judgment N4）；`examples/consumer-dedup/dedupe.mjs` 的注释写「The protocol promises at-least-once delivery」，协议文档没有这个承诺（SENT 只表示已交给发送时在线的连接，过期行从未发送）。
- S027 设计与代码一致的部分：§2 交付映射；§3 目录；§4 导入（E11）；§5 样本字段与校验（E71）；§8 质量块与未测项；§9 延迟参数；§11 清理场景；§12 不新增依赖；§13 质量输出可逐字节复现（E70）。
- 不一致处（文档措辞，judgment N5）：
  - §10 写「只给出其中之一时，脚本只运行替身」，README 写「只给出其中之一时，脚本同样拒绝运行」。实测只给 `--real-model` 时拒绝（退出 2），只给环境变量时照常只跑替身（E70）。两种行为都不会调用真实模型，两份文档各错一半。
  - §6 写 BLOCK 组「归一化两条」，`rule-set.json` 里是三条（禁词甲、bannedalpha、badword）加受约束正则一条。
  - §7 写替身声明的模型为 `bench-synthetic-model`，代码与 README 是 `bench-declared-model`。

<a id="gates"></a>
### 1.3 门禁与启动冒烟

install --frozen-lockfile、build、typecheck（含 bench）、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程；`ws` 以 external 留在包外，dist 带数据库启动时原生端点已装配（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.4 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试、E60–E62 与 E70–E71 都在拦截与垫片下运行，每次运行前在同一环境里确认拦截已加载（E08 与各次的 `selfcheck.txt`）。对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用。E60–E62 的连接全部是回环、指向探针自己开的端口；E70–E71 只有 IPC。样例消费者的子进程也加载了拦截（E62）。基准的假 CLI 子进程由适配器以精简环境启动（只有 `PATH`、`FAKE_KIRO_LOG`、`FAKE_KIRO_MODE`），不带 `NODE_OPTIONS`，它只导入 `node:fs`（静态核对）。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有调用真实 YouTube 或 Google 的接口。

<a id="deps"></a>
### 1.5 依赖方向

check:deps 0 违规（E06）；同一规则在副本中对 adapter 导入模块或 db、output-adapter 模块导入 `ws` 或 db、契约包导入包外路径、db 导入模块都报违规（E09）。所以端点放在 adapter 分区、端口放契约包、存储放 db 分区是唯一能过规则的接法（设计 §2、§3）。契约包是新增导出，已有类型与 `CONTRACT_VERSION` 未改。bench 不在 check-deps 的扫描根中，只按相对路径调用已有导出（E11）。

## 2. VOXWARD-STORY-021 组（35 行：satisfied 33，failed 2）

<a id="s021-summary"></a>
### 2.0 S021 实测摘要（必验项 1）

E60 的 G、Q、C、D、Z、M 节用真实 `buildApp`：迁移后的临时 SQLite、真实签发与撤销路由、真实 ws 端点与投递泵（每 20 ms 一轮）、真实时钟；消费者是真实 ws 客户端或手工握手的 TCP 连接（探针决定它读不读、答不答 ping、答不答关闭帧）。S 节与 E61 R2–R4 用与 `app.ts` 相同的端点、注册表、端口与投递泵，只把时钟换成可设置的，手动调用 `runPass()`。投递行都经 S014 的真实决策存储 `commitVerdict` 写入；改判与补发经 S014 的 `overturnEvent`、`resendDelivery`。频道 `channel-a`、`channel-b`；主体键、平台消息引用等写成带标记的合成值（`UCviewerSTABLEID…`、`msgrefSECRET…`），用来检查它们不进帧。

| 检查 | 7400f39 | 变体 |
| --- | --- | --- |
| G1 所有者签发：201、`cache-control: no-store`、正文只有 `grantId` 与 `credential`，凭据为 `vwo_` 加 43 位 base64url | 符合 | — |
| G2 签发写一行 `credential_refs`（OUTPUT_GRANT，`secretref:` 加 SHA-256）与一行 `output_grants`（NATIVE_V1、ROOM_READ_ONLY）；明文凭据不在任何表里 | 符合 | — |
| G3 房管、数据管理员、其它频道的所有者、缺 CSRF 的请求 403；原生凭据当 Bearer 401；S003 下游令牌 403；都不写入 | 符合 | — |
| G4 子协议里的凭据打开房间；服务端只选中并回显 `vw-output.v1`，不回显凭据；第一帧 HELLO | 符合 | — |
| G5 凭据放查询串、Authorization、Cookie 或其它头，缺 `vw-output.v1`、给两个凭据、格式错误、未知、S003 令牌：裸 401 无正文；凭据放路径或别的路径：裸 404 | 12 项符合 | — |
| G6 只撤销 `credential_refs`、只撤销 `output_grants`、purpose 不是 OUTPUT_GRANT、凭据频道与授权频道不同、kind 不是 NATIVE_V1：在线连接 101–103 ms 内（心跳 100 ms）4403，重连 401 | 5 项符合 | — |
| G7 房间由授权决定：channel-a 的消费者只收到 a-1，channel-b 的只收到 b-1 | 符合 | — |
| G8 所有者撤销：204，该授权的两个连接都 4403 `GRANT_REVOKED`，另一授权的连接不受影响，再撤销 404，重连 401；其它频道所有者（403、404）与房管（403）撤销不了 | 符合 | — |
| G9 不应答关闭帧的消费者收到 4403 后，服务端在 502 ms（宽限 500 ms）断开 TCP；关闭帧之后没有任何帧 | 符合 | — |
| G10 原生凭据打不开 HTTP 路由（成员列表、Change Log 查看器）：401 | 符合 | — |
| G11 57 行日志里没有任何凭据或其摘要；18 条升级拒绝日志只有 `status` 与 `reason` | 符合 | — |
| Q1 路径参数超长：414，正文固定为 `{"error":"URI_TOO_LONG"}` | 符合 | — |
| Q2 百分号转义残缺：400，正文固定为 `{"error":"BAD_REQUEST"}` | 符合 | — |
| Q3 明文、`%5F` 编码、全编码、双重编码的令牌，令牌在 Host、在查询串：响应都不重复令牌；HTTP 解析器拒绝的请求得到解析器的固定答复 | 符合 | — |
| Q4 日志：路径里的明文、`%5F` 编码与全编码令牌和 Host 里的令牌都是 `[REDACTED]`；查询串不进日志 | 符合 | — |
| Q5（观察）双重编码 `vwo%255F…` 解一次后记为 `/x/vwo%5FQQQ…` | 见 §2.2 | — |
| C1 答 ping 的消费者跨多次心跳保持连接 | 符合 | — |
| C2 文本或二进制数据帧：4400 `CLIENT_DATA_NOT_ACCEPTED` | 符合 | — |
| C3 不答 ping：收到 ping，634 ms 后 4408 `HEARTBEAT_TIMEOUT` 并断开 | 符合 | — |
| C4 暂停读取的消费者在发送超时（400 ms）内收不完 16 MiB 的帧：4413 `SUBSCRIBER_BACKPRESSURE` 并断开 | 符合 | — |
| C4b（观察）该行之后为 SENT、attempts 1，正常读取的消费者收到它 2 次 | 见 §2.5 | — |
| C5 四个关闭码各有一个固定原因 | 符合 | — |
| D1 ALLOW：DELIVER 的键与 `NATIVE_FRAME_FIELDS.DELIVER` 相同，display 为 `{label: null, text, translation}` | 符合 | — |
| D2 BLOCK：WARD_BLOCKED 的键与列表相同，被拦截的原文不在任何帧里 | 符合 | — |
| D3 帧里没有主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据 | 符合 | — |
| D4 同一房间的两个消费者收到相同的帧，按 platformOrder 10、20、30 排列 | 符合 | — |
| D5 ALLOW_NOISE 同样走 DELIVER | 符合 | — |
| S1 只有 PENDING、未过期、属于当前裁决的行发出：SENT、FAILED、CANCELLED、EXPIRED、过期的 PENDING 行与被改判的 ALLOW 行都不发，改判产生的 BLOCK 行发出 | 符合 | — |
| S2 发出的行为 SENT（`updated_at` 为本轮时间），过期的 PENDING 行为 EXPIRED，其余状态不变 | 符合 | — |
| S3 重连不补播 SENT 与 EXPIRED 行 | 符合 | — |
| S4 没有消费者时行保持 PENDING、0 次尝试，消费者连上后发出 | 符合 | — |
| S5 补发 SENT 行：有效期内 NOT_EXPIRED，过期后 ALREADY_SENT（Q56），都不写新行 | 符合 | — |
| S6 补发 EXPIRED 行：新 deliveryId `resend:channel-a:op-r3`、有效期 60 s，只发一次；同一操作 duplicate；数据管理员 denied；10 分钟后 WINDOW_CLOSED | 符合 | — |
| S7 改判放行（BLOCK→ALLOW）写成 EXPIRED，不自行发出；明确补发后才发出放行的正文 | 符合 | — |
| S8 120 行待发：三轮发出 50、50、20 | 符合 | — |
| S9 某个消费者每次发送都失败：该行重试到第 3 次标 FAILED，后面的行等待；正常的消费者收到同一 deliveryId 3 次 | 符合 | — |
| Z1 两个消费者在线时 `app.close()` 应及时完成并断开它们（设计 §8、§13） | **不符**：3 s 后仍未完成，两个连接仍在，投递泵仍在发送；消费者自己断开（3509 ms）后 1 ms 内完成 | `fix-preclose` 符合 |
| M1（观察）16 MiB 的客户端文本帧：服务端读完整帧后才以 4400 关闭（663 ms），`maxPayload` 仍是 ws 默认的 100 MiB | 见 §2.3 | — |
| M2（观察）同一凭据开 20 个连接全部被接受 | 见 §2.3 | — |
| E61 R1 真实应用：第 1 行正写给一个暂停读取的消费者时，房管把第 2 行改判为拦截并已提交；第 2 行的原文不应再发出 | **不符**：26 ms 后读的消费者收到第 2 行的 DELIVER 与原文，该行标为 SENT，之后才收到 WARD_BLOCKED | `fix-recheck` 符合 |
| E61 R2 受控：第 1 行的发送被挂起时改判第 2 行 | **不符**：两个消费者都收到第 2 行原文，该行 SENT | `fix-recheck` 符合 |
| E61 R3 受控：第 1 行被挂起时第 2 行被标 CANCELLED | **不符**：第 2 行仍发出，状态保持 CANCELLED | `fix-recheck` 符合 |
| E61 R4 对照：第 1 行被挂起时时钟越过第 2 行的有效期，泵自己的时间检查跳过它 | 符合 | 符合 |
| E62 E1–E5 原样运行的样例消费者：连接、打印 HELLO、正文与 WARD_BLOCKED、按 deliveryId 去重、撤销后 4403 并退出 0；错误凭据与非法地址的退出码 | 5 项符合 | — |

<a id="s021-credential"></a>
### 2.1 凭据：只读、可撤销，按 `output_grants` 与 `credential_refs` 判定（Q16、Q18）

- 交付方式（Q16）：凭据只在 WebSocket 子协议列表里，形如 `vw-cred.vwo_…`，同时要有 `vw-output.v1`；服务端只选中 `vw-output.v1`（`handleProtocols` 恒返回它），凭据从不回显（G4）。查询串、Authorization、Cookie、其它头或路径里的凭据一律不认（G5）。拒绝发生在升级之前，是只有状态行、`Connection: close` 与 `Content-Length: 0` 的裸响应，不回显请求内容；拒绝日志只有状态与原因码（G5、G11）。
- 授权（Q18）：签发在一次短事务内写 `credential_refs`（purpose OUTPUT_GRANT，`secret_ref` 为 `secretref:` 加凭据的 SHA-256，74 字符，恰好满足现有 CHECK）与 `output_grants`（NATIVE_V1、ROOM_READ_ONLY），不存凭据本身（G2）。解析与复查用同一条件：两行都未撤销、purpose、kind、scope 相符、两行的频道相同；任一条件不满足，新连接 401，在线连接在下一个心跳周期 4403（G6）。房间由授权的频道决定（G7）。
- 只读：消费者只能回 pong，任何数据帧 4400（C2）；原生凭据不是 HTTP 凭据，`authenticateRequest` 只认 S003 的 `auth_output_tokens` 与会话，所以原生凭据在 HTTP 路由上 401（G10）。签发与撤销要所有者的 `tokens.manage` 与 CSRF（G3、G8）。
- 撤销后真的断开：撤销路由在短事务提交后调用 `closeGrant`，该授权的每个连接先收关闭帧 4403，`closeGraceMs`（默认 1 s，E60 用 500 ms）内对端不完成关闭握手就 `terminate()`（G8、G9）。在别处撤销（直接改表）由心跳复查发现（G6）；复查读库失败按已撤销处理（`socket.test.ts` 的失败存储用例，E05）。
- S003 的 `auth_output_tokens` 与原生授权用同一前缀 `vwo_`、同一形状，但只有后者能订阅原生端点（G5），前者现在没有任何路由要求 `output.feed`（judgment N4）。

<a id="s021-q25"></a>
### 2.2 Q25：400、414 不回显 URL，日志脱敏

- `frameworkErrors` 把 Fastify 的 `FST_ERR_MAX_PARAM_LENGTH` 答为 414 `URI_TOO_LONG`，其余（`FST_ERR_BAD_URL` 等）答为 400 `BAD_REQUEST`，正文固定（Q1、Q2）。404 的正文也是固定的 `NOT_FOUND`；HTTP 解析器层面的错误由 Fastify 的 clientError 处理，答复固定，不含请求内容（Q3）。
- 请求日志的 `url` 只取路径（查询串不记）并先解一次百分号编码再脱敏，`host` 同样处理：`vwo%5F…` 与全编码的令牌都记为 `[REDACTED]`（Q4）。
- 观察（不改判）：双重编码的 `vwo%255F…` 解一次后是 `vwo%5F…`，不匹配令牌形状，原样记入日志（Q5）。服务端路由看到的也是解一次后的值，所以这不是一个能用的凭据；只有客户端把凭据双重编码进路径时才会出现。残缺的转义（如 `%E0%A4%A`）解出的是若干 latin1 字符，日志里会出现乱码，不影响脱敏。

<a id="s021-close"></a>
### 2.3 握手拒绝与关闭码

- 升级前：路径不对 404；缺凭据、缺 `vw-output.v1`、两个凭据、格式错误 401；凭据未知、已撤销、范围不符 401；读授权抛异常 500（G5、G6，`socket.test.ts`）。
- 连接后：数据帧 4400（C2）、撤销或复查失败 4403（G6、G8）、心跳未答 4408（C3）、积压 4413（C4）。四个码各有一个固定原因文本（C5），由契约 `NATIVE_CLOSE` 定义，没有其它关闭原因。
- 4413 有两个判定：发送前已排队超过 1 MiB，或单帧在 `sendTimeoutMs`（默认 5 s）内没写进套接字。C4 触发的是后者。前者在投递泵逐行等待写完的用法下很难出现（上一帧写完才发下一帧），本轮没有单独触发。
- 观察（judgment N3）：`WebSocketServer` 没有设 `maxPayload`，仍是 ws 默认的 100 MiB；ws 收完整个消息才发出 `message` 事件，所以一个持有凭据的消费者可以让服务端先缓存最多 100 MiB 再被 4400 关闭（M1）。同一凭据的连接数也不限（M2）。没有凭据时升级在 HTTP 层就被拒，ws 不解析任何帧。

<a id="s021-frames"></a>
### 2.4 统一 ALLOW/BLOCK 与 WARD_BLOCKED；B7

- 常规路径成立：`frameFor` 对 BLOCK 只造 WARD_BLOCKED、不读正文；ALLOW 与 ALLOW_NOISE 都造 DELIVER，正文与译文在发送时从 Technical Log 的 `MESSAGE_TEXT`、`TRANSLATION` 证据读取（过期证据不读）；帧的键是固定白名单（D1–D5）。同一房间的所有消费者从同一个投递泵收到同样的帧（D4）。
- 不成立的部分（B7）：`createDeliveryPump` 的 `sendChannel` 每轮对一个频道只调用一次 `readSendable`（`delivery.ts:62`），然后逐行 `await sendRow`（`:66`）。每行发送前只用新时钟检查有效期（`decideSend`，`:65`），不再核对该行的状态与所属裁决是否仍是当前裁决；`markSent` 的比较条件只有 `status = 'PENDING'` 与 `valid_until > now`（`output-store.ts:231`）。发送是异步的：只要某个消费者的套接字不能立即写完，这一轮就让出事件循环，期间提交的改判或其它状态变更不会被这一轮看到。
  - E61 R1（真实应用）：读的消费者正常读取，另一消费者暂停读取；第 1 行 8 MiB，第 2 行是普通 ALLOW。第 1 行写给慢消费者时，房管经 S014 把第 2 行改判为 BLOCK 并提交（旧裁决 `is_current = 0`，新裁决 BLOCK）。慢消费者恢复读取后 26 ms，读的消费者收到第 2 行的 DELIVER 与原文 `TEXT-THAT-THE-MODERATOR-BLOCKED`，该行被标 SENT；之后才收到改判的 WARD_BLOCKED。慢消费者也收到了原文。
  - R2（受控、挂起一次发送）结果相同；R3：第 2 行在这一轮中被标 CANCELLED 后照样发出，`markSent` 失败所以状态仍为 CANCELLED，但帧已经发出。R4 对照：时钟越过第 2 行的有效期时被跳过，说明泵对时间做了复查，对状态与裁决没有。
  - 变体 `fix-recheck` 在每行发送前重读一次可发送的行，R1–R3 都不再发出第 2 行，E60 的其它检查不变（E61）。
  - 触发条件：一轮之中至少有一次发送不能同步写完（任一消费者慢、网络拥塞或帧较大），同时这一轮读到的后面的行被改判、取消或删除。直播中积压后重连、远端 OBS 网络不稳时都会出现慢写；房管改判正在排队的消息正是人工审核的常见操作。
  - 影响：房管已经提交的拦截裁决没有拦住下游，被拦截的原文作为 DELIVER 出现在舞台上，并被记为 SENT；之后的 WARD_BLOCKED 没有撤下已显示内容的约定（judgment N2）。违反设计 §6 与协议文档 §6「只发送 PENDING、validUntil 未过、且属于当前裁决的行」、提案 §13.1「输出适配器只能读取已批准的展示事件」与 VW-R-018「拦截仅无原文/身份的 WARD_BLOCKED」。S019 接入删除后，R3 的路径会让已取消的投递在同一轮里发出。
  - `pump.test.ts` 的「a row that changed while its frame was in flight is not overwritten with SENT」只覆盖正在发送的那一行，不覆盖同一轮里后面的行。

<a id="s021-delivery"></a>
### 2.5 投递 ID、状态、有限发送与补发（Q56）

- 投递 ID 稳定：`deliveryId` 就是 `deliveries.id`，同一行重试时不变（S9：同一 ID 发给正常消费者 3 次；C4b：2 次）。补发是新行、新 ID（`resend:<频道>:<操作>`，S6）。改判行的 ID 为 `overturn-delivery:<频道>:<操作>`，含频道 ID，不含观众身份。
- 只发 PENDING 且未过期的行：读行时成立（S1）；发送前不再核对的问题见 B7。每轮先把过期的 PENDING 行比较状态改为 EXPIRED（每轮最多 500 行），EXPIRED 行永不发出（S1、S2）。
- 发送后在同一短事务里标为 SENT：全部在线消费者都接受后，`markSent` 以一条带 `id`、`status = 'PENDING'` 与 `valid_until > now` 条件的 UPDATE 在 `runShortTransaction` 里执行，影响行数为 1 才算 SENT（S2，`output-store.ts:223–232`）。发送期间有新消费者加入时不标 SENT，下一轮发给全部消费者（`pump.test.ts`）。
- SENT 后补发被拒（Q56）：S014 的 `commitResend` 读到 SENT 时拒绝 ALREADY_SENT（S5）；服务层先检查有效期，所以有效期内是 NOT_EXPIRED。Q56 提到的「投递状态没有 SENT 写入方」已由输出端补上。
- 发送有上限：每轮每频道 50 行（S8），失败 3 次 FAILED 且后面的行等待（S9），单帧写入 5 s 超时与 1 MiB 积压上限关闭消费者（C4）。部分失败会让已收到的消费者再收到一次，消费者必须按 deliveryId 去重（S9、C4b、E62 E2），协议文档 §6 写明。
- 过期 SC 不自动补播：EXPIRED 与过期的 PENDING 行不发，重连不补播（S1、S3）；改判放行写成 EXPIRED（S7）；只有明确的补发产生新行，新行有效期 60 s，消息到达 10 分钟后不能补发（S6）。投递行不区分是否 SC，规则对所有投递相同。

<a id="s021-repro"></a>
### 2.6 协议文档与去重样例在本机复现

E62 按 `docs/protocol/output-native-v1.md` §2、§8 与样例 README：所有者经路由签发，`VOXWARD_OUTPUT_CREDENTIAL=<凭据> VOXWARD_OUTPUT_URL=ws://127.0.0.1:<端口>/output/v1/room node examples/consumer-dedup/consumer.mjs`（样例未改）。输出为：

```text
connected: vw-output.v1, heartbeat every 60000 ms
d-r1 approved text from the reproduction
d-r2 WARD_BLOCKED
d-r4 BIG:zzzz…（4194313 个字符，打印一次）
closed 4403 GRANT_REVOKED
```

d-r3（连上之前已过期）没有打印，d-r2 的原文没有打印。另一个暂停读取的消费者让 d-r4 第一次发送失败（attempts 1），样例收到两次、打印一次（E2）。撤销后样例以 4403 关闭并退出 0（E3）。凭据不在样例输出与服务端日志里（E4）。错误凭据输出 `connection failed` 并退出 1；地址带查询串、主机不是 127.0.0.1、没有凭据时连接前就以 2 退出（E5）。协议文档各节与实测一致，不一致处见 §1.2。

<a id="s021-dist"></a>
### 2.7 dist 启动与关闭

- dist 能启动：`--external:ws` 生效，包内是 `import { WebSocket, WebSocketServer } from "ws"`，带数据库的默认配置下 `/healthz` 200（E07）。`ws` 在 `apps/server` 的运行时依赖里，锁文件已含（E02）。
- 关闭（judgment N1）：`startNativeOutput` 用 `app.addHook("onClose", …)` 停止投递泵并关闭端点（`app.ts:128–131`）。Fastify 自己关闭 HTTP 服务器的处理也是一个 onClose 处理，它在 `preReady` 时登记，比 `buildApp` 里的钩子晚，按登记的逆序先执行，于是先调用 `server.close()`；升级后的 WebSocket 连接仍计入服务器的连接数，`server.close()` 一直等它们结束，停止投递泵与关闭端点的钩子轮不到执行。实测两个消费者在线时 `app.close()` 3 s 后仍未完成，期间新写入的行照样发给消费者，新连接被拒；消费者自己断开后立即完成（Z1）。`main.ts` 的 SIGINT/SIGTERM 处理就是 `app.close()` 后关库退出，所以有 OBS 在线时进程不会自行退出，要第二个信号或 SIGKILL。变体 `fix-preclose` 把钩子改为 `preClose` 后 Z1 成立。`socket.test.ts` 的 `afterEach` 先 terminate 所有客户端再 `app.close()`，测不出这个问题。

### 2.8 VOXWARD-STORY-021 本单行

<a id="vw-s021-ac001"></a>
**VW-S021-AC001@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：候选 7400f39 检出：install --frozen-lockfile、build、typecheck、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）；S021 的 10 个测试文件 58 项通过（E05）。E60 用真实 buildApp（迁移后的临时 SQLite、真实签发与撤销路由、真实 ws 端点与投递泵、真实时钟）、真实 ws 客户端与手工握手的 TCP 消费者；S 节用与 app.ts 相同的端点、注册表、db 端口与投递泵，只换成可设置的时钟，改判与补发经 S014 的决策服务与真实存储。不输出稳定用户 ID、分数、名单、审核理由或对话：DELIVER、WARD_BLOCKED、HELLO 的键与 NATIVE_FRAME_FIELDS 逐一相同，display 只有 label（恒为 null）、text、translation，帧里没有主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：文本或二进制数据帧一律 4400 断开（C2）。不承诺严格只展示一次：协议文档 §6、§9 与样例 README 写明，消费者按 deliveryId 去重（E62）。场景：违规消息只发 WARD_BLOCKED、原文不进帧（D2、S1）；重复投递时同一 deliveryId 被重发、样例只显示一次（S9、C4b、E62 E2）；断连有 4408、4413、4403，断开后重连只收到 HELLO（C3、C4、G8、S3）；过期 SC 不补播（S1、S3、S7）；人工补发只有明确操作产生新行且只发一次，SENT 行补发被拒（S5、S6）；凭据撤销后连接 4403 断开、重连 401（G6、G8、G9）。B7（改判在一个投递轮次中提交时，投递泵仍按轮次开头的读数发出该行原文，E61）不在本行 expected 列举的项内，判在 Story 与 SUB-040 的 INHERIT-018。

<a id="vw-s021-parent"></a>
**VW-S021-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 AC001）。S021 的贡献是原生协议与帧、凭据签发与两表判定、WebSocket 传输与心跳、投递泵与补发契约、协议文档与去重样例；OBS 页面、显示昵称与付费展示信息不在本单（设计 §1、§11）。B7（改判在一个投递轮次中提交时，投递泵仍按轮次开头的读数发出该行原文，E61）不在本行 expected 列举的项内，判在 Story 与 SUB-040 的 INHERIT-018。

### 2.9 VOXWARD-SUB-039 本单行

<a id="vw-sub039-ac001"></a>
**VW-SUB039-AC001@1：satisfied**（machine；要求 work:ac327b9a81a9326b33711ffb#VW-SUB039-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效。
- 依据：候选 7400f39 检出：install --frozen-lockfile、build、typecheck、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）；S021 的 10 个测试文件 58 项通过（E05）。E60 用真实 buildApp（迁移后的临时 SQLite、真实签发与撤销路由、真实 ws 端点与投递泵、真实时钟）、真实 ws 客户端与手工握手的 TCP 消费者；S 节用与 app.ts 相同的端点、注册表、db 端口与投递泵，只换成可设置的时钟，改判与补发经 S014 的决策服务与真实存储。不输出稳定用户 ID、分数、名单、审核理由或对话：帧的键是固定白名单，帧里没有主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：文本或二进制数据帧一律 4400 断开（C2）。撤销后订阅失效：所有者撤销后该授权的两个连接立即 4403，其它授权的连接不受影响，重连 401（G8）；只撤销 credential_refs 或 output_grants、purpose、kind 或频道不符时，在线连接一个心跳内 4403、重连 401（G6）；不应答关闭帧的消费者在宽限后被断开 TCP（G9）；原生凭据打不开 HTTP 路由（G10）。违规消息只发 WARD_BLOCKED（D2）；断连有 4408、4413（C3、C4）。

<a id="vw-sub039-story"></a>
**VW-SUB039-STORY@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效。 本单只证明所承担部分；VOXWARD-STORY-021 的完整判据（VW-S021-AC001@1）保持。
- 依据：复用 VW-SUB039-AC001 的同次执行（E02–E08、E60）。本单承担的「原生协议、字段/版本/鉴权/心跳断连说明；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED」成立：子协议 vw-output.v1、版本 1，凭据只在子协议列表，不走查询串、Authorization、Cookie 或其它头（E60 G4、G5），HELLO 先于投递帧（G4），心跳 ping 与 4408（C1、C3），4400、4403、4413 各有固定原因（C2、C4、C5）；ALLOW 与 ALLOW_NOISE 都是 DELIVER、BLOCK 都是 WARD_BLOCKED，同一房间的所有消费者收到相同的帧（D1、D4、D5）；frameFor 对 BLOCK 不读正文。B7 出在 SUB-040 的投递泵选行，不在本单的帧构造与传输。本行只证明 SUB-039 承担的部分；VOXWARD-STORY-021 的完整判据 VW-S021-AC001 另行判定为 satisfied。

<a id="vw-sub039-parent"></a>
**VW-SUB039-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 VW-S021-AC001）。SUB-039 承担的部分见 VW-SUB039-AC001。B7（改判在一个投递轮次中提交时，投递泵仍按轮次开头的读数发出该行原文，E61）不在本行 expected 列举的项内，判在 Story 与 SUB-040 的 INHERIT-018。

### 2.10 VOXWARD-SUB-040 本单行

<a id="vw-sub040-ac001"></a>
**VW-SUB040-AC001@1：satisfied**（machine；要求 work:a86848777f015b0c0a1d9611#VW-SUB040-R001@1）

- expected：重复投递可按投递 ID 去重；过期 SC 不自动补播；补发须明确动作且受有效期限制；不承诺不可控消费者网络严格只展示一次。
- 依据：候选 7400f39 检出：install --frozen-lockfile、build、typecheck、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）；S021 的 10 个测试文件 58 项通过（E05）。E60 用真实 buildApp（迁移后的临时 SQLite、真实签发与撤销路由、真实 ws 端点与投递泵、真实时钟）、真实 ws 客户端与手工握手的 TCP 消费者；S 节用与 app.ts 相同的端点、注册表、db 端口与投递泵，只换成可设置的时钟，改判与补发经 S014 的决策服务与真实存储。重复投递可按投递 ID 去重：一个消费者发送失败时，该行在下一轮以同一 deliveryId 重发给全部在线消费者（E60 S9 3 次、C4b 2 次），样例 consumer.mjs 按 deliveryId 只打印一次（E62 E2），dedupe.mjs 跳过 validUntil 已过的帧（consumer-dedup.test.ts 5 项，E05）。过期 SC 不自动补播：EXPIRED 与过期的 PENDING 行不发并被标 EXPIRED，重连不补播（S1–S3）；改判放行写成 EXPIRED，不自行发出（S7）。补发须明确动作且受有效期限制：补发只经 S014 的 resendDelivery，SENT 行有效期内 NOT_EXPIRED、过期后 ALREADY_SENT（Q56），EXPIRED 行补发得到新 deliveryId、60 s 有效期，只发一次；同一操作为 duplicate；数据管理员 denied；消息到达 10 分钟后 WINDOW_CLOSED（S5、S6）。不承诺严格只展示一次：协议文档 §6、§9（E62）。

<a id="vw-sub040-story"></a>
**VW-SUB040-STORY@1：satisfied**（machine；要求 work:26274628cbb8f691b6cf430c#VW-S021-R001@1）

- expected：重复投递可按投递 ID 去重；过期 SC 不自动补播；补发须明确动作且受有效期限制；不承诺不可控消费者网络严格只展示一次。 本单只证明所承担部分；VOXWARD-STORY-021 的完整判据（VW-S021-AC001@1）保持。
- 依据：复用 VW-SUB040-AC001 的同次执行（E02–E08、E60、E62）。本单承担的「投递 ID 和状态；有限发送与补发契约」成立：deliveryId 即 deliveries.id，重发不换 ID（E60 S9）；读行条件为 PENDING、未过期、当前裁决（S1），全部在线消费者接受后以比较状态的单语句短事务标 SENT（S2）；没有在线消费者时保持 PENDING、不计次数（S4）；每轮每频道 50 行（S8），失败 3 次 FAILED 且后面的行等待（S9），积压 4413（C4）；补发规则同 AC001（S5–S7）。本单交付的投递泵在发送前不再核对状态与当前裁决（B7），判在本单与 Story 的 INHERIT-018，不在本行 expected 列举的项内。本行只证明 SUB-040 承担的部分；VOXWARD-STORY-021 的完整判据 VW-S021-AC001 另行判定为 satisfied。

<a id="vw-sub040-parent"></a>
**VW-SUB040-PARENT@1：satisfied**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R021@1）

- expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。
- 依据：复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 VW-S021-AC001）。SUB-040 承担的部分见 VW-SUB040-AC001。B7（改判在一个投递轮次中提交时，投递泵仍按轮次开头的读数发出该行原文，E61）不在本行 expected 列举的项内，判在 Story 与 SUB-040 的 INHERIT-018。

### 2.11 INHERIT 行

同一 INHERIT 行在 Story 与两张子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-001"></a>
**VW-S021-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 的类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 db 与本分区（E11）。check:deps 0 违规（E06）；副本中 adapter 导入模块或 db、模块导入 ws 或 db、契约包导入包外路径、db 导入模块都报违规（E09，6 处）。新增运行时依赖只有 ws，esbuild 以 --external:ws 打包，dist 只 import "ws"（E07）。契约包新增 output/native-v1.ts 与 ports/output-port.ts 的导出，已有类型未改，CONTRACT_VERSION 仍为 "1"（E11）。端口只有平台中性的类型，ws 与 Fastify 只在 adapter 与组合层，不进业务模块。不引入托管服务或本机代理。远端部署与 WSS 终止本单未触及（S029）。

<a id="vw-sub039-inherit-001"></a>
**VW-SUB039-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 的类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 db 与本分区（E11）。check:deps 0 违规（E06）；副本中 adapter 导入模块或 db、模块导入 ws 或 db、契约包导入包外路径、db 导入模块都报违规（E09，6 处）。新增运行时依赖只有 ws，esbuild 以 --external:ws 打包，dist 只 import "ws"（E07）。契约包新增 output/native-v1.ts 与 ports/output-port.ts 的导出，已有类型未改，CONTRACT_VERSION 仍为 "1"（E11）。端口只有平台中性的类型，ws 与 Fastify 只在 adapter 与组合层，不进业务模块。不引入托管服务或本机代理。远端部署与 WSS 终止本单未触及（S029）。本单交付契约、帧、订阅注册表、传输、签发与撤销路由。

<a id="vw-sub040-inherit-001"></a>
**VW-SUB040-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 的类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 db 与本分区（E11）。check:deps 0 违规（E06）；副本中 adapter 导入模块或 db、模块导入 ws 或 db、契约包导入包外路径、db 导入模块都报违规（E09，6 处）。新增运行时依赖只有 ws，esbuild 以 --external:ws 打包，dist 只 import "ws"（E07）。契约包新增 output/native-v1.ts 与 ports/output-port.ts 的导出，已有类型未改，CONTRACT_VERSION 仍为 "1"（E11）。端口只有平台中性的类型，ws 与 Fastify 只在 adapter 与组合层，不进业务模块。不引入托管服务或本机代理。远端部署与 WSS 终止本单未触及（S029）。本单交付投递泵、补发规则、db 端口实现、协议文档与去重样例。

#### VW-R-006@1（INHERIT-006）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-006"></a>
**VW-S021-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，PENDING、SENT、EXPIRED、FAILED 由输出端以比较状态的写入改变（S1、S2、S9）；有效期，过期行不发、重连不补播，补发的新行只有 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

<a id="vw-sub039-inherit-006"></a>
**VW-SUB039-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单承担的心跳与断连成立：答 ping 的消费者保持连接（C1），不答 4408（C3），积压 4413（C4），撤销 4403（G8）；投递顺序、状态与有效期由 SUB-040 交付，同 Story 行：VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，PENDING、SENT、EXPIRED、FAILED 由输出端以比较状态的写入改变（S1、S2、S9）；有效期，过期行不发、重连不补播，补发的新行只有 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

<a id="vw-sub040-inherit-006"></a>
**VW-SUB040-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单承担的就是投递顺序、状态与有效期：VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，PENDING、SENT、EXPIRED、FAILED 由输出端以比较状态的写入改变（S1、S2、S9）；有效期，过期行不发、重连不补播，补发的新行只有 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-009"></a>
**VW-S021-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料：S021 不调用 AI，不构造模型输入（E11）。输出帧只带已批准的正文与译文，发送时从 Technical Log 的 MESSAGE_TEXT、TRANSLATION 证据读出，过期证据不读，不另存副本（output-store.ts readApproved，E60 D1）。日志只写状态、原因码与错误名，不含正文、URL 或凭据（E60 G11、E11）。凭据只存 SHA-256 摘要（G2）。本单不涉及会话、提示或工具轨迹，也不对清理作任何宣称。

<a id="vw-sub039-inherit-009"></a>
**VW-SUB039-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料：S021 不调用 AI，不构造模型输入（E11）。输出帧只带已批准的正文与译文，发送时从 Technical Log 的 MESSAGE_TEXT、TRANSLATION 证据读出，过期证据不读，不另存副本（output-store.ts readApproved，E60 D1）。日志只写状态、原因码与错误名，不含正文、URL 或凭据（E60 G11、E11）。凭据只存 SHA-256 摘要（G2）。本单不涉及会话、提示或工具轨迹，也不对清理作任何宣称。

<a id="vw-sub040-inherit-009"></a>
**VW-SUB040-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料：S021 不调用 AI，不构造模型输入（E11）。输出帧只带已批准的正文与译文，发送时从 Technical Log 的 MESSAGE_TEXT、TRANSLATION 证据读出，过期证据不读，不另存副本（output-store.ts readApproved，E60 D1）。日志只写状态、原因码与错误名，不含正文、URL 或凭据（E60 G11、E11）。凭据只存 SHA-256 摘要（G2）。本单不涉及会话、提示或工具轨迹，也不对清理作任何宣称。

#### VW-R-010@1（INHERIT-010）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s021-inherit-010"></a>
**VW-S021-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 没有改动这些模块（E11），它们的测试照常通过（E05、E08）。原生输出只读投递表与证据，不经推理适配器。完整判据由 VW-AC-010 承载。

<a id="vw-sub039-inherit-010"></a>
**VW-SUB039-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 没有改动这些模块（E11），它们的测试照常通过（E05、E08）。原生输出只读投递表与证据，不经推理适配器。完整判据由 VW-AC-010 承载。

<a id="vw-sub040-inherit-010"></a>
**VW-SUB040-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 没有改动这些模块（E11），它们的测试照常通过（E05、E08）。原生输出只读投递表与证据，不经推理适配器。完整判据由 VW-AC-010 承载。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-011"></a>
**VW-S021-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：签发在一次短事务内写 credential_refs 与 output_grants，撤销在一次短事务内设置两行的 revoked_at（E60 G2、G8）；输出端的状态变更 expireDue、markSent、recordSendFailure、markFailed 各是一次同步短事务，不跨 await，都是比较状态的写入（output-store.ts；S2、S9）；网络发送期间没有打开的事务。投递队列就是 deliveries 表，deliver 只唤醒，不写第二份意图，也不复制正文（index.ts）；正文只在 Technical Log 证据与内存中的帧里。消费者不能写（4400，C2），浏览器与 AI 不直写。没有迁移，表结构未改（E11）。

<a id="vw-sub039-inherit-011"></a>
**VW-SUB039-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：签发在一次短事务内写 credential_refs 与 output_grants，撤销在一次短事务内设置两行的 revoked_at（E60 G2、G8）；输出端的状态变更 expireDue、markSent、recordSendFailure、markFailed 各是一次同步短事务，不跨 await，都是比较状态的写入（output-store.ts；S2、S9）；网络发送期间没有打开的事务。投递队列就是 deliveries 表，deliver 只唤醒，不写第二份意图，也不复制正文（index.ts）；正文只在 Technical Log 证据与内存中的帧里。消费者不能写（4400，C2），浏览器与 AI 不直写。没有迁移，表结构未改（E11）。

<a id="vw-sub040-inherit-011"></a>
**VW-SUB040-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：签发在一次短事务内写 credential_refs 与 output_grants，撤销在一次短事务内设置两行的 revoked_at（E60 G2、G8）；输出端的状态变更 expireDue、markSent、recordSendFailure、markFailed 各是一次同步短事务，不跨 await，都是比较状态的写入（output-store.ts；S2、S9）；网络发送期间没有打开的事务。投递队列就是 deliveries 表，deliver 只唤醒，不写第二份意图，也不复制正文（index.ts）；正文只在 Technical Log 证据与内存中的帧里。消费者不能写（4400，C2），浏览器与 AI 不直写。没有迁移，表结构未改（E11）。

#### VW-R-012@1（INHERIT-012）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-012"></a>
**VW-S021-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-012 的本单部分成立：WebSocket 在升级前逐连接鉴权，每个心跳周期重读授权（E60 G6）；凭据只读、可撤销（G8、G9），不走查询串、Authorization、Cookie 或其它头（G5），日志与错误体不含凭据（G11、Q1–Q4）；签发与撤销要求频道所有者的 tokens.manage 与 CSRF，房管、数据管理员、其它频道所有者被拒（G3、G8）；房间由授权决定，频道隔离（G7）；原生凭据打不开任何 HTTP 路由（G10）；400、414、404 用固定响应体（Q1–Q3）。WSS 由部署终止，未验证（S029）。非阻断：服务端 maxPayload 仍是 ws 默认的 100 MiB，同一授权的连接数不限（M1、M2，judgment N3）。

<a id="vw-sub039-inherit-012"></a>
**VW-SUB039-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-012 的本单部分成立：WebSocket 在升级前逐连接鉴权，每个心跳周期重读授权（E60 G6）；凭据只读、可撤销（G8、G9），不走查询串、Authorization、Cookie 或其它头（G5），日志与错误体不含凭据（G11、Q1–Q4）；签发与撤销要求频道所有者的 tokens.manage 与 CSRF，房管、数据管理员、其它频道所有者被拒（G3、G8）；房间由授权决定，频道隔离（G7）；原生凭据打不开任何 HTTP 路由（G10）；400、414、404 用固定响应体（Q1–Q3）。WSS 由部署终止，未验证（S029）。非阻断：服务端 maxPayload 仍是 ws 默认的 100 MiB，同一授权的连接数不限（M1、M2，judgment N3）。

<a id="vw-sub040-inherit-012"></a>
**VW-SUB040-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单部分成立：投递泵只把一个频道的行发给该频道的订阅者（注册表按 channelId 取，E60 G7），不读授权，不接受消费者的任何数据；补发要 review.decide，数据管理员 denied（S6）。凭据、握手与 CSRF 由 SUB-039 与路由承担，见 Story 行。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s021-inherit-017"></a>
**VW-S021-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：到期与失败有真实去向，validUntil 已过的 PENDING 行比较状态改为 EXPIRED（E60 S2），发送失败 3 次为 FAILED（S9），已批准文本缺失为 FAILED（pump.test.ts）；表没有原因列，原因码未记录（设计 §13 已登记）。输出端不留正文副本（同 INHERIT-011）。重启后只按持久状态发送仍为 PENDING 且未过期的行，SENT 与 EXPIRED 不补播（S3）；改判放行写成 EXPIRED，不会被恢复自动发出（S7）。删除流程（S019）还没有写入方；E61 R3 显示一行在一轮之中被标 CANCELLED 后仍会发出，接入删除前要先按 B7 修复。

<a id="vw-sub039-inherit-017"></a>
**VW-SUB039-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：到期与失败有真实去向，validUntil 已过的 PENDING 行比较状态改为 EXPIRED（E60 S2），发送失败 3 次为 FAILED（S9），已批准文本缺失为 FAILED（pump.test.ts）；表没有原因列，原因码未记录（设计 §13 已登记）。输出端不留正文副本（同 INHERIT-011）。重启后只按持久状态发送仍为 PENDING 且未过期的行，SENT 与 EXPIRED 不补播（S3）；改判放行写成 EXPIRED，不会被恢复自动发出（S7）。删除流程（S019）还没有写入方；E61 R3 显示一行在一轮之中被标 CANCELLED 后仍会发出，接入删除前要先按 B7 修复。

<a id="vw-sub040-inherit-017"></a>
**VW-SUB040-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：到期与失败有真实去向，validUntil 已过的 PENDING 行比较状态改为 EXPIRED（E60 S2），发送失败 3 次为 FAILED（S9），已批准文本缺失为 FAILED（pump.test.ts）；表没有原因列，原因码未记录（设计 §13 已登记）。输出端不留正文副本（同 INHERIT-011）。重启后只按持久状态发送仍为 PENDING 且未过期的行，SENT 与 EXPIRED 不补播（S3）；改判放行写成 EXPIRED，不会被恢复自动发出（S7）。删除流程（S019）还没有写入方；E61 R3 显示一行在一轮之中被标 CANCELLED 后仍会发出，接入删除前要先按 B7 修复。

#### VW-R-018@1（INHERIT-018）

expected：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；不承诺不可控消费者网络严格只展示一次。 继续遵守 VW-R-018 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s021-inherit-018"></a>
**VW-S021-INHERIT-018@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60），另加 E61。前半句成立（同 AC001）。VW-R-018 的「输出获准必要展示字段；拦截仅无原文/身份的 WARD_BLOCKED，不输出分值/稳定 ID/审核对话」在常规路径上成立（E60 D1–D5、S1）。不成立的部分（B7）：投递泵每轮对一个频道只读一次可发送的行（delivery.ts:62），逐行 await 发送（:66），发后面的行之前只按新时钟查有效期，不再核对状态与所属裁决；markSent 的比较条件也只有 status 与 valid_until（output-store.ts:231）。某次发送不能同步写完时，这一轮后面的行就按旧读数发出。E61 R1 用真实应用、真实投递泵与真实 ws：一个消费者正常读取、另一个暂停读取；第 1 行写给慢消费者时，房管经 S014 把第 2 行改判为 BLOCK 并已提交（旧裁决 is_current=0，新裁决 BLOCK），26 ms 后正常的消费者收到第 2 行的 DELIVER 与被拦截的原文，该行标为 SENT，之后才收到改判的 WARD_BLOCKED。R2（受控，挂起一次发送）相同；R3：一行在该轮中被标 CANCELLED 后照样发出。对照：R4 时钟越过有效期时被跳过；副本中每行发送前重读一次可发送的行（fix-recheck）后 R1–R3 都成立，E60 其余各项不变。违反设计 §6 与协议文档 §6「只发送 PENDING、validUntil 未过、且属于当前裁决的行」、提案 §13.1 与 VW-R-018「拦截仅无原文/身份的 WARD_BLOCKED」。

<a id="vw-sub039-inherit-018"></a>
**VW-SUB039-INHERIT-018@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60），另见 E61。前半句成立（同 AC001）。本单承担的帧构造与传输部分成立：frameFor 对 BLOCK 只造 WARD_BLOCKED、不读正文，DELIVER 只带白名单字段（E60 D1–D3），传输只发出投递泵交给它的帧，不选行。B7（一轮之中被改判的行仍按旧读数发出原文）出在 SUB-040 的投递泵 delivery.ts 与 markSent，本单未触及；VOXWARD-STORY-021 与 SUB-040 的 INHERIT-018 判为 failed。

<a id="vw-sub040-inherit-018"></a>
**VW-SUB040-INHERIT-018@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：复用 VW-S021-AC001 的同次执行（E02–E08、E60），另加 E61。前半句成立（同 AC001）。常规路径上本单的投递泵只把 BLOCK 行交给帧构造为 WARD_BLOCKED，原文不进帧（E60 D2、S1）。不成立的部分（B7）：投递泵每轮对一个频道只读一次可发送的行（delivery.ts:62），逐行 await 发送（:66），发后面的行之前只按新时钟查有效期，不再核对状态与所属裁决；markSent 的比较条件也只有 status 与 valid_until（output-store.ts:231）。某次发送不能同步写完时，这一轮后面的行就按旧读数发出。E61 R1 用真实应用、真实投递泵与真实 ws：一个消费者正常读取、另一个暂停读取；第 1 行写给慢消费者时，房管经 S014 把第 2 行改判为 BLOCK 并已提交（旧裁决 is_current=0，新裁决 BLOCK），26 ms 后正常的消费者收到第 2 行的 DELIVER 与被拦截的原文，该行标为 SENT，之后才收到改判的 WARD_BLOCKED。R2（受控，挂起一次发送）相同；R3：一行在该轮中被标 CANCELLED 后照样发出。对照：R4 时钟越过有效期时被跳过；副本中每行发送前重读一次可发送的行（fix-recheck）后 R1–R3 都成立，E60 其余各项不变。违反设计 §6 与协议文档 §6「只发送 PENDING、validUntil 未过、且属于当前裁决的行」、提案 §13.1 与 VW-R-018「拦截仅无原文/身份的 WARD_BLOCKED」。出错的 delivery.ts 与 markSent 都是本单的交付。

#### VW-R-019@1（INHERIT-019）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s021-inherit-019"></a>
**VW-S021-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 没有改 apps/web（E11），只提供页面将来使用的原生协议；协议文档写了浏览器类消费者用页面地址的片段交付凭据，真实 OBS 与浏览器未验证（设计 §11）。显示昵称（label 恒为 null）与付费展示信息没有来源。完整判据由 VW-AC-019 承载。

<a id="vw-sub039-inherit-019"></a>
**VW-SUB039-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 没有改 apps/web（E11），只提供页面将来使用的原生协议；协议文档写了浏览器类消费者用页面地址的片段交付凭据，真实 OBS 与浏览器未验证（设计 §11）。显示昵称（label 恒为 null）与付费展示信息没有来源。完整判据由 VW-AC-019 承载。

<a id="vw-sub040-inherit-019"></a>
**VW-SUB040-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 没有改 apps/web（E11），只提供页面将来使用的原生协议；协议文档写了浏览器类消费者用页面地址的片段交付凭据，真实 OBS 与浏览器未验证（设计 §11）。显示昵称（label 恒为 null）与付费展示信息没有来源。完整判据由 VW-AC-019 承载。


## 3. VOXWARD-SUB-049（23 行，全部 satisfied）

<a id="s027-summary"></a>
### 3.0 SUB-049 实测摘要（必验项 2）

| 检查 | 7400f39 |
| --- | --- |
| V1 原样本集通过自身校验：73 条，每组至少 5 条（zh 11、ja 7、en 8、mixed 6、homophone 6、nickname-combo 8、cross-line 8、noise 6、evasion 7、false-positive 6） | 符合（E71） |
| V2 改坏的 8 种副本都被拒并给出原因：provenance 改成直播聊天导出、`contains_real_viewer_data: true`、重复 ID、跨条缺线程、非跨条带线程、未知路由、空正文、ja 组只剩 4 条 | 符合（E71） |
| V3 样本里没有 YouTube 频道 ID、URL、电子邮件、@ 账号、9 位以上数字串或 live chat ID；每个 senderRef 都是 `bench-` 占位 | 符合（E71） |
| Q 质量脚本两次运行与直接运行的输出 sha256 相同（`a50a0c39…9463`），且与实施自测记录的值相同 | 符合（E70） |
| Q 质量输出分别有 rules、realtime（synthetic、fakeCli）、sc（翻译关闭、开启无故障、注入多余条目）、review 四块，另有 crossLine 与 notMeasured；每个替身块 `qualityMeaningful: false` | 符合（E70） |
| L 延迟输出记录环境（平台、CPU 型号与核数、内存、Node、时间）、参数（73 条、静态 20 轮、批大小 10、并发 1/2/4、每档 24 批）、静态 P50/P95 0.160/0.244 ms、端到端三档 P50/P95 与吞吐、超时探针 RUN_TIMEOUT（539.9 ms）、输出过大 RUN_OUTPUT_TOO_LARGE | 符合（E70） |
| C 清理观察：成功、失败、校验失败、取消、超时五个场景残留运行目录 0、存活进程 0、`clean: true`，失败场景不泄露替身的 stderr 标记；异常重启后孤儿清理删除 1 个目录、终止 1 个进程、请求 1 次会话删除，之后为 0 | 符合（E70） |
| G 真实模型闸门：只给 `--real-model` 拒绝（退出 2）；参数加 `VOXWARD_BENCH_REAL_MODEL=1` 三个脚本都拒绝（本包没有真实绑定，退出 2）；只设环境变量照常只跑替身，输出与默认相同；未知参数退出 2 | 符合（E70） |
| R 本轮没有运行真实模型：垫片调用 0 次，基准运行没有任何网络连接，`docs/reports/` 不存在，检出 `git status` 0 行，基准 scratch 运行后为空 | 符合（E70） |

<a id="s027-samples"></a>
### 3.1 样本来源与覆盖

- 来源：样本与规则集由实施者为基准原创合成，`provenance: synthetic-authored`、`contains_real_viewer_data: false`；`SOURCES.md` 写明来源类别、不含真实观众与平台数据、不使用第三方数据集（将来引入须先登记来源、许可证与引用范围）、许可（与仓库相同；仓库没有 LICENSE 文件，因此仅限项目内部使用）、占位词清单与数据范围。禁词全部是占位（禁词甲、禁語乙/丙、bannedalpha、badword、扣分词丁），规则集 `rule-set.json` 的 provenance 同样写明。昵称是常见的虚构称呼，senderRef 是 `bench-…` 占位（V3）。这满足「合成样本，或许可明确允许的公开数据」中的前者。
- 期望标签分两层：`expected.route` 是规则层（完整消息含昵称）的真值，`expected.ai` 是只看正文的分类真值，`joint` 是跨条线程的整体期望；SOURCES.md 写明标签依据政策意图人工设定、不按运行结果回填。
- 覆盖：中文、日文、英文、混合文字、谐音（读音规则）、昵称组合（昵称命中、昵称加正文、昵称缺失）、跨条（3 个线程 8 条，其中 2 个线程整体应拦截），另有噪声、规避（零宽字符、全角、组合标记、空格、软连字）与误报近似词（V1）。跨条的整体期望只计数不计分，因为规则引擎逐条判定（quality `crossLine.scored: false`）。

<a id="s027-scripts"></a>
### 3.2 脚本复现与替身

- 默认只跑替身：实时用合成适配器（恒为 ALLOW_MEANINGFUL）与真实 kiro-cli 适配器配假 CLI（`bench/fixtures/fake-kiro-cli.mjs`，含 `badword` 判 BLOCK）；SC 的安全端口是假 CLI，翻译开启时用合成 SC 模型；复盘用合成审核输出。三个脚本里所有命令都是 `FAKE_CLI`（E11 的 `grep`），假 CLI 只导入 `node:fs`。替身用 `declareModels` 声明 `bench-declared-model` 以通过模型选择闸门，README 写明这不是能力声明。
- 可复现：质量输出不含时间与环境，两次运行逐字节相同，并与实施方工作树上的值相同，说明合并 S021 没有改变基准结果（E70）。延迟与清理输出含时间与环境，结构稳定。
- 结果的意义：替身结果只说明管线能跑通、输出稳定；`rules` 的 73/73 只对占位规则集成立；假 CLI 的分类是固定字符串规则。这些在 README「限制」与每个块的 `qualityMeaningful: false` 里都写明。
- 未测且写明原因：人工改判率、API 配额与单场费用（无真实模型）、跨条整体判定（引擎逐条）、复盘结算循环（未接线）、队列最老消息年龄（需要任务协调器接线）、真实账号内的会话留存与真实删除命令（SUB-050）。脚本里没有限流的替身模式（假 CLI 的模式是 ok、hang、fail、huge、no-text、not-json、invalid），费用与配额也没有采集位置，judgment N6。

<a id="s027-gate"></a>
### 3.3 真实模型默认关闭，本轮未运行真实模型

- 闸门在 `bench/lib/gate.ts`：只有给出 `--real-model` 时才检查，参数单独出现时拒绝并说明缺环境变量，参数加 `VOXWARD_BENCH_REAL_MODEL=1` 时也拒绝（SUB-049 没有绑定真实适配器，留给 SUB-050，Q60），都以 2 退出；经 pnpm 包装时退出码变为 1，错误文字不变（README 已写）。只设环境变量不改变任何行为（E70）。设计 §10 与 README 对「只给其中之一」的描述各有一半与实测不符，见 §1.2。
- 本轮的所有基准运行都在拦截与垫片下：没有网络连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用，没有用本机 Kiro 账号，没有连接 Kiro Crew 网关，没有写 `docs/reports/`（E70）。STORY-027 与 SUB-050 本轮不判。

### 3.4 VOXWARD-SUB-049 本单行

<a id="vw-sub049-ac001"></a>
**VW-SUB049-AC001@1：satisfied**（machine；要求 work:2aa6c8e36e17dd07df29f664#VW-SUB049-R001@1）

- expected：样本来源合法且有记录；脚本可复现并分别输出规则、实时、SC 与复盘结果。
- 依据：候选 7400f39：pnpm typecheck 含 bench:typecheck 退出 0（E04）；三个脚本在拦截与垫片下运行（E70）。样本来源合法且有记录：73 条全部由本项目合成（provenance synthetic-authored、contains_real_viewer_data false），不来自真实观众、平台或第三方数据集，禁词是占位词，昵称是虚构称呼，senderRef 是 bench- 占位；来源类别、作者、合成方法、许可（与仓库相同，仓库没有 LICENSE 文件，仅限项目内部使用）与覆盖矩阵写在 bench/samples/SOURCES.md；内容扫描没有 YouTube 频道 ID、URL、电子邮件、@ 账号、长数字串或 live chat ID（E71 V3）；校验对非合成来源、真实观众标记、重复 ID、跨条缺线程、非跨条带线程、未知路由、空正文、某组少于 5 条都报错（E71 V2）。覆盖 zh 11、ja 7、en 8、mixed 6、homophone 6、nickname-combo 8、cross-line 8（3 个线程）、noise 6、evasion 7、false-positive 6（V1）。脚本可复现：pnpm bench:quality 两次与直接运行的输出 sha256 都是 a50a0c3968e92914778ad4a9bc08f58aea6cd28671041ba6bd13b51a0d639463，与实施自测记录的值相同；latency 与 cleanup 含时间与环境，结构稳定（E70）。分别输出：quality 有 rules、realtime（synthetic、fakeCli）、sc（翻译关闭、开启、注入多余条目）、review 四块，另有 crossLine 与 notMeasured，每个替身块 qualityMeaningful=false（E70）。默认只跑合成适配器与假 CLI：只给 --real-model 时拒绝（退出 2），参数加 VOXWARD_BENCH_REAL_MODEL=1 时三个脚本也拒绝（本包没有真实绑定），只设环境变量时照常只跑替身、输出相同（E70）。本轮垫片调用 0 次、基准运行没有网络连接、没有写 docs/reports/、检出无改动（E70）。

<a id="vw-sub049-story"></a>
**VW-SUB049-STORY@1：satisfied**（machine；要求 work:58dd548e00e4c319dce50484#VW-S027-R001@1）

- expected：样本来源合法且有记录；脚本可复现并分别输出规则、实时、SC 与复盘结果。 本单只证明所承担部分；VOXWARD-STORY-027 的完整判据（VW-S027-AC001@1）保持。
- 依据：复用 VW-SUB049-AC001 的同次执行（E04、E70、E71）。本单承担的「合法样本来源；中日英/混合/谐音/昵称组合/跨条样本；规则/实时/SC/复盘分别评测」的样本与脚本部分成立（同 AC001）。跨条线程的整体期望只计数不计分（规则引擎逐条判定），复盘只测审核模型输出的契约与裁决一致性，结算循环未接（设计 §14，quality notMeasured）。本行只证明 SUB-049 承担的部分；VOXWARD-STORY-027 的完整判据 VW-S027-AC001 按简报本轮不判。

<a id="vw-sub049-parent"></a>
**VW-SUB049-PARENT@1：satisfied**（machine；要求 work:79b813cdbe785e9ab7d32228#VW-E006-R027@1）

- expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。
- 依据：复用 VW-SUB049-AC001 的同次执行（E70、E71）。expected 的记录项在本单交付中成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。scenario 中「所选模型」在代表性流量下的真实运行属 SUB-050（Q60），本轮未验证；脚本里超时与输出过大有替身探针，限流没有对应的替身模式（judgment N6）。

### 3.5 INHERIT 行

VOXWARD-STORY-027 的同名行本轮不判（简报），下列只有 SUB-049 的行。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-sub049-inherit-001"></a>
**VW-SUB049-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：bench 只按相对路径导入已有导出（契约包 index、moderation-engine 的 index 与 rules/groups、normalize、transliterate，inference-provider index，synthetic 与 kiro-cli 适配器、errors、orphan-sweep），与设计 §4 所列一致，不导入 apps/server/test（E11）；不改 apps/、packages/、vitest.workspace.ts 与 check-deps（E11）；没有新依赖，tsx 与 tsc 来自 apps/server 的开发依赖；根 package.json 只加 bench:* 脚本并把 bench:typecheck 并入 typecheck（E04、E11）。假 CLI 是测试替身，不是本机代理，不贯穿业务层。

#### VW-R-002@1（INHERIT-002）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-002"></a>
**VW-SUB049-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照本单与该需求对应模块（platform-source/youtube）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。基准不抓取 YouTube，样本全部合成（E71）。完整判据由 VW-AC-002 承载。

#### VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-003"></a>
**VW-SUB049-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：对照本单与该需求对应模块（moderation-engine）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。基准用真实规则引擎与占位规则集 bench-synth-v1（BLOCK 组归一化 3 条与受约束正则 1 条、REVIEW 组读音 1 条、DEDUCT 组精确 1 条），完整消息含昵称，rules 73/73 与期望一致（E70）；结果只对占位规则集成立。完整判据由 VW-AC-003 承载。

#### VW-R-004@1（INHERIT-004）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-004"></a>
**VW-SUB049-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：对照本单与该需求对应模块（scoring-engine）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。基准不计分、不写账本。完整判据由 VW-AC-004 承载。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-005"></a>
**VW-SUB049-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照本单与该需求对应模块（moderation-engine 的昵称与复盘、inference-provider 的复盘契约）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。昵称经引擎的昵称源接口给出；复盘只把合成输出交给 validateReviewBatch（契约拒绝 0、候选词 8），不入队、不结算（E70）。完整判据由 VW-AC-005 承载。

#### VW-R-006@1（INHERIT-006）

expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。 继续遵守 VW-R-006 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-sub049-inherit-006"></a>
**VW-SUB049-INHERIT-006@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。VW-R-006 的本单部分：并发档位 1、2、4 只是测量点，不固定子代理数；批大小 10 有界；超时探针 RUN_TIMEOUT（539.9 ms），输出过大 RUN_OUTPUT_TOO_LARGE（E70）。队列最老消息年龄未测，原因已写明（需要任务协调器接线）。

#### VW-R-007@1（INHERIT-007）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-007"></a>
**VW-SUB049-INHERIT-007@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：对照本单与该需求对应模块（decision-service）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。基准不做人工裁决、名单或词条操作。完整判据由 VW-AC-007 承载。

#### VW-R-008@1（INHERIT-008）

expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-sub049-inherit-008"></a>
**VW-SUB049-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。VW-R-008 的本单部分：实时假 CLI 经真实 kiro-cli 适配器与 validateModerationBatch；SC 经 runScBatch 的真实批次校验与生成文本检查，注入多余条目时 8/8 批被拒（OUTPUT_TOO_MANY_ITEMS），翻译开启时 8 条译文被规则拒绝（GENERATED_TEXT_REJECTED）；复盘经 validateReviewBatch；清理观察的校验失败场景为 RUN_OUTPUT_INVALID（E70）。

#### VW-R-009@1（INHERIT-009）

expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-sub049-inherit-009"></a>
**VW-SUB049-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。VW-R-009 的本单部分：实时与 SC 只把正文与 correlationId 交给适配器，由适配器换成临时 itemId（quality.ts），昵称与 senderRef 不进模型输入；假 CLI 日志与运行目录都在 $KIROCREW_SCRATCH/bench 下，每次运行后删除（E70：运行后该目录为空）；五个场景残留为 0，异常重启经孤儿清理后为 0；cleanup 的 notMeasured 写明真实账号内的会话留存未测，没有把应用清理说成提供方删除。

#### VW-R-010@1（INHERIT-010）

expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-sub049-inherit-010"></a>
**VW-SUB049-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。VW-R-010 的本单部分：替身用 declareModels 声明 bench-declared-model 只为通过模型选择闸门，README 写明不是能力声明，适配器本身未改；没有模型或 reasoning 建议，没有为未测模型排名；真实模型由 SUB-050 测（Q60）。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-sub049-inherit-011"></a>
**VW-SUB049-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：基准不打开数据库、不写 SQLite，不在队列或额外日志复制正文（E11）；假 CLI 日志只在本次运行的 scratch 里，运行结束删除（E70）。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-sub049-inherit-012"></a>
**VW-SUB049-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口与运行权限：基准不开端口、不读凭据、不接触输出凭据与权限模块（E11）；假 CLI 的环境只有 PATH、FAKE_KIRO_LOG、FAKE_KIRO_MODE，由适配器以精简环境启动；样本文本只作为批次条目的 text 字段进入替身，不当作命令；真实模型闸门默认关闭且本包拒绝真实运行（E70）。

#### VW-R-013@1（INHERIT-013）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-013"></a>
**VW-SUB049-INHERIT-013@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-013@1）

- 依据：对照本单与该需求对应模块（data-lifecycle-service 与数据面板）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。完整判据由 VW-AC-013 承载。

#### VW-R-014@1（INHERIT-014）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-014"></a>
**VW-SUB049-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：对照本单与该需求对应模块（记分例外相关的 moderation-engine、scoring-engine 与 data-lifecycle-service）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。完整判据由 VW-AC-014 承载。

#### VW-R-015@1（INHERIT-015）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-015"></a>
**VW-SUB049-INHERIT-015@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-015@1）

- 依据：对照本单与该需求对应模块（audit-store 的两类日志）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。基准不写 Change Log 或 Technical Log。完整判据由 VW-AC-015 承载。

#### VW-R-016@1（INHERIT-016）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-016"></a>
**VW-SUB049-INHERIT-016@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-016@1）

- 依据：对照本单与该需求对应模块（audit-store 的日志查看器）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。完整判据由 VW-AC-016 承载。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-sub049-inherit-017"></a>
**VW-SUB049-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与清理：每个脚本只在 $KIROCREW_SCRATCH/bench（未设置时为已被 .gitignore 忽略的 bench/.tmp）下建本次运行的目录，结束时删除；清理观察的残留统计与孤儿清理结果如实输出，不因结果改写判据（E70）。基准不持久化任何业务数据，不重建已删数据。

#### VW-R-018@1（INHERIT-018）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-018"></a>
**VW-SUB049-INHERIT-018@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- 依据：对照本单与该需求对应模块（output-adapter 与原生输出）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。完整判据由 VW-AC-018 承载。

#### VW-R-019@1（INHERIT-019）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-sub049-inherit-019"></a>
**VW-SUB049-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- 依据：对照本单与该需求对应模块（apps/web 的页面与 sandbox）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。完整判据由 VW-AC-019 承载。

#### VW-R-020@1（INHERIT-020）

expected：记录硬件、模型、配置、规模、并发、时间和清理观察；候选与实测分开，目标依据结果确定，无虚构速度/零留存保证。 继续遵守 VW-R-020 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-sub049-inherit-020"></a>
**VW-SUB049-INHERIT-020@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-020@1）

- 依据：复用 VW-SUB049-AC001 的同次执行（E70、E71）。前半句成立：latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。VW-R-020 的本单部分：合法来源（合成）；覆盖中日英、混合、昵称组合、噪声、跨条、规避，另有谐音与误报（E71 V1）；规则、实时、SC 与复盘分别评测；测静态与端到端 P50/P95、结构失败（注入故障）、误拦漏检；队龄、改判、配额与费用列为未测并写明原因；注明硬件、替身名、规模、并发与时间（E70）。替身结果不代表模型质量；真实模型测量属 SUB-050（Q60）。


<a id="scope"></a>
## 4. 未验证与范围说明

- 真实 OBS Browser Source 与真实浏览器的片段（`#`）凭据流程：没有页面，未验证（设计 §11）；样例只在本机 127.0.0.1 复现。WSS 终止与反向代理在部署时验证（S029）。
- 负载与延迟：心跳 15 s、pong 10 s、积压 1 MiB、写超时 5 s、关闭宽限 1 s、每 250 ms 一轮、每轮 50 行、过期每轮 500 行、3 次失败都是自定值，本轮只验证了行为，没有做负载测量。4413 的「发送前已排队超过 1 MiB」分支没有单独触发（§2.3）。
- 显示昵称（`display.label` 恒为 null）、付费展示信息、FAILED 的原因码：来源缺口，设计 §11、§13 已登记。`deliver()` 唤醒没有接入注册表，投递只靠 250 ms 计时器（设计 §8）。
- 删除流程（S019）还没有写 CANCELLED 的地方；E61 R3 用直接改表模拟。
- 多进程部署：订阅注册表在进程内，撤销路由只关闭本进程的连接，其它进程靠心跳复查；本轮只验证单进程。
- SUB-049：真实模型、真实 kiro-cli 3.x、真实账号内的会话留存属 SUB-050（Q60）；替身分类能力不代表模型质量。限流、费用与配额没有替身或采集位置（judgment N6）。
- STORY-027 与 SUB-050 的行本轮不判、不出证据行。S019 在另一个工作树，不在本轮范围。
- 测试通过与本轮机器结果不替代 Owner 对 OBS 与舞台效果的目视验收（VOXWARD-STORY-030）。
