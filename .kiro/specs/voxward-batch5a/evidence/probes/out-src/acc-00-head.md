# 第 5a 批独立验收记录（S006、S008 复验；S017、S018 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `b1a1471`（`b1a147172ff4ca26e024f4f2d2111814d3ca0923`）。基线 `fa5dc19` 之上先有三个 master 提交（`3e30cd1`、`233467a`、`c19c9c7`），再依次合入 `voxward/s006-fix`（合并提交 `73a595b`）、`voxward/s008-fix`（`2280e6c`）、`voxward/s017-log-viewer`（`046bbfa`）、`voxward/s018-data-panel`（`b1a1471`；`apps/server/src/app.ts` 与 `apps/web/vite.config.ts` 有冲突，主线程保留了两侧的 import、路由注册与代理）。相对 `fa5dc19`：`.kiro/` 之外 109 个文件，+10399/−231 行；新增迁移 `0004_data_request_kinds`；`apps/web/package.json` 与锁文件增加 `@voxward/contracts` 工作区依赖；`CONTRACT_VERSION` 仍为 `"1"`。
- 检出：`$KIROCREW_SCRATCH/vw-int-b5a`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移出，冒烟后放回并核对 sha256。探针、假 CLI、外连拦截、联调夹具与浏览器脚本都在 `$KIROCREW_SCRATCH/vw-accept-b5a-work/`，只按绝对路径导入检出内源码；副本与原始输出另放在交付目录的 `probes/`。联调夹具的数据库只在 work 目录。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0，kiro-cli 3.2.0（`~/.local/bin/kiro-cli` 的修改时间是 2026-11-11 02:20，第 4 批验收时为 3.1.0，见 judgment N2），Chrome for Testing 149.0.7827.55 headless shell。所有服务只绑 127.0.0.1。时间 2026-11-11（UTC）。
- 工单读数（E01）：库版本 20941，headEventHash `07b3d1b48be262e8…bed4ee47760fb1e2226002`，11 单相同。简报写「一共 10 张单」，但工单表列出 11 张（S006 组 2、S008 组 3、S017 组 3、S018 组 3），本轮按表覆盖全部 11 张。修订号：STORY-006 rev 5、SUB-012 rev 4、STORY-008 rev 6、SUB-015 rev 5、SUB-016 rev 5、STORY-017 rev 4、SUB-031 rev 3、SUB-032 rev 3、STORY-018 rev 4、SUB-033 rev 3、SUB-034 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空。S006 组与 S008 组的 `content.evidence` 是第 4 批 c67db24 的行（11、12、11、12、12 行），S017 组与 S018 组为空。共 134 行验收：STORY-006 11、SUB-012 12、STORY-008 11、SUB-015 12、SUB-016 12、STORY-017 12、SUB-031 13、SUB-032 13、STORY-018 12、SUB-033 13、SUB-034 13。
- D1：S008 组 18 行已按 minutes:8fc0b8640384844e0b2a1787#D1 升为第 2 版（STORY-008 的 AC001、PARENT、INHERIT-009/010/012/017；SUB-015 的 PARENT、INHERIT-009/010/012/017；SUB-016 的 AC001、STORY、PARENT、INHERIT-009/010/012/017），方法改为「固定版本 kiro-cli 3.1.0 的假 CLI 替身调用、输入/文件观察与故障清理演练。真实 Kiro 调用未验证，移到 VOXWARD-STORY-029 部署演练」。本轮按第 2 版判定。子单 PARENT 与 INHERIT 行共 74 行，机械比对 expected、method、requirement、版本与去掉「继承自」后缀的场景，与所属 Story 对应行逐字相同；只有 S008 组 10 行的后缀「继承自 … @1」和 SUB-015、SUB-016 的 STORY 行 expected 中的「VW-S008-AC001@1」没有随 D1 改成 @2（judgment N12）。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现，也没有做过第 4 批验收。四份自测证据与集成日志只作参考，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 4 批）：`satisfied` 表示该行 expected 的每一部分在候选 `b1a1471` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时，按候选上的整体结果判定，并写明本单承担的部分。本单没有触及的部分写「本单未触及」并指向承接单。方法允许替身或写明真实调用未验证的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：134 行中 132 行 satisfied、2 行 failed。STORY-006 组 21 行 satisfied、2 行 failed（B3）；STORY-008 组 35/35 satisfied；STORY-017 组 38/38 satisfied；STORY-018 组 38/38 satisfied。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-b5a-work/`（会话临时目录，会被回收），副本在交付目录 `probes/`，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/vw/int-b5a.log`、`smoke-dev.log`、`smoke-dist.log`（复核，不作唯一依据） | 0 ×5 | install、build、typecheck、test 941/941、check:deps 162 个文件 0 违规，冒烟两次 200；与本轮 E02–E07 一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <11 个 KEY>`，输出重定向后用 node 提取 | 0 ×11 | 约 103 s，每份 1.91–2.09 MB。库版本 20941，headEventHash 十一单相同；行数与版本见文首。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 151.2 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、web、server 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `pnpm test` | 0 | 88 个文件、941 项，约 24 s。本批相关：normalize 18、transliterate 8、rules/engine 27、groups 14、truth-table 106、router 15、states 19、classification 20、exception-queue 6、moderation-engine 7、regex-cost 11、bounded-regex 35；kiro-cleanup 的 cleanup 11、crash-drill 1、lifecycle 8、orphan-sweep 12，kiro-cli 的 capabilities 2、command 5、input-builder 5、provider 16、run-stream 10，synthetic 7，contracts inference-provider 4，batch-contract 23；audit-store/viewer 的 cache 7、permissions 8、queries 9，auth/log-viewer-routes 10，web pages/logs 的 api 9、chain-navigation 6、json-panel 5、untrusted-isolation 4；data-lifecycle-service 7 个文件 46 项（含 routes 7），db/data-request-store 8、db/data-requests-migration 2、db/schema 32、db/migrate 5，web pages/data 的 DataPanel 9、api 5、flow 6。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 162 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/e07/logs`，结束后移走新建的库、放回原库并 `sha256sum -c` | 0 | `pnpm dev` 1 s 内 `/healthz` 200，`VOXWARD_ADAPTERS=synthetic node dist/main.js` 1 s 内 200；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；停止后 3000/5173 无监听、无残留进程；原库放回后 sha256 OK。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，四份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 1、1、0、0 | 共 182 s。`voxward-s006-routing`：SPEC_STALE，rev 5，previousSourceDigest `831e7e6e…7d15` → sourceDigest `d4174fb2…4545`；`voxward-s008-kiro-provider`：SPEC_STALE，rev 6，`2ffa5624…f6af` → `bd716111…cb81`；`voxward-s017-log-viewer`：SPEC_CURRENT，rev 4，`18a74aab…4e9b`；`voxward-s018-data-panel`：SPEC_CURRENT，rev 4，`74bf9dac…775b`。四份 tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 127 个文件 sha256 不变。 |
| E11 | `kiro-cli --version`；`kiro-cli chat --help`（只允许这两条，没有运行推理） | 0 ×2 | `kiro-cli 3.2.0`；help 141 行。仍列出 `--no-interactive`、`--output-format <text\|stream-json>`（stream-json 为 the run's ACP events as JSON Lines）、`--agent-engine`（v2、v1、v3）、`--trust-tools <TOOL_NAMES>`（`--trust-tools=` 表示不信任任何工具）、`-a/--trust-all-tools`、`-r/--resume`、`--resume-id`、`--trust-workspace`、`--cloud`、`--repo`、`-l/--list-sessions`（当前目录已保存的会话）、`-f/--format`（plain、json、json-pretty，用于 list 命令）、`-d/--delete-session <SESSION_ID>`、`--session-source <v1\|v2>`；没有 `--sandbox`。相对第 4 批记录的 3.1.0 新增 `--resume-picker`、`--sessions`、`--all-cwds`、`--list-models`、`--mode` 等。 |
| E20 | `apps/server/node_modules/.bin/tsx $W/probe-s006.mts <检出> <work>`；对照副本由 `git archive f4808fb` 与 `git archive fa5dc19` 导出到 work（`fa5dc19` 的规则代码即第 4 批被打回的 c67db24） | 1 | 66 项检查，62 项符合预期，4 项不符，都是 B3 的输入：半角 ﾊﾞｶ，以及组合浊点前夹 U+200B、U+2060、U+00AD 的三种写法。真值表、路由器、转写表、Q12 全部符合。明细见 §2.0。 |
| E21 | `tsx $W/probe-s006-hw.mts <检出> <work>`；`tsx $W/hw2.mts <检出> <work>` | 0 ×2 | B3 补充取证：10 组输入在三个版本上的结果，候选 9 组与期望不符；扣分规则 カス 命中「ｶﾞｽ代が高い」；转写表 {ガ: ga, カ: ka} 把 ｶﾞｶ 读成 kaka 且标为完整。明细见 §2.1。 |
| E30 | `cd apps/server && tsx $W/probe-s008.mts <检出> <work>`（自写假 CLI `$W/s008/fake-kiro.mjs` 记录 argv、cwd、环境键与 stdin；崩溃演练用子进程 `$W/s008/crash-child.mts`） | 0 | 38/38 符合预期，约 4 s。执行后没有残留的假 CLI 进程与运行目录。明细见 §3.0。 |
| E31 | 外连与真实 CLI 拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 88 个文件 941 项通过。拦截模块在 116 个 Node 进程中加载（改写 `net.Socket.prototype.connect`、`dns.lookup` 与 `fetch`，非回环一律拒绝）。被拒连接 0 次，非回环 fetch 0 次，回环连接 13 次，IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截返回 ENOTFOUND，启动失败用例照常通过）。PATH 最前的 `kiro-cli` 垫片调用 0 次。拦截先自检：对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 连接全部被拒。 |
| E32 | `tsx $W/q24.mts <检出>` | 0 | Q24 边界：2 条输入对 1 万条输出只报 1 条 OUTPUT_TOO_MANY_ITEMS（1.8 ms）；60 条错误 itemId 截为 50 条，末条 ERRORS_TRUNCATED，不回显模型给的 itemId；64 个 emoji 的 itemId 通过，65 个报 INPUT_ITEM_ID_LENGTH_INVALID。批结果校验代码本轮未改。 |
| E40、E50、E70 | 联调夹具 `$W/harness.mts`：全新 SQLite（work 目录）跑完迁移、写入合成数据，用真实 `buildApp` 监听 127.0.0.1:3000，另开 127.0.0.1:3901 控制口代替尚未接线的删除路径（调用 S016 的 `removeSubject`）与执行路径（写入部分失败）；`apps/web` 下 `vite` 监听 127.0.0.1:5173。再运行 `tsx $W/probe-http.mts <work>`，大部分请求经 Vite 代理发出 | 0 | 47/47 符合预期：跨包 3 项（E70），S017 22 项（E40），S018 22 项（E50）。明细见 §1.3、§4.0、§5.0。 |
| E41、E51 | 同一夹具重新建库后运行 `node $W/browser-test.mjs <work> <chrome-headless-shell>`：CDP 驱动 Chrome for Testing 149，每个角色一个独立浏览器上下文，点击用 `Input.dispatchMouseEvent`，输入用 `Input.insertText` | 0 | 30/30 符合预期：S017 20 项（E41），S018 10 项（E51）。本机不允许非特权用户命名空间，Chrome 需要 `--no-sandbox`，只加载本机合成页面。headless shell 没有中文字体，截图里的中文显示为空白或方框，所以断言读的是 DOM 文本，截图只作辅助。 |
| E52 | `tsx $W/owner-dataadmin.mts <检出> <work>` | 0 | 同一账号先授予 CHANNEL_OWNER，再插入第二条有效授权：`UNIQUE constraint failed: channel_members.channel_id, channel_members.account_ref`；经 `grantMembership` 授予 DATA_ADMIN 后，CHANNEL_OWNER 行被撤销，账号只剩 subject.evidence、data.handle。 |
| E60 | `tsx $W/probe-migrate.mts <检出> <work>` | 0 | 15/15 符合预期。明细见 §1.2。 |
| E61 | 在 `apps/server` 下：`./node_modules/.bin/drizzle-kit check`；把 `src/db/migrations` 复制到 work 后用相对路径 `drizzle-kit generate --dialect sqlite --schema ./src/db/schema/index.ts --out <副本>` | 0 ×2 | `Everything's fine`；`No schema changes, nothing to migrate`，副本与源目录 `diff -r` 为空。 |
| E71 | 停掉夹具后，`VOXWARD_ADAPTERS=synthetic VOXWARD_DATABASE_FILE=<work>/e71/main.sqlite3 node dist/main.js`（cwd `apps/server`），经 Vite 与直连各请求 7 个路径 | 0 | `/healthz` 200；`/auth/session`、两个查看器路由、两个数据路由都是 401 `UNAUTHENTICATED`（已注册，不是 404）；未知路径 404 `{"error":"NOT_FOUND"}`。结束后 3000、3901、5173 无监听，无残留进程。 |

## 1. 共同检查

<a id="spec"></a>
### 1.1 Spec 状态与设计、代码一致性

- S006 与 S008 为 SPEC_STALE，S017 与 S018 为 SPEC_CURRENT（E10）。S006 的 rev 4→5 来自第 4 批链写证据，S008 的 rev 4→6 来自链写证据与 D1 改版；返工分支没有刷新 spec。这两份的 SPEC_STALE 属简报所说的预期情况，需要继续使用当前 spec 时按 Q11 用 `refresh --approved-in` 刷新。check 没有改动任何 spec 文件。
- S006：§1、§3、§5 的迁移编号与升级说明已改为 0003 与「从 0000–0002 升级」，§4.9 的提示文案改为代码原文（第 4 批 N9）；§3 写明开发库按旧编号建成时应删除重建（第 4 批 N10）；§4.3 的真值表顺序与提案 §4 流程图一致（第 4 批 N1，E20 §3）。不一致处：§4.8 写「U+3099、U+309A 保留，经 NFKC 重新组合」，这只在组合浊点与前一个假名处于同一单元时成立，半角浊点与被格式字符隔开的浊点不成立（B3）。§4.8 自报的残余风险（正则 badword 不命中 ba 加 U+0301 加 dword）与 S004 基线 f4808fb 相同，已如实写明。
- S008：§3 关于 `command.ts` 环境变量的描述已与代码一致（第 4 批 N9），§9 补了 N4 的结果项说明。不一致处：§9 自称「与上文不一致处以本节为准」，却仍写「孤儿扫描：进程仍存活的目录跳过，不强制终止进程」与「`deploy/kiro-runtime/` 没有 agent 配置模板」，与返工后的代码、`deploy/kiro-runtime/README.md`、`docs/security/ai-retention-boundary.md` 相反；§2 记录的是 3.1.0 的帮助，本机已是 3.2.0（judgment N1、N2）。
- S017：§2 依赖方向、§3 布局偏离（`audit-store/viewer/` 代替 `audit/`）、§4 端口与路由、§5 可见性、§6 分页（默认 50、最多 100）、§7 缓存、§8 前端都与代码和 E40、E41 一致。§10 说前端只有单元级测试、没有启动真实浏览器，这是自测范围；本轮补做了真实浏览器交互（E41）。查看器显示的契约版本取读取时的常量（judgment N5）。§9 写明列表查询没有专用索引、性能未测，本轮也未测。
- S018：§2 布局、§3 依赖方向、§4 迁移与状态、§5 接口、§7 两种删除的登记语义、§9 受控材料、§10 不可信文本都与代码和 E50、E51、E60 一致。不一致处：§6 写「主播处理数据需同时持有 DATA_ADMIN」，而 `channel_members` 一账号一频道只能有一条有效授权，同一账号做不到（E52，judgment N7）。

<a id="migrations"></a>
### 1.2 迁移、journal、快照与数据字典

- journal 为 `0:0000_initial`、`1:0001_auth_sessions`、`2:0002_audit_log_fields`、`3:0003_drop_subject_nickname_checks`、`4:0004_data_request_kinds`，idx 连续，`when` 严格递增（0004 为 1794369600037），每条对应一个 SQL 文件；快照 prevId 成链（`9f371f59` 的 prevId 为 0003 的 `36fae55f`），表数 24、27、27、26、26（E60）。
- 0004 用临时表重建 `data_requests`：新增 `request_kind`（回填 `DELETE`）、`verification_method`，`mode` 改为可空，新增索引 `data_requests_subject_idx` 与 4 个 CHECK；开头设 `PRAGMA defer_foreign_keys = ON`，使 `data_request_items` 的外键在提交时检查。
- 升级（E60）：分别停在 0000、0001、0002、0003 的库，各写入频道、主体、一条 `DELETE_AND_EXCEPT` 请求、一条删除目标与一条技术日志，升级到 0004 后迁移记录 1/2/3/4→5，表数 26，原有行都在，请求的 `request_kind` 为 `DELETE`、`mode` 保留、`verification_method` 为空，删除目标仍指向该请求，`integrity_check` 为 ok，外键检查 0 处，没有 `subject_nickname_checks`。
- 空库到 0004：26 张表、5 条迁移记录、WAL；再跑一次不变。新增 CHECK 实测：删除请求缺 mode、访问请求带 mode、VERIFIED 无核验方式、未知类别都被拒绝（E60）。
- 失败回滚：停在 0003 的库里有一条 `VERIFIED` 但没有核验方式的旧行时，升级因 CHECK 失败，整体回滚：仍为 4 条迁移记录，表仍是旧形状，行还在，没有残留临时表（E60）。S018 设计 §4.1 预先写明了这一点；S002 没有写入路径，现有部署中该表为空。
- 数据字典与实库逐项核对（E60）：26/26 张表、211 列（类型与可空）、43 个索引（普通、唯一、部分唯一）、55 个 CHECK 名称、36 个外键，0 处差异；字典开头写「26 张表」。`drizzle-kit check` 为 `Everything's fine`，对副本 `generate` 无变化（E61）。字典开头的范围句没有提到 0002 与 0004，`data_request_items` 的目标种类仍含已删表对应的 `NICKNAME_CHECK`，都不影响一致性。

<a id="cross"></a>
### 1.3 跨包接线（必验项 5）

- `app.ts` 合并结果：两侧 import 都在；`database` 存在时依次注册 `authRoutes`、查看器（`createViewerCache` 加 `createLogViewer`，`onClose` 时释放缓存）与 `logViewerRoutes`、`dataLifecycleRoutes`。`main.ts` 传入数据库，所以打包产物与 `pnpm dev` 都注册这些路由：E71 中两组路由未登录时都是 401，不是 404。
- 两组路由互不影响（E70）：查看器路由的坏参数与数据路由的坏请求体各自返回 400 `{"error":"INVALID_REQUEST"}`，两个插件的错误处理器各在自己的作用域；未知路径走固定 404。同一个夹具里，查看器与数据面板的全部 HTTP 检查与浏览器检查都通过（E40、E41、E50、E51）。
- Vite 新增的三个代理（`/internal`、`/auth`、`/channels`）都能用（E70）：经 127.0.0.1:5173 请求 `/healthz`、`/auth/session`、`/internal/channels/channel-1/logs/technical`、`/channels/channel-1/data/capabilities` 都是 200，与直连 3000 相同；浏览器中经 `/auth/login` 拿到会话 Cookie，两类页面都经代理取数（E41、E51）。
- 衔接缺口：查看器缓存的失效总线由 `buildApp` 自建，`main.ts` 不传 `invalidation`，以后的删除路径若另建总线，查看器缓存不会失效（judgment N4）；孤儿扫描与 Kiro 适配器尚未接入组合根（judgment N3）。

<a id="smoke"></a>
### 1.4 启动冒烟

默认配置（不设 `VOXWARD_DATABASE_FILE`）下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后无监听、无残留进程（E07）。

<a id="isolation"></a>
### 1.5 外连与真实 CLI

全量测试在外连拦截下通过，对外部主机 0 次连接，真实 `kiro-cli` 0 次调用（E31）。本轮只运行了 `kiro-cli --version` 与 `kiro-cli chat --help`（E11），没有用任何 Kiro 账号推理。
