# 第 m7 批第 1 部分判断（总表第 7 批：S011 第 3 轮复验、S015 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `cb822f0`（`0a3237c` 之上依次合入 `voxward/s011-fix2`、`voxward/s015-platform-delete`，均无冲突；`0a3237c` 与上一轮候选 `fff691e` 的代码相同）。
- 范围：5 张工单、54 行验收（S011 组 35 行与上一轮逐项相同，S015 组 19 行首次验收）。satisfied 54 行，failed 0 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch-m7/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现，也没有做过前几轮验收；按小轮处理，验收、判断与 lessons 一次完成。普通判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| Story | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-011 | **通过** | 35/35 satisfied（STORY 11、SUB-021 12、SUB-022 12） | 无（B6 已修复） | 上一轮 2 行 failed（两单的 INHERIT-006）在本候选上成立；B2、B3、B4、N5 的修复没有退回 |
| VOXWARD-STORY-015 | **通过** | 19/19 satisfied（STORY 9、SUB-028 10） | 无 | 真实受权删除按方法标为未验证，不影响各行判定 |

- rejection 计数：P-S011 在第 3 轮通过，此前 2 次打回记在 SUB-021。P-S015 首次通过，rejections=0。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（1802/1802）、`pnpm check:deps`（204 个文件 0 违规）通过；默认配置下用 `tools/smoke.sh` 起 `pnpm dev` 与 `node dist/main.js`，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试与全部探针在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew` 0 次调用（acceptance.md E02–E09）。本批第一部分可以写成「S011、S015 两组全部通过」；S021 没有合入，不在本轮范围。
- Spec：`voxward-s011-review` 为 `SPEC_STALE`（rev 6），原因是前两轮链写证据使工单修订号推进；含义、验收行与要求都没有变化，受管段与 `source.json` 与 `fff691e` 逐字相同，属预期（acceptance.md §1.2，E10、E11）。`voxward-s015-platform-delete` 为 `SPEC_CURRENT`（rev 4）。设计与代码的不一致见 N1、N3。
- 执行偏差：E08 的拦截自检有一次误在未加载拦截模块时运行，对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 各发出一次不带凭据的根路径请求（fetch 与 https 各一次）和一次 443 端口 TCP 连接。请求不含令牌、项目数据或接口路径，没有调用 YouTube 或 Google 的任何 API，所有判定都不依赖它；之后的测试与探针都在拦截下运行。原始输出在 `probes/logs/e08/selfcheck-NO-GUARD-mistake.txt`。简报的「不连真实 YouTube 或 Google」按字面没有完全做到，如实报告。

## 上一轮阻断的复验结论

- **B6：已修复。** `takeBatch` 遇到调用方没请求、但能启动且微批已就绪的更高车道时返回 null，不再往下取低车道；车道还在微批窗口或在重试退避时不算就绪。复验条件都成立：E60 A6 改为期望通过（实时就绪时后台取到 0 个批次，执行器启动 3 个）；E62 复盘先取时 8/8 实时完成、0 条转人工，三种调用顺序每个周期启动的批次相同；E61 与 E30–E34 不变差（与上一轮逐行相同）。本轮另加 E63：300 组随机到达共 5940 个付费或实时任务，两种调用顺序下没有一个比单一调用方晚开始或被转人工；同一探针在 `fff691e` 对照副本上复盘先取有 1090 个晚开始、527 个转人工。修法与上一轮给出的修复方向一致，改动只在 S011 返工已放开的 `task-coordinator/coordinator.ts`。
- B2、B3、B4 与 N5（Q50）的修复没有退回（E60 A1、A3–A5、F8–F9、G1–G6，E61）。

### 上一轮非阻断建议的处理

- 上一轮 N3（Q57）：R7（跳过不认识的任务仍整批 finishBatch）与 R9（一个协调器只接一个复盘运行器）已写进 S011 设计 §9；接线约束本身仍归接线 Story，Q57 保持打开。
- 上一轮 N4（Q53 的剩余部分）：S009 设计 §4 已改为 `takeBatch(options?)`，§5 写明跨调用方规则；S011 设计 §9 已补 R7、R8，另加 R9、R10。余下两处：S009 §5「与哪个调用方先调用无关」说得过宽（N1）；S010、S011、S014 的 `tasks.md` 本地段仍没有返工条目。

## 必验项结论

### 必验项 1：S011 B6

- E60 A6 改为期望通过：成立（后台 0 个批次，执行器 3 个；A6b 执行器取走后后台得到剩下的 1 个槽位）。
- E62 复盘先取时 8/8 实时完成、0 条转人工：成立。
- E61、E30–E34 不变差：成立，与上一轮逐行相同（只有堆读数与计时不同）。
- B2–B4、N5 的修复不退回：成立（见上）。
- 路径与 `fff691e` 相同的行：S011 组上一轮 satisfied 的 33 行所依赖的源码（`review/` 除 `ports.ts` 注释外、`candidates/`、`inference-provider/`）没有改动，本轮重跑结果逐项相同；由于协调器有改动，E60、E61、E62 全部在 `cb822f0` 上重跑，35 行都以本轮执行为依据并盖 codeVersion `cb822f0`。

### 必验项 2：S015

- 删除前校验本地权限（房管/房主）与 OAuth 写权限，无权限、无写权限、配额不足时请求前失败，平台调用 0 次：成立。本地权限按真实角色矩阵只给本频道持有 `review.decide` 的房主与房管，被拒时连平台权限都不检查（E70 L1–L4）；只读、没有、已撤销授权得 NO_WRITE_SCOPE，预算不足或平台已报耗尽得 QUOTA_EXHAUSTED，都是 0 次请求、0 单位（W1、Q1–Q3）；默认的本地拒绝不经过删除端口（L5、E11）。
- 等待、成功、失败、未知四种平台状态与本地拦截分开记录：成立。每次请求前记 PENDING，结束记 SUCCEEDED、FAILED 或 UNKNOWN，四种都出现过；`local` 与 `platform` 分开返回，平台记录只经 `record` 回调交出，不写 Change Log；平台失败后裁决仍是 BLOCK、BLOCK 投递仍是 PENDING（S1、S4、S8）。平台状态没有落库，界面也没有做，属本包范围之外（设计 §0、§7），见 N2。
- 结果未知时先核实，不盲目重试，重试有上限：在一次操作之内成立。未知时先读回；ABSENT 记成功、读回不可用记 UNKNOWN 且不再请求；只有读回 PRESENT 才重试，总次数上限 2，重试前重新检查写权限与配额；同一操作标识重复提交不再请求（S5–S7、U1–U4）。跨操作的情形见 N2。
- 只用替身，不连真实 YouTube 或 Google：被测代码与探针只经替身传输层（E70），全部在拦截下运行；执行偏差见文首。
- 变异对照：去掉权限与配额检查、未知时不读回、被拒的本地审核仍继续，三个副本分别有 8、7、3 项检查不符，说明 E70 能区分这些条款是否满足。

### 必验项 3：Spec

两份都跑了 `kiro-specs.mjs check`：S011 `SPEC_STALE`（rev 6，原因与影响见文首），S015 `SPEC_CURRENT`（rev 4）。设计与代码：S011 设计各节与代码一致；S009 设计 §4 一致，§5 的机制描述一致但有一句结论过宽（N1）；S015 设计各节与代码一致，§3.2 有一处措辞出入（N3）。

### 必验项 4：阻断发现

本轮没有阻断发现。N1–N4 都有当前行为或明确来源作依据，但没有违反验收行的 expected 或明文契约：N1 是提案 §6.2 允许的后台延后，N2 涉及的持久化、路由与界面不在 S015 本单的交付清单里，N3 是文档措辞，N4 是部署说明。

## 阻断发现

无。

## 非阻断建议

编号为本轮编号；引用上一轮时写「上一轮 Nx」。

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | 复盘运行器先于执行器取批时，后台会让出本周期剩下的槽位。复盘运行器在一个周期里第一次 `takeBatch` 就遇到已就绪的实时批次，得到 null 后按 `runBatch()` 的用法不再取；执行器取走实时批次后剩下的槽位，本周期没有人用。E63 S1（1 条实时、8 条后台，上限 4）：单一调用方 `RBBB BBB BB`，复盘先取 `R BBB BBB BB`。S2（每周期 1 条新实时、持续 10 个周期）：单一调用方与执行器先取时后台在第 0–2 周期全部开始，复盘先取时要等实时停止后的第 10–12 周期。随机场景里复盘先取时 3659 个后台任务有 3217 个晚于单一调用方开始；执行器先取时 0 个。实时与付费在两种顺序下都不受影响（P1–P3），提案 §6.2 也允许后台「暂停或延后」，所以不阻断；但直播期间持续有消息时，复盘可能一直拖到下播或证据到期，到期的项按 §5.4 标 UNSETTLED_EXPIRED、不计分。S009 设计 §5「每个周期启动的批次因此与单一调用方的 `takeBatch()` 相同，与哪个调用方先调用无关」只对付费与实时成立。 | E63 S1、S2、P；`coordinator.ts` `takeBatch`；提案 §6.2、§5.4；S009 设计 §5、S011 设计 R10 | 接线 Story（与 Q39、Q52、Q57 同一张）与 S026：每个调度周期先调用执行器的 `pump()`，再调用复盘运行器的 `runBatch()` 直到 null（或在 `pump()` 之后再取一次），并加一个「实时细流加后台积压」的用例，断言后台在剩余槽位里前进。如果接线不能保证顺序，可以改协调器：只取低车道的调用遇到已就绪的高车道时，把这些就绪批次需要的槽位先算作占用，剩余槽位仍可给低车道，这样结果与调用顺序无关。S009 设计 §5 那句改为只对付费与实时成立，并写明后台在复盘先取时会延后；下次改 S009 或 S011 spec 时一并处理 |
| N2 | S015 平台状态的跨操作约束还没有：① 上一次结果为 UNKNOWN 之后，用新的操作标识再执行一次，编排器直接发删除请求，没有先读回（E70 U5）；② 两人同时对同一消息选「拒绝并删除」，共发 2 次请求、计 40 单位（U6；真实平台上第二次多半得到 404，记 FAILED(MESSAGE_NOT_FOUND)，与第一次的 SUCCEEDED 同时显示）；③ 平台状态只交给 `record` 回调，进程在 PENDING 之后中断时，没有任何地方记得这次请求，重启后无从核实；④ `deleteFromPlatform` 的 `local` 结果只带 `seq` 与 `verdictId`，改判路由会显示的 `compensation`、`needsManualAdjustment`、BLOCK 投递的 `deliverySequence` 与 `validUntil` 都没有带出（纠分记录本身仍由 S014 写入）。提案 §7.3 要求「结果未知不盲目重复请求」、界面分别显示两种状态，§16 要求重启后依据持久业务状态恢复。设计 §0 第 4、5 条与 §7 已写明落库、路由与界面不在本包，「不做跨操作的『已删除』去重」。 | E70 U5、U6；`decision-service/platform-delete.ts`（`localBlockOf`、`settle`）；`decision-service/routes.ts` `overturnResponse`；提案 §7.3、§16；S015 设计 §0、§7 | 把 S015 接到路由、页面与持久化的 Story（接线 Story），S026 验证：按事件持久化每条平台记录（同一短事务内比较状态）；新操作开始前读该事件最近的平台状态——PENDING 且未结束时不再发送并显示进行中，UNKNOWN 或重启后遗留的 PENDING 先读回再决定，SUCCEEDED 不再发送；路由返回与改判路由相同的本地字段。验收用例覆盖 U5、U6 两种序列与「PENDING 后重启」 |
| N3 | S015 设计 §3.2 写 `writeGrantScopes`「返回该频道最新一条未撤销的 `PLATFORM_WRITE` 授权的 scope」。S012 的凭据存储里没有单独的 PLATFORM_WRITE 授权：每个频道只有一条 `PLATFORM_OAUTH` 授权记录，带 scope 列表；`PLATFORM_WRITE` 是 `OPERATION_ACCESS` 里的操作名（只要求 `youtube.force-ssl`），适配器另外也接受完整的 `youtube` scope（提案 §7.3 两者都列了）。按 `readGrant(channelId)` 为 ACTIVE 时取 `record.scopes`、否则为空来绑定即可，E70 就是这样绑定的。 | `youtube/credentials.ts`（`readGrant`、`OPERATION_ACCESS`）；S015 设计 §3.2；E70 W1、W2 | 接线 Story 绑定时按上述方式实现；S015 设计 §3.2 下次修改时改措辞 |
| N4 | 删除与 streamList 连接共用一个配额监视器：每次删除在请求前计 20 单位，平台对删除答复 `quotaExceeded` 后监视器记为耗尽，之后的删除与 streamList 连接都被拒，直到 UTC 换日（E70 Q4、Q4b）。这与 YouTube 按 Cloud 项目计日配额一致，代码不需要改；但一批删除会用掉断线重连需要的预算。提案 §3.1 要求部署指引列明每项能力的配额成本。 | E70 Q3、Q4、Q4b；`youtube/quota.ts`；提案 §3.1、§7.3 | S029（部署与配置说明）：写明删除每次 20 单位、与连接共用日预算、配额耗尽后连接同样被拒；是否给重连保留余量由部署配置决定，界面同时显示两者的用量 |

问题清单的状态（主线程 `tasks.md`）：Q27 前半与 Q38 在本候选上成立，可以随 S011 组关单关闭；Q57 的设计登记部分已完成，接线约束保持；Q53 只剩 N1 的 §5 措辞与三份 `tasks.md` 的返工条目。N1–N4 建议登记到问题清单，归属如上表；N1 与 Q57 是同一张接线 Story 的约束，可以合并登记。Q46–Q49、Q51、Q52、Q54–Q56 不变。

## 需 Owner 决定

无。两组都在现有授权（minutes:fd542a49a57a9e6526440dac）内通过；N1–N4 都按已有来源归到后续 Story，不涉及产品方向。

## 下一轮拆分

本轮两组都不需要返工，没有新的返工包。S021 不在本轮，由第 7 批第二部分验收。

## 复验范围

- 关单：STORY-011 组（STORY-011、SUB-021、SUB-022）与 STORY-015 组（STORY-015、SUB-028）可以按本轮证据以 `cb822f0` 链写关单。S011 组三单的 `content.evidence` 里已有前两轮的 22、24、24 行，本轮行以 codeVersion `cb822f0` 追加；S015 组两单的 `content.evidence` 为空。完成候选须用同一字符串。S011 spec 关单前按 Q11 刷新受管段。
- 若主线程改在之后的新候选上关单（例如与 S021 一起合入后），先确认下列路径相对 `cb822f0` 的 diff 为空，再复用本轮证据并重新盖 codeVersion；有改动则重跑对应探针与门禁：
  - S011 组：`apps/server/src/modules/task-coordinator/`、`apps/server/src/modules/moderation-engine/`、`apps/server/src/modules/scoring-engine/`、`apps/server/src/modules/inference-provider/validation/`、`apps/server/src/auth/permissions.ts`、`apps/server/src/db/`（E60 §C、§G 用迁移后的库与 SQLite 计分端口）、对应测试目录、`packages/contracts/`（E60、E61、E62、E63、E30–E34）。
  - S015 组：`apps/server/src/modules/decision-service/`、`apps/server/src/modules/platform-source/youtube/`（含 `credentials.ts`、`quota.ts`、`config.ts`）、`apps/server/src/db/`、`apps/server/src/auth/permissions.ts`、`apps/server/src/security/credential-vault.ts`、对应测试目录与 `test/decision-service/fixtures.ts`、`packages/contracts/`（E70）。
  - S021 计划改 `output-adapter/`；它若改到 `packages/contracts/` 或 `db/`，上面两组的证据都要重跑。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08，自检要与拦截模块同一条命令运行）、check-deps 负面对照（E09）、两份 spec 的 check（E10）、静态核对（E11）。
- 探针、拦截脚本、生成脚本与原始输出的副本在交付目录 `probes/`，复验时可直接复用（见 `probes/README.md`；需要 `apps/server/node_modules/.bin/tsx`、`@voxward/contracts` 软链接，S011 对照需要 `git archive fff691e` 副本）。
