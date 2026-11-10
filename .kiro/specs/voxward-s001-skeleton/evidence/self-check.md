# S001 本地自测证据

本文件记录工作树 `/home/ryanlan/Code/Voxward/.worktrees/s001-skeleton`（分支 `voxward/s001-skeleton`）上的本地自测输出。它是实施子代理的本地记录，不是正式完成证据。正式完成与验收由引擎流程决定。

环境：Node v24.16.0，pnpm 12.18.0（PATH 中版本），Linux x86_64。
基线：HEAD 6413406。分支提交：VOXWARD-SUB-001 `3c94ba6`，VOXWARD-SUB-002 `4ea44a6`，VOXWARD-SUB-003 为包含本文件的最后一个提交。

## 1. 命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 锁文件与 package.json 一致 |
| `pnpm -r run build` | 0 | contracts：tsc 通过；server：esbuild 输出 `dist/main.js`（8.3kb）；web：vite build，39 个模块转换完成 |
| `pnpm -r run typecheck` | 0 | 三个包 tsc 无错误 |
| `pnpm test` | 0 | 5 个测试文件，41 项全部通过：contracts 16；server 25（adapters 7，boundary 3，config 13，app 2） |
| `pnpm check:deps` | 0 | 38 个源文件，0 违规 |
| `kiro-specs.mjs check`（voxward-s001-skeleton，work:674c24794f9a1fb626eb2ad1） | 0 | SPEC_CURRENT，workRevision 4 |
| `kiro-specs.mjs check`（voxward-core-contracts，work:29efe5676405320e83378661） | 0 | SPEC_CURRENT，workRevision 3 |

`kiro-specs.mjs init`（voxward-core-contracts）退出码 0，返回 SPEC_INITIALIZED，sourceDigest 为 `3ec8dcf6…2575c0`。

## 2. 启动冒烟

- `node dist/main.js`（干净环境，`VOXWARD_ADAPTERS=synthetic`）：`GET /healthz` 返回 200 `{"status":"ok"}`；`GET /events` 返回 404（无业务路由）；SIGTERM 后进程退出，3000 不再监听。
- `pnpm dev`：`127.0.0.1:3000/healthz` 返回 200；`127.0.0.1:5173/` 返回 200，HTML 含 `<div id="root"></div>`；`127.0.0.1:5173/healthz`（Vite 代理）返回 200；`/src/main.tsx`、`/src/routes.tsx`、`/src/pages/home/route.tsx`、`/src/pages/home/HomePage.tsx` 均返回 200，类型为 `text/javascript`。两端口只监听 127.0.0.1。停止进程组后两端口均不再监听。
- 一次冒烟日志出现 `Vite [client] Pre-transform error: The service is no longer running`（插件 vite:esbuild）。之后连续三次完整启停均未复现，日志无此错误，模块请求均返回 200。该次出现的原因未查明。

## 3. 配置失败（`env -i` 干净环境，不启动服务）

| 环境 | 退出码 | stderr |
| --- | --- | --- |
| 未设置 VOXWARD_ADAPTERS | 1 | `CONFIG_INVALID: adapters (required key is missing)` |
| VOXWARD_ADAPTERS=synthetic，VOXWARD_PROT=4000 | 1 | `CONFIG_UNKNOWN_KEY: VOXWARD_PROT` |
| VOXWARD_ADAPTERS=synthetic，VOXWARD_PORT=70000 | 1 | `CONFIG_INVALID: port (out of range)` |
| VOXWARD_ADAPTERS=super-secret-value | 1 | `CONFIG_INVALID: adapters (not an allowed value)`，不回显取值 |

四种情况均无监听端口。

## 4. 负面对照（证明检查会失败）

1. 类型断言（SUB-002）：临时加入违例 `expectTypeOf` 断言，`tsc` 报 TS2345 两处，退出码 2。删除该文件后 typecheck 退出码 0。
2. 依赖方向（SUB-003）：临时加入四类违规导入：模块引用 `fastify`；模块跨引 `scoring-engine`；contracts 引用 apps/server；web 引用 apps/server 的 registry。`check:deps` 退出码 1，四处均报出。删除临时文件后退出码 0，无残留。

## 5. 验收条目

### VW-SUB001-AC001
- 安装、构建、类型检查：第 1 节，退出码均为 0。
- Fastify 与 Vite 启动：第 2 节。
- 按模块组织且只有一个业务服务进程：业务服务只有 apps/server 一个进程。apps/web 是 Vite 开发服务器，只提供前端转换与静态资源，不承载业务接口。

### VW-SUB002-AC001
- 版本：九个模块接口，以及 ChannelEvent、EventRef、SenderRef、TaskRef（含 processingGeneration）、Verdict、DeliveryIntent、VoxwardError 的每个导出对象类型都带 contractVersion 字段。类型层由 contracts 测试中的 expectTypeOf 断言强制，第 4 节的负面对照证明断言有效；运行时由 `CONTRACT_VERSION === "1"` 与样例测试覆盖。
- 不引用 Kiro 会话对象、平台原始响应或第三方协议帧：源码词汇检查（kiro、raw、frame 系词）无命中；无裸包导入；无越出 contracts 目录的相对导入（grep 复核无命中）。
- 下游裁决只有 ALLOW 与 BLOCK：DOWNSTREAM_VERDICTS 测试、映射测试、DownstreamVerdict 类型断言。
- Spec SPEC_CURRENT：第 1 节。

### VW-SUB003-AC001
- 合成事件替换平台、推理、输出适配器：注册表在 synthetic 配置下绑定三个合成替身；边界测试从 platformSource 取得事件，经 inferenceProvider 得到分类，再经 outputAdapter 投递。
- 未知配置与缺必需项受控报错：第 3 节，以及 config 测试 13 项。
- 业务层不导入供应商原始对象：check:deps 0 违规；modules/* 只允许导入 @voxward/contracts 与本模块文件。
- 模块替身可独立测试：adapters/synthetic.test.ts 7 项。
- 构建、类型检查、模块契约测试、依赖方向审查：第 1 节与第 4 节。

### VW-S001-AC001
- 启动开发服务：`pnpm dev` 冒烟，第 2 节。
- 合成事件替换适配器并走通边界：test/boundary/synthetic-flow.test.ts 3 项。
- 未知配置受控报错、模块替身独立测试：第 3 节与上面各条。
- 构建、类型检查、模块契约测试、依赖方向审查：第 1 节。

## 6. 与 spec 的偏离与解读

- 工具版本：TypeScript 固定 5.9（~5.9.3），未采用 7.0.2。Vite 7、@vitejs/plugin-react 5、react-router 7、vitest 3.2.7。理由：TypeScript 7 与 Vite 8 尚未在本项目的 tsconfig、vitest 3 与 esbuild 组合中验证。vitest 3.2.7 是保留设计要求的 `vitest.workspace.ts` 的可用版本，它输出弃用提示，下一主版本将移除该文件，届时迁移到 `test.projects`。
- pnpm 12 默认阻止依赖的构建脚本。esbuild 通过 `pnpm approve-builds esbuild` 放行，结果写入 pnpm-workspace.yaml 的 `allowBuilds`。
- 配置：`adapters` 为必需项（自定）。`pnpm dev` 通过 `VOXWARD_ADAPTERS=synthetic` 满足它。环境变量映射 VOXWARD_HOST、VOXWARD_PORT、VOXWARD_ADAPTERS 与 VOXWARD_CONFIG_FILE 为自定。
- AC 文字「配置含未知项或缺必需项 -> 服务可启动」与设计 §4「服务启动前失败退出，退出码非 0」不一致。本实现按设计执行：未知键与缺必需项返回受控错误并非零退出；合法配置启动服务。
- 组合根：设计 §2 表中的 `registry.ts` 位于 `modules/registry.ts`（与设计 §4、tasks 3.2 一致）。check:deps 把 registry.ts、app.ts、main.ts 与 config/ 视为组合根，允许依赖各层。设计表未逐条列出 config 与 main，此分类为自定。
- 占位：PlatformSource、InferenceProvider、OutputAdapter 的模块目录 index.ts 按设计保留，但注册表绑定的是合成适配器，这三个占位工厂当前不被调用。
- 边界测试中的 DeliveryIntent 由测试代码组装，因为 DecisionService 在 S001 是占位。设计未规定由谁组装。
- 契约签名为 S001 自定。设计只给职责与不承担项。方法如下：PlatformSource.fetchAfter；ModerationEngine.moderate；ScoringEngine.applyVerdict（输入是 Verdict，不接受模型写分）；InferenceProvider.describe、infer、cancel、releaseSession；TaskCoordinator.enqueue、statusOf；DecisionService.commit（带 actorRef，并以 TaskRef 的代次做版本检查）；OutputAdapter.deliver；DataLifecycleService.requestDeletion；AuditStore.append、findByCorrelationId（带 actorRef）。
- 映射：ALLOW_MEANINGFUL 与 ALLOW_NOISE 映射为 ALLOW，BLOCK 映射为 BLOCK。设计要求映射函数，但未给出映射规则。
- 代次：TaskRef.processingGeneration 承载数据处理代次。STALE_GENERATION 错误携带 expected 与 actual。
- 占位失败：占位方法以 `Error("MODULE_NOT_IMPLEMENTED: <模块>.<方法>")` 拒绝。该码不在设计列出的错误集合内，设计只要求「至少」包含的五个码。
- contracts 的 build 为类型检查，不产出 dist。原因：contracts 以源码方式导出（exports 指向 src/index.ts）。server 的 build 用 esbuild 打包，fastify 与 zod 保持外部依赖。
- kiro-specs check 只统计受管段内的任务勾选。本地段勾选不进入 tasksCheckedLocalOnly，该字段为空。这是脚本行为，不影响 SPEC_CURRENT。
- 本地段 tasks.md 的勾选只是本地进度，不替代引擎中的工作状态与证据。

## 7. 未验证项与来源缺口

- 提案 §9.3 只给职责与不承担项，没有方法签名，签名为 S001 自定。PlatformSource 的「身份能力」与 ScoringEngine 的「人工纠错」未建模为方法。
- 未用浏览器打开页面。browser 工具默认拒绝本机地址，页面渲染未做目视验证；首页状态仅通过模块与代理请求验证。
- 未接入真实平台、Kiro、数据库、鉴权，也未发布；按设计不在 S001 内。
- 未执行 work-show 复核验收文本。验收文本以 tasks.md 受管段为准，并由 kiro-specs check 的 SPEC_CURRENT 覆盖。
- 第 2 节提到的一次 Vite 预转换错误未查明原因。
