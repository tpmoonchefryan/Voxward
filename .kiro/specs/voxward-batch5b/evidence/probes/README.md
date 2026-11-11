# 第 5b 批验收探针与原始输出

- 运行方式见 acceptance.md 的「0. 执行记录」。探针只按绝对路径导入检出内源码，参数一般为 `<检出> <work>`，用 `apps/server/node_modules/.bin/tsx` 运行。
- S006 探针（`probe-s006-b5b.mts`，以及 `probes5a/` 里原样复跑的第 5a 批探针）需要对照副本：`git -C <检出> archive <rev> apps/server/src/modules/moderation-engine | tar -x -C <work>/old/<rev>`，`<rev>` 为 `f4808fb`、`fa5dc19`、`b1a1471`；另在 `<work>/node_modules/@voxward/contracts` 放一个指向 `<检出>/packages/contracts` 的软链接。
- S009 探针（`probe-s009*.mts`）只用进程内替身：自写时钟、事务型事实端口、技术日志接收器（每条交给审计库 `prepareTechnicalWrite` 校验）与 Crew 替身；不启动 Kiro Crew，不连接网关，不调用 kiro-cli。`probe-s009.mts` 的 §8 要加 `NODE_OPTIONS=--expose-gc`，整份约 150 s；脚本只统计，不以失败退出，看末尾的 `checks N, failures M`。
- `net/preload.mjs` 经 `NODE_OPTIONS=--import` 加载：非回环连接、DNS 与 fetch 一律拒绝；`PROBE_DENY_PORTS` 列出的本机端口（运行前已在监听的端口）即使走回环也拒绝。`net/selfcheck.mjs` 与 `net/loopcheck.mjs` 是它的自检。`shim/` 放在 PATH 最前，替换 `kiro-cli`、`kirocrew`、`kiro`，每次调用都记录并以 97 退出。
- `out-src/` 是生成 acceptance.md 与 evidence-records.json 的片段与脚本：`node out-src/build-out.mjs <work> <out>`，需要 `<work>/out-src/`、`<work>/cards.json`（已附在 `out-src/cards.json`，由 E01 的输出提取）与 `<work>/VOXWARD-STORY-006.json`（E01 原始输出，只读库版本与 headEventHash，未附）。
- `logs/` 是原始输出：`gates/` 为 E02–E06，`e07/` 为冒烟，`e08-net.jsonl` 为拦截记录（126 个进程合并）。数据全部是合成的。
