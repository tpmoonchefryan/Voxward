# 自测证据：VOXWARD-SUB-049

工单：VOXWARD-SUB-049（work:2aa6c8e36e17dd07df29f664），父 Story VOXWARD-STORY-027（work:58dd548e00e4c319dce50484）。
工作树：`/home/ryanlan/Code/Voxward/.worktrees/s027-bench`，分支 `voxward/s027-bench`，基线 `8687bb4`。
提交：`d0ad429` 规格（STORY-027: add spec）；`dde51bc` 样本与规则集；`8a271bf` 替身、脚本与根脚本入口；本文件与 `bench/README.md` 随最后一个提交。
运行时模型：claude-haiku-5.5（kiro 运行时，economy 档，见派工简报）。

本证据只记录实施者的自测。它不是独立验收，也不是工单的完成证据。

## 1. 门禁（工作树根）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=1 pnpm install` | 0 | `Packages: +174`，锁文件未变更（`pnpm-lock.yaml` 无差异） |
| `pnpm build` | 0 | `apps/server` esbuild 完成并复制迁移；`apps/web` vite 构建 82 个模块 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 通过；随后 `bench:typecheck` 通过 |
| `pnpm test` | 0 | `Test Files 134 passed (134)`，`Tests 1802 passed (1802)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 204 files checked, 0 violations` |
| `kiro-specs.mjs check` | 0 | `SPEC_CURRENT`，`workRevision 4`，`formalStatus active`，`formalDone false` |
| `env -u VOXWARD_DATABASE_FILE bash .../tools/smoke.sh <工作树> <scratch>` | 0 | `dev healthz ok=1 code=200 after 1s`；`dist healthz ok=1 code=200 after 1s`；结束后无监听端口 |

`bench/` 没有 vitest 用例。根 `vitest.workspace.ts` 不包含 bench，本包也没有改动它。bench 的验证靠脚本复跑、负面对照和类型检查。

typecheck 的 `tsc` 在删除一个未使用导入后又复跑了一次（bench 子项目，退出码 0）。根 `pnpm typecheck` 的其余部分未受该改动影响，只在删除前运行过一次（上表）。

## 2. 样本与校验

- 样本 73 条，覆盖：zh 11、ja 7、en 8、mixed 6、homophone 6、nickname-combo 8、cross-line 8（3 个线程）、noise 6、evasion 7、false-positive 6。来源与许可见 `bench/samples/SOURCES.md`。
- 负面对照：`loadSampleSet` 对一个违规样本集给出 16 条问题，退出码 0（对照脚本本身退出 0，表示按预期被拒绝）。摘录：`provenance: expected synthetic-authored`；`contains_real_viewer_data: must be false`；`samples[0].expected.route: unknown route`；`samples[1].body: required`；`samples[1]: duplicate id zh-01`；`samples[2].thread: cross-line samples need a thread id`；各组覆盖不足。

## 3. 质量（`pnpm bench:quality`，替身）

退出码 0。最终代码（提交 `8a271bf` 之后）复跑两次，输出 sha256 相同：`a50a0c3968e92914778ad4a9bc08f58aea6cd28671041ba6bd13b51a0d639463`。标准输出与 `--out` 文件逐字节相同（同一次复跑中核对）。

| 块 | 结果 |
| --- | --- |
| rules（完整消息，真实规则引擎，占位规则集） | 73/73 与期望一致；误拦 0，漏检 0，误送复核 0，未送复核 0 |
| realtime.synthetic（恒为放行） | 下游正确 57/73；漏检 16；误拦 0；类别正确 49/73 |
| realtime.fakeCli（真实 kiro-cli 适配器配假 CLI） | 下游正确 57/73；漏检 15；误拦 1（en-08，学术引用含 badword） |
| sc.translationOff | 全部 73 条隐藏（TRANSLATION_OFF 71，VERDICT_BLOCK 2）；8 批，无拒绝 |
| sc.translationOnNoFault | 展示 48；VERDICT_BLOCK 17；GENERATED_TEXT_REJECTED 8；下游正确 72/73；漏检 0；误拦 1 |
| sc.translationOnExtraItemFault | 8/8 批被拒绝（OUTPUT_TOO_MANY_ITEMS），0 条展示 |
| review（合成复盘模型，经 validateReviewBatch） | 契约拒绝 0；候选词 8；下游正确 72/73；漏检 0；误拦 1 |
| crossLine | 3 个线程、8 行；整体期望 BLOCK 2 个、PASS 1 个，只计数，不计分 |

替身结果不代表任何模型的质量。`rules` 的 73/73 只针对占位规则集，样本量也小。

## 4. 延迟与容量（`pnpm bench:latency`，替身）

退出码 0。环境：AMD Ryzen 7 5800X 8 核，30.3 GiB 内存，Linux，Node v24.16.0。下表数字取自提交 `8a271bf` 之后的一次运行。这些数字随机器和负载变化，不应跨机器比较。

| 项 | 结果 |
| --- | --- |
| 静态规则耗时（1460 次观察） | P50 0.159 ms，P95 0.240 ms；第一轮 P50 0.227 ms，P95 0.404 ms |
| 端到端，并发 1（24 批，批大小 10） | P50 62.155 ms，P95 66.895 ms，15.9 批/秒 |
| 端到端，并发 2 | P50 63.671 ms，P95 70.932 ms，31.1 批/秒 |
| 端到端，并发 4 | P50 68.630 ms，P95 73.914 ms，57.6 批/秒 |
| 超时探针（timeoutMs 500） | RUN_TIMEOUT，536.9 ms |
| 输出过大探针（3 MiB） | RUN_OUTPUT_TOO_LARGE，44.5 ms |

未测：队列最老消息年龄（需要任务协调器与复盘循环）；真实模型延迟与费用（SUB-050）。

## 5. 清理观察（`pnpm bench:cleanup`，替身）

退出码 0（只表示观察完成，清理是否通过以 `clean` 为准）。

| 场景 | 结果 | 残留运行目录 | 存活进程 | 删除会话请求 | clean |
| --- | --- | --- | --- | --- | --- |
| success | COMPLETED | 0 | 0 | 1 | true |
| failure | RUN_FAILED，exitCode 2，未泄露 stderr 标记 | 0 | 0 | 0 | true |
| invalid-output | RUN_OUTPUT_INVALID，[OUTPUT_TOO_MANY_ITEMS] | 0 | 0 | 1 | true |
| cancel | RUN_CANCELLED | 0 | 0 | 1 | true |
| timeout | RUN_TIMEOUT | 0 | 0 | 1 | true |
| restart-after-kill | 收尾前：1 个运行目录、1 个存活进程；`sweepOrphanRunDirectories` 删除 1 个目录、终止 1 个进程、请求 1 次会话删除 | 收尾后 0 | 收尾后 0 | — | true |

提交 `8a271bf` 之后复跑 `bench:cleanup`，五个场景与重启场景的 `clean` 仍为 true。

未测：真实 Kiro 账号中会话的保留情况（SUB-050，Q60）；真实 kiro-cli 的会话删除命令（替身对每个删除请求都应答）。

## 6. 真实模型闸门

- `pnpm bench:quality --real-model`（无环境变量）：拒绝，输出 `--real-model also needs VOXWARD_BENCH_REAL_MODEL=1`。脚本直接运行时退出码 2；经 pnpm 包装后退出码为 1。
- `VOXWARD_BENCH_REAL_MODEL=1 pnpm bench:quality --real-model`：拒绝，输出 `the real-model binding is not part of SUB-049; SUB-050 adds it with the Owner account (Q60)`。
- `pnpm bench:quality --bogus`：拒绝，输出 `unknown argument --bogus`，退出码 2（经 pnpm 为 1）。
- 本包没有运行任何真实模型，没有使用本机 Kiro 账号，没有连接本机 Kiro Crew 网关。

## 7. 验收行逐条结果（VW-SUB049-AC001）

- 样本来源合法且有记录：满足。样本为本项目合成，无真实观众数据，无平台数据，无第三方数据集；`contains_real_viewer_data: false`；来源与许可写在 `bench/samples/SOURCES.md`。
- 脚本可复现：满足。`quality` 两次输出逐字节相同。`latency` 与 `cleanup` 包含时间与环境，不要求逐字节相同，但它们的结构和判据稳定。
- 分别输出规则、实时、SC 与复盘结果：满足，见第 3 节的四个块。
- 来源审查由实施者完成，属于自测。独立审查由工单的 verificationOwner 按批次安排。

## 8. 偏离、自定选择与未验证项

- 自定：增加 `bench/lib/`、`bench/fixtures/`、`bench/tsconfig.json`；根 `package.json` 增加 `bench:*` 入口，`typecheck` 追加 bench；不新增依赖（Q59）。
- 自定：真实模型闸门默认关闭，`--real-model` 即使配环境变量也拒绝运行，绑定留给 SUB-050。
- 偏离并已修正：规格初稿的布局、规则集分组与依赖列表与实现不一致，已在提交 `d0ad429` 之后的本提交中修正（受管段未改动，`kiro-specs check` 为 SPEC_CURRENT）。
- 未测：队列最老消息年龄；跨条合并判定（引擎逐条判定）；复盘结算循环（review store 与任务协调器未接入）；人工改判率；API 配额与单场费用；真实模型的结构失败率。
- 未验证：真实 kiro-cli 3.x 的参数与输出（替身按 `fake-kiro-cli` 的行为测试）；替身的分类能力（假 CLI 只认 `badword`，合成适配器恒为放行）。

## 9. 与同批其它包可能的合并冲突

- 根 `package.json` 的 `scripts` 段：本包新增 `bench:typecheck`、`bench:quality`、`bench:latency`、`bench:cleanup`，并改了 `typecheck`。其它包如果也改这一段，会在这里冲突。
- `pnpm-lock.yaml`、`pnpm-workspace.yaml`、`vitest.workspace.ts`、`scripts/check-deps.mjs`、`apps/`、`packages/`：本包均未改动。
