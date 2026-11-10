# VOXWARD-STORY-001 第 1 批独立验收记录

- 候选：本地 main `ffa1ddc`（`ffa1ddc6f15a8ae8945cd5b511a944dcafa9a891`），即 `a0b9ed4`（main）与 `voxward/s001-skeleton` 的合并；分支提交为 `3c94ba6` SUB-001、`4ea44a6` SUB-002、`14dd8ed` SUB-003。
- 检出：独立干净检出，detached at `ffa1ddc`，验收前未 install。验收全程 `git status` 干净；负面对照用的临时文件均已删除并复核。
- 环境：Linux 7.0.0-29-generic x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。所有服务只绑 127.0.0.1。时间 2026-11-10（UTC）。
- 工单读数（E01）：同一库版本 20743、headEventHash `95d01a7523d7…6510`。VOXWARD-STORY-001 rev 4，VOXWARD-SUB-001/002/003 rev 3，四单均为 active，`content.evidence` 均为空。
- 验收人：独立验收兼判断子代理（main 档，kiro / claude-opus-5.5 / max），未参与实现。实施方的 `self-check.md` 只作参考，下列结论来自本次实测或源码审查。
- 判定口径：`satisfied` 表示该行 expected 在候选 `ffa1ddc` 上对本单贡献成立，并有实测或审查依据。INHERIT 行按其 expected 判定；本单没有触及的行为一律写「本单未触及」，并指向承担实施或完整验证的责任单，不当作已通过。本轮没有 `failed` 或 `unverified` 行。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在会话临时目录 `$KIROCREW_SCRATCH/vw-accept-b1-work/`，会被回收，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | `node ~/.einzbern/engine/einzbern.mjs work-show --workspace "<Ether>" --external-key <KEY>`，对 STORY-001、SUB-001、SUB-002、SUB-003 并行执行，输出重定向到文件后用 jq 提取 | 0 ×4 | 墙钟 43 s。STORY-001 有 11 行验收，三张子单各 12 行。三张子单的 PARENT/INHERIT 行与 STORY-001 对应行逐字一致（规范化后 sha256 均为 `38be9c1e…`）。 |
| E02 | `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；157 个包；esbuild postinstall Done。安装后锁文件未变。 |
| E03 | `pnpm build`（即 `pnpm -r run build`） | 0 | contracts `tsc -p` Done；server esbuild 输出 `dist/main.js` 8.3kb（fastify、zod 外置）；web `vite build` 转换 39 个模块，`dist/assets/index-*.js` 315.33 kB。 |
| E04 | `pnpm typecheck`（即 `pnpm -r run typecheck`） | 0 | web、contracts、server 三包 `tsc -p tsconfig.json` 均 Done。contracts 与 server 的 tsconfig `include` 含 `test/`。 |
| E05 | `pnpm test`（即 `vitest run`，workspace 含 contracts 与 server）；另以 `--reporter=verbose` 复跑列出用例名 | 0 | 5 个文件、41 项通过：contracts 16；server 25（adapters 7、boundary 3、config 13、app 2）。有 `vitest.workspace.ts` 弃用提示。 |
| E06 | `pnpm check:deps`（即 `node scripts/check-deps.mjs`） | 0 | `check-deps: ok, 38 files checked, 0 violations` |
| E07 | `pnpm dev` 启动冒烟：脚本用 setsid 启动，探测后停止整个会话 | 0 | 约 1 s 就绪。`GET 127.0.0.1:3000/healthz` 200 `{"status":"ok"}`；`GET 127.0.0.1:3000/events` 404；`GET 127.0.0.1:5173/` 200，HTML 含 `<div id="root"></div>` 与 `/src/main.tsx`；`127.0.0.1:5173/healthz`（Vite 代理）200；`/src/main.tsx`、`/src/routes.tsx`、`/src/pages/home/route.tsx`、`/src/pages/home/HomePage.tsx` 均 200 `text/javascript`。监听只有 `127.0.0.1:3000`（pid 127939，tsx 子进程运行 `src/main.ts`）与 `127.0.0.1:5173`（pid 127905，vite），没有非回环监听。停止后会话 127842 无进程，3000/5173 无监听，检出路径下无残留进程。本次日志无 Pre-transform error。 |
| E08 | 配置失败：在 `apps/server` 下以 `env -i PATH=… HOME=… <变量> timeout 15` 分别运行 `node dist/main.js` 与 `./node_modules/.bin/tsx src/main.ts`，各 9 例（见下表） | 1 ×18 | 18 例 stdout 均为 0 字节，stderr 只有一行；植入的取值（`sk-live-SECRET-ENV-123`、`tok-SECRET-FILE-456`、`tok-SECRET-MALFORMED-789`、`super-secret-value`）在输出中命中 0 次；之后 3000/4321 无监听。两个入口结果逐例相同。 |
| E09 | 合法启动：`env -i … VOXWARD_ADAPTERS=synthetic node dist/main.js`；`env -i … VOXWARD_CONFIG_FILE=<adapters=synthetic, port=4321 的 JSON> node dist/main.js` | SIGTERM 后 0 | 两次均 `/healthz` 200 `{"status":"ok"}`、`/events` 404；分别监听 `127.0.0.1:3000`、`127.0.0.1:4321`；SIGTERM 后退出码 0，端口释放。附带观察：`VOXWARD_HOST=not-a-host.invalid` 通过 schema，listen 时抛出未捕获的 `getaddrinfo ENOTFOUND` 并打印堆栈，退出码 1（非阻断，见 judgment N2）。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，两份并行；脚本与检出内副本 sha256 相同（`59ee6d70…`） | 0 ×2 | voxward-s001-skeleton：`SPEC_CURRENT`，work:674c24794f9a1fb626eb2ad1 workRevision 4，sourceDigest `4ad1f8b4…aa1c`（等于 previousSourceDigest）。voxward-core-contracts：`SPEC_CURRENT`，work:29efe5676405320e83378661 workRevision 3，sourceDigest `3ec8dcf6…75c0`。两者 `tasksCheckedLocalOnly` 为空；check 前后 spec 文件 sha256 不变。墙钟 154 s。 |
| E11 | check-deps 负面对照：临时放入 13 个违规文件后运行 `node scripts/check-deps.mjs`，删除后复跑 | 1，复跑 0 | 报出 13 处：模块导入 fastify（值导入、type-only、类型位置 `import("fastify")`）；模块多行 `export { z } from "zod"`；模块跨引 `../scoring-engine/index.js`；模块引用 adapters；adapter 引用模块；contracts 引用 `node:fs`、`zod`、apps/server；web 引用 apps/server 相对路径与 `@voxward/server`；未归区文件。未报出两处：模块内 ``import(`fastify`)``（文件被扫描，模板字符串未匹配）；模块内 `.mts` 文件（不在扫描扩展名内，扫描数 50 = 38 + 12）。删除后 `ok, 38 files checked, 0 violations`。 |
| E12 | 类型级负面对照：临时 `packages/contracts/test/__accept_tmp_typelevel.test.ts`，对不含 contractVersion 的记录断言 `toHaveProperty("contractVersion")`，并把 `DeliveryIntent["verdict"]` 断言为含 REVIEW；在 `packages/contracts` 运行 `tsc -p tsconfig.json` | 2，删除后 0 | `TS2345`（contractVersion 不存在）与 `TS2344`（verdict 不含 REVIEW）。证明 `contracts.test.ts` 的 expectTypeOf 断言由 `pnpm typecheck` 强制，`vitest run` 本身不检查类型。 |
| E13 | 单独运行替身与契约测试：`./node_modules/.bin/vitest run apps/server/test/adapters/synthetic.test.ts apps/server/test/boundary/synthetic-flow.test.ts`；`pnpm --filter @voxward/contracts test` | 0，0 | 10/10；16/16。 |
| E14 | 源码审查（静态，含 grep 机械核对） | — | contracts：25 个导出 interface 除 `Versioned` 自身外全部 `extends Versioned` 或 `VersionedModule<…>`；`VoxwardError = Versioned & (…)`；全部导入为包内相对路径；package.json 无 `dependencies`；kiro/raw/frame/sdk/session/payload/平台名词汇只出现在两处职责注释。server：九个模块 `index.ts` 与三个合成适配器只导入 `@voxward/contracts`；fastify 只在 `app.ts`，zod 只在 `config/schema.ts`。src 无文件写入或持久化调用；唯一网络调用是前端同源 `fetch("/healthz")`；源码无密钥样式字面量（仅测试中的 `super-secret-value`）。提案文件 sha256 `cad909c1…33ee` 与 INIT 基线一致，§9.3 在第 371-385 行。 |
| E15 | `git log` / `git diff --name-status ffa1ddc^1 ffa1ddc` | 0 | 相对 `a0b9ed4` 新增 66 个文件、4388 行，全部落在 SUB-001/002/003 的交付路径与两份 Spec；未改 steering、AGENTS、harness 等治理文件。 |

E08 用例与 stderr（两个入口相同）：

| 输入 | stderr |
| --- | --- |
| 未设 `VOXWARD_ADAPTERS` | `CONFIG_INVALID: adapters (required key is missing)` |
| `VOXWARD_PROT=4000` | `CONFIG_UNKNOWN_KEY: VOXWARD_PROT` |
| `VOXWARD_API_KEY=sk-live-SECRET-ENV-123` | `CONFIG_UNKNOWN_KEY: VOXWARD_API_KEY` |
| `VOXWARD_ADAPTERS=super-secret-value` | `CONFIG_INVALID: adapters (not an allowed value)` |
| `VOXWARD_PORT=70000` | `CONFIG_INVALID: port (out of range)` |
| `VOXWARD_PORT=abc` | `CONFIG_INVALID: port (expected a different type)` |
| 配置文件含未知键 `apiToken`（取值 `tok-SECRET-FILE-456`） | `CONFIG_UNKNOWN_KEY: apiToken` |
| 配置文件 JSON 损坏（内含 `tok-SECRET-MALFORMED-789`） | `CONFIG_INVALID: VOXWARD_CONFIG_FILE (file is not valid JSON)` |
| 配置文件不存在 | `CONFIG_INVALID: VOXWARD_CONFIG_FILE (file cannot be read)` |

## 1. 子单本单验收行

<a id="vw-sub001-ac001"></a>
### VW-SUB001-AC001@1：satisfied

expected：安装、构建、类型检查成功；Fastify 服务与 Vite 前端可启动；代码按模块组织但只有一个业务服务进程。

- 安装、构建、类型检查在干净检出成功：E02、E03、E04 退出码 0；测试 E05 41/41。
- Fastify 与 Vite 可启动：E07（3000/healthz 200，5173 首页与页面模块 200，Vite 代理 200）。
- 按模块组织且只有一个业务服务进程：九个模块目录在 `apps/server/src/modules/`，由 `modules/registry.ts` 组合。E07 中监听业务端口的只有一个 node 进程（pid 127939）；其余进程是 pnpm、tsx 监视器、vite 与 esbuild 服务，vite 只代理 `/healthz`，不承载业务接口。生产入口 `node dist/main.js` 为单进程（E09）。
- 偏差（非阻断）：SUB-001 交付清单列出的 `apps/web/src/App.tsx` 不存在；`main.tsx` 直接渲染 `routes.tsx` 生成的路由，`src/pages/*/route.tsx` 自动注册已实现。

<a id="vw-sub002-ac001"></a>
### VW-SUB002-AC001@1：satisfied

expected：九个接口及事件/代次/裁决/投递意图/错误类型均带契约版本；契约不引用 Kiro 会话对象、平台原始响应或第三方协议帧；下游裁决只有 ALLOW/BLOCK；Spec 为 SPEC_CURRENT。

- 带契约版本：E14 机械核对全部导出记录；E04 中 `contracts.test.ts` 的类型级断言覆盖 ChannelEvent、EventRef、TaskRef（含 `processingGeneration`）、Verdict、DeliveryIntent、VoxwardError 与九个接口的字面量 `moduleName`，E12 证明这些断言会失败；E05 运行时断言 `CONTRACT_VERSION === "1"`、`createVerdict` 携带版本，注册表九个模块的 `contractVersion` 均为 `"1"`。
- 不引用 Kiro 会话对象、平台原始响应或第三方协议帧：E14（只有包内相对导入，零运行时依赖，字段均为基础类型）；E05 源码边界用例；E06 contracts 区只允许包内导入，E11 证明 contracts 引用 `node:fs`、`zod`、apps/server 会被拦。
- 下游裁决只有 ALLOW/BLOCK：`DOWNSTREAM_VERDICTS = ["ALLOW", "BLOCK"]`，`DeliveryIntent.verdict: DownstreamVerdict`；三种内部分类映射只产出 ALLOW/BLOCK（E05 中 downstream verdicts 组 6 项，E04 中类型级断言 2 条，E12 反例）。`ModerationRoute` 的 PASS/BLOCK/REVIEW 是内部路由，不进入下游。
- Spec 为 SPEC_CURRENT：E10，两份均为 SPEC_CURRENT。voxward-core-contracts 由助手生成，`source.json` 带 `einzbern.kiro-spec-source.v1` 归属戳与 managedSha256。本次没有重跑 `init`（它是写操作），`check` 已对照当前引擎来源。
- 逐项核对提案 §9.3（`docs/proposal/y3_project_proposal.md` 第 371-385 行）：

| 接口 | 提案职责 | 契约体现 | 不承担项核对 | 结论 |
| --- | --- | --- | --- | --- |
| PlatformSource | 官方平台接入、身份能力、游标和去重依据 | `fetchAfter(cursor, limit)` 返回 `SourceBatch{events, nextCursor}`；ChannelEvent 带 `platformMessageId`、`platformOrder` | 无评分方法，无下游反向采集 | 符合；身份能力未建模 |
| ModerationEngine | 基础规则、审核路由、最终内容策略 | `moderate(ChannelEvent)` 返回 `route: PASS/BLOCK/REVIEW` | 不含模型 SDK 或 CLI 类型 | 符合 |
| ScoringEngine | 基础分、冷却、钳制、幂等与人工纠错 | `applyVerdict(event, verdict)` 返回 `ScoreChange{subjectRef, delta, idempotencyKey}` | 输入是 Verdict，不接受模型写分；无跨频道接口 | 符合；人工纠错未建模，ScoreChange 未显式带频道范围 |
| InferenceProvider | 输入输出适配、能力声明、取消与会话清理 | `describe`、`infer`、`cancel`、`releaseSession`；`InferenceRequest` 只有 `correlationId` 与 `text` | 无凭据字段，无数据库句柄 | 符合；correlationId 说明见 judgment N3 |
| TaskCoordinator | 队列、期限、资源与任务执行 | `enqueue(event, deadlineAt)` 返回 `TaskRef`；`statusOf(taskId)` | 无改写裁决的方法 | 符合 |
| DecisionService | 人工操作、版本检查、事务和投递意图 | `commit(task: TaskRef, verdict, actorRef)` 返回 `DeliveryIntent` | `actorRef` 供逐次权限检查，`TaskRef` 代次供版本检查 | 符合 |
| OutputAdapter | 将获准事件转为特定下游协议 | `deliver(intent)` | 无采集或查询方法 | 符合 |
| DataLifecycleService | 数据请求、删除、例外、保留期限与清理 | `requestDeletion(DeletionRequest)` | 注释声明不承诺删除提供方控制的历史 | 符合；例外、保留期限、清理未建模 |
| AuditStore | Change Log、Technical Log、关联索引、受权限查看器查询与删除索引 | `append(AuditEntry{kind: CHANGE/TECHNICAL, …})`；`findByCorrelationId(correlationId, actorRef)` | 查询需 actor，注释声明不是公开或下游检索 API | 符合；删除索引未建模 |

S001 设计 §3 规定「只定签名，不写业务逻辑」。未建模的职责不与任何不承担项冲突，记为非阻断（judgment N7）。

<a id="vw-sub003-ac001"></a>
### VW-SUB003-AC001@1：satisfied

expected：服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。（场景含「配置含未知项或缺失必需项」）

- 合成替身替换平台、推理、输出适配器时服务可启动：`bindingsFor` 在 `adapters: "synthetic"` 下绑定三个合成替身，`main.ts` 用同一配置构建注册表。`pnpm dev`（服务端脚本设 `VOXWARD_ADAPTERS=synthetic`）E07 启动，生产入口 E09 启动。边界用例 `carries a synthetic event from platform to output without any vendor object`（E05）：合成平台事件，经合成推理得到 ALLOW_MEANINGFUL，经 `createVerdict` 得到 ALLOW，组装 DeliveryIntent 后由合成输出记录，记录与输入相同。
- 业务层不导入供应商原始对象：E14 九个模块只导入 `@voxward/contracts`；E06 0 违规；E11 中模块导入 fastify、zod（含 type-only、类型位置 `import()`、多行 re-export）、跨模块导入、模块引用 adapters 均被报出。已知盲区见 judgment N1，当前代码没有这类写法。
- 未知配置与缺必需项受控报错，不泄漏取值：E08 18 例全部退出码 1，一行受控报错，取值命中 0 次，无监听；E05 config 用例 13 项（含 `never echoes a configured value in its error`）。
- 模块替身可独立测试：E13 单独运行 adapters 与 boundary 用例 10/10；三个合成替身的工厂不依赖服务器即可构造（`synthetic.test.ts` 7 项），注册表支持注入替身（`buildRegistry(config, { outputAdapter: sink })`）。
- 构建、类型检查：E03、E04。

## 2. Story 验收行

<a id="vw-s001-ac001"></a>
### VW-S001-AC001@1：satisfied

expected：服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。method：构建、类型检查、模块契约测试和依赖方向审查。

- 服务可启动：E07、E09。
- 业务层不导入供应商原始对象：E06、E11、E14。
- 未知配置受控报错：E08，含缺必需项与不回显取值。
- 模块替身可独立测试：E05、E13。
- method 对应：构建 E03，类型检查 E04，模块契约测试 E05（契约 16 项、边界 3 项）与 E12，依赖方向审查 E06、E11、E14。
- 三张子单的贡献在 `ffa1ddc` 上已集成，判定见第 1 节。

## 3. 子单 STORY 行（指向 VW-S001-R001@1）

<a id="vw-sub001-story"></a>
- **VW-SUB001-STORY@1：satisfied**。复用 VW-SUB001-AC001 的同次执行 E02–E07、E09：安装、构建、类型检查、测试退出码 0，Fastify 与 Vite 可启动，单一业务进程。本行只证明 SUB-001 承担的基础工程部分；VW-S001-AC001 另行判定（satisfied）。

<a id="vw-sub002-story"></a>
- **VW-SUB002-STORY@1：satisfied**。复用 VW-SUB002-AC001 的依据 E04、E05、E06、E10、E11、E12、E14 与 §9.3 对照表。本行只证明 SUB-002 承担的契约与 Spec 部分。

<a id="vw-sub003-story"></a>
- **VW-SUB003-STORY@1：satisfied**。复用 VW-SUB003-AC001 的依据 E03–E09、E11、E13、E14。本行只证明 SUB-003 承担的配置校验与边界测试部分。

## 4. PARENT 行（指向 VW-E001-R001@1）

expected 与 VW-S001-AC001 相同；method 要求复用本单同候选版本的证据并保留来源。候选 `ffa1ddc` 已集成三张子单，以下各行复用同一批执行 E03–E14。

<a id="vw-s001-parent"></a>
- **VW-S001-PARENT@1：satisfied**。服务可启动（E07、E09）；业务层不导入供应商原始对象（E06、E11、E14）；未知配置与缺必需项启动失败退出 1、一行受控报错（E08）；替身可独立测试（E13）。EPIC-001 的其余判据不由本单证明。

<a id="vw-sub001-parent"></a>
- **VW-SUB001-PARENT@1：satisfied**。同上。SUB-001 的贡献是可启动的工程骨架与 `/healthz`（E02–E07）。

<a id="vw-sub002-parent"></a>
- **VW-SUB002-PARENT@1：satisfied**。同上。SUB-002 的贡献是零依赖的版本化契约，业务层只经它通信（E04、E05、E12、E14）。

<a id="vw-sub003-parent"></a>
- **VW-SUB003-PARENT@1：satisfied**。同上。SUB-003 的贡献是配置校验、注册表、合成替身、边界测试与依赖方向检查（E05、E06、E08、E11、E13）。

## 5. INHERIT 行

三张子单的 INHERIT 行与 STORY-001 对应行文本一致（E01）。每个需求下分四行判定：STORY-001 判整体贡献，子单行只判该子单交付的部分。

### 5.1 VW-R-001@1（INHERIT-001）

expected：服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。继续遵守 VW-R-001 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s001-inherit-001"></a>
- **VW-S001-INHERIT-001@1：satisfied**。前半句依据同 VW-S001-AC001（E03–E14）。对 VW-R-001 的贡献：pnpm、TypeScript、Fastify、React、Vite 工程就位；按 §9 建立九个版本化模块契约；模块化单体只有一个业务进程。本单未触及：SQLite WAL、Drizzle、浏览器多人协作、频道评分、审核与精翻、人工处理、受控输出，由 INIT VW-AC-001 全量验收。

<a id="vw-sub001-inherit-001"></a>
- **VW-SUB001-INHERIT-001@1：satisfied**。候选 `ffa1ddc` 上前半句成立（同上）。SUB-001 贡献 pnpm workspace、TypeScript 基础配置、Fastify 入口与 React/Vite 壳（E02–E07）；没有引入 VW-R-001 之外的技术栈。

<a id="vw-sub002-inherit-001"></a>
- **VW-SUB002-INHERIT-001@1：satisfied**。前半句成立（同上）。SUB-002 贡献九个版本化接口与业务类型（E04、E05、E12、E14）。

<a id="vw-sub003-inherit-001"></a>
- **VW-SUB003-INHERIT-001@1：satisfied**。前半句成立（同上）。SUB-003 贡献配置校验、注册表、合成替身与边界测试（E05、E06、E08、E11、E13）。

### 5.2 VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施 VOXWARD-EPIC-001，完整验证 VOXWARD-EPIC-006；记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s001-inherit-003"></a>
- **VW-S001-INHERIT-003@1：satisfied**（源码审查）。接口与前置：`ModerationEngine.moderate(ChannelEvent)` 返回 PASS/BLOCK/REVIEW 内部路由；下游裁决只有 ALLOW/BLOCK，ALLOW_MEANINGFUL 与 ALLOW_NOISE 映射为 ALLOW，BLOCK 映射为 BLOCK（E05、E14）。实际影响：只定签名与占位，不改变 ModerationEngine 或其它模块职责。本单未触及：昵称、正文与组合检查，精确、归一化、读音/转写与有界正则，白名单与噪声，选择性 AI、付费自定义文本安全审核与例外队列。实施由 EPIC-001 后续 Story、完整验证由 EPIC-006、完整判据由 INIT VW-AC-003 承载；这些责任单目前没有可引用的实际结果。

<a id="vw-sub001-inherit-003"></a>
- **VW-SUB001-INHERIT-003@1：satisfied**（源码审查）。SUB-001 只交付工程骨架与 `/healthz`，本单未触及审核规则与裁决，不改变任何模块职责。

<a id="vw-sub002-inherit-003"></a>
- **VW-SUB002-INHERIT-003@1：satisfied**（源码审查）。SUB-002 交付上述 ModerationEngine 签名与 ALLOW/BLOCK 下游裁决契约；审核规则本单未触及。

<a id="vw-sub003-inherit-003"></a>
- **VW-SUB003-INHERIT-003@1：satisfied**（源码审查）。ModerationEngine 占位对所有调用以 `MODULE_NOT_IMPLEMENTED` 拒绝；合成推理固定返回 ALLOW_MEANINGFUL 只是测试替身，不构成审核策略。审核规则本单未触及。

### 5.3 VW-R-004@1（INHERIT-004）

expected：同 5.2（实施 EPIC-001，完整验证 EPIC-006，完整判据 INIT VW-AC-004）。

<a id="vw-s001-inherit-004"></a>
- **VW-S001-INHERIT-004@1：satisfied**（源码审查）。`ScoringEngine.applyVerdict(ChannelEvent, Verdict)` 返回 `ScoreChange{subjectRef, delta, idempotencyKey}`：输入是裁决而不是模型分值，带幂等键；ChannelEvent 带 `platform` 与 `channelId`；没有跨频道或公开分值的接口。只定签名，不改变职责。本单未触及：钳制、actualDelta、冷却、多规则最大扣分、幂等结算、身份变化、noise 不变、故障不扣分、分值不公开，由责任单验证。ScoreChange 未显式带频道范围，记为非阻断（judgment N7）。

<a id="vw-sub001-inherit-004"></a>
- **VW-SUB001-INHERIT-004@1：satisfied**（源码审查）。本单未触及评分，不改变 ScoringEngine 职责。

<a id="vw-sub002-inherit-004"></a>
- **VW-SUB002-INHERIT-004@1：satisfied**（源码审查）。SUB-002 交付上述 ScoringEngine 签名；评分规则本单未触及。

<a id="vw-sub003-inherit-004"></a>
- **VW-SUB003-INHERIT-004@1：satisfied**（源码审查）。ScoringEngine 占位拒绝调用，边界用例断言 `MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict`（E05）；评分规则本单未触及。

### 5.4 VW-R-005@1（INHERIT-005）

expected：同 5.2（实施 EPIC-001、EPIC-002，完整验证 EPIC-006，完整判据 INIT VW-AC-005）。

<a id="vw-s001-inherit-005"></a>
- **VW-S001-INHERIT-005@1：satisfied**（源码审查）。本单未触及：昵称缓存（主体、昵称哈希、规则版本、期限失效）、安全称呼与读音、后台复盘 UNSETTLED_FAST_PASS、跨条临时别名与候选词人工确认。S001 只提供 TaskCoordinator（`enqueue`、`statusOf`）与 InferenceProvider 签名，没有新增缓存或复盘队列，不改变上述职责。实施与完整验证由责任单承接。

<a id="vw-sub001-inherit-005"></a>
- **VW-SUB001-INHERIT-005@1：satisfied**（源码审查）。本单未触及昵称缓存与后台复盘。

<a id="vw-sub002-inherit-005"></a>
- **VW-SUB002-INHERIT-005@1：satisfied**（源码审查）。只交付 TaskCoordinator 与 InferenceProvider 签名，本单未触及缓存与复盘行为。

<a id="vw-sub003-inherit-005"></a>
- **VW-SUB003-INHERIT-005@1：satisfied**（源码审查）。TaskCoordinator 为拒绝调用的占位，合成推理无状态；本单未触及缓存与复盘行为。

### 5.5 VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s001-inherit-009"></a>
- **VW-S001-INHERIT-009@1：satisfied**（源码审查）。触及内容：`InferenceRequest{contractVersion, correlationId, text}`、`InferenceProvider.cancel/releaseSession`、无状态的合成推理替身。观察：请求不含平台用户 ID、昵称、账本或凭据字段；src 无文件写入，没有新增会话、提示或工具轨迹副本（E14）；DataLifecycleService 注释明示不承诺删除提供方历史，代码与文档中没有「Archive 或清理等于删除」的表述。本单未触及：真实 AI 会话、Kiro/Crew 内容清理，运行时验证由 EPIC-002 与 EPIC-006 的责任单承接。correlationId 与提案 §8.1 临时 itemId 的关系见 judgment N3。

<a id="vw-sub001-inherit-009"></a>
- **VW-SUB001-INHERIT-009@1：satisfied**（源码审查）。本单未触及 AI 输入、会话或提示；Fastify 请求日志只写到 stdout，内容是方法、URL、Host、对端地址与状态码，不含正文（E07 日志）。

<a id="vw-sub002-inherit-009"></a>
- **VW-SUB002-INHERIT-009@1：satisfied**（源码审查）。InferenceRequest 只有正文与关联编号两项业务字段；契约不含会话、提示或工具轨迹类型。

<a id="vw-sub003-inherit-009"></a>
- **VW-SUB003-INHERIT-009@1：satisfied**（源码审查）。合成推理不发起外部调用、不保存状态，`cancel` 与 `releaseSession` 为空操作；没有新增持久化。

### 5.6 VW-R-011@1（INHERIT-011）

expected：服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s001-inherit-011"></a>
- **VW-S001-INHERIT-011@1：satisfied**。前半句依据同 VW-S001-AC001（E03–E14）。遵守 VW-R-011：单一业务进程（E07、E09）；本单没有新增数据库、队列或日志存储，src 无文件写入（E14）；DeliveryIntent 与 TaskRef 只带事件引用，不带正文。本单未触及：SQLite WAL、短事务、Technical Log、Crew 队列，由 INIT 全量验收。

<a id="vw-sub001-inherit-011"></a>
- **VW-SUB001-INHERIT-011@1：satisfied**。前半句成立（同上）。SUB-001 只建立单进程服务骨架，没有存储。

<a id="vw-sub002-inherit-011"></a>
- **VW-SUB002-INHERIT-011@1：satisfied**。前半句成立（同上）。契约层 `DeliveryIntent.eventRef` 与 `TaskRef` 不含正文，没有存储实现。

<a id="vw-sub003-inherit-011"></a>
- **VW-SUB003-INHERIT-011@1：satisfied**。前半句成立（同上）。注册表全为合成或占位实现；合成输出只在进程内存记录投递意图（只含引用），没有持久化。

### 5.7 VW-R-012@1（INHERIT-012）

expected：同 5.6，继续遵守 VW-R-012。

<a id="vw-s001-inherit-012"></a>
- **VW-S001-INHERIT-012@1：satisfied**。前半句依据同 VW-S001-AC001（E03–E14）。遵守 VW-R-012：只注册 `GET /healthz`，响应只有 `{"status":"ok"}`，没有业务路由（`/events` 404，E05、E07、E09）；默认与实测只绑 127.0.0.1；`DecisionService.commit` 与 `AuditStore.findByCorrelationId` 带 `actorRef`。本单未触及：角色模型、逐次鉴权、HTTPS/WSS、CSRF、转义、可撤销输出凭据、运行时 agent 隔离（S003 及后续）。

<a id="vw-sub001-inherit-012"></a>
- **VW-SUB001-INHERIT-012@1：satisfied**。前半句成立（同上）。Fastify 与 Vite 只绑 127.0.0.1（`vite.config.ts` 设 `host: "127.0.0.1"`、`strictPort`），只注册 `/healthz`。

<a id="vw-sub002-inherit-012"></a>
- **VW-SUB002-INHERIT-012@1：satisfied**。前半句成立（同上）。裁决提交与日志查询签名带 `actorRef`；没有公开或下游日志检索接口。

<a id="vw-sub003-inherit-012"></a>
- **VW-SUB003-INHERIT-012@1：satisfied**。前半句成立（同上）。配置默认 host 为 127.0.0.1，配置错误不回显取值（E08）。

### 5.8 VW-R-014@1（INHERIT-014）

expected：同 5.2（实施 EPIC-001、EPIC-004，完整验证 EPIC-006，完整判据 INIT VW-AC-014）。

<a id="vw-s001-inherit-014"></a>
- **VW-S001-INHERIT-014@1：satisfied**（源码审查）。本单未触及记分例外：频道独立偏好、所有消息先入审核、不走白名单/噪声/高分快通道、例外期间不记分、恢复需明确请求。S001 没有加入任何快通道或例外旁路；ModerationEngine 与 ScoringEngine 只是签名与占位，不改变职责。实施与完整验证由责任单承接。

<a id="vw-sub001-inherit-014"></a>
- **VW-SUB001-INHERIT-014@1：satisfied**（源码审查）。本单未触及记分例外。

<a id="vw-sub002-inherit-014"></a>
- **VW-SUB002-INHERIT-014@1：satisfied**（源码审查）。契约没有快通道或例外旁路字段；本单未触及例外行为。

<a id="vw-sub003-inherit-014"></a>
- **VW-SUB003-INHERIT-014@1：satisfied**（源码审查）。注册表与合成替身不含快通道；本单未触及例外行为。

### 5.9 VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s001-inherit-017"></a>
- **VW-S001-INHERIT-017@1：satisfied**（源码审查）。触及内容：`TaskRef.processingGeneration` 与 `deadlineAt`、`STALE_GENERATION{taskId, expected, actual}`、含 DISCARDED 的 TaskStatus、`DeliveryIntent.validUntil`、VoxwardError 联合、`DataLifecycleService.requestDeletion`（注释说明不能删除提供方控制的历史）。观察：本单没有创建数据库、缓存、队列、日志文件或备份，src 无写入（E14）；合成输出只在进程内存记录意图引用；Fastify 请求日志只到 stdout，不含正文。本单未触及：删除执行、代次失效、恢复先应用删除记录、WAL 与备份清理，由对应责任单验证。

<a id="vw-sub001-inherit-017"></a>
- **VW-SUB001-INHERIT-017@1：satisfied**（源码审查）。本单未触及数据生命周期；产物只有 git 忽略的 `dist/`。

<a id="vw-sub002-inherit-017"></a>
- **VW-SUB002-INHERIT-017@1：satisfied**（源码审查）。契约为代次、到期与失败状态提供了上述字段和错误码；运行行为本单未触及。

<a id="vw-sub003-inherit-017"></a>
- **VW-SUB003-INHERIT-017@1：satisfied**（源码审查）。没有持久化，合成状态只在进程内存；运行行为本单未触及。

## 6. 未验证与范围说明

- 前端页面只验证了 HTML 与模块转换返回 200，没有用浏览器渲染或目视检查「服务状态：正常」。本批验收行不要求页面渲染，也没有做 Owner 目视验收。
- 只在 Linux 验证。服务端 dev 脚本使用 POSIX 的环境变量前缀写法。
- `kiro-specs.mjs init` 没有重跑（写操作），只做了 `check`。
- 实施方报告的一次 Vite `Pre-transform error` 本次没有出现，原因仍未查明。
- 没有接入真实平台、Kiro、数据库或鉴权，也没有推送或发布；这些按设计不在 S001。
- INIT 与 EPIC 级完整判据（VW-AC-001、003、004、005、009、011、012、014、017 等）不由本批证明。
