# P-S014-fix 返工一轮自检（rework1）

来源：批次 m6 判断（B5、N4、N8），简报 `b7-s014-fix.md`。子单 VOXWARD-SUB-027（work:72af8ac97c70068c90e95e09）。

## 基本信息

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s014-fix`，分支 `voxward/s014-fix`。
- 基线：`763bc39`。简报写的是 `0f7fcd0`，它是 `763bc39` 的祖先，已核对。
- 实际模型：kiro / claude-haiku-5.5 / max（economy 档，rejections=1）。
- 提交：
  - `0d72f14` VOXWARD-SUB-027 B5（阻断项，单独提交）。
  - 下一个提交：N4（Q49）、Q53 设计对齐、N4 测试、本证据（非阻断项、spec 与证据合并）。

## 修复

### B5 改判放行不产生可投递意图；补发拒绝已送达的投递

- 改判为放行：`OverturnOutcome.intent` 为 null。新裁决的投递行写为 `EXPIRED`，有效期取改判时刻。显式补发可以引用这一行，仍受 10 分钟时限约束（`WINDOW_CLOSED`）。
- 改判为拦截：保留原投递（`PENDING`，5 分钟）。
- 补发拒绝状态为 `SENT` 的投递（`ALREADY_SENT`），对应探针 E3 的观察。
- 文件：`apps/server/src/db/decision-store.ts`、`apps/server/src/modules/decision-service/compensation.ts`、`apps/server/src/modules/decision-service/routes.ts`、`packages/contracts/src/modules/decision-service.ts`、`packages/contracts/src/ports/decision-store.ts`。

### N4（Q49）其后条目触及上下限：标记，不重算

- 选择「标记」。同一主体在原条目之后有账本条目被钳制（请求变化量与实际变化量不同），或有无计分结果为 `CLAMPED`，纠分即标为需人工调整。结果带 `needsManualAdjustment: true`，Change Log 写入摘要「纠分需人工调整：其后有条目触及上下限」（不含分数）。
- 金额不变：仍是账本实际变化取反后经当前上下限钳制的结果。
- 理由：重算要在账本上重放计分规则，需要改计分引擎，超出本包范围。
- 设计写入 `design.md` 的 §4、§6、§7、§10，包括改判不对新结论计分的取舍。

### Q53 设计与代码对齐

- §1、§2：`auth/decision-routes.ts` 在本检出中不存在，改为「计划项，本检出不存在（见 §8）」。
- §4：人工补偿键改为 `manual:<频道>:<主体>:<操作标识>`，与 `scoring-engine/compensation.ts` 一致。

## 测试（先红后绿）

修前运行 `test/decision-service`（45 项）：8 项失败。
- B5 相关 5 项：误判放行的 intent 断言、放行不产生意图、时限内补发、超时补发的 `WINDOW_CLOSED`、已 SENT 的补发。
- N4 相关 2 项：后续钳制时标记、无后续触限时不标记。
- BLOCK 方向 1 项：它断言了新增字段 `downstream`，行为与修前一致。

修后：`test/decision-service` 与 `test/db` 共 150 项全部通过（N4 新增 4 项，其中一项只经过账本路径判断，用来验证 `rowid` 比较）。

## 修复前后的实测对照

探针 `probe-m6-s014.mts <worktree> <scratch> <label> all`，修前在 `763bc39` 上运行，修后在本包的工作树上运行。

| 项 | 修前 | 修后 |
| --- | --- | --- |
| 检查数 / 不符数 | 24 / 1（D1） | 24 / 1（D1，见未验证项） |
| D1：2 小时前拦截改判为放行 | 产生状态 `PENDING`、有效期至 12:05 的放行投递，intent 为 ALLOW | intent 为 null；投递行 `EXPIRED`，有效期 12:00；没有可投递记录 |
| D2：补发该消息 | 两次补发均为 `WINDOW_CLOSED` | 同 |
| C5：五次拦截（每次 −3，下限 −10）后纠正第一条 | 纠分 +3，结果 −7；按账本重放应为 −10 | 结果 −7（不变），结果带 `needsManualAdjustment`（探针不打印该字段，由 `correction-limits.test.ts` 覆盖） |
| E1、E2 | 通过 | 通过 |
| E3（观察） | 已 SENT 的投递过期后可再发 | 已 SENT 的投递被拒绝（`resend.test.ts` 覆盖） |

## 自测

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | 0 | 无新增包 |
| `CI=true pnpm build` | 0 | server 与 web 构建成功 |
| `CI=true pnpm typecheck` | 0 | contracts、server、web 通过 |
| `CI=true pnpm test` | 0 | 127 个文件，1729 项通过 |
| `CI=true pnpm check:deps` | 0 | 200 个文件，0 违规 |
| `kiro-specs.mjs check --work-id work:210958ccce508a7abf314287 --spec-dir .kiro/specs/voxward-s014-decision` | 1 | `SPEC_STALE`：正式源为 rev 5（sourceDigest `b87b42d7…`），托管段记录的是 rev 4（`8ac27e27…`）。两个摘要都不依赖本地内容，与本包改动无关。未执行 `refresh`，因为它会改写托管段，简报未授权。 |
| `smoke.sh <工作树> $KIROCREW_SCRATCH/s014-fix-smoke` | 0 | dev 与 dist 的 `/healthz` 均为 200（2 s、1 s）；结束后 3000、5173 无监听 |

测试在最后一次改动后复跑：typecheck、test、check:deps 均为 0。build、spec 检查与冒烟在此之前运行，之后源码没有改动，结果不变。

## 未验证项

- N4：只判断原账本时间线上的触限。替换后，原本未钳制的后续条目可能新触及上下限，账本里看不出来；本包不重放。
- 改判为拦截时是否另发不含原文的拦截事件，按提案 §13.1 另定，本包不改。
- 真实输出适配器（S021）未接，投递的实际发出与补发后的展示未验证。
- 补发与标记 SENT 之间没有压力测试，依赖 SQLite 事务守卫。
- 探针 D1 断言 `intent === undefined`，修后为 `intent: null`，语义相同，但探针仍报 1 项不符。探针属于 `voxward-batch-m6` 的证据，本包不改它。
- spec 检查未通过（见上表）。
- N1–N3、N5–N9 不在本包范围内。

## 变更文件

- 代码：`apps/server/src/db/decision-store.ts`、`apps/server/src/modules/decision-service/compensation.ts`、`apps/server/src/modules/decision-service/routes.ts`。
- 契约：`packages/contracts/src/modules/decision-service.ts`、`packages/contracts/src/ports/decision-store.ts`（后者超出简报列出的范围，见下）。
- 测试：`apps/server/test/decision-service/compensation/overturn.test.ts`、`resend.test.ts`、`correction-limits.test.ts`（新增）。
- spec：`.kiro/specs/voxward-s014-decision/design.md`（只改受管段之后的本地内容）。
- 证据：`.kiro/specs/voxward-s014-decision/evidence/rework1-self-check.md`（本文件，新增）。

## 与其它返工包的冲突风险

- `packages/contracts/src/ports/decision-store.ts` 是本包改动的文件，简报与判断的清单中没有它。P-S010-fix、P-S011-fix 的清单里没有这个文件。
- P-S010-fix（`inference-provider/`、`adapters/kiro-cli/`）与 P-S011-fix（`moderation-engine/`、`task-coordinator/`）的文件与本包没有交集。

## 偏离简报的决定（需主线程确认）

1. 为让 N4 的标记与 B5 的 `deliverable` 输入经过存储层，改了 `packages/contracts/src/ports/decision-store.ts`。改动限于三处：`OverturnStoreInput.deliverable`、`OverturnStoreResult.needsManualAdjustment`、补发拒绝原因 `ALREADY_SENT`。
2. 改判为拦截仍保留自动投递，撤下旧内容的方向不变。
3. 补发拒绝已 SENT 的投递（探针 E3 的同处决定，自定）。
4. N4 选择标记，不重算。
