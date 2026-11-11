# 第 m6 批判断（总表第 6 批：S010、S011、S014 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `5482e5d`（`40223e2` 之上依次合入 `voxward/s010-sc-translation`、`voxward/s011-review`、`voxward/s014-decision`，均无冲突）。
- 范围：9 张工单、99 行验收。satisfied 73 行，failed 26 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch-m6/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；按小轮处理，验收、判断与 lessons 一次完成。普通判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-010 | **打回** | 25 satisfied、10 failed（STORY 4、SUB-019 3、SUB-020 3） | B1 | SUB-020 |
| VOXWARD-STORY-011 | **打回** | 28 satisfied、7 failed（STORY 3、SUB-021 3、SUB-022 1） | B2、B3、B4 | SUB-021（B2 的修复要改 task-coordinator） |
| VOXWARD-STORY-014 | **打回** | 20 satisfied、9 failed（STORY 3、SUB-026 2、SUB-027 4） | B5 | SUB-027 |

- failed 行与根因：B1 使 S010 组所有前半句为「关闭精翻仍安全审核；拦截不输出小抄；参数能力真实…」的行不成立（STORY-010 的 AC001，三张单的 PARENT、INHERIT-008、INHERIT-010）；SUB-019、SUB-020 的 AC001 与 STORY 行只判本单部分，为 satisfied。B2 使 STORY-011 与 SUB-021 的 INHERIT-006 不成立；B3 使三张单的 INHERIT-008 不成立；B4 使 STORY-011 与 SUB-021 的 INHERIT-017 不成立；S011 组的 AC001、STORY、PARENT 行在各自场景下成立。B5 使 STORY-014 的 AC001，三张单的 PARENT、INHERIT-007，以及 SUB-027 的 AC001 与 STORY 行不成立；SUB-026 的 AC001 与 STORY 行成立。只修部分根因时，对应的行仍为 failed。
- rejection 计数：实施包 P-S010、P-S011、P-S014 各第 1 次打回，分别记在 SUB-020、SUB-021、SUB-027；下次派工用 `--rejections 1` 解析模型。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（1720/1720）、`pnpm check:deps`（200 个文件 0 违规）通过；默认配置下用 `tools/smoke.sh` 起 `pnpm dev` 与 `node dist/main.js`，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew` 0 次调用。门禁全绿，但三组都被打回，主线程汇报时不能写成「本批通过」。
- Spec：三份都是 SPEC_CURRENT（rev 4）。设计与代码的不一致见 acceptance.md §1.1、B1、B5、N8。

## 阻断发现

编号为本轮编号；引用以往批次时写「第 n 批 Bx」。

### B1 精翻关闭路径不使用所选模型，安全审核按适配器构造时的模型运行（归属 SUB-020）

- 触发：精翻关闭；SC 的选择是模型 A（能力报告列出 A）；安全审核端口（S008 适配器）构造时用的是模型 B 或 CLI 默认。用户在运行中经设置接口把 SC 模型从 B 换成 A，而适配器不重建，就是这种情况。
- 当前行为（5482e5d）：`runScBatch` 在精翻关时用 `checkSelection(selection, …, deps.capabilities())` 核对所选模型，然后调用 `deps.safety.infer(request)`。`InferenceRequest` 没有模型字段，S008 适配器的 `--model` 来自构造参数（`KiroCliProviderOptions.model`）。`capabilities` 与 `safety` 是两个独立依赖，流水线不核对报告是否属于运行审核的那个适配器。实测（acceptance.md §2.3，E50 F）：选 synthetic-model-a/high，适配器按 synthetic-model-b 构造时假 CLI 收到 `--model synthetic-model-b`，不带模型构造时 argv 里没有 `--model`；两次都返回 ok，结果里看不出所用模型。reasoning 也不传（G4）。模块自己的 `safety-only.test.ts` 用固定报告 `REPORT_WITH_MODELS` 配真实适配器（它的 `describe()` 不报告模型），正是这种组合，所以测试通过。
- 契约：VW-S010-AC001 与各单 PARENT、INHERIT-008、INHERIT-010「参数能力真实，无静默更换服务」；VW-R-010「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」；提案 §9.1「具体选项由适配器报告，模型不支持时明确显示，不虚构统一可用的参数」；S010 设计 §3.3「精翻开和精翻关两种情况都使用 `scTranslation` 槽位的选择」。
- 影响：一旦适配器开始报告模型（G1），用户为 SC 选的模型与 reasoning 在精翻关时不起作用，付费文本的安全审核跑在部署时构造的模型上，设置页上的选择与实际运行不一致，也没有报错。现在真实适配器不报告模型，按它自己的报告组合时所有 SC 运行都在门槛被拒（E50 E4），生产上暂时不会发生；那只是因为 SC 还根本跑不起来（N2）。
- 判为阻断的理由：验收行明文要求无静默更换服务；问题在本单流水线的代码里，用真实适配器与模块声明的依赖形状直接复现；设计写的是另一种行为。修法小。
- 文件：`apps/server/src/modules/inference-provider/sc-translation/pipeline.ts`（`runScBatch`、`safetyOnly`、`ScPipelineDeps`）、`apps/server/test/inference-provider/sc-translation/safety-only.test.ts`、`fixtures.ts`；S010 设计 §3.3。
- 修复方向（实现由 SUB-020 选择）：让精翻关的安全审核按所选模型运行，并用运行它的那个适配器的报告做门槛。例如把依赖改为 `safetyFor(selection): InferenceProvider`，门槛读 `safetyFor(selection).describe()`；或者给 `InferenceRequest` 加可选的模型选择并让适配器使用它（要改契约包与 `adapters/kiro-cli/`，需主线程在简报里放开）。适配器无法应用的参数（G4 的 reasoning）要么报告里不列，要么被拒。测试用真实适配器加假 CLI 断言 argv 里是所选模型；构造参数与选择不同时，要么用选择，要么拒绝运行。
- 复验：E50 §F 改为期望通过，§C–§E 不变；inference-provider 测试与完整门禁；S010 spec check。

### B2 复盘运行器从共用协调器取任意车道的批次，实时任务被转人工；实时执行器也会取走复盘任务（归属 SUB-021，修复要改 task-coordinator）

- 触发：复盘运行器与实时路径共用同一个 TaskCoordinator（S009 的设计：一个协调器、三个车道共享并发上限与后台余量），调用 `runBatch()` 时有 PAID 或 REALTIME 任务在排队；或者 S009 的 Crew 执行器在 BACKGROUND 车道有复盘任务时 `pump()`。
- 当前行为（acceptance.md §3.1）：`takeBatch()` 按 PAID > REALTIME > BACKGROUND 取第一个能取的车道，批次带 `lane`，运行器不看它；对 `entries` 里没有的任务，运行器调用 `reportFailure(taskId, "REVIEW_TASK_UNKNOWN")`，这个错误码不可重试。E60 A2：同一协调器里一条排队的 REALTIME 任务被第一次 `runBatch()` 取走，状态变为 PENDING_REVIEW。E60 A3：Crew 执行器取走 BACKGROUND 复盘任务，启动 1 个会话，以普通审核的 `writeVerdict` 提交；复盘的资格复查、复核记录、候选词与计分状态都被绕开，消息仍是 UNSETTLED_FAST_PASS，运行器之后取不到批次。
- 契约：VW-R-006「推理并发按服务限流和宿主资源动态约束…付费优先、复盘让出实时容量」，S011 各单 INHERIT-006 要求保留原始要求且不改变其它模块职责；提案 §6.2「后台复盘：使用剩余容量，可以暂停或延后，不抢占全部实时处理能力」；S011 设计 §6 第 3–5 步（复盘任务由运行器取批与结算）。
- 影响：接线后，复盘运行器每跑一次就可能把一批实时或付费消息直接送进人工队列；实时执行器又会把复盘任务当普通审核结算。给复盘单独建协调器，后台就不再让出实时容量，两边各按资源算上限，宿主上同时运行的会话数可以超过上限。
- 判为阻断的理由：模块层的当前行为（真实运行器、真实协调器、真实执行器）直接违反 VW-R-006，触发条件就是设计的接法；简报的必验项要求「复盘只走 BACKGROUND 车道，不挡实时」。
- 归属说明：S011 的简报不允许改 `task-coordinator/` 的内部实现（Q38 除外），协调器又没有按车道取批的接口，实施方在约束内做不出正确接法。修复要改协调器，这是主线程在现有授权（minutes:fd542a49a57a9e6526440dac）内可以放开的实现约束，不需要 Owner 决定。
- 文件：`apps/server/src/modules/moderation-engine/review/runner.ts`（`runBatch`、`failTask`）、`review/ports.ts`（`BackgroundCoordinatorPort`）；`apps/server/src/modules/task-coordinator/coordinator.ts`（`takeBatch`）、`index.ts`、`crew/adapter.ts`（`pump`）；对应测试。
- 修复方向：协调器提供按车道取批（例如 `takeBatch({ lanes })`），仍共用同一套槽位与后台余量；Crew 执行器只取 PAID 与 REALTIME，复盘运行器只取 BACKGROUND；运行器遇到不属于自己的任务时不得用不可重试的错误码结算它。测试把执行器与复盘运行器接到同一个协调器：REALTIME、PAID 任务不被复盘运行器触碰，复盘任务只由运行器结算；后台上限为 1 时暂停等 S009 行为不变。
- 复验：E60 §A 改为期望通过；E30–E34（协调器改动）；task-coordinator、moderation-engine 测试与完整门禁；S011 spec check。

### B3 复盘结果没有按整批契约校验：重复的 itemId 让后一条覆盖前一条，缺项与批外 ID 时其余条目照常结算（归属 SUB-021）

- 触发：模型对一批复盘返回重复的 itemId、缺少条目或批外 itemId。模型输出不可信（提案 §8.2），同一批的观众正文也会进入模型输入。
- 当前行为（acceptance.md §3.5，E60 G）：运行器只用契约包的 `validateReviewBatchResult` 校验单条字段，再按 itemId 建 Map。`[i0 BLOCK, i0 ALLOW_MEANINGFUL]` 时 i0 以 ALLOW_MEANINGFUL 结算 +2，没有复核记录，i1 为 `AI_OUTPUT_INCOMPLETE`；`[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL]` 时两条都 +2，BLOCK 消失；缺项与批外 ID 时其余条目照常结算。同一输出交给 inference-provider 的 `validateReviewBatch` 都被整批拒绝。批内检查在 inference-provider 里，moderation-engine 不能导入。
- 契约：VW-R-008「普通审核、SC 和复盘分别使用版本化 JSON 契约；校验字段/枚举/长度、批内 ID 完整唯一性、Unicode 区间与理由一致性，初版整批受控失败」，S011 各单 INHERIT-008「继续遵守 VW-R-008 原始要求」；提案 §8.3「`itemId` 属于本批且不重复、每个必需项目均返回…初版按完整批契约验收；缺项或重复项使该批进入受控失败处理」。
- 影响：一条被判 BLOCK 的消息可以因为同一 itemId 的第二条结果变成 ALLOW，拿到合规加分，不进复核列表，候选词也取自后一条；部分结果被接受，与「初版整批受控失败」相反。
- 判为阻断的理由：明文契约，错误结算可复现，计分与复核记录都受影响。
- 文件：`apps/server/src/modules/moderation-engine/review/runner.ts`（`reviewWithModel`）、`apps/server/test/moderation-engine/review/runner.test.ts`。
- 修复方向：结算前检查返回的 itemId 集合与本批输入完全相同、没有重复（区间若会被使用，也查范围），不符就整批 `reportFailure`（例如 `AI_OUTPUT_INVALID`），不结算、不计分、不建卡片。可以把批内检查移进契约包供两个模块共用，也可以在运行器里实现同样的检查。
- 复验：E60 §G 改为期望通过（G5 对照不变）；moderation-engine 测试。

### B4 复盘运行器在任务不经 runBatch 结束时一直保留消息正文（归属 SUB-021）

- 触发：复盘任务入队后因删除被 `cancelEvent` 取消、在协调器里到截止时间、被 Crew 执行器取走（B2）。后台车道只用剩余容量、并发上限为 1 时暂停（S009 设计 §5），到期是常态。
- 当前行为（acceptance.md §3.5，E61）：存储行删除之后，取消的 20 条与到期的 20 条正文标记都还在堆上，经 `runBatch` 结算的 0 条。`entries` 为每个入队任务保存整条 ChannelEvent（含 body），只在 `runBatch` 的结算与失败路径里删除。协调器自己在结算时已经释放正文（第 6 批 N2，本轮 E34 §C）。
- 契约：S011 各单 INHERIT-017「删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据」（VW-R-017「生命周期覆盖…缓存…队列…删除先失效任务代次」）。
- 影响：被删除消息的正文留在复盘运行器的内存里直到进程重启；后台容量不足时，每个周期到期的任务（每频道最多 50 条，自定）各留一份事件与正文，数量没有上限。第 6 批 N7（身份缓存删除时不清理）判为非阻断，因为那是有上限、不含正文的结构；这里是消息正文且无界，触发是正常运行与删除流程本身。
- 判为阻断的理由：当前行为可复现，违反 INHERIT-017 的明文要求。
- 文件：`apps/server/src/modules/moderation-engine/review/runner.ts`（`entries`、`runCycle`、`runBatch`）。
- 修复方向：`entries` 只存结算需要的字段（eventId、频道、平台消息 ID、senderRef、receivedAt、correlationId），不存正文，正文由批次提供；每次 `runCycle` 与 `runBatch` 清理协调器状态已终结或已淘汰（`statusOf` 抛 `TaskNotFoundError`）的条目。测试：E61 的 H2、H3 为 0；`entries` 条数不超过未结任务数。
- 复验：E61；moderation-engine 测试。

### B5 改判自动生成可投递的放行意图，绕过显式补发与它的时限（归属 SUB-027）

- 触发：对有当前裁决的消息改判，尤其误判放行（BLOCK → ALLOW），不论消息多久以前到达。
- 当前行为（acceptance.md §4.3，E70 D）：改判一条 2 小时前被 BLOCK 的消息为放行，存储层插入 `overturn-delivery:…`，状态 PENDING，下游结论 ALLOW，有效 5 分钟；`overturn` 返回 `DeliveryIntent`。同一消息走显式补发，原投递与改判投递都得 `WINDOW_CLOSED`。`overturn.test.ts` 断言 `intent: { verdict: "ALLOW" }`，把这当作预期；设计 §4、§9 也写了「改判投递 5 分钟」。
- 契约：提案 §7.1「误判放行：将最终裁决改为人工放行，按账本纠正该条实际计分；是否补发到下游由独立、明确的补发操作决定」；§6.3「人工放行旧消息时显示消息年龄，补发必须是明确操作，并受输出有效期限制；不能让恢复连接自动重播过时付费卡片或触发旧消息朗读」；STORY-014 AC001、各单 PARENT 与 INHERIT-007、SUB-027 AC001 与 STORY「补发必须明确且受有效期限制」；SUB-027 目标「过期消息只能经独立、受有效期限制的补发动作重新投递」。投递表的含义是「裁决投递到输出端的意图与状态」，`DeliveryIntent` 是「deliver one event verdict downstream」的指令。
- 影响：输出适配器（S021）接上后，房管在直播后复核、为观众改正记录时，旧消息会在 5 分钟内重新出现在 OBS 页面与下游朗读链路上；补发自己的 10 分钟时限被绕开；房管无法只改记录与计分而不重新投递。
- 判为阻断的理由：违反明文契约，触发是复核的常规操作，测试把这个行为固定为预期。
- 文件：`apps/server/src/db/decision-store.ts`（`commitOverturnInTransaction`）、`apps/server/src/modules/decision-service/compensation.ts`（`overturnEvent`）、`service.ts`（`overturnValidityMs`）、`packages/contracts/src/modules/decision-service.ts`（`OverturnOutcome`）、`apps/server/test/decision-service/compensation/overturn.test.ts`、`resend.test.ts`；S014 设计 §4、§9。
- 修复方向：改判只改裁决、纠分与记录，不产生可投递的放行意图。为了之后能对新结论做显式补发，可以给新裁决写一条不可投递的投递行（有效期取改判时刻，或状态为 EXPIRED），补发按现有规则（显式操作、到达时限、60 s 有效、幂等、代次）处理它；改判结果不返回可投递的 intent。同一处顺带决定补发是否允许对已 SENT 的投递再发（E70 E3 观察）。改判为 BLOCK 时是否发出不含原文的拦截事件可按提案 §13.1 另定，不影响本项。测试：E70 D1 改为期望通过；改判后 10 分钟内显式补发成功，超过时限 `WINDOW_CLOSED`。
- 复验：E70 §C–§E；decision-service 与 db 测试；S014 spec check。

## 必验项结论

### 必验项 1：S010

- Q40：已修复。带留言的 Super Chat 读 `superChatDetails.userComment`，不带留言时正文为空，错放的 `textMessageDetails` 不被读取；测试替身改为官方形状，两种都覆盖（E50 A1–A3；40223e2 上 A2 不符）。
- Q23：已修复。BLOCK 条目的生成文本既不检查也不展示；译文命中规则只扣该条，整批 ok；规则引擎不可用时整批失败（E50 B1、B2、C2、C6；40223e2 上同一输出整批失败）。UNVERIFIED 仍整批失败是实施方自定，理由成立：检查本身没有运行，不能只丢一条。
- 模型和 reasoning 设置：不支持的选择按问题码被拒且不写入，能力变化后不静默替换保存值，真实适配器下全部 `CAPABILITY_NOT_REPORTED`（E50 E1–E4）。但精翻关的运行不带所选模型，见 B1。
- 精翻只在安全审核通过后进行：提案 §8.3 与 §4.2 第 3 步把 SC 安全审核与精翻定为同一任务；分类为 BLOCK 或生成文本未通过检查的条目都没有小抄（E50 C2、C6），这一实现符合。精翻关时只审核、不出小抄（D1）。
- 推理只用替身：全量测试在拦截下 `kiro-cli` 0 次调用（E08）；测试与探针只启动假 CLI。

### G10 的判断：不违反本批验收行，归后续 Story

- S010 的验收行场景是「关闭精翻、选择不支持参数的模型、SC 违规或生成文本未通过输出检查」，交付是精翻开关、小抄结构与模型设置。会员文字的读取在 S013 的接入解析（`stream-list.ts`）里，本批只按 Q40 改了 Super Chat。
- 实测（E50 A4）：会员里程碑的自定义文字进入事件时正文为空。平台原始条目不进入流水线，所以这段文字不会未经审核地经 VoxWard 输出；结果是文字被丢掉，既不审核，也不展示、不精翻。「以空正文通过安全审核」的说法属实，但不构成未审内容外泄。
- 提案 §4.2 第 3 步要求「Super Chat、带自定义文本的会员消息统一进入安全审核」，§1.2 要求「没有观众自定义文本的会员系统事件按事件类型处理」。接线后若不修，会员付费文字会丢失。另外 ChannelEvent 不带消息类型或付费标记，组合层无法把 Super Chat 与会员文字送进 PAID 车道。归属与修法见 N1：与 Q41 一起由下一次修改 `stream-list.ts` 的 Story 处理，最迟在付费文本处理接线之前。

### 必验项 2：S011

- 复盘只走 BACKGROUND 车道：入队成立（E60 A1）；取批不分车道，实时任务被转人工，且实时执行器会取走复盘任务（B2）。
- 临时作者别名不泄露真实身份：成立。模型输入不含 senderRef、频道 ID、平台消息 ID 与 correlationId；同任务同作者同别名，下一任务换别名（E60 B1–B4）。
- 统一结算不重复计分：成立。一次结算一行账本；两个写入方只结算一次；人工、删除、例外、过期都不结算或不计分（E60 C1–C5，真实 SQLite 计分端口）。模型输出不合整批契约时结算错误，见 B3。
- Q27 前半：成立。BLOCK 结算写一条不含正文的复核记录进人工列表，ALLOW 不写（E60 D1）。
- Q38：成立。记录数有上限，未结任务不淘汰，淘汰后的晚到结果被丢弃（E60 E1–E3）。第 6 批 S009 探针 142 项检查 0 项不符，E31、E32 与第 6 批相同；E34 §C 每条结算记录从 514 字节降到 54 字节，堆不再增长。S009 设计 §12、§13 要随之改（N8）。
- 候选词卡片的确认：按真实角色矩阵，DATA_ADMIN 403、其它频道 404、房管确认后以新规则版本发布，重复确认 409；复盘只提出卡片，规则端口 0 次调用（E60 F1–F5）。没有驳回接口，确认与词条入库用的能力不同（N5）。
- 另有 B4：运行器在任务不经 `runBatch` 结束时保留正文。

### 必验项 3：S014

- 人工接管后 AI 结果不覆盖：成立（E70 A1）。
- 多房管并发只结算一次，冲突有明确状态：成立。6 个进程同时提交只有 1 个 committed，5 个冲突都带存下的结果；同一事件的第二个任务 `ALREADY_FINAL`（E70 A2、B1、B2）。没有做压力测试。
- 改判按账本实际值纠分，只纠一次：成立（E70 C1–C3）。后续条目触及上下限时不重算（C5，N4）。
- 补发要显式操作并有有效期：补发动作本身成立（E70 E1、E2）；改判绕过它，见 B5。
- 名单和词条按权限拒绝：按真实角色矩阵，DATA_ADMIN 的名单与词条编辑都被拒且不写入（E70 F1）。
- Q19①②③：成立。无效果结果写 `score_outcomes`，冷却后重放不计分；人工补偿与身份事件的键带频道与主体；裁决、投递、计分、Change Log 同一事务，计分失败一起回滚（E70 L1–L3、G1；40223e2 上 L1–L3 全部不符）。
- Q21：成立。绕过模块守卫直接写例外主体，端口拒绝并记 REFUSED；经 DecisionService 时裁决保留、计分被拒（E70 L4、H1；40223e2 上 L4 不符）。
- Q27 后半：成立。提交前在同一事务内校验任务状态、事件版本、主体代次与当前裁决（E70 A1–A3）。
- Q29 写入方：成立。摘要不含分数与正文，主体级名单记录带 `subject:<主体标识>`，裁决与纠分记录带事件关联（E70 F3）。例外标记与单独的人工调分还没有 Change Log 写入方（S019 与后续 Story）。
- 迁移 0005 与数据字典：一致（E70 M1、M2；`schema.test.ts`、`migrate.test.ts` 通过）。

### 必验项 4：Spec

三份都是 SPEC_CURRENT（rev 4），check 不改文件（E10）。设计与代码的不一致：S010 §3.3（B1）；S011 §6 第 4 步（B3）、R5 未写取批不分车道（B2）、未登记缺少驳回（N5）；S014 §2 列了不存在的 `auth/decision-routes.ts`、§4 人工补偿键格式、§4 与 §9 的改判投递（B5）、§6 未写后续触底不重算（N4）；本批改了 S009 协调器而 S009 设计 §12、§13 未改（N8）。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | G10：接入解析只读文字消息与 Super Chat 的正文，会员里程碑等带自定义文字的类型正文为空；ChannelEvent 不带消息类型或付费标记，组合层无法把付费文字送进 PAID 车道。 | E50 A4、A5；提案 §1.2、§4.2 第 3 步 | 下一次修改 `platform-source/youtube/stream-list.ts` 的 Story（与 Q41 一起），最迟在付费文本处理接线之前：按类型读取会员留言，字段名在 S029 真实接入时核对；ChannelEvent 增加消息类型或付费标记（契约最小改动）；S013 设计 §6 的正文说明一并改 |
| N2 | 真实 Kiro CLI 适配器不报告模型（G1），无法应用 reasoning（G4），结果只含分类字段、不能返回 SC 字段（G6）。按适配器自己的报告组合时，所有带选择的 AI 运行都在门槛被拒（E50 E4），失败方向是安全的，但 SC 精翻与审核都还不能运行。 | E50 E3、E4；S010 设计 G1、G4、G6 | S008 适配器的后续工作，与 B1 的修法配合，最迟在 S029 演练之前：报告只列适配器真能应用的模型与参数；SC 输出通道扩展 |
| N3 | 模型设置是一个全局对象，读写处理函数不接收操作者与频道；提案 §2.1 写频道所有者管理「模型和输出端配置」。 | `model-settings/routes.ts`；S010 设计 G3 | 注册设置路由时（S022 设置页或接线 Story）：加角色鉴权，并定下设置按频道还是按部署归属；与 Q34（多角色）一起考虑 |
| N4 | 改判纠分只取该条自己的 `actual_delta` 取反并按当前上下限钳制，不重算其后触及上下限的条目（E70 C5：−7，按账本重放应为 −10）；新结论不计分、同一事件只纠一次，所以二次改判后的最终结论没有计分效果，放行改判为 BLOCK 也不扣分。提案 §7.1 要求「在保留的账本范围内重算受影响部分…超出可重建范围则走明确的人工调整」。验收行「无旧结果重建或机械加回配置分」成立，所以不阻断。 | E70 C1–C5；提案 §7.1；S014 设计 §4、§6 | 可在 B5 返工中一并处理，最迟下一次修改 `db/decision-store.ts` 的 Story：在保留账本内重算，或在其后有条目触及上下限时把纠分标为需要人工调整；设计写明改判不对新结论计分的取舍；S026 覆盖 |
| N5 | SUB-022 的范围写「确认与驳回 API」，卡片只有待确认与已确认两种状态，路由没有驳回，误报的候选词无法处理掉。确认要 `review.decide`，S014 的词条入库要 `list.edit`，现在授给同样的角色；提案 §2.1 写房管做「获准的名单与词条操作」。 | E60 F6、F7；SUB-022 scope；`auth/permissions.ts` | S011 返工一并处理（同文件、成本低）：加驳回与 REJECTED 状态；确认统一用 `list.edit`，或在设计写明为何不同 |
| N6 | 删除覆盖：新表 `score_outcomes` 是按主体的幂等记录（字典写「随主体删除（后续 Story 实现）」）；候选词卡片带来源 correlationId，可能取自已删消息。 | E70 M1；`candidates/store.ts`；VW-R-017 | STORY-019：删除索引覆盖 `score_outcomes`（按 `subject_id`）并决定卡片随来源删除还是去关联；S011、S014 设计写明 |
| N7 | 接线约束：①复盘的 `commitSettlement` 数据库绑定要把复盘结论写成该事件的当前裁决，否则 S014 改判时会按 FAST_PASS 裁决去冲正复盘写下的账本行；②`resumePendingScoring` 需要定时调用；③复盘模型端口要绑定 S010 的 review 设置；④SC 要进 PAID 车道（需要 N1 的类型信息）。 | S011 设计 R1、§8；`db/decision-store.ts` 读 `event:<频道>:<消息>` 账本行 | 接线 Story（问题清单 Q39 所说的接线 Story）与 STORY-026 核心闭环验证 |
| N8 | 文档出入：S014 设计 §2 列了 `apps/server/src/auth/decision-routes.ts`（不存在），§4 的人工补偿键格式与代码不同；S009 设计 §12、§13 仍写结算记录随累计任务数增长，§12 的「用于同一事件的去重」在窗口淘汰后只在窗口内成立（S011 R2）；S011 设计没有登记缺少驳回。 | acceptance.md §1.1 | S011 返工时改 S009 设计；其余下次修改这些 spec 时一并改 |
| N9 | DecisionService 契约改了 `commit` 的参数与返回值并新增两个方法，`CONTRACT_VERSION` 仍为 `"1"`（设计 §0：当前没有其它实现者）。 | `packages/contracts/src/modules/decision-service.ts` | 下一次修改契约包的 Story：在契约说明里记下这次不兼容变更；有第二个实现者之前定好版本规则 |

## 需 Owner 决定

无。B1–B5 都按验收行与提案原文修复，在现有授权（minutes:fd542a49a57a9e6526440dac）内。B2 的修复要改 `task-coordinator/`，S011 的原简报禁止这一改动，主线程需要在返工简报里放开；这是实现约束，不是产品取舍。

## 下一轮拆分（返工）

三个返工包互不改同一文件，可以并行。每包在自己的工作树与分支上做，基于本候选 `5482e5d`。

| 包 | 子单 | 处理 | 改动文件 | 依赖与注意 |
| --- | --- | --- | --- | --- |
| P-S010-fix | SUB-020（必要时 SUB-019） | B1；设计 §3.3 改为与代码一致 | `inference-provider/sc-translation/pipeline.ts`、`index.ts`、`test/inference-provider/sc-translation/*`；若选改请求契约，再加 `packages/contracts/src/modules/inference-provider.ts` 与 `adapters/kiro-cli/*`（需主线程放开） | 无。推理只用假 CLI，不调用真实模型 |
| P-S011-fix | SUB-021、SUB-022 | B2、B3、B4；N5 建议一并做；N8 中 S009 设计 §12、§13 | `moderation-engine/review/runner.ts`、`ports.ts`、`candidates/store.ts`、`routes.ts`、`task-coordinator/coordinator.ts`、`index.ts`、`crew/adapter.ts` 与对应测试；`.kiro/specs/voxward-s009-scheduler/design.md` 本地段 | 需放开 task-coordinator 的改动；交付前在本包内复跑 E30–E34 与 E60、E61 |
| P-S014-fix | SUB-027 | B5；N4 建议一并做或写进设计；N8 中 S014 设计 §2、§4 | `db/decision-store.ts`、`decision-service/compensation.ts`、`service.ts`、`resend.ts`、`packages/contracts/src/modules/decision-service.ts`、`test/decision-service/compensation/*` | 无 |

## 复验范围

- 证据失效：三组都有 failed 行，返工后在新候选上关单时，99 行都要以新候选的 codeVersion 重新判定。
  - S010 组：`apps/server/src/modules/inference-provider/`、`apps/server/src/adapters/kiro-cli/`、`apps/server/test/inference-provider/`、`packages/contracts/`、`platform-source/youtube/stream-list.ts`、S010 设计。重跑 E50（§F 改为期望通过）。
  - S011 组：`apps/server/src/modules/moderation-engine/`、`apps/server/src/modules/task-coordinator/`、`apps/server/test/moderation-engine/`、`apps/server/test/task-coordinator/`、S011 与 S009 设计。重跑 E60（§A、§G 改为期望通过）、E61（H2、H3 改为期望通过）、E30–E34（协调器改动后的 S009 回归）。
  - S014 组：`apps/server/src/db/`、`apps/server/src/modules/decision-service/`、`apps/server/src/modules/scoring-engine/`、`apps/server/test/decision-service/`、`apps/server/test/db/`、`packages/contracts/`、`docs/data-dictionary.md`、S014 设计。重跑 E70（§D 改为期望通过；§L 在对照副本上的结论不变）。
  - 本轮 satisfied 的行，若对应路径在新候选上与 `5482e5d` 相同，可复用本轮证据并重新盖 codeVersion；有改动则按上面重跑。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08）、check-deps 负面对照（E09）、三份 spec 的 check（E10）、静态核对（E11）。
- 问题清单：N1–N9 建议登记到主线程 `tasks.md` 的问题清单，归属如上表。
- 探针、拦截脚本、生成脚本与原始输出的副本在交付目录 `probes/`，复验时可直接复用（见 `probes/README.md`；需要 `apps/server/node_modules/.bin/tsx`、`@voxward/contracts` 软链接与 `git archive 40223e2` 对照副本）。
