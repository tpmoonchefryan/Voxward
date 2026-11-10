# S006 自测证据（VOXWARD-STORY-006 / VOXWARD-SUB-012）

工作树：`/home/ryanlan/Code/Voxward/.worktrees/s006-routing`，分支 `voxward/s006-routing`，基线 `0590dec`（main）。
日志原件保存在 `$KIROCREW_SCRATCH/s006-routing/logs/`，不入库。本文件随最后一个提交保存。

## 1. 提交序列

| 提交 | 说明 |
| --- | --- |
| `5f26de4` | `VOXWARD-STORY-006: add spec`（kiro-specs check 为 SPEC_CURRENT） |
| `6b6cb86` | `VOXWARD-SUB-012`：Q6 组合标记选项。注：Q12 的准入提示代码与测试也在这一提交（两者都改 `groups.ts`），未单独成提交；步骤 1.2 不另起提交 |
| `d96d30d` | `VOXWARD-SUB-012`：Q22 `Verdict.penaltyHits` 与 BLOCK 扣分取最大 |
| `93b2f9d` | `VOXWARD-SUB-012`：Q8 删除 `subject_nickname_checks`（迁移 0002、数据字典、schema 测试） |
| `7a05e96` | `VOXWARD-SUB-012`：Q8 旧库升级测试 |
| `0b11b82` | `VOXWARD-SUB-012`：分类、处理状态、例外队列 |
| `3a6ea16` | `VOXWARD-SUB-012`：统一路由真值表 |
| `475b5f2` | `VOXWARD-SUB-012`：路由编排、计分接线、导出与端到端测试 |
| `35e4868` | `VOXWARD-SUB-012`：设计文档与实现同步 |
| 本提交 | 自测证据与任务勾选 |

## 2. 自测命令（工作树根）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 锁文件未变；`Done` |
| `pnpm build` | 0 | `apps/server build: Done`；`apps/web` 产物生成 |
| `pnpm typecheck` | 0 | 0 条 `error TS`；`apps/server typecheck: Done` |
| `pnpm test` | 0 | `Test Files  50 passed (50)`；`Tests  614 passed (614)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 99 files checked, 0 violations` |
| `kiro-specs.mjs check`（work:685ad243ec946eb7f628c93e） | 0 | `reasonCode: SPEC_CURRENT`，`formalDone: false` |
| `pnpm dev`（未设置 `VOXWARD_DATABASE_FILE`） | — | 见第 4 节 |

基线（改动前，`0590dec`）：build 0、typecheck 0、`Tests 430 passed (430)`、check:deps `94 files checked, 0 violations`。

开发过程中的失败（均在包内修复后复跑，最终结果见上表）：
- Q6 测试样例把组合标记挂在 `d` 上（`bad\u0301word`），这个位置本来就被旧规则去除，不构成绕过；改为挂在 `a` 上（`ba\u0301dword`）后，旧行为可复现。测试输入错误，未改实现。
- 路由测试的 `ExceptionQueueError` 初版在消息中回显了键的长度，改为固定文案。
- 其余失败未出现。

改动后新增与变更的测试（来自最终测试日志）：

| 测试文件 | 用例数 |
| --- | --- |
| `test/moderation-engine/routing/truth-table.test.ts` | 105（96 种输入组合不变式 + 8 行代表用例 + 计数） |
| `test/moderation-engine/routing/router.test.ts` | 15 |
| `test/moderation-engine/routing/classification.test.ts` | 20 |
| `test/moderation-engine/routing/states.test.ts` | 19 |
| `test/moderation-engine/routing/exception-queue.test.ts` | 6 |
| `test/moderation-engine/rules/normalize.test.ts` | 13（含 Q6 4 项） |
| `test/moderation-engine/rules/groups.test.ts` | 14（含 Q12、归一化选项校验） |
| `test/moderation-engine/rules/engine.test.ts` | 20（含 Q6 组合标记绕过） |
| `test/scoring-engine/engine/rules.test.ts` | 8（含 Q22 多规则取最大） |
| `test/scoring-engine/engine/index.test.ts` | 14（含 Q22 命中校验与端到端扣分） |
| `test/db/schema.test.ts` | 32（26 张表、迁移删除表的核对） |
| `test/db/migrate.test.ts` | 4（含旧库升级用例） |
| `packages/contracts/test/contracts.test.ts` | 17（含 `penaltyHits` 默认值与拷贝） |

## 3. 各子单 AC001 与相关验收行的实际结果

本包的主验收行是 `VW-SUB012-AC001`。下表记录本包实际观察到的内容，并区分「满足」「部分」「未涉及」。

| 验收行 | 期望（摘要） | 本包实际结果 | 状态 |
| --- | --- | --- | --- |
| VW-SUB012-AC001（主） | 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK | 真值表 96 种组合的不变式通过；例外消息不进入快速通道；基础 BLOCK 在例外队列中以 BASE_BLOCK 结束；快速放行（评分或白名单）不调用计分；下游值只来自 `toDownstreamVerdict`。对应 165 个路由用例全部通过 | 满足（合成数据、真实基础检查与假账本） |
| VW-SUB012-STORY（承担 VW-S006-R001） | 名单/例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS；系统失败与人工接管 | 例外队列登记与结算、付费文本 R2 不被白名单/评分/噪声取消、噪声与 UNSETTLED_FAST_PASS 标记、SYSTEM_FAILED 不下发不计分、MANUAL_TAKEOVER 后人工裁决计分。名单（白名单、付费身份）的数据来源未接线，以事实输入（见第 6 节） | 满足（路由与状态层）；名单数据来源未涉及 |
| VW-SUB012-PARENT / VW-S006-PARENT（继承） | 复用同候选版本证据 | 同 AC001 的路由证据。继承引用本身不是已执行证明 | 部分（仅路由层） |
| VW-SUB012-INHERIT-001（架构） | 远端自托管、版本化模块契约、既定栈 | 依赖方向检查 0 违规；路由位于 moderation-engine，只导入 contracts 与本模块；未引入新基础设施 | 部分（接口与依赖审查） |
| VW-SUB012-INHERIT-003（R-003） | 基础检查不被快速通道绕过；付费不免安全审核；例外不免审；内部 meaningful/noise 不形成第二裁决 | R1、R4 基础结果不被快速通道绕过；R2 付费审核不可跳过；R3 例外不走快速通道；分类只映射到 ALLOW/BLOCK | 满足（路由层） |
| VW-SUB012-INHERIT-004（R-004） | 本单不改变其它模块职责 | 未改注册表与其它模块；计分仅经契约端口调用 | 满足（接口核对） |
| VW-SUB012-INHERIT-005（R-005） | 快速放行不立即冒充合规加分；无重复结算；过期明确未结算 | 快速放行标记 UNSETTLED_FAST_PASS 且不加分（已测）。复盘结算、过期未结算未实现（提案 §5.4 不在本包） | 部分 |
| VW-SUB012-INHERIT-009（R-009） | AI 输入只带必要文本与临时编号 | 本包不调用 AI，不构造 AI 输入 | 未涉及 |
| VW-SUB012-INHERIT-011（R-011） | 写入经短事务与本地 SQLite | 仅新增迁移 0002（删除表）；路由不写库 | 未涉及（迁移层已测） |
| VW-SUB012-INHERIT-012（R-012） | 频道、角色、字段校验保留 | 未改鉴权与接口 | 未涉及 |
| VW-SUB012-INHERIT-014（R-014） | 与 R-014 对应的例外与快速通道行为 | 同 AC001 的路由证据 | 部分 |
| VW-SUB012-INHERIT-017（R-017） | 删除代次、到期、失败状态有真实去向 | 丢弃（DISCARD）结算例外项为 DISCARDED；系统失败保持 PENDING_REVIEW 存储状态。删除编排与保留期限未实现 | 部分 |

## 4. 开发服务检查（`pnpm dev`，未设置 `VOXWARD_DATABASE_FILE`）

- `GET http://127.0.0.1:3000/healthz` 返回 200，正文 `{"status":"ok"}`（启动后约 2 秒）。
- 服务日志：`Server listening at http://127.0.0.1:3000`。
- 监听：`127.0.0.1:3000`（服务）与 `127.0.0.1:5173`（前端 Vite），均只绑 127.0.0.1。
- 停止：对进程组发送 TERM，进程组退出；端口 3000、5173 释放；未发现残留的 `pnpm`、`tsx`、`vite` 进程。
- 默认数据库文件 `apps/server/data/voxward.sqlite3` 由服务创建，位于 `.gitignore` 的 `data/` 下，未入库。

## 5. 问题清单项的证据

### Q6 组合标记绕过（已修）

- 修复前的行为（NFKC 直接组合）：`ba\u0301dword` 归一化为 `bádword`，不匹配规则 `badword`。
- 修复后（默认：NFKD → 删除 `\p{M}` → NFKC）：同一输入归一化为 `badword`，`BLOCK`。
- 测试：`engine.test.ts`「blocks a composed mark that hides a rule, under the default option」；「lets the same text through when the rule set turns stripping off」（关闭选项即为修复前行为，结果 PASS）。
- 默认值「开启」为自定，理由写在 `normalize.ts` 注释与设计第 4.8 节。

### Q8 昵称检查两套存放（已修）

- 保留进程内缓存，删除持久表 `subject_nickname_checks`（迁移 `0002_drop_subject_nickname_checks.sql`，由 drizzle-kit 生成）。
- schema 测试：26 张表；迁移中被后续迁移删除的表只有 `subject_nickname_checks`。
- 迁移测试：空库得到 26 张表、3 条迁移记录；从 0000、0001 升级，既有 `channels`、`subjects` 行保留，表被移除。
- 数据字典：表数 27 改为 26，段落删除，说明中记录迁移 0002。

### Q12 准入提示（已修）

- 错误信息示例（来自测试）：`RULE_SET_INVALID: REGEX_GROUP_ALTERNATION at alt (hint: write the alternatives as top-level branches, such as a|b, or split them into several rules)`。错误中不出现模式原文。
- 无界量词与变长量词组合：提示「split the pattern into several rules, or give one of the quantifiers a fixed count」。

### Q22 命中列表传给计分（已修）

- 修复前：`BLOCK` 的扣分只有 `violationPenalty` 一项，`selectPenalty` 在实际路径上只有单元素输入。
- 修复后，端到端（路由 → 计分，假账本）：基础 BLOCK 命中扣分组 `heavy`（9）与 `light`（2），`violationPenalty` 为 5，账本记录 −9；
  模型 BLOCK 在复核中保留命中，同样记录 −9。计分测试中命中 7 与 1、违规 3，结果 −7。
- 非法命中（空编码、负数、小数）在账本调用前被拒绝（`ScoringInputError`），账本调用次数为 0。

## 6. 未验证项与来源缺口（与设计第 9 节一致）

- 白名单、付费身份（Super Chat、会员自定义文本）的数据来源未接线，路由以事实输入；端到端仅用合成事实。
- 频道内评分读取：路由接收调用方提供的 `score`，未读取账本。
- 快速通道阈值以路由选项传入（默认关闭），计分配置未增加键。
- 例外队列只有进程内实现，重启后丢失。
- AI 调度、结果回写、`DecisionService.commit`、`verdicts`/`deliveries` 写入均未接线；复盘结算未实现。
- 性能未测量；噪声判定与归一化的耗时不作声明。
- 合成数据全部使用虚构频道与观众标识。

## 7. 偏离与自定（摘要，详见 design.md 第 7、8 节）

- 目录：工单写 `moderation/`，实际为 `moderation-engine/`。
- 自定：归一化默认开启；R5–R7 的 `ALLOW_NOISE` 占位分类；系统失败存为 PENDING_REVIEW，人工接管存为 RUNNING；噪声三类词元与 3 次阈值；人工裁决同样计分；计分拒绝采用调用后识别；Q8 选择进程内缓存。
- 本次实施时 `ExceptionQueue.register` 增加了 `correlationId` 参数，设计第 4.6 节已同步。
- Q12 的代码与测试与 Q6 同在 `6b6cb86`，任务表中的 1.2 据此勾选。
