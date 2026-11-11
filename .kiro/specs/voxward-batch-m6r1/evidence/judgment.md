# 第 m6 批第 2 轮判断（总表第 6 批返工复验：S010、S011、S014）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `fff691e`（`763bc39` 之上依次合入 `voxward/s010-fix`、`voxward/s011-fix`、`voxward/s014-fix`，均无冲突；`763bc39` 与上一轮候选 `5482e5d` 的代码相同）。
- 范围：9 张工单、99 行验收（与上一轮逐项相同）。satisfied 97 行，failed 2 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch-m6r1/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现，也没有做过上一轮验收；按小轮处理，验收、判断与 lessons 一次完成。普通判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| Story | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-010 | **通过** | 35/35 satisfied（STORY 11、SUB-019 12、SUB-020 12） | 无（B1 已修复） | 上一轮 10 行 failed 在本候选上全部成立 |
| VOXWARD-STORY-011 | **打回** | 33 satisfied、2 failed（VW-S011-INHERIT-006、VW-SUB021-INHERIT-006） | B6（新） | B2、B3、B4 已修复；B6 是 B2 修法带来的跨调用方优先级问题，归 SUB-021 |
| VOXWARD-STORY-014 | **通过** | 29/29 satisfied（STORY 9、SUB-026 10、SUB-027 10） | 无（B5 已修复） | 上一轮 9 行 failed 在本候选上全部成立 |

- rejection 计数：P-S010（SUB-020）与 P-S014（SUB-027）本轮通过，此前各 1 次打回。P-S011 第 2 次打回，记在 SUB-021；下次派工用 `--rejections 2` 解析模型。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（1760/1760）、`pnpm check:deps`（201 个文件 0 违规）通过；默认配置下用 `tools/smoke.sh` 起 `pnpm dev` 与 `node dist/main.js`，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew` 0 次调用（acceptance.md E02–E09）。门禁全绿，但 S011 组被打回，主线程汇报时不能写成「本批全部通过」。
- Spec：三份都是 `SPEC_STALE`（rev 5），原因是上一轮链写证据使工单修订号变化；含义、验收行与要求都没有变化，受管段与 `source.json` 与 `5482e5d` 逐字相同，属预期（acceptance.md §1.2，E10、E11）。设计与代码的不一致见 B6 与 N4。

## 上一轮阻断的复验结论

- **B1：已修复。** `InferenceRequest` 增加可选的 `selection`；S008 适配器对带 selection 的请求用所选模型作 `--model`，reasoning 不能应用时在启动进程前报 `SELECTION_UNSUPPORTED`；流水线的门槛改读运行端口自己的报告，精翻关把选择放进请求。上一轮的复现输入（按 B 构造或不带模型构造，选 A）现在 CLI 都收到 `--model synthetic-model-a`；上一轮写的触发（运行中把选择从 B 换成 A、适配器不重建）两次运行依次用 B、A；报告里没有的模型或等级在启动前被拒；精翻开把选择原样交给 SC 模型端口；不带 selection 的实时请求不变（E50 F1–F9）。修法是上一轮「修复方向」列出的第二种（请求带选择），改动在 S010 返工简报放开的范围内。
- **B2：已修复。** 协调器按车道取批，Crew 执行器只取 PAID 与 REALTIME，复盘运行器只取 BACKGROUND，运行器遇到不认识的任务不再用不可重试的错误码结算。共用协调器时排队的 REALTIME、PAID 任务不被复盘运行器触碰，复盘任务不被执行器取走，后台余量与上限为 1 时暂停不变（E60 A1–A5），第 6 批 S009 探针 142 项检查 0 项不符（E30–E34）。但按车道过滤之后，派工优先级只在一次调用内成立，见 B6。
- **B3：已修复。** 运行器在结算前检查返回的 itemId 集合；重复、批外 ID 与缺项都使整批进入人工队列，不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同一规则在 moderation-engine 里另写一份，因为 check:deps 禁止它导入 inference-provider（E09）。
- **B4：已修复。** 运行器的条目不再存正文；取消、到期两组各 20 条在存储行删除后堆上正文标记为 0，条目在下一次周期释放为 0（E61 H1–H4）。
- **B5：已修复。** 改判为放行不再产生可投递意图：`intent` 为 null，新裁决的投递行写为 EXPIRED、有效期等于改判时刻；2 小时前被拦截的消息改判后显式补发得 `WINDOW_CLOSED`；时限内的改判放行只能经显式补发投递（60 s 有效、幂等、10 分钟后被拒）；补发拒绝已 SENT 的投递（E70 D1–D3、E1–E3）。改判为拦截仍立即投递 BLOCK（D4），这是上一轮判断留给提案 §13.1 另定的部分，不影响 B5。

## 必验项结论

### 必验项 1：S010

- Q40：成立，`platform-source` 本轮未改，带留言与不带留言的 Super Chat 正文都对，对照副本上带留言的仍为空（E50 A1–A3）。
- Q23：成立，`validation` 本轮未改，BLOCK 条目不进精翻，译文命中只扣该条，无法检查时整批失败（E50 B1、C2、C6）。
- 模型和 reasoning 设置：不支持的选择按问题码被拒、不写入，能力变化后不静默替换保存值（E50 E1–E4）；所选模型现在到达运行，适配器不能应用的参数明确失败，不换模型（E50 F1–F9）。
- 精翻只在安全审核通过后进行：安全审核与精翻是同一任务（提案 §8.3），小抄只给分类不是 BLOCK、生成文本通过检查的条目（E50 C2、C6）；精翻关只审核、不出小抄（D1）。
- 推理只用替身：全量测试与探针都只启动假 CLI，`kiro-cli` 0 次调用（E08）。

### G10 的判断：不违反本批验收行，归后续 Story（结论与上一轮相同）

本轮相关代码没有变化，E50 A4 与上一轮相同：会员里程碑的自定义文字进入事件时正文为空，文字被丢掉，不会未经审核地输出。S010 的验收行场景是精翻开关、小抄与模型设置，会员文字的读取在 S013 的接入解析里。问题清单 Q46 已按上一轮建议登记（下一次修改 `stream-list.ts` 的 Story，最迟在付费文本接线之前），本轮不重复建议。

### 必验项 2：S011

- 复盘只走 BACKGROUND 车道：入队与取批都只用 BACKGROUND，实时与付费任务不被复盘运行器触碰（E60 A1–A3）。「不挡实时」只在执行器先取时成立：复盘运行器先取时，实时批次已就绪也要等后台批次，见 B6。
- 临时作者别名不泄露真实身份：成立（E60 B1–B4）。
- 统一结算不重复计分：成立（E60 C1–C5）；模型输出不合整批契约时整批转人工（G1–G4）。
- Q27 前半：成立，BLOCK 结算写一条不含正文的复核记录，ALLOW 不写（E60 D1）。
- Q38：成立，记录数有上限，未结任务不淘汰，淘汰后的晚到结果被丢弃（E60 E1–E3）。第 6 批 S009 探针逐行与上一轮相同（E30–E34）；这些探针只用单一调用方，B6 由 E60 A6 与 E62 测得。
- 候选词卡片的确认：按真实角色矩阵，DATA_ADMIN 403、其它频道 404、房管确认后以新规则版本发布、重复确认 409；复盘只提出卡片，规则端口 0 次调用（E60 F1–F5）。

### 上一轮 N5（Q50）的处理：已处理

卡片增加 REJECTED 与驳回接口；确认与驳回统一要求 `list.edit`，与 S014 的词条入库一致；只有 `review.decide` 的操作者被拒，DATA_ADMIN 被拒，驳回后同一词不再提出、不能再确认（E60 F8–F10）。真实角色矩阵里频道所有者与房管两项能力都有，能确认的角色没有变化。设计 §1.1、§4 已登记。Q50 随 S011 组关单关闭；P-S011-fix2 不改 `candidates/`，这部分证据下一轮可以复用。

### 必验项 3：S014

- 人工接管后 AI 结果不覆盖：成立（E70 A1）。
- 多房管并发只结算一次，冲突有明确状态：成立，6 个进程只有 1 个 committed，5 个冲突都带存下的结果（E70 B1、B2）；没有做压力测试。
- 改判按账本实际值纠分，只纠一次：成立（E70 C1–C3）。
- 补发要显式操作，并有有效期：成立（E70 D1–D3、E1–E3）。
- 名单和词条按权限拒绝：DATA_ADMIN 都被拒且不写入（E70 F1）。
- Q19①②③：成立（E70 L1–L3、G1；对照副本 L1–L3 全部不符）。
- Q21：成立，端口层拒绝例外主体的写入；经 DecisionService 时裁决保留、计分被拒（E70 L4、H1）。
- Q27 后半：成立，提交前在同一事务内校验任务状态、事件版本、主体代次与当前裁决（E70 A1–A3）。
- Q29 写入方：成立，摘要不含分数与正文，主体级名单记录带 `subject:<主体标识>`（E70 F3）；本轮新增的「纠分需人工调整」记录同样不含数字（C5）。
- 迁移 0005 与数据字典：一致，本轮两者都没有改动（E70 M1、M2）。
- 超出简报范围的文件：S014 返工改了 `packages/contracts/src/ports/decision-store.ts`（`deliverable`、`needsManualAdjustment`、`ALREADY_SENT` 三处）。这是把改判的投递选择与标记传过存储端口所需的最小改动，属于为交付原包而修正自身改动（批量原则第 1 条），实施方已在报告里列出，不另作处理。契约再次不兼容变更而 `CONTRACT_VERSION` 仍为 `"1"`，归已登记的 Q54。

### 上一轮 N4（Q49）的处理：部分处理，余下缺口不阻断

实施方选「标记，不重算」：纠分金额仍取账本实际变化，同一主体其后有条目被钳制或有 `CLAMPED` 的无效果结果时，结果带 `needsManualAdjustment` 并写一条不含分数的 Change Log（E70 C5、C5b）。设计写明了改判不对新结论计分的取舍。这符合上一轮给出的两种处理之一。余下的缺口是只在重放时才触及上下限的情形：账本时间线上没有被钳制的条目时不标记，结果与重放不同（E70 C6：结果 9，重放 7）。验收行「无旧结果重建或机械加回配置分」成立，设计 §7 已登记这一缺口，所以不阻断，见 N1。

### 必验项 4：Spec

三份 `kiro-specs.mjs check` 都返回 `SPEC_STALE`（rev 5），原因与影响见文首「Spec」。设计与代码：S010 §3.3 已与代码一致；S014 §2、§4、§7、§10 已与代码一致；S011 设计 §1.1 引用的 R8 与自测证据所说新增的 R7 不在 §9 残余清单里；S009 设计 §4 的接口代码块仍是 `takeBatch()`，§5 的「派工顺序仍是 PAID、REALTIME、BACKGROUND」跨调用方不成立（B6、N4）。

## 阻断发现

编号沿用上一轮：B1–B5 为上一轮编号，本轮新发现从 B6 起。

### B6 按车道取批后，派工优先级只在一次调用内成立：复盘运行器先取时，已就绪的实时批次要等后台批次（归属 SUB-021）

- 触发：复盘运行器与 S009 的 Crew 执行器共用一个协调器（S009、S011 设计的接法）；PAID 或 REALTIME 批次已就绪且有空槽位时，复盘运行器先调用 `takeBatch({ lanes: ["BACKGROUND"] })`。复盘运行器按 `runBatch()` 返回 null 为止循环时，每结束一批就立刻再取下一批，所以在实时积压期间，这个顺序会反复出现。
- 当前行为（acceptance.md §3.1）：`takeBatch` 先按调用方给的车道过滤，再逐车道检查能否启动；只取 BACKGROUND 的调用不看更高车道有没有已就绪的批次，只受后台上限 `limit − reserve` 约束。第 6 批的单一调用方 `takeBatch()` 在同样状态下会先给实时。E60 A6：上限 4、3 个实时批次已就绪，复盘调用方先取得到 3 个槽位，执行器随后只启动 1 个实时批次，2 个等待。E62：8 条实时与 8 条后台同时排队、每批占槽 1 s、实时截止 2.5 s，单一调用方与执行器先取时 8 条实时都完成、0 条转人工；复盘运行器先取时只完成 2 条，6 条转 PENDING_REVIEW。实时截止 10 s 时都能完成，但最后一批实时任务晚两个周期才开始。`lanes.test.ts` 的第一个用例「takes only the lanes asked for, even when a higher lane is queued」把复盘在 PAID、REALTIME 已就绪时取到批次当作预期。
- 契约：VW-R-006「付费优先、复盘让出实时容量」，S011 各单 INHERIT-006 要求保留原始要求且不改变其它模块职责；提案 §6.2「后台复盘：使用剩余容量，可以暂停或延后」；S011 返工简报第 1 项「实时容量要让给 REALTIME 和 PAID（VW-R-006）」；S009 设计 §5「派工顺序 PAID > REALTIME > BACKGROUND。PAID 与 REALTIME 可用全部槽位」，以及本轮返工自己写的「派工顺序仍是 PAID、REALTIME、BACKGROUND」；第 6 批验收的 SUB-017 行「付费优先、后台余量」。
- 影响：实时积压期间，后台最多占 `limit − reserve` 个槽位（上限 4 时为 3 个），而且只要还有复盘任务就一直占着；实时只剩余量那 1 个槽位。超过截止时间的实时消息按提案 §6.2 作为系统处理失败交给人工队列，房管的人工负担在直播高峰时增加，而这正是优先级要保护的场景。复盘任务的截止时间是结算期限，延后的代价小。
- 判为阻断的理由：明文契约与返工简报的要求；用真实协调器与设计的接法测得，触发是复盘运行器的正常循环；这是本轮改动带来的、相对第 6 批已验收行为的退化；S009 设计写的顺序与代码不符，测试把这个行为固定为预期。第 5b 批 B4（后台复盘挡住同频道的实时提交）是同类问题，当时也判为阻断。
- 归属说明：上一轮判断给 B2 的修复方向只写了「按车道取批，仍共用同一套槽位与后台余量」，没有写跨调用方的优先级，实施方按这个方向做了。这是上一轮判断的遗漏，修复仍归 SUB-021（改动在 S011 返工已放开的 `task-coordinator/coordinator.ts`），不需要 Owner 决定。
- 文件：`apps/server/src/modules/task-coordinator/coordinator.ts`（`takeBatch`）、`apps/server/test/task-coordinator/lanes.test.ts`；`.kiro/specs/voxward-s009-scheduler/design.md` §4、§5。
- 修复方向（实现由 SUB-021 选择）：让按车道过滤的调用只拿单一调用方在同一时刻会拿到的批次。例如 `takeBatch` 仍按 PAID、REALTIME、BACKGROUND 的顺序检查每个车道，遇到调用方没有请求、但此刻能启动且已就绪（`laneMayStart` 与微批判定都通过）的更高车道时返回 null，不再往下取低车道；槽位与后台余量照旧共用。更高车道还在等微批窗口、没有就绪时，后台仍可取，与第 6 批单一调用方的行为相同。测试：把 `lanes.test.ts` 第一个用例改为「PAID、REALTIME 已就绪时只取 BACKGROUND 的调用返回 null，它们被取走或未就绪时才返回后台批次」；加一个两调用方的积压用例，复盘先取与单一调用方的结果相同（E62 的形状即可）；A4、A5 与 E30–E34 的行为不变。S009 设计 §4 的接口块写上 `takeBatch(options?)`，§5 写明跨调用方如何保持顺序。
- 复验：E60（A6 改为期望通过：实时就绪时后台取到 0 个批次）、E62（复盘先取时 8/8 完成、0 条转人工）、E61、E30–E34；task-coordinator 与 moderation-engine 测试与完整门禁；S011 spec check。

## 非阻断建议

编号为本轮编号；引用上一轮时写「上一轮 Nx」。

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | Q49 的余下缺口：「需人工调整」只看原账本时间线上有没有被钳制的条目。原条目被去掉后，后续条目可能在重放时才触及上下限，这种情况不标记，纠分结果与重放不同。E70 C6：BLOCK −3、六次 ALLOW +2（都没有被钳制）、再 BLOCK −3，改判第一条后分数 9、不标记，按账本重放为 7。提案 §7.1 要求重算受影响部分，超出可重建范围时走明确的人工调整，不能声称已精确恢复。设计 §7 已登记。 | E70 C5、C5b、C6；提案 §7.1；S014 设计 §7 | 下一次修改 `db/decision-store.ts` 的 Story，最迟 STORY-026 核心闭环验证：在现有标记条件上加一条，按账本倒推原条目之后每一步的运行分数（当前分数减去其后各条的 `actual_delta`），加上纠分量后任何一步越过上下限也标记；这只用账本与当前分数做算术，不需要改计分引擎，身份基准重算的情形按保守近似处理。或在保留账本内重放。S026 覆盖 C6 这种序列 |
| N2 | 投递状态的写入方还没有：B5 让改判放行写一行 EXPIRED 投递，补发靠 `status = 'SENT'` 拒绝重复投递，但目前没有任何代码把投递标为 SENT，`ALREADY_SENT` 要等输出端接上才起作用；输出端也必须只发送 PENDING 且未过期的行，不能把 EXPIRED 行当作待发。 | E70 D1、E3；`db/decision-store.ts`；`deliveries` 状态取值 | STORY-021（输出适配器）与接线 Story：输出端发送后把投递标为 SENT（同一短事务内比较状态），只读取 PENDING 且 `valid_until` 未过的行；验收用例覆盖「SENT 后补发被拒」「EXPIRED 行不被发送」 |
| N3 | 复盘运行器的接线约束：① 一个协调器只接一个复盘运行器。两个运行器共用时，一个运行器的批次会带着另一个运行器入队的任务，它跳过这条任务，任务留在 RUNNING 直到截止转人工（E60 A7）。② 运行器跳过不认识的任务时仍对整批 `finishBatch`，任务停在 RUNNING 到截止时间；这是自测证据写的 R7，设计 §9 没有登记。③ 上一轮 N7（复盘结论写成当前裁决、`resumePendingScoring` 定时调用、复盘模型绑定 review 设置、SC 进 PAID 车道）仍有效。 | E60 A7；`review/runner.ts`；S011 设计 §9 | 接线 Story（Q39、Q52 所说的那一张）与 STORY-026：组合根只建一个复盘运行器，或让条目表与协调器共享；把 R7 写进 S011 设计 §9 |
| N4 | 文档出入：S009 设计 §4 的接口代码块仍是 `takeBatch()`，§5 写的跨调用方顺序与代码不符（随 B6 一起改）；S011 设计 §1.1 引用的 R8 与自测证据所说的 R7 不在 §9 残余清单里；S010、S011、S014 的 `tasks.md` 本地段都没有返工条目。 | acceptance.md §1.2 | S009、S011 设计随 B6 返工一并改；三份 `tasks.md` 下次修改这些 spec 时补返工条目 |

问题清单的状态（主线程 `tasks.md`）：Q19、Q21、Q23、Q40 与 Q27 后半在本候选上成立，可以随 S010、S014 两组关单一起关闭；Q27 前半与 Q38 在本候选上成立，但 S011 组被打回、P-S011-fix2 还要改协调器，等下一轮复验后再关；Q29 的写入方成立，删除索引的查找仍归 S019；Q50 已处理，随 S011 关单关闭；Q49 改为 N1 的余下缺口；Q53 除 N4 外已处理；Q46、Q47、Q48、Q51、Q52、Q54 不变（Q47 补一句：B1 之后适配器拒绝任何 reasoning 等级，G1 修复时报告里的 `reasoningLevels` 要为空；Q54 补一句：本轮 S014 又改了一次 DecisionService 与存储端口的形状）。N1–N4 建议登记到问题清单，归属如上表。

## 需 Owner 决定

无。B6 按 VW-R-006、提案 §6.2 与 S011 返工简报原文修复，在现有授权（minutes:fd542a49a57a9e6526440dac）内；改动在 S011 返工已放开的 `task-coordinator/` 范围里。

## 下一轮拆分（S011 第 2 次返工）

只有一个返工包，基于本候选 `fff691e`。S010 组与 S014 组不需要返工。

| 包 | 子单 | 处理 | 改动文件 | 依赖与注意 |
| --- | --- | --- | --- | --- |
| P-S011-fix2 | SUB-021 | B6；N3 的 R7 写进设计；N4 中 S009 设计 §4、§5 与 S011 设计 §9 | `apps/server/src/modules/task-coordinator/coordinator.ts`、`apps/server/test/task-coordinator/lanes.test.ts`（可再加一个两调用方的积压测试）、`.kiro/specs/voxward-s009-scheduler/design.md` 与 `.kiro/specs/voxward-s011-review/design.md` 的受管段之外 | 不改 `packages/contracts/`、`inference-provider/`、`db/`、`decision-service/`，这样 S010、S014 两组的证据不失效。交付前在包内复跑 E30–E34、E60、E61、E62（探针在本轮交付目录 `probes/`）。模型用 `einzbern execution-policy-resolve --rejections 2` 解析 |

## 复验范围

- 关单：STORY-010 组与 STORY-014 组可以按本轮证据以 `fff691e` 链写关单（九单的 `content.evidence` 里已有上一轮 `5482e5d` 的 99 行，本轮行以 codeVersion `fff691e` 追加，完成候选须用同一字符串）。STORY-011 组不能以 `fff691e` 关单。
- 若主线程改在 P-S011-fix2 合入后的新候选上一起关单，先确认下列路径相对 `fff691e` 的 diff 为空，再复用本轮 S010、S014 两组的证据并重新盖 codeVersion；有改动则重跑对应探针与门禁：
  - S010 组：`apps/server/src/modules/inference-provider/`、`apps/server/src/adapters/kiro-cli/`、`apps/server/src/modules/platform-source/youtube/`、`apps/server/test/inference-provider/`、`apps/server/test/adapters/kiro-cli/`、`packages/contracts/`、`.kiro/specs/voxward-s010-sc-translation/design.md`（E50）。
  - S014 组：`apps/server/src/db/`、`apps/server/src/modules/decision-service/`、`apps/server/src/modules/scoring-engine/`、`apps/server/test/decision-service/`、`apps/server/test/db/`、`apps/server/test/scoring-engine/`、`packages/contracts/`、`docs/data-dictionary.md`、`.kiro/specs/voxward-s014-decision/design.md`（E70）。
- S011 组在新候选上 35 行都要重新判定：`apps/server/src/modules/moderation-engine/`、`apps/server/src/modules/task-coordinator/`、`apps/server/test/moderation-engine/`、`apps/server/test/task-coordinator/`、S011 与 S009 设计都在返工范围里。重跑 E60（A6 改为期望通过）、E61、E62（复盘先取须与单一调用方相同）、E30–E34。本轮 satisfied 的 33 行，若对应路径在新候选上与 `fff691e` 相同，可复用本轮证据并重新盖 codeVersion。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08）、check-deps 负面对照（E09）、三份 spec 的 check（E10）、静态核对（E11）。
- 探针、拦截脚本、生成脚本与原始输出的副本在交付目录 `probes/`，复验时可直接复用（见 `probes/README.md`；需要 `apps/server/node_modules/.bin/tsx`、`@voxward/contracts` 软链接与 `git archive 40223e2` 对照副本）。
