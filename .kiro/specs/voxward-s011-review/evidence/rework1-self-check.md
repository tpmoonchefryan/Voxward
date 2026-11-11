# VOXWARD-STORY-011 第一次返工自检（rework1，P-S011-fix）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s011-fix`，分支 `voxward/s011-fix`，基于 `763bc39`（main，含 m6 验收证据）。简报写的基线是 `0f7fcd0`，它是 `763bc39` 的祖先；两者之间只有文档与任务记录，`git diff 5482e5d HEAD -- apps packages` 为空，所以代码与候选 `5482e5d` 相同。
- 实际模型：claude-haiku-5.5（kiro 后端，economy 档，推理努力 max）。
- 环境：Linux x86_64，Node v24.16.0，pnpm 12.18.0。推理只用替身。没有连接真实 Kiro、Crew、YouTube、Google，也没有连接本机 Kiro Crew 网关。
- 提交：
  - `8ea87fc` VOXWARD-SUB-021 B2：按车道取批。
  - `b2a54a0` VOXWARD-SUB-021 B3：复盘结果按整批校验 itemId 集合。
  - `999d423` VOXWARD-SUB-021 B4：复盘运行器的条目不保存正文。
  - `c370928` VOXWARD-STORY-011 N5：候选词驳回，确认与驳回统一 `list.edit`。
  - 本文件所在提交：设计文档（S011、S009 受管段之外）与本证据。

## 修复项

| 编号 | 修法 | 测试位置 |
| --- | --- | --- |
| B2 | `takeBatch` 接收可选 `lanes`，缺省取全部车道，派工顺序不变。Crew 执行器只取 PAID 与 REALTIME；复盘运行器只取 BACKGROUND。两者仍共用槽位与后台余量。运行器遇到不由它入队的任务时不结算，留给截止时间扫描（R7）。 | `task-coordinator/lanes.test.ts`（车道过滤、共用槽位、后台上限，5 例）；`task-coordinator/crew/adapter.test.ts`（复盘任务不启动会话，2 例）；`moderation-engine/review/runner.test.ts`（实时任务不被复盘批次取走，1 例） |
| B3 | 运行器在结算前检查模型返回的 itemId 集合（`review/membership.ts`）。每个批内 id 必须恰好返回一次；批外或重复为 `AI_OUTPUT_INVALID`，缺项为 `AI_OUTPUT_INCOMPLETE`。整批转人工，不结算、不计分、不写复核记录、不建卡片。moderation-engine 不能导入 inference-provider（check:deps），因此在本模块写同一规则。 | `moderation-engine/review/runner-batch-contract.test.ts`（重复、缺项、批外三种，3 例；规则单元，2 例） |
| B4 | 条目只保存事件的身份字段，正文由批次提供，只在一次结算期间存在。`runCycle` 与 `runBatch` 开始时释放协调器已结束或已淘汰（`TASK_NOT_FOUND`）任务的条目。`retainedEntries()` 观察条目数。 | `moderation-engine/review/runner-entries.test.ts`（取消与到期后条目数为 0；弱引用与完整回收后事件对象已释放，2 例）。`review/fixtures.ts` 增加 `forget` |
| N5 | `CandidateStatus` 增加 `REJECTED`；`store.reject` 与 `routes.reject`（403、400、404、409 与确认一致）。驳回后同一规范化词条不再提出。确认与驳回统一用 `list.edit`（提案 §2.1；S014 词条入库已用同一能力）。频道所有者与房管两者都有，因此能确认的角色不变；数据管理员两者都没有。导出名 `REVIEW_DECIDE_CAPABILITY` 改为 `LIST_EDIT_CAPABILITY`。 | `candidates/store.test.ts`（驳回，4 例）；`candidates/routes.test.ts`（list.edit、驳回路由，改写为 7 例） |
| Q53 | S011 设计：偏离登记（§1.1）、布局、接口、状态与顺序、测试对应、残余 R5、R7、R8。S009 设计：§5 车道分工、§9 pump 只取 PAID 与 REALTIME、§12 结算记录窗口（Q38）、§13 内存未验证项。两份文件的受管段未改。 | 文档，无用例 |

## 修复前后的实测对照

修复前是候选代码 `5482e5d`（与 `763bc39` 的代码相同），修复后是 `c370928`。

| 检查 | 修复前 | 修复后 |
| --- | --- | --- |
| E60 探针（S011 §A、§C–§G） | 26 项，6 不符（A2、A3、G1–G4） | 26 项，0 不符 |
| E60 A2：共用协调器时实时任务 | `PENDING_REVIEW`，`REVIEW_TASK_UNKNOWN` | `QUEUED`（见下文探针说明） |
| E60 A3：复盘任务由谁结算 | Crew 执行器启动 1 个会话并 `writeVerdict`，消息仍为 `UNSETTLED_FAST_PASS` | 执行器启动 0 个会话，消息为 `SETTLED` |
| E60 G1–G4：整批契约 | 部分结算。G1 的 `i0` 以 ALLOW 结算 +2，BLOCK 消失；G2、G3 的其余条目照常结算 | 四例均整批 `FAILED`（G1、G3、G4 为 `AI_OUTPUT_INVALID`，G2 为 `AI_OUTPUT_INCOMPLETE`），计分 0、复核记录 0 |
| E60 G5（合法输出对照） | 符合 | 符合 |
| E61 堆探针（H1–H3） | 3 项，2 不符：取消 20/20、到期 20/20 个正文标记残留 | 3 项，0 不符：取消 0/20、到期 0/20、已结算 0/20 |
| E30（第 6 批 S009 主探针） | 98 项，0 不符 | 98 项，0 不符；逐行 OK/FAIL 与修复前相同 |
| E31（S009 extra） | hung cancel 返回；ch-b 到期转 PENDING_REVIEW | 同 |
| E32（S009 order） | 第一个任务 PENDING_REVIEW，第二个 DONE | 同 |
| E34（第 6 批 S009 b6） | 44 项，0 不符 | 44 项，0 不符；逐行 OK/FAIL 与修复前相同 |
| 新增单元用例（修复前运行） | — | B2 6 例、B3 3 例、B4 2 例、N5 8 例共 19 例失败；修复后全部通过。B3 的规则单元 2 例随修复一并加入 |

探针说明：

- 第 6 批 S009 探针的副本与 `.kiro/specs/voxward-batch6/evidence/probes/` 的 sha256 相同（`probe-s009.mts` 为 `5a9ba6146ff82ef28c53c551246c6d30f32add1c71b65e9a9d1be9f9063aeb77`，`probe-s009-b6.mts` 为 `a0310db7987ca89853043d8ac22b1386b6b61e302989baf2899574b01374f6d6`）。
- E60 原探针的 `runnerOn` 把协调器包进一个 spy，spy 的 `takeBatch` 忽略车道参数。在这个替身下，运行器取到了实时批次，并把该任务留在 `RUNNING`，直到截止时间（R7）。原探针的 A2 检查接受 `QUEUED` 或 `RUNNING`，所以这一项通过，但结论不成立。
- 我另外跑了一份副本 `probe-m6-s011-lanes.mts`（工作目录内，未改动验收探针）。它只把 spy 改为透传车道参数，结果为：A2 的实时任务 `QUEUED`，26 项 0 不符。
- E60、E61、E30–E34 的探针从 `.kiro/specs/voxward-batch-m6/evidence/probes/` 复制到工作目录运行，原件未改动。

## 自测（工作树根，`CI=1`）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Done`，锁文件未变 |
| `pnpm build` | 0 | contracts、server（`dist/main.js`）、web 构建完成 |
| `pnpm typecheck` | 0 | 0 个 `error TS` |
| `pnpm test` | 0 | 129 个文件，1741 项通过。基线为 126 个文件、1720 项（验收证据 E05），新增 21 项 |
| `pnpm check:deps` | 0 | `check-deps: ok, 201 files checked, 0 violations` |
| `kiro-specs.mjs check --work-id work:8f928245aa79a29f26ad28a6 --spec-dir .kiro/specs/voxward-s011-review` | 1 | `SPEC_STALE`：引擎的 `workRevision` 为 5，管理段头为 rev 4（`172094d5…`）。在基线 `763bc39` 的草稿工作树上运行，结果相同，所以它不是本轮改动造成的。受管段未改动，需由主线程或引擎刷新。 |
| `tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s011-fix-smoke` | 0 | dev `healthz` 200（1 s），dist `healthz` 200（1 s）；结束后 3000、5173 无监听。日志中的 `Failed` 是停止进程时的输出 |

## 未验证项

- `kiro-specs check` 在 rev 4 与引擎 rev 5 不一致时报 `SPEC_STALE`，因此规格的受管段仍未通过检查。
- 没有重跑验收证据中的 E08（外连拦截下的全量测试）、E09（依赖负面对照）与 E11（静态核对）。本轮新增的代码没有网络调用、子进程或新的导入。
- B4 的弱引用测试依赖 `v8.setFlagsFromString("--expose_gc")` 与 `vm` 取得 `gc`。在 Node v24 上验证通过；其它版本未验证。
- 真实 Kiro Crew 的取消、会话与资源信号仍未验证（S029）。
- R7：端口若忽略车道参数，实时或付费任务会被运行器取走并停在 `RUNNING`，直到截止时间才转人工。生产接线按车道取批，此路径不可达。它是防御行为，不是可接受的运行状态。
- N1–N4、N6、N7、N9 不在本包范围，未处理。

## 与其它返工包可能冲突的文件

- `apps/server/src/modules/moderation-engine/index.ts`：导出名 `REVIEW_DECIDE_CAPABILITY` 改为 `LIST_EDIT_CAPABILITY`，并增加 `RejectResult` 类型。简报的文件列表未列出它；它是 S011 候选词导出的一部分。
- `apps/server/src/modules/moderation-engine/review/fixtures.ts`、`apps/server/test/task-coordinator/crew/adapter.test.ts`：测试夹具与用例，S010、S014 的测试目录如果同时改这些文件，合并时需要留意。
- `.kiro/specs/voxward-s009-scheduler/design.md`：本包改了受管段之外的 §5、§9、§12、§13。简报的 N8 也列出了这一文件。
- S010、S014 的返工包改动的目录（`inference-provider/`、`db/`、`decision-service/`、`packages/contracts/`）与本包的改动没有交集。
