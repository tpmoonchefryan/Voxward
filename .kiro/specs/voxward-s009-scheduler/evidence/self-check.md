# S009 自测证据

- 父 Story：VOXWARD-STORY-009（work:ac2a8c1b963085361cf086f0）
- 子单：VOXWARD-SUB-017（work:98811c5dc9e7282c8f3ab9b5）、VOXWARD-SUB-018（work:69b0cc08690c31022d613fc1）
- 分支：voxward/s009-scheduler，基线 fe93a49（main）
- 实际模型：会话声明为 claude-haiku-5.5（economy 档）。未观察到宿主切换。

## 提交

| 提交 | 内容 |
| --- | --- |
| 6d12da9 | VOXWARD-STORY-009: add spec（design.md、tasks.md、requirements.md、source.json） |
| a61bf51 | VOXWARD-SUB-017：微批、车道、截止时间、重试、代次与保序 |
| 1250005 | VOXWARD-SUB-018：Crew 执行器与动态并发 |
| 本提交 | 规格本地段对齐（测试文件映射、执行器行为）与本证据 |

未推送。

## 自测命令与结果

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install` | 0 | Packages: +174，`Lockfile is up to date`，锁文件无改动 |
| `pnpm build` | 0 | contracts `tsc` 通过；server `dist/main.js 168.3kb`；web `vite build` 通过 |
| `pnpm typecheck`（根，递归） | 0 | contracts、server、web 三个包的 `tsc -p tsconfig.json` 无错误 |
| `pnpm test`（根） | 0 | `Test Files 96 passed (96)`，`Tests 1029 passed (1029)` |
| `pnpm -C apps/server test` | 0 | `Test Files 82 passed (82)`，`Tests 933 passed (933)`；其中 task-coordinator 8 个文件、88 个用例 |
| `pnpm check:deps` | 0 | `check-deps: ok, 171 files checked, 0 violations` |
| `kiro-specs.mjs init` | 0 | `SPEC_INITIALIZED`，workRevision 4，sourceDigest cdcf67a0…ea616 |
| `kiro-specs.mjs check` | 0 | `SPEC_CURRENT`（规格本地段对齐之后再次检查，仍为 SPEC_CURRENT） |
| `pnpm dev`（未设置 VOXWARD_DATABASE_FILE） | — | `Server listening at http://127.0.0.1:3000`；`GET /healthz` 返回 200，正文 `{"status":"ok"}`；`LISTEN 127.0.0.1:3000` 与 `127.0.0.1:5173` |

task-coordinator 各文件用例数：priority 6、micro-batch 8、ordering 10、generation 6、acceptance 9、coordinator 25、crew/capacity 10、crew/adapter 14，合计 88。

## dev 服务未能停止（未完成项）

- 停止服务的命令在执行前被安全策略拦截（规则 self-protection-kill）。本包没有用其它写法重试，也没有绕过。
- 仍在运行的进程：`pnpm dev` 进程号 140420（进程组号同为 140420），子进程 tsx watch 140476、vite 140480、server 140512、esbuild 140520。
- 仍在监听：127.0.0.1:3000（进程 140512）与 127.0.0.1:5173（进程 140480）。
- 副作用：生成 `apps/server/data/voxward.sqlite3` 及 `-wal`、`-shm`。该路径被 `.gitignore` 的 `data/` 覆盖，未进入提交。
- 需要由 Owner 执行：`kill -TERM -- -140420`。之后 `ss -ltnp | grep -E ':(3000|5173) '` 应无输出。

## 验收行结果

### VW-SUB017-AC001 与 VW-SUB017-STORY（调度故障注入、优先级、容量和恢复）

- 慢请求：`acceptance.test.ts` 的 slow request。迟到结果为 DISCARDED，超时任务转 PENDING_REVIEW，不写裁决，日志为 TIMED_OUT。
- 限流：`acceptance.test.ts` 的 rate limit。退避 1000 ms、2000 ms，第三次耗尽后为 RETRY_EXHAUSTED。
- 队列满：`acceptance.test.ts` 的 full queue。上限 3，溢出的 7 条转 PENDING_REVIEW。
- 进程重启：`acceptance.test.ts` 的 process restart。未知任务的结果为 UNKNOWN_TASK，`apply` 未执行。
- 删除与取消：`acceptance.test.ts` 的 delete and cancel。车道无空槽时，排队的后台任务仍立即取消；运行中任务在数据删除后为 DATA_DELETED。
- 前序超时：`acceptance.test.ts` 的 predecessor timeout。前序截止后推进，并记录 PREDECESSOR_UNFINISHED；跨通道不等待。
- 车道与后台余量：`priority.test.ts`、`coordinator.test.ts`。PAID 先于 REALTIME；四个并发时后台最多 3 个批次。
- 微批：`micro-batch.test.ts` 覆盖 FULL、BYTES、WAIT、DEADLINE 四种取批条件。超过字节上限的单条在入队时被拒绝，见 `coordinator.test.ts`。
- 结果提交的代次与事务确认：`generation.test.ts`。版本被替代、数据已删除、代次变化、已结算、提交异常，各自被拒绝或转人工，且不写入。

### VW-SUB018-AC001 与 VW-SUB018-STORY（Crew 契约测试，替身实现）

- Crew 可用：`crew/adapter.test.ts` 的 Crew available。提交与证据记录正确；会话完成但无条目不算裁决（INVALID_OUTPUT）；同一任务两条条目同样 INVALID_OUTPUT；可重试错误回到队列；非法错误码记为 CREW_FAILED；前序暂存后提交；结构损坏的报告整批明确失败（CREW_FAILED）。
- Crew 不可用：CREW_UNAVAILABLE，不写任何裁决；会话中途失联（`done` 被拒绝）同样明确失败。
- 取消：运行中的会话在无存活任务时被取消并释放槽位；仍服务其它任务的会话不被取消。
- 宿主资源收缩：并发峰值为 4；收缩到最小后，槽位释放前不再启动新会话（`crew/adapter.test.ts`）。压力分级与上下限见 `crew/capacity.test.ts`。
- 重启：新进程不接管旧会话，也不重启旧任务。
- 真实 Kiro Crew：未验证，本包只用替身。

### VW-S009-INHERIT-*（继承行为）

- 依赖方向：`check:deps` 0 违规。
- `packages/contracts` 与 `apps/server/src/modules/registry.ts` 未改动。
- 其余继承行为的完整验证由 VOXWARD-EPIC-006 承接。本包不宣称已完成。

## 未验证项

- 真实 Kiro Crew 的会话语义、资源信号来源与报告格式（待部署实测，S029，VW-S029-KIRO-REAL）。
- 微批、截止时间余量、排队上限、退避与压力阈值均为自定默认值，未测量。
- 提案中的 250 ms 与 2 ms 未作为承诺使用。
- 主体引用（channelId + senderRef）与 S019 删除索引的对接未验证。
- S008 输出写入 S016 Technical Log 的实际接线未做（S011）。
