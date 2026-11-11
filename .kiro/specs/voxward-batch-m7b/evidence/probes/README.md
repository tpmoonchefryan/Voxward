# 第 m7b 批（S021 首次验收、S027 SUB-049 首次验收）验收探针与原始输出

- 运行方式见 acceptance.md 的「0. 执行记录」。探针只按绝对路径导入检出内的源码与测试夹具（第一个参数是检出根），用检出里的 `apps/server/node_modules/.bin/tsx` 运行。脚本只统计、以 0 退出，看末尾的 `checks N, failures M`。每条 `OK`/`FAIL` 行写的是它检查的契约，`FAIL` 表示被测代码不满足；`NOTE` 只记录读数。数据全部是合成的，服务只绑 127.0.0.1。
- 每条命令都经 `guarded.sh <日志目录> <命令…>` 运行：它设置 `PATH=<work>/shim:$PATH`、`PROBE_SHIM_LOG`、`PROBE_NET_LOG_DIR`、`PROBE_DENY_PORTS=$(cat logs/deny-ports.txt)` 与 `NODE_OPTIONS=--import=<work>/net/preload.mjs`，先在同一环境里运行 `net/selfcheck.mjs`，自检通过才运行命令。临时库放在 `KIROCREW_SCRATCH=<work>/tmp`，基准的 scratch 放在 `KIROCREW_SCRATCH=<work>/tmp-bench`。
- **自检只在拦截加载后运行（Q58）**：本轮的 `net/preload.mjs` 在全部补丁就位后设置 `globalThis.__VW_PROBE_NET_GUARD__ = true`；`net/selfcheck.mjs` 第一步检查这个标记，没有标记时不导入任何网络模块、不发起任何连接，直接以 3 退出。本轮没有在未加载拦截时运行自检。
- 相对上一轮（`.kiro/specs/voxward-batch-m7/evidence/probes/net/preload.mjs`）的拦截改动只有两处：设置上述标记；`dns.promises.lookup` 与 `dns.resolve*`（含 promises 版本）对非回环名称同样拒绝并记录。`loopcheck.mjs` 与 `shim/` 原样沿用。
- `net/net-summary.mjs <日志目录>` 汇总一次运行的拦截记录（加载拦截的进程数、各类连接、被拒目标、DNS、垫片调用次数），写出 `net-summary.json` 与合并后的 `net.jsonl`。

## 探针

| 文件 | 执行记录 | 内容 |
| --- | --- | --- |
| `lib-m7b.mts` | E60–E62 | 共用：从检出导入模块、建库与种子数据（经 S014 真实决策存储写裁决与投递行）、账号与登录、真实 `buildApp` 装置、ws 客户端、手工握手的 TCP 消费者、帧解析。 |
| `probe-m7b-s021.mts` | E60 | G 凭据签发、交付、两表判定与撤销（Q16、Q18）；Q 框架错误与日志脱敏（Q25）；C 心跳、客户端数据、积压与关闭码；D 帧与字段；S 投递状态、有限发送与补发（受控时钟，与 app.ts 相同的端点、注册表、端口与投递泵）；Z 有消费者在线时关闭应用；M 观察项。 |
| `probe-m7b-s021-race.mts` | E61 | 投递泵一轮之中，后面的行被改判（R1 真实应用；R2 受控）、被标 CANCELLED（R3）或越过有效期（R4，对照）。 |
| `probe-m7b-s021-example.mts` | E62 | 原样运行 `examples/consumer-dedup/consumer.mjs`，按协议文档签发、连接、去重、撤销；错误凭据、带查询串、非 127.0.0.1、缺凭据时的退出码。 |
| `probe-m7b-s027-samples.mts` | E71 | 样本校验对原文件与 8 种改坏的副本；样本内容扫描（平台 ID、URL、邮件、@ 账号、长数字、live chat ID）。 |
| `extract-cards-m7b.cjs` | E01 | 从 4 份 work-show 输出提取验收行，核对 Story 与子单同名 INHERIT 行逐字相同，写出 `out-src/cards-m7b.json`。 |

## 对照变体（只在 scratch 副本中，检出未改）

- 做法：`git -C <检出> archive 7400f39 apps/server/src apps/server/test apps/server/package.json packages/contracts/src packages/contracts/package.json | tar -x -C <work>/variants/<名>`，再把 `<检出>/apps/server/node_modules` 软链到副本的 `apps/server/node_modules`，按下列 diff 改一处，把副本根当作检出传给探针。
- `variants/fix-recheck.diff`：`delivery.ts` 在每行发送前重读一次该频道的可发送行，该行不在其中就跳过。E61 R1–R3 由不符变为符合，E60 其余 34 项不变（Z1 仍不符）。
- `variants/fix-preclose.diff`：`app.ts` 把停止投递泵与关闭端点的钩子从 `onClose` 改为 `preClose`。E60 的 Z1 由不符变为符合，35 项全部符合。
- 两个变体只用来说明探针能区分实现、修法方向可行，不是给实施方的补丁。

## 其它文件

- `guarded.sh`、`net/`、`shim/`（`kiro-cli`、`kirocrew`、`kiro` 垫片，每次调用记录并以 97 退出）。
- `out-src/`：`cards-m7b.json`（E01 读数）、`rows.mjs`（每行判定与依据）、`acc-*.md`（acceptance.md 的叙述片段）、`build-out.mjs`（生成 acceptance.md 与 evidence-records.json，并做格式自检；有问题时退出 1 且不写文件）。用法：`node out-src/build-out.mjs <输出目录>`。
- `SHA256SUMS`：本目录探针、脚本、片段与变体 diff 的 sha256。
- `logs/`：`e01/` 读数提取；`gates/` 为 E02–E06（逐条退出码、锁文件 sha256、去掉颜色码的测试输出）；`e07/` 冒烟与打包产物静态核对；`e08/` 拦截下的全量测试（运行前自检与回环自检、汇总后的拦截记录、垫片记录）；`e09/` 负面对照；`e10/` 两份 spec check 与 `.kiro/specs/**` 前后 sha256；`e11/` 静态核对；`probes/` 为 E60–E62 在候选与两个变体上的输出；`bench/` 为 E70–E71。
