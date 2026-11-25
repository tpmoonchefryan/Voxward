# VoxWard 基准脚本（VOXWARD-SUB-049）

本目录提供合成样本集和三个可复现的基准脚本。默认只运行替身：合成适配器和假 CLI。脚本不调用真实模型，不使用 Kiro 账号，也不连接 Kiro Crew 网关。

结果说明的是：脚本能在本机跑通，输出稳定，并且能分别给出规则、实时、SC 与复盘的结果。替身的结果不说明任何模型的质量、速度或费用。真实模型运行与报告属于 VOXWARD-SUB-050，待 Owner 提供独立 Kiro 账号后，于 S029 演练时执行（问题清单 Q60）。

## 目录

| 路径 | 作用 |
| --- | --- |
| `samples/SOURCES.md` | 样本来源、许可、覆盖矩阵，以及两组期望标签的含义 |
| `samples/moderation-samples.json` | 91 条合成样本，每条带规则期望与 AI 期望 |
| `samples/rule-set.json` | 占位规则集 `bench-synth-v1` 与读音表 |
| `fixtures/fake-kiro-cli.mjs` | 假 CLI 替身，内容复制自 `apps/server/test` 的替身，不调用模型 |
| `lib/` | 样本校验、规则装配、替身装配、指标、真实模型闸门、环境记录 |
| `scripts/quality.ts` | 规则、实时、SC、复盘的质量指标 |
| `scripts/latency-capacity.ts` | 静态耗时、端到端 P50/P95、并发档位、超时与过载探针 |
| `scripts/cleanup-observe.ts` | 成功、失败、校验失败、取消、超时、异常重启后的残留观察 |
| `tsconfig.json` | 只用于类型检查，不生成文件 |

## 运行

在仓库根目录执行：

```sh
pnpm bench:quality [--out <文件>]
pnpm bench:latency [--out <文件>]
pnpm bench:cleanup [--out <文件>]
pnpm bench:typecheck
```

不加 `--out` 时，JSON 输出到标准输出。根目录的 `pnpm typecheck` 已包含 `bench:typecheck`。

The quality JSON groups rule, realtime, SC and review results under `byLanguage`. Compare `falseBlock` and `miss` within each language; rule results also distinguish `falseReview` from direct blocks. `mixed` is code-switching and `und` is undetermined. Explicit language sample groups supply metadata to the rule checker; other groups use script hints for reporting. These are synthetic fixtures and doubles, not measured real-model quality.

脚本使用的 `tsx` 与 `tsc` 来自 `apps/server` 的开发依赖，没有新增依赖。运行 scratch 位于 `$KIROCREW_SCRATCH/bench/`；未设置该变量时位于 `bench/.tmp/`，后者已被根 `.gitignore` 忽略。每次运行结束后会删除自己创建的目录。

退出码：脚本直接运行时，成功为 0，拒绝为 2，样本校验失败为 1。经 `pnpm` 包装运行时，pnpm 会把非零退出码统一改为 1，错误文字保持不变。

## 真实模型闸门

默认关闭。给出 `--real-model` 还需要环境变量 `VOXWARD_BENCH_REAL_MODEL=1`。两者都给出时，脚本仍然拒绝运行：本包没有绑定真实适配器，绑定由 SUB-050 完成。只给出其中之一时，脚本同样拒绝运行并说明缺少的条件。

## 质量（quality）

- `rules`：完整消息（含昵称）经规则引擎的路由，与样本的规则期望比较。输出误拦、漏检、误送复核、未送复核，并按组给出结果。规则集是占位规则集，结果只对它有意义。
- `realtime.synthetic`、`realtime.fakeCli`：实时 AI 分类，只看正文，与合同一致。合成适配器恒为 `ALLOW_MEANINGFUL`。假 CLI 只把含 `badword` 的正文判为 BLOCK，因此它检验的是管线，不是分类能力。
- `sc.translationOff`：翻译关闭，只跑安全审核，检查每条的裁决与隐藏原因。
- `sc.translationOnNoFault`：翻译开启，合成 SC 模型输出经真实批次校验与生成文本检查，统计展示的条目、隐藏原因（含生成文本被规则拒绝的数量）。
- `sc.translationOnExtraItemFault`：同一流程，但合成模型多返回一个未知条目编号。批次校验应拒绝整批，输出里体现为 `refusedBatches`。
- `review`：合成复盘模型输出经 `validateReviewBatch` 校验，统计契约拒绝、候选词数量与裁决一致性。
- `crossLine`：跨条线程的数量。引擎逐条判定，线程的整体期望只计数，不计分。
- `notMeasured`：未测项与原因。

每个替身块都带 `qualityMeaningful: false`。

## 延迟与容量（latency-capacity）

- 静态耗时：规则引擎逐条计时，共 20 轮。第一轮与之后的轮次分开报告，因为之后的轮次会命中昵称判定缓存。
- 端到端：真实 kiro-cli 适配器配假 CLI（模式 `ok`）。批大小 10，并发 1、2、4，每档 24 批。
- 探针：超时（500 ms，假 CLI 模式 `hang`），以及输出过大（假 CLI 模式 `huge`，3 MiB）。
- `environment` 记录操作系统、CPU、内存、Node 版本与生成时间。这些数字随机器和负载变化，不应跨机器比较。
- 未测：队列最老消息年龄（需要任务协调器与复盘循环接线，S011、S014 之后）；真实模型延迟与费用（SUB-050）。

## 清理观察（cleanup-observe）

每个场景使用独立的 scratch 和运行根目录，结束后记录：

- `residualRunDirs`：运行根目录下残留的 `run-` 目录数
- `processesAlive`：假 CLI 日志中记录的进程是否仍在运行
- `sessionDeleteRequests`：会话删除请求数
- `clean`：前两项是否都为 0

异常重启场景：子进程启动一批不会结束的任务，然后被 SIGKILL 杀死。随后调用 `sweepOrphanRunDirectories` 收尾。`restart.beforeSweep` 记录收尾前的残留，`restart.afterSweep` 记录收尾后的结果。

脚本退出码为 0，只表示观察已完成，不表示清理通过。判断清理是否通过，看各场景的 `clean` 字段。

## 复现

`pnpm bench:quality` 两次运行的输出逐字节相同，因为输出不含时间和环境。`bench:latency` 与 `bench:cleanup` 含有时间与环境，不要求逐字节相同。

## 限制

- 替身结果不代表模型质量。
- 样本的期望标签依据政策意图人工设定。修改标签时，须同时更新 `SOURCES.md` 并说明理由。
- 替身声明的模型 `bench-declared-model` 只用来通过模型选择闸门，不是能力声明。
- 假 CLI 的分类规则是固定字符串，只用来检验管线。
