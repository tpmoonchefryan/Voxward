# S009 第一次返工自检（rework1）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s009-fix`，分支 `voxward/s009-fix`，基于 `d819cbe`。
- 实际模型：claude-haiku-5.5（kiro 后端，economy 档）。
- 提交：
  - `cbf6a4f` VOXWARD-SUB-017 B4：保序门控只比较同频道同车道的前序。
  - `c40ef04` VOXWARD-SUB-018 B5：pump 与 cancelEvent 不等待 Crew 的取消。
  - 本文件所在提交：N1–N3、N6–N8、设计文档与本证据。

## 修复项

| 编号 | 修法 | 测试位置 |
| --- | --- | --- |
| B4 | `OrderedTask` 增加 `lane`；`orderGate` 只比较同频道且同车道的前序。设计 §8 改为同频道同车道，并说明提案「通道」指处理车道。 | `ordering.test.ts`（车道，3 例）、`coordinator.test.ts`（提交顺序，4 例） |
| B5 | `reapIdle` 只发起取消、不等待。待定取消表记录每次取消；批次槽位在 Crew 接受取消（或会话已报告）后释放；被拒绝的取消由下一次 `pump` 再发；`start` 晚到的会话立即取消且不阻塞。`cancelEvent` 在协调器取消完成后返回。取消一直不返回时槽位保留（见未验证项）。 | `crew/adapter.test.ts`（挂起替身 `crew/hung-crew.ts`，6 例） |
| N1 | `commitResult` 遇到已过截止时间的 RUNNING 任务，与扫描一致转 PENDING_REVIEW（DEADLINE_EXCEEDED），对调用方仍返回 `discarded`。设计 §3、§7 同步。 | `acceptance.test.ts`（慢请求；前序超时增加状态断言） |
| N2 | 任务记录不再保存整份事件；结算时释放正文（置空）并移出未结索引；未结任务按车道与频道建索引；槽位记录自己的任务列表；取消按事件键直达；到期扫描只遍历未结任务。 | `coordinator.test.ts`（结算记录，1 例） |
| N3 | 选择改设计说明（设计 §8）：前序已被扫描转入 PENDING_REVIEW 时，后一条不记录 `PREDECESSOR_UNFINISHED`；缺口由前序自身的 TIMED_OUT 条目记下。代码不改。 | `acceptance.test.ts`（前序已被扫描，1 例） |
| N6 | `CrewReport`、`CrewPort` 注释写明：`completed` 须先经 S007 整批校验（VW-R-008）；Crew 端内容残留由真实绑定在 done 或 cancel 后清理（VW-R-009），归 S029。设计 §9 同步。 | 文档，无用例 |
| N7 | `ResourceSignalPort.read()` 抛异常按 CRITICAL 处理，限额收缩到下限。 | `crew/capacity.test.ts`（1 例） |
| N8 | 设计 §5 改写：当前上限为 1 时后台暂停；上限更高时，即使降到最小值，后台仍保留 `limit - reserve` 个槽位。代码不改，与原行为一致。 | 文档，无用例 |

## 修复前后的实测对照

修复前的失败（修复前代码 `d819cbe` 加本轮新增用例）：

- B4：5 例失败（`ordering.test.ts` 2 例、`coordinator.test.ts` 3 例）。修复后全部通过。
- B5：cancelEvent、pump、槽位保留、取消重试共 4 例失败，原因是 cancel 不返回。start 挂起与 done 挂起的 2 例修复前即通过，作为守护用例保留。
- N1：慢请求用例期望 PENDING_REVIEW，修复前失败。N7：读取异常修复前抛出，用例失败。
- 原始输出：`$KIROCREW_SCRATCH/s009-fix/prefix-b4-b5.txt`、`prefix-n.txt`；修复后 `after-b4.txt`、`after-b5.txt`、`after-n.txt`。

探针对照（`probes/probe-s009-extra.mts`、`probe-s009-order.mts`）：

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 挂起取消：pump、第二次 pump、cancelEvent 是否返回 | 均否；启动会话 1 个；ch-b 停在 QUEUED | 均是；启动会话 2 个；ch-b RUNNING，到期后 PENDING_REVIEW（DEADLINE_EXCEEDED） |
| 结算记录成本，8 条（提交 / 扫描 / 取批，µs） | 5 / 2 / 60 | 6 / 2 / 174 |
| 结算记录成本，2 万条（µs） | 657 / 121 / 693 | 1 / 0 / 1 |
| 结算记录成本，6 万条（µs） | 2543 / 703 / 1942 | 2 / 0 / 3 |
| 前序超时后一条的提交日志 `data` | `null` | `null`（按 N3 的设计说明） |

来源：修复前数据是上一子代理在同一基线上的实测，保存在 `$KIROCREW_SCRATCH/s009-probe/out/before-extra.txt`、`before-order.txt`。修复后数据是本轮在修复后代码上重跑，保存在 `$KIROCREW_SCRATCH/s009-probe-after/after-extra.txt`、`after-order.txt`。每项为单次运行。8 条时的取批 174 µs 与修复前的 60 µs 差异属于单次测量的噪声，未重复测量。

## 自测命令与退出码

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 锁文件未变 |
| `pnpm build` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 97 个文件、1474 个用例全部通过（基线 1458，新增 16） |
| `pnpm check:deps` | 0 | 171 个文件，0 违规 |
| `kiro-specs.mjs check --work-id work:ac2a8c1b963085361cf086f0 --spec-dir .kiro/specs/voxward-s009-scheduler` | 1 | `SPEC_STALE`，见下 |
| `smoke.sh <工作树> <scratch>/s009-fix-smoke`（默认配置） | 0 | `pnpm dev` 与 `dist/main.js` 的 `/healthz` 均为 200（127.0.0.1）；停止后 3000、5173 无监听 |

`SPEC_STALE` 的情况：设计文档的受管段（`EINZBERN-SPEC:MANAGED-START` 至 `MANAGED-END`）与基线 `d819cbe` 逐字相同。检查报告的源摘要为 `e80dada5…`，对应工作项修订号 5；spec 记录的是修订号 4（`cdcf67a0…`）。修订号变化发生在工作项库一侧，不是本分支的改动造成的。本轮未运行 `refresh`。修订号变化是否只因链写，本地无法确认，由主线程判断。

## 未验证项与残留风险

- 真实 Kiro Crew 的 start、cancel、done 行为未验证，全部用替身；真实绑定归 S029。
- B5 残留 1：`CrewPort.cancel` 永不返回时，该批次的槽位一直保留。并发上限为 1 时，派工停止直到 Crew 应答。执行器侧没有设上限，因为提前释放会让 Crew 侧的会话数超过上限。有界取消需要 S029 的绑定保证。
- B5 残留 2：`start` 尚未返回时批次已空闲，槽位立即释放。若 `start` 之后才返回，Crew 侧可能短暂多出一个会话，直到取消被接受。未测量。
- N2 残留：结算后仍保留轻量记录（状态、原因、事件键与版本），用于查询与去重。它随累计任务数线性增长，清理策略未定，未做长时间运行实测。
- N2 中「释放正文」没有直接用例：测试覆盖的是结算后的查询、去重与调度索引；正文释放只在代码中可见。
- 微批、阈值、并发上限等数值仍未测量。

## 可能与 S013 包冲突的文件

S013 工作树未检查。本包改动的文件：`apps/server/src/modules/task-coordinator/ordering.ts`、`coordinator.ts`、`crew/adapter.ts`、`crew/capacity.ts`，新增 `apps/server/test/task-coordinator/crew/hung-crew.ts`，以及测试 `ordering.test.ts`、`coordinator.test.ts`、`acceptance.test.ts`、`crew/adapter.test.ts`、`crew/capacity.test.ts`，和 `.kiro/specs/voxward-s009-scheduler/design.md`。
