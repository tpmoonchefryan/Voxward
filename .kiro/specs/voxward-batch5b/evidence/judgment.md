# 第 5b 批判断（S006 第 3 轮复验；S009 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `5ce5bee`（`4c3b94a` 之上依次合入 `voxward/s006-fix2`、`voxward/s009-scheduler`，均无冲突）。
- 范围：5 张工单、58 行验收。satisfied 40 行，failed 18 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch5b/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现，也没有做过上一轮验收；按小轮处理，验收、判断与 lessons 一次完成。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-006 | **通过** | 23/23 satisfied（STORY 11、SUB-012 12） | 无（B3 已修复） | — |
| VOXWARD-STORY-009 | **打回** | 17 satisfied、18 failed（STORY 6、SUB-017 5、SUB-018 7） | B4、B5 | B4：SUB-017；B5：SUB-018 |

- STORY-009 的 18 行 failed 来自两个根因。B5 使所有前半句为「无无限积压/全局无限屏障…」的 Story 级行不成立（三张单的 PARENT 与 INHERIT-006/010/011/017，STORY-009 的 AC001），以及 SUB-018 的 AC001 与 STORY 行；B4 另使三张单的 INHERIT-006 不成立。SUB-017 的 AC001 与 STORY 行只判本单的协调器部分，为 satisfied。若只修 B5 不修 B4，仍有 3 行 INHERIT-006 failed。
- rejection 计数：实施包 P-S006 本轮通过（此前 2 次打回）。实施包 P-S009 第 1 次打回，记在 SUB-017（B4）与 SUB-018（B5）；下次派工按 master A8 用 `--rejections 1` 解析模型。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（1458/1458）、`pnpm check:deps`（171 个文件 0 违规）通过；默认配置下 `pnpm dev` 与 `node dist/main.js` 启动、`/healthz` 200、只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew` 0 次调用。门禁全绿，但 STORY-009 被打回，主线程汇报时不能写成「本批全部通过」。
- Spec：S006 为 SPEC_STALE（rev 6，第 5a 批链写所致，属预期）；S009 为 SPEC_CURRENT（rev 4）。设计与代码的不一致见 B4、B5、N1、N3、N8。

## 阻断发现

### B4 保序门控不区分车道：后台复盘挡住同频道的实时提交，付费结果也要等普通前序（归属 SUB-017）

- 触发：同一频道内，存在 platformOrder 更小、状态为 QUEUED 或 RUNNING 的任务，而它与正在提交的任务不在同一车道。最典型的是 BACKGROUND 车道的复盘任务：复盘对象是先前已快速放行的消息，platformOrder 必然更小；后台车道只用剩余容量，上限为 1 时整体暂停，截止时间也可以很长。第二种是 PAID 结果之前有同频道更早的 REALTIME 任务（acceptance.md E30 §5，§3.1）。
- 当前行为（5ce5bee）：`orderGate` 只按 `channelId` 与 `platformOrder` 选前序，`orderedOf` 不带车道。实测：BACKGROUND 任务（platformOrder 1，截止 10 分钟，仍在排队）与 REALTIME 任务（platformOrder 2，截止 5 s）同频道，REALTIME 结果提交返回 `waiting`；5 s 后 REALTIME 任务到期转 PENDING_REVIEW，BACKGROUND 任务仍 QUEUED。PAID 任务按优先级先派工、先出结果，提交同样返回 `waiting`，等的是同频道更早的 REALTIME 任务。不同频道之间不等待。
- 契约：VW-R-006「付费优先、复盘让出实时容量…有限保序、投递 ID/状态及有效期保证实时可用性」，三张单的 INHERIT-006 要求继续遵守；提案 §6.2 后台复盘「使用剩余容量，可以暂停或延后，不抢占全部实时处理能力」，付费消息「更高优先级与独立延迟预算，避免被大批普通消息长期占用」；提案 §6.3「需要审核的消息在各自通道内尽量按源顺序提交」。提案里「通道」指处理路径（同节「快速通道」，§4.3「输出通道」），YouTube 频道一律写作「频道」。S009 设计 §8 把它解释为 channelId，并让门控跨车道生效。
- 影响：STORY-011 接上复盘后，一个频道只要有一条复盘任务在排队或运行，该频道之后所有实时审核结果都提交不了，直到复盘任务完成或到它自己的截止时间；在此之前实时任务各自到期，全部进入人工队列（或按 N1 被丢弃）。实时 AI 审核在该频道实际停摆，人工队列被灌满。付费消息的提交延迟由同频道更早普通消息的截止时间决定，失去独立延迟预算。门控本身有界（不会超过前序的截止时间），所以不算「全局无限屏障」，本项判在 INHERIT-006。
- 判为阻断的理由：违反 VW-R-006 的明文要求，触发条件是复盘接线后的日常运行，影响是实时审核在频道内停摆。S009 交付的正是车道与保序语义，STORY-011 只会按 `enqueueInLane("BACKGROUND", …)` 使用它。
- 文件：`apps/server/src/modules/task-coordinator/ordering.ts`（`orderGate`）、`coordinator.ts`（`orderedOf`、`orderedTasksOf`）、`apps/server/test/task-coordinator/ordering.test.ts`、`acceptance.test.ts`；`.kiro/specs/voxward-s009-scheduler/design.md` §8。
- 修复方向（实现由 SUB-017 选择，验收只看结果）：门控只比较同一车道的前序（按提案「在各自通道内」）。若主线程认为付费消息应与同频道普通消息保持源顺序，那是产品取舍，要写进 S009 设计并让付费任务的等待受它自己的延迟预算约束；BACKGROUND 无论如何不能挡住 REALTIME 与 PAID。测试至少加入：同频道更早的 BACKGROUND 任务（排队与运行两种）不挡 REALTIME 与 PAID；PAID 不被同频道 REALTIME 挡住（或按选定语义只等到自己的预算）；同车道内的保序与「只等到前序截止时间」保持。
- 复验：E30 §5 的 F2 与 PAID 场景改为期望通过；E30 其余各节、E32、task-coordinator 测试与完整门禁。

### B5 Crew 的 cancel 不返回时，pump 与 cancelEvent 一直等待，所有频道停止派工（归属 SUB-018）

- 触发：Crew 接下作业后不再响应，`CrewPort.cancel` 返回的 Promise 不结束；同时该会话所在批次已没有运行中的任务（任务到期被扫描、被取消或数据被删除），执行器要回收它（acceptance.md E30 §7 F3、E31，§3.2）。
- 当前行为（5ce5bee）：`reapIdle` 对每个空闲批次依次 `await crew.cancel(...)`；`pump` 在取新批次之前 await `reapIdle`，执行器的 `cancelEvent` 也 await `reapIdle`。实测：ch-a 的任务到期后，这次 pump 不返回；之后为另一频道 ch-b 调用 pump，同样卡在 ch-a 会话的 cancel 上，ch-b 一直 QUEUED，没有新会话启动；执行器的 `cancelEvent(ch-c)` 先把 ch-c 转为 DISCARDED，然后也不返回；ch-b 到期后再调用 pump，扫描把它转为 PENDING_REVIEW，这次 pump 仍不返回。拒绝的 cancel 有处理（保留槽位，下次再试），不返回的 cancel 没有；start 与 done 不返回的情况由截止时间兜底，cancel 没有。
- 契约：VW-S009-AC001 与各 PARENT、INHERIT-006/010/011/017 的「无…全局无限屏障」；VW-SUB018-AC001「Crew 不可用时任务明确失败而非默认放行」；S009 设计 §9「pump 不等待会话结束」；提案 §9.2「仍需由 VoxWard 管理任务截止时间、业务幂等、频道权限和数据清理」，§6.3「不使用一条慢消息无限阻塞所有后续内容的全局屏障」。
- 影响：一个无响应的 Crew 会话让所有频道的 AI 派工停止，持续多久取决于 Crew 何时恢复。驱动方若按返回值逐次 await pump（推论：pump 返回启动数，这是自然用法），此后不再有扫描，新任务一直 QUEUED，既不派工也不进人工队列，不满足「明确失败」；驱动方若不 await，每次 pump 再挂起一个，任务到期才转人工，派工仍为 0。删除流程若 await 执行器的 `cancelEvent`，会停在这里，尽管任务已先转 DISCARDED。
- 判为阻断的理由：观察到的当前行为直接违反「无全局无限屏障」，触发条件是验收行场景「Crew 不可用」的常见形态（外部调用无响应）；执行器对 start、done 的同类情况已经有兜底，对 cancel 没有，与设计 §9 自述不符。真实绑定（S029）未实现不改变结论：CrewPort 契约没有要求 cancel 必须按时结束，执行器也没有自己的上限。
- 文件：`apps/server/src/modules/task-coordinator/crew/adapter.ts`（`reapIdle`、`pump`、`cancelEvent`）、`apps/server/test/task-coordinator/crew/adapter.test.ts`、`crew/fake-crew.ts`（替身的 cancel 总是立即结束）；设计 §9。
- 修复方向（实现由 SUB-018 选择）：pump 与 cancelEvent 不在主路径上等待 Crew 的 cancel：发起取消、记下待定状态、槽位保留到取消结束（或给取消设上限并决定上限到期后的处理），主路径继续扫描、重试暂存提交与派工；cancelEvent 在协调器取消完成后即返回。测试加入 cancel、start、done 分别永不结束的替身，断言 pump 与 cancelEvent 按时返回、其它频道照常派工、并发不超过上限。
- 复验：E30 §7 的 F3、E31 改为期望通过；E30 §6 并发上限不受影响；task-coordinator 测试与完整门禁。

## 第 5a 批阻断的复验结论

- B3：已修复。第 5a 批 E20、E21 的全部输入在 5ce5bee 上符合期望；本轮新写的 E22 用真实检查器断言 191 个用例的路由与原文区间：五个词各 15 种半角、独立浊点与格式字符隔开的写法全部 BLOCK、区间只覆盖该词，对应无浊点规则全部 PASS；第 4 批 B1 的 15 个对照输入不变；新组合 12 类 69 例无漏拦、无误伤；逐单元副本与整段参照 40 万次比较 0 处不同；3000 条随机嵌入写法区间全对。同一批用例在 b1a1471 上 140 处路由不符（acceptance.md §2.0–§2.1）。
- 第 3 轮的方案判断：没有发现 B3 同类缺陷，不需要改成整段 NFKC 再映射回原文。逐单元与整段在本轮字母表上已经等价（40 万次比较 0 处不同）。仍有一处已知的逐单元差异：韩文兼容字母（`ㅂㅏㅂㅗ`）逐个成单元，整段 NFKC 会组成音节。机制与 B3 相同，但各版本一致，第 5a 批已记为 N11，S006 设计 4.11 写明不在本修法内，兼容字母逐个显示、与 `바보` 外观不同，也不是评估语种；要覆盖时把兼容元音并入前一单元即可，仍不需要整段 NFKC。谚文填充字符（N4）与单元边界无关，整段 NFKC 也保留它们。SUB-012 本轮采用的做法（浊点并入前一单元、组合前删不可见字符、独立浊点先转组合浊点）保持了按单元记录的区间映射，三条路径共用同一组函数。

## 非阻断建议

编号为本轮编号；引用第 5a 批的编号时写「第 5a 批 Nx」。N1、N2、N3、N7、N8 在 S009 返工涉及的文件内，建议本轮返工一并处理。

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | 运行中的任务到期后，若扫描先发生，任务转 PENDING_REVIEW（人工队列）；若结果先到，`commitResult` 把任务转为 DISCARDED（原因 DEADLINE_EXCEEDED），不进人工队列。同一个慢请求的终态取决于 pump 的时机；若接线方只在入队与会话结束时调用 pump（推论，驱动方尚未实现），安静时段的慢请求几乎都会落到 DISCARDED。S006 的状态语义里 DISCARDED 只用于过期代次或已删除，不产生复核项。提案 §6.2「标记为系统处理失败并交给人工队列」、§4.2 第 5 步「系统审核失败的消息进入对应复核列表」，S009 设计 §3 也写超时转 PENDING_REVIEW，但设计 §7 第 3 步与 `acceptance.test.ts`（slow request 第一例、predecessor timeout）把 DISCARDED 写成了期望。验收行 expected「超时不默认放行或扣分」两种终态都满足，所以不单独判行失败。 | E30 §2、§7 | SUB-017 随 B4 返工：`commitResult` 遇到已过截止时间的 RUNNING 任务时与扫描一样转 PENDING_REVIEW，对调用方仍返回 discarded；改两处测试断言与设计 §7 |
| N2 | 结算后的任务记录一直留在内存：`tasks`、`taskByEvent` 只增不减，每条保留整份事件（含正文），约 1.1 KB/条；`takeBatch`、`commitResult`、`sweep`、`cancelEvent`、`idleBatchIds` 每次遍历全部记录。6 万条时单次提交约 2.4 ms、takeBatch 约 2.0 ms，线性增长；按每秒 10 条进入 AI 审核估算，服务连续运行数天后堆达 GB 级，调度调用占满事件循环（推算，未实测）。删除请求之后正文仍留在进程内存里直到重启。按「无无限积压」的字面读法也可判为不成立，本轮按「积压指待处理工作」判定，排队数确有上限。 | E30 §8、E31 | SUB-017 返工时处理：结算后释放记录或至少丢弃正文，按车道与频道维护未结任务索引；最迟在 STORY-011 接线、或改为持久任务表之前 |
| N3 | 设计 §8 写门控放行时在后一条记录 `PREDECESSOR_UNFINISHED`；经执行器时 pump 先扫描，前序已转 PENDING_REVIEW，门控为 clear，后一条不记录。前序自己的 TIMED_OUT 条目已记下未完成原因。 | E32 | SUB-017 返工：改设计说明，或在门控放过一个因超时结束的前序时记录 |
| N4 | 谚文填充字符 U+3164、U+FFA0、U+115F、U+1160 是默认可忽略的字母（`\p{Lo}`），不是 `\p{Cf}` 也不是 `\p{M}`，不在删除范围内；NFKC 把前两个变成 U+1160，仍留在副本里。`bad` + U+1160 + `word` 不命中归一化规则 `badword`，`ﾊﾞ` + U+3164 + `ｶ` 不命中 `バカ`；三个版本相同。按 Unicode 对默认可忽略码点的处理建议，渲染时通常不显示（U+3164、U+FFA0 在部分字体下显示为空白；本轮未做渲染实测），可用来拆开任何语言的词。不属 B3 同类（不是浊点丢失，也与单元边界无关），第 4 批 B1 与第 5a 批 B3 的复验要求都未覆盖；S006 设计 4.11 已把它列为未验证。 | E22 §3 | 记入问题清单；下一次修改 `moderation-engine/rules/normalize.ts` 的 Story（规则配置界面 STORY-022，或更早触及该文件的 Story）：匹配副本删除全部 `\p{Default_Ignorable_Code_Point}`，加测试 |
| N5 | S009 实施子代理结束时留下在跑的 `pnpm dev`：它的证据写明停止命令被安全策略拦截（规则 self-protection-kill），13 个进程仍在，3000 与 5173 仍在监听，进程分属不同进程组；主线程之后停掉。S009 简报要求子代理手工起 `pnpm dev`，而 S006 简报要求用 `tools/smoke.sh`。S009 的 `tasks.md` 中 S009-SELF、S009-EVID 两项未勾选，证据已提交。本轮开始与结束时 3000、5173 均无监听。 | S009 `evidence/self-check.md`、E07 | 主线程：实施简报的启动冒烟统一写 `tools/smoke.sh`（setsid 启动、按进程组停止、端口占用即拒绝）；A11 的残留检查保留 |
| N6 | 执行器把 Crew 的 `completed` 报告当作已校验：缺条目或重复条目只让对应任务转人工，其余任务照常提交。VW-R-008 要求初版整批受控失败，所以 `completed` 必须先经过 S007 的整批校验，这一点目前只在 CrewReport 的注释里隐含。CrewPort 也没有清理 Crew 端内容的步骤（VW-R-009「成功/失败/取消…清理…Crew 内容残留」），只能由绑定在 done 或 cancel 后自行清理。 | E30 §7、`crew/adapter.ts` | SUB-018 返工时把这两点写进 CrewPort 契约注释与设计 §9；STORY-029 的真实绑定实现并验证 |
| N7 | `ResourceSignalPort.read()` 抛异常时，异常从 `takeBatch` 与 pump 直接抛出，不像非有限数、负数那样按 CRITICAL 收缩到下限；资源读取失败期间不再派工。 | E30 §7 观察 | SUB-018 返工：把读取异常视为 CRITICAL，加测试 |
| N8 | 设计 §5「并发降到最小值时后台暂停」只在上限为 1 时成立；下限为 2 时，在下限上后台批次仍可启动（`interactiveReserve(2)` 为 1）。 | E30 §5 | SUB-017 返工：改设计措辞，或按原意在最小并发时暂停后台 |

## 需 Owner 决定

无。B4 的修复按提案原文（「在各自通道内」「独立延迟预算」）按车道保序即可，在现有授权（minutes:fd542a49a57a9e6526440dac）内。只有主线程认为「通道」应读作频道、并希望付费消息与同频道普通消息保持源顺序时，才是需要写进设计的产品取舍；即便如此，BACKGROUND 也不能挡住 REALTIME 与 PAID。

## 复验范围

- 证据失效：S009 返工会改 `task-coordinator/`（至少 `ordering.ts`、`coordinator.ts`、`crew/adapter.ts`）、对应测试与 S009 设计，使 STORY-009 组 35 行全部失效，要在新候选上重新盖章。重跑 E30（全部各节，F1、F2、F3 与 PAID 场景改为期望通过）、E31、E32、E33 的导入核对与 E09 负面对照，并补充 B4、B5、N1、N3、N7 的新用例；S009 spec 的 check（E10）。
- STORY-006 组：在 `5ce5bee` 上 23/23 satisfied，可以按本轮证据以 `5ce5bee` 链写关单。若主线程改在 S009 返工后的新候选上关单，先确认下列路径的 diff 为空，再复用 E20–E24 并重新盖 codeVersion；有改动则重跑 E20–E24：`apps/server/src/modules/moderation-engine/`、`apps/server/src/modules/scoring-engine/`、`packages/contracts/`、`apps/server/src/db/`、`docs/data-dictionary.md`、`apps/server/test/moderation-engine/`。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08）、两份 spec 的 check（E10）。
- 探针、替身、拦截脚本与生成脚本的副本在交付目录 `probes/`，复验时可直接复用（需要 `apps/server/node_modules/.bin/tsx`；S006 探针需要 `git archive` 导出的 `f4808fb`、`fa5dc19`、`b1a1471` 对照副本与 `@voxward/contracts` 软链接，见 `probes/README.md`）。
