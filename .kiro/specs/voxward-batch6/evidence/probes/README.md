# 第 6 批验收探针与原始输出

- 运行方式见 acceptance.md 的「0. 执行记录」。探针只按绝对路径导入检出内源码，用 `apps/server/node_modules/.bin/tsx` 运行；导入 `@voxward/contracts` 需要在 work 目录放一个软链接 `<work>/node_modules/@voxward/contracts` → `<检出>/packages/contracts`。脚本只统计，不以失败退出，看末尾的 `checks N, failures M`。
- S009：
  - `probe-s009.mts`（E30）：第 5b 批 E30 的副本，只把 §5 的 PAID 场景与 §7 的资源端口异常改为带期望的检查，其余行不变。§8 要加 `NODE_OPTIONS=--expose-gc`。参数 `<检出> <work>`。
  - `probe-s009-extra.mts`（E31）、`probe-s009-order.mts`（E32）：第 5b 批原样。参数 `<检出>`。
  - `probe-s009-b6.mts`（E34，本轮新写）：§A 车道矩阵，§B 按会话控制的 Crew 替身（start、cancel、done 可分别挂起或晚到；pump 与 cancelEvent 用 1 s 真实计时器判定是否返回），§C 结算后正文释放（写堆快照到 `<work>/logs/` 再检索唯一标记，检索完删除）与轻量记录增长。要加 `NODE_OPTIONS=--expose-gc`。参数 `<检出> <work> <label>`。
  - 对照副本：`git -C <检出> archive 5ce5bee apps/server/src/modules/task-coordinator apps/server/src/modules/audit-store | tar -x -C <work>/old/5ce5bee`，把 `<work>/old/5ce5bee` 当作 `<检出>` 传入。
- S013：
  - `probe-s013-q28.mts`（E40）：自写假 Google 令牌端点（按 RFC 7636 4.6 校验 S256，可选兑换失败时是否作废授权码），真实保险箱、凭据存储、state 存储与 OAuth 路由。参数 `<检出> <label>`。
  - `probe-s013-q20.mts`（E41）：在 `<scratch>` 下建临时目录，迁移真实 SQLite，运行真实计分引擎与计分端口，结束后删除。参数 `<检出> <scratch> <label>`。
  - `probe-s013-stream.mts`（E42）：脚本化传输按官方 liveChatMessage 资源形状给出条目；S3、S3b 在 `<scratch>` 下用真实 SQLite 与计分引擎。参数 `<检出> <scratch> <label>`。
  - 对照副本：`git -C <检出> archive 6d395c9 apps/server/src | tar -x -C <work>/old/6d395c9`，再 `ln -s <检出>/apps/server/node_modules <work>/old/6d395c9/apps/server/node_modules`。
- `net/preload.mjs` 经 `NODE_OPTIONS=--import` 加载：非回环连接、DNS 与 fetch 一律拒绝；`PROBE_DENY_PORTS` 列出的本机端口（运行前已在监听的端口，见 `logs/deny-ports.txt`）即使走回环也拒绝。`net/selfcheck.mjs` 与 `net/loopcheck.mjs` 是它的自检。`shim/` 放在 PATH 最前，替换 `kiro-cli`、`kirocrew`、`kiro`，每次调用都记录并以 97 退出。
- `out-src/` 是生成 acceptance.md 与 evidence-records.json 的片段与脚本：`node out-src/build-out.mjs <out>`，读取同目录的 `cards-b6.json`（E01 读到的 6 单实时验收行）、`rows.mjs`（每行判定与依据）与 `acc-*.md`。脚本做格式自检，有问题时退出 1 且不写文件。
- `logs/` 是原始输出：`gates/` 为 E02–E06，`e07/` 为冒烟，`e08-net.jsonl` 为拦截记录（134 个进程合并），`e09-*` 为负面对照，`e10-*` 为 spec check，`e30`–`e42` 为各探针在候选与对照上的输出，`e33-*` 为静态核对。数据全部是合成的。
