# 第 m7 批第 1 部分（S011 第 3 轮复验、S015 首次验收）验收探针与原始输出

- 运行方式见 acceptance.md 的「0. 执行记录」。探针只按绝对路径导入检出内的源码与测试夹具，用 `apps/server/node_modules/.bin/tsx` 运行；工作目录要有软链接 `<work>/node_modules/@voxward/contracts` → `<检出>/packages/contracts`。脚本只统计，不以失败退出，看末尾的 `checks N, failures M`。每条 `OK`/`FAIL` 行写的是它检查的契约，`FAIL` 表示被测代码不满足；`NOTE` 只记录读数。数据全部是合成的。
- 本轮所有探针都在拦截下运行：`PATH=<work>/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=$(cat logs/e08/deny-ports.txt) NODE_OPTIONS="--import=<work>/net/preload.mjs"`（E30、E34、E61 另加 `--expose-gc`）。探针运行的拦截记录在 `logs/probes/probe-runs-net.jsonl`：32 个进程，只有 IPC。
- **自检必须带拦截模块运行**：`net/selfcheck.mjs` 会真的去连 Google、Kiro 与 example.com，它不检查拦截模块是否已加载。本轮第一次误在没有 `NODE_OPTIONS=--import` 时运行（`logs/e08/selfcheck-NO-GUARD-mistake.txt`），见 acceptance.md E08。正确写法：`PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=… NODE_OPTIONS=--import=<work>/net/preload.mjs node net/selfcheck.mjs`。
- S011 对照副本：`git -C <检出> archive fff691e apps/server/src apps/server/test packages/contracts/src packages/contracts/package.json | tar -x -C <work>/old/fff691e`，再 `ln -s <检出>/apps/server/node_modules <work>/old/fff691e/apps/server/node_modules`，把 `<work>/old/fff691e` 当作 `<检出>` 传入（E60、E62、E63）。
- S015 变异对照：把检出的 `apps/server/src`、`apps/server/test`、`packages/contracts/src` 与 `package.json` 复制到 `<work>/old/mut-m{1,2,3}`，软链 `node_modules`，再按 `s015-mutants.diff` 各改 `decision-service/platform-delete.ts` 一行（m1 权限与配额检查恒为通过；m2 读回恒为 PRESENT，即未知时直接重试；m3 被拒的本地审核仍执行平台步骤），把副本当作 `<检出>` 传给 `probe-m7-s015.mts`（E70）。

## 探针

| 文件 | 执行记录 | 来源与改动 |
| --- | --- | --- |
| `probe-m7-s011.mts` | E60 | 上一轮 `probe-m6r1-s011.mts` 的副本加改动，差异全文见 `probe-m6r1-to-m7-s011.diff`：§A2 改为 B6 要求的顺序（PAID、REALTIME 已就绪时 `runBatch()` 返回 null、不调模型、两条任务仍 QUEUED、复盘消息仍 UNSETTLED_FAST_PASS；执行器取走后才结算，再取为 null）；§A6 由观察改为检查（后台 0 个批次、执行器 3 个）；新增 §A6b（执行器取走后后台得到剩下的 1 个槽位）、§A6c（实时还在微批窗口内时不挡后台）、§A6d（实时在重试退避中时不挡后台）。其余各节逐字相同。实施方自测证据里的 `probe-m6r1-to-m6r2.patch` 只作线索，本副本是独立改写的。 |
| `probe-m6r1-s011.mts` | E60（对照） | 上一轮原样。在 cb822f0 上只有 A2 的旧期望不再成立（32 项 1 项不符），用来确认本轮副本只改了需要改的地方。 |
| `probe-m6r1-s011-heap.mts` | E61 | 上一轮原样。 |
| `probe-m6r1-s011-order.mts` | E62 | 上一轮原样。 |
| `probe-m7-s011-order2.mts` | E63 | 本轮新增。真实协调器与假时钟，比较单一调用方、执行器先取、复盘先取三种顺序：S1（1 条实时、8 条后台）、S2（实时细流加后台积压）、P（300 组固定种子的随机到达，检查付费与实时任务的开始周期与去向，后台只作读数）。任务按到达序号对齐，不按 taskId（夹具的任务 ID 与批次 ID 共用一个计数器）。 |
| `probe-m7-s015.mts` | E70 | 本轮新增。真实 S014 决策服务与迁移后的 SQLite、S015 编排器与 YouTube 删除适配器、S013 配额监视器、S012 凭据存储（内存 refs、真实保险箱）与真实角色矩阵；只有传输层是替身。节：L 本地权限与默认拒绝、W 写权限、Q 配额、S 状态与本地拦截、U 未知结果与重试上限、G 守卫。`writeGrantScopes` 按设计 §3.2 绑定为频道最新未撤销授权的 scope。 |
| `probe-s009.mts`、`probe-s009-extra.mts`、`probe-s009-order.mts`、`probe-s009-b6.mts` | E30–E34 | 第 6 批 `.kiro/specs/voxward-batch6/evidence/probes/` 的原样副本（sha256 见 `logs/s009/probe-sha.txt`），参数同第 6 批。 |
| `extract-cards-m7.cjs` | E01 | 上一轮 `extract-cards.cjs` 的副本，只改了文件头与工单列表。从 5 份 work-show 输出提取验收行，与 `cards-m6r1.json` 比较 S011 组，写出 `out-src/cards-m7.json`。 |

## 其它文件

- `net/preload.mjs`（外连与本机已有端口拦截）、`net/selfcheck.mjs`、`net/loopcheck.mjs`、`shim/`（`kiro-cli`、`kirocrew`、`kiro` 垫片，每次调用都记录并以 97 退出）沿用上一轮。
- `out-src/`：生成 acceptance.md 与 evidence-records.json 的片段与脚本：`node out-src/build-out.mjs <out>`，读取同目录的 `cards-m7.json`、`rows.mjs`（每行判定与依据）与 `acc-*.md`。脚本做格式自检，有问题时退出 1 且不写文件。
- `s015-mutants.diff`：三个变异体相对 cb822f0 的改动。
- `SHA256SUMS`：本目录探针、脚本与片段的 sha256。
- `logs/`：`e01/` 工单读数；`gates/` 为 E02–E06（逐条退出码、锁文件 sha256、去掉颜色码的测试输出）；`e07/` 冒烟；`e08/` 拦截下的全量测试（`vitest.clean.log`、汇总后的拦截记录 `net.jsonl`、垫片记录、自检与回环自检、那次未加拦截的自检输出）；`e09/` 负面对照；`e10/` 两份 spec check 与 `.kiro/specs/**` 前后 sha256 的比较；`e11/` 静态核对；`s009/` 为 E30–E34；`probes/` 为 E60–E63、E70 在候选、对照副本与变异副本上的输出。
