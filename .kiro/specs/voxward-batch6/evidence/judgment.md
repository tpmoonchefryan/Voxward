# 第 6 批判断（S009 第 2 轮复验；S013 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `0b929d3`（`6d395c9` 之上依次合入 `voxward/s009-fix`、`voxward/s013-livestream`，均无冲突）。
- 范围：6 张工单、64 行验收，全部 satisfied，failed 0 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch6/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现，也没有做过上一轮验收；按小轮处理，验收、判断与 lessons 一次完成。

| Story | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-009 | **通过** | 35/35 satisfied（STORY 11、SUB-017 12、SUB-018 12） | 无（B4、B5 已修复） | 第 5b 批的 18 行 failed 在本候选上全部成立 |
| VOXWARD-STORY-013 | **通过** | 29/29 satisfied（STORY 9、SUB-024 10、SUB-025 10） | 无 | Q28、Q20 实测通过；非阻断建议见 N3–N9 |

- rejection 计数：实施包 P-S009 本轮通过（此前 1 次打回，记在 SUB-017 与 SUB-018）；实施包 P-S013 首次验收通过。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（1558/1558）、`pnpm check:deps`（178 个文件 0 违规）通过；默认配置下用 `tools/smoke.sh` 起 `pnpm dev` 与 `node dist/main.js`，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听；全量测试在拦截下对外部主机与本机已有服务 0 次连接，`kiro-cli`、`kirocrew` 0 次调用。
- Spec：S009 为 SPEC_STALE（rev 5，第 5b 批链写所致，含义未变，受管段与 `6d395c9` 逐字相同，属预期）；S013 为 SPEC_CURRENT（rev 4）。设计与代码的不一致见 N4、N5、N9。

## 第 5b 批阻断的复验结论

- **B4：已修复。** `orderGate` 先按频道与车道过滤再比较 `platformOrder`。E30 §5 的 F2 与 PAID 场景改为期望通过后符合；E34 §A 加测：同频道更早的 BACKGROUND 任务排队或运行时，REALTIME 与 PAID 都立即提交；同频道更早的 REALTIME 任务排队或运行时，PAID 立即提交；三个车道内部仍保序、只等到前序截止时间并记 `PREDECESSOR_UNFINISHED`；车道之间夹着别的任务时只等同车道的前序。同一批用例在 `5ce5bee` 上 E34 §A 7 项、E30 §5 2 项不符（acceptance.md §2.1）。
- **B5：已修复。** `reapIdle` 只登记待定取消并在后台发出，不 await；`cancelEvent` 在协调器取消完成后返回。Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限；驱动方逐次 await pump 时 25 次都返回，任务按截止时间转人工；E30 F3 与 E31 改为期望通过后符合。同一批用例在 `5ce5bee` 上 E34 §B 9 项、E30 F3 1 项不符（acceptance.md §2.2）。
- 修法选择的判断：槽位保留到 Crew 接受取消，是第 5b 批 B5「修复方向」列出的做法之一（「槽位保留到取消结束」），取舍理由成立：提前释放会让宿主同时跑的会话超过资源上限，而 VW-R-006 要求并发按宿主资源约束。代价是 Crew 长期不答复取消时可用容量减少，见 N1。

## 必验项 3：第 5b 批 N 组（按实际行为判定）

| 第 5b 批编号 | 结论 | 依据 |
| --- | --- | --- |
| 第 5b 批 N1 | 已修复 | 到期后先到的结果与扫描一样转 PENDING_REVIEW，直接调用与经执行器两种顺序都实测（E30 F1） |
| 第 5b 批 N2 | 已修复，留一处残余 | 已结算任务的正文在堆快照里 0 条残留（8 种结算方式各 50 条），排队中的 50 条都在；调度调用只读未结任务，结算 6 万条后单次调用 1–2 µs（E34 §C、E31、E30 §8）。轻量记录仍增长，见本轮 N2 |
| 第 5b 批 N3 | 已处理（改设计） | 行为不变（E32），设计 §8 写明前序已被扫描时后一条不记缺口 |
| 第 5b 批 N6 | 已处理（文档） | CrewReport、CrewPort 注释与设计 §9 写明 S007 整批校验与 Crew 端清理归 S029 |
| 第 5b 批 N7 | 已修复 | 资源读取抛异常按 CRITICAL 收缩到下限 1（E30 §7） |
| 第 5b 批 N8 | 已处理（改设计） | 设计 §5 改为与代码一致：上限为 1 时后台暂停，上限更高时保留 `limit - reserve` 个后台槽位 |

## 必验项 4：Q28

- 四项要求都实测成立（E40，acceptance.md §3.1）：另一频道的所有者用自己的 state 加主播的授权码，两个频道都得不到授权；verifier 为空时在发请求之前失败，verifier 不对时提供方拒绝；他人账号、同频道房管、无角色账号的失败尝试都不消耗主播的 state，主播随后用同一 state 完成授权；重新授权后旧授权行撤销，旧密文从保险箱删除并清零，旧值不可读，状态探测改用新令牌。修复前的 `6d395c9` 上 15 项不符，其中攻击者频道直接得到授权。
- 「Google 侧旧 token 没有调用撤销接口」：**不需要 Owner 决定，可在现有授权内由 STORY-029 实现。** 理由：
  - 这是凭据生命周期的实现选择，不改产品方向；提案 §16 要求凭据隔离、§3.3 要求部署检查，没有规定重新授权时如何处理提供方侧的旧令牌，Q28 的要求（撤销本地行、删除本地密文）已满足。授权 minutes:fd542a49a57a9e6526440dac 允许普通实现选择自行决定；真实 Google 调用属于真实平台操作，本来就要在 S029 的部署演练里、用 Owner 提供的账号验证。
  - 不能简单地「重新授权就撤销旧令牌」。社区报告 Google 的撤销接口按「客户端 + 用户授权」整体撤销（R2，非官方说明）：同一个 Google 账号重新授权时，撤销旧 refresh token 会让刚拿到的新令牌一起失效，频道会立刻失去授权。S029 实现时应只在新旧授权属于不同 Google 账号时撤销旧令牌（需要能比对账号或频道身份），同账号只删本地副本；显式断开授权已有撤销路由（`routes.revoke`，提供方确认后才标记撤销）。
  - 当前风险有限：旧令牌只在本地删除，提供方侧仍有效；要利用它需要同时拿到旧令牌与部署的 client secret。保险箱持久化以后，备份与 SQLite 空闲页里的旧密文要按 Q30 一并处理。
  - S013 设计 §3、§10 的「待 Owner 决定」应改为「归 S029，按同账号/异账号区分」（N8）。

## 必验项 5：Q20 的残余

- 现象（E41 Q20-2）：分数 100 时升级会员，再被 BLOCK 扣 5 分，当前分 95，而基准 10 加行为 95 是 105；到期后仍是 95。
- **不违反提案 §5.2，不阻断。** 依据：
  - Q20 要修的「上限处升级不加分、到期却扣分」已不再发生：没有其它事件时，升级再到期分数不变、行为分不变（Q20-1），下限处同样不凭空加分（Q20-4）；修复前分别凭空扣 10、加 10。
  - 残余场景的终态与没有会员经历的同一序列相同（100 − 5 = 95）。BLOCK 立即生效是 §5.1 的运行钳制公式与「按实际生效值记账」；身份变化按 §5.2 的建议「把身份基准与行为调整分开记录，再计算最终钳制分数」。两条路径各自按提案原文实现，中间态的差异是两者并存的结果。§5.2 的硬性要求（升级按幂等事件只应用一次、降级与到期有明确语义、不覆盖历史行为分）都成立；账本记录了每一步的 requested 与 actual，可以解释。
  - 还要注意同一机制的另一面（E41 Q20-3）：盈余状态下扣分后，下一次身份变化会把分数重算回 `clamp(基准 + 行为)`。实测从房管降为会员（requested −20）时分数反而 +5（95 → 100），再到期回到 95。终态仍正确，但「降级加分」这一语义没有写进设计，§5.2 要求降级语义明确，所以列为 N6（文档与固定用例）。若 Owner 以后希望上限处的扣分被身份盈余吸收（裁决也按两部分重算），那是产品取舍；现有授权内不需要改。

## 必验项 6：S013 主体与实施方残余

- 主体各项实测成立（E42，acceptance.md §3.3）：按平台消息 ID 去重；初连补发的近期 Super Chat 只投递一次，过时的不投递；缺失的订阅标记不伪造，未知身份按无身份处理；直播结束、配额不足、权限失效、聊天不可用都有明确终止状态；只接受官方 liveChatMessage 条目；模块不导入 db 或供应商 SDK（E09、E33）。
- 「sink 抛异常时消息 ID 已被占用（最多投递一次）、去重存储在进程内」：**不违反验收行。** 各行要求不重复计分、不重复投递、不重播过时卡片，最多一次满足「不重复」；跨进程重启不在任何一行的场景里，设计 §5 已把持久去重写成组合层的接线点。但这两点与提案 §16「重启后依据持久业务状态恢复…避免恢复即重播旧消息」直接相关，接线时必须解决，本轮实测的影响见 N3。

## 阻断发现

无。

## 非阻断建议

编号为本轮编号；引用第 5b 批时写「第 5b 批 Nx」。

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | Crew 调用没有上限时的退化形态：cancel 一直不返回，该批次槽位永久保留；上限为 1（CRITICAL）或全部取消都挂起时，AI 派工停止，新任务只能按截止时间转人工（E34 B3）。start 一直不返回时，每个截止周期都会再发起新的 start，10 个周期后有 20 个未返回的调用，它们持有的作业含正文（E34 B5）；done 不返回时同样保留作业（B6）。start 晚于截止时间才返回时，执行器立即取消，取消被接受前 Crew 侧比上限多 1 个会话（B4）。执行器侧的行为符合设计 §9 写明的取舍，这些都要靠真实绑定给调用设上限。 | E34 §B，设计 §9、§13 | STORY-029：真实 CrewPort 绑定给 start、cancel 设超时并对超时会话做进程级清理；连续超时时把 Crew 标为不可用、停止发起新的 start；演练时实测 Crew 侧会话数与取消后会话是否真的结束 |
| N2 | 结算后的轻量记录（状态、原因、事件键与版本）仍只增不减，约 514 字节/条（正文 56 个字符时）。按每秒 10 条进入 AI 审核估算，每天约 0.4 GB（推算，未做长时间运行实测）。正文已释放，调度调用不受影响。 | E34 §C，设计 §12、§13 | 最迟在 STORY-011 接线或改为持久任务表之前：给已结算记录设保留窗口（长于最大截止时间与补发年龄）后淘汰，或移到持久任务表；STORY-027 的容量测量覆盖长时间运行 |
| N3 | streamList 接入的跨重启与失败语义：① 去重存储在进程内，重启后的初连会把 5 分钟内的消息再投递一次（E42 S2）；计分账本对已生效的条目幂等（S3），但首次没有效果的裁决不留幂等记录（第 3 批 Q19①），重放时带新的 receivedAt，可能得分（S3b：冷却期内的第二条消息在 61 s 后的重放中得 1 分），这违反 VW-S013-R001「历史补发不重复产生业务事实」的本意。② sink 抛异常时 ID 已占用，消息永远不再投递，`runStreamList` 直接拒绝，调用方拿不到状态与游标（S8）。③ 顺序号 `platformOrder` 每次运行从 1 开始，需由调用方传入 `firstOrder` 续接。④ 若已删除观众的消息在补发窗口内，重启后会重新进入流水线（与 N7 相关）。 | E42 S2、S3、S3b、S8；提案 §16、§6.3、§11.3 | 接线 Story（把 PlatformSource 接到审核路由与计分的那一张，问题清单里还没有指定；STORY-026 核心闭环验证）：`MessageIdStore` 绑定 `channel_events_dedupe_uq`，把「占用」与事件落库放进同一个短事务（冲突即 DUPLICATE），这样 sink 失败不会留下占用；`runStreamList` 在 sink 失败时返回带游标的失败状态而不是抛出；`firstOrder` 从持久状态续接；删除后保留消息引用的墓碑，初连补发先应用删除记录（与 STORY-019 对齐）。验收用例：重启后初连补发、冷却期内被挡的消息重放、sink 失败后重发 |
| N4 | Super Chat 的留言没有进入事件正文：解析只读 `textMessageDetails.messageText`；按官方资源，Super Chat 的留言在 `superChatDetails.userComment`，`superChatDetails` 只在 `superChatEvent` 时设置（R1）。按资源形状给出的 Super Chat，ChannelEvent 的 `body` 为空字符串（E42 S7），留言不会被审核或精翻；会员里程碑（`memberMilestoneChatDetails.userComment`）同理。S013 的测试替身给 `superChatEvent` 也塞了 `textMessageDetails`，所以测试发现不了。当前没有接线，没有不安全内容被展示；ChannelEvent 契约也还没有金额、币种等 SC 字段。`textMessageDetails` 是否也会出现在真实的 Super Chat 条目里，本轮没有逐字核对。 | E42 S7、R1，设计 §6「body = 消息文本」 | STORY-010（SC 精翻，要扩展契约以承载 SC 信息）：按类型读取 `superChatDetails.userComment`、`memberMilestoneChatDetails.userComment`，其余类型按 `displayMessage` 处理或明确不进审核；测试改用官方资源形状的条目；最迟在任何 SC 处理接到这些事件之前 |
| N5 | 接入层两处与时间有关的假设：① 补发年龄对每一批、每一条都按本机时钟判定，设计 §5 写的是只在 INITIAL、RESUME 阶段；同一连接里晚到超过 5 分钟的消息被丢弃，服务器时钟比平台快 6 分钟时所有消息都被丢弃，只体现在 staleReplay 计数（E42 S9）。② 平台每批之后都关闭连接时，每次重连只等 1 s（响应会把失败计数清零），由配额门兜底（E42 S6）。 | E42 S6、S9，设计 §5 | 下一次修改 `platform-source/youtube/stream-list.ts` 的 Story，最迟 STORY-029 接真实 streamList 之前：补发年龄只用于连接后的首批，或改用平台时间作参照；STREAMING 阶段出现 staleReplay 时给出可见警告；部署检查加入时钟同步；按真实连接时长决定是否给正常关闭后的重连设下限 |
| N6 | 评分的混合语义没有写进设计：裁决与人工补偿按 §5.1 运行钳制，身份变化按 `clamp(基准 + 行为)` 重算。上限处有身份盈余时先扣分，下一次身份变化会把分数重算回去：降级可能加分（E41 Q20-3：requested −20、actual +5），升级可能多于配置差额。终态与没有身份事件时一致。 | E41 Q20-2、Q20-3，提案 §5.1、§5.2 | 下一次修改 `scoring-engine/` 的 Story：在 S013 设计 §4（或 S005 设计）写明这条语义与例子，加一个固定该行为的用例；STORY-026 验证时覆盖「盈余状态下扣分再降级」 |
| N7 | 身份跟踪器（每个 senderRef 最近一次确定身份，有界、进程内）没有按主体失效的接口，删除请求不会清掉它；删除后同一观众再发言时，跟踪器可能不再发出身份变化，新建的主体缺少会员基准分，直到条目被挤出或重启。进程内的平台消息 ID 同样不在删除索引里。性质同第 2 批 N2（昵称缓存）。 | 代码审查（E33），提案 §11.3 | STORY-019：删除索引覆盖这两个进程内结构，或接线时改用持久状态 |
| N8 | Q28 的提供方侧撤销：判断见「必验项 4」。另有一处小问题：显式断开（`revokeGrant`）在提供方确认后只把行标记为撤销，密文仍留在保险箱，到下一次重新授权才删除。 | E40 Q28-5，`credentials.ts` | STORY-029：按同账号/异账号区分撤销；断开授权后同时删除密文；S013 设计 §3、§10 的「待 Owner 决定」改为「归 S029」 |
| N9 | 文档出入：S013 设计 §5 的状态表与代码命名不一致（FAILED 对应代码的 GAVE_UP；REQUEST_REJECTED、STOPPED、invalidArgument 不在表中；代码没有 CONNECT_OK 事件）。S009 的 `tasks.md` 本地段没有返工条目，S009-SELF、S009-EVID 仍未勾选（证据已提交）。 | acceptance.md §1.1 | 下次修改这两份 spec 时一并改 |

## 需 Owner 决定

无。Q28 的提供方侧撤销在现有授权内由 S029 实现（必验项 4）；Q20 的残余不违反提案，属已授权的实现范围（必验项 5）。只有 Owner 希望「上限处扣分被身份盈余吸收」时，才需要作为产品取舍写进设计；本批不需要。

## 复验范围

- 关单：两组都可以按本轮证据以 `0b929d3` 链写关单。S009 组三单的 `content.evidence` 里有 `5ce5bee` 的一批行（其中 18 行 failed），本轮行以 codeVersion `0b929d3` 追加，完成候选须用同一字符串。
- 若主线程改在更新的候选上关单，先确认下列路径相对 `0b929d3` 的 diff 为空，再复用本轮证据并重新盖 codeVersion；有改动则重跑对应探针与门禁：
  - S009 组：`apps/server/src/modules/task-coordinator/`、`apps/server/test/task-coordinator/`、`apps/server/src/modules/audit-store/`、`packages/contracts/`、`.kiro/specs/voxward-s009-scheduler/design.md`（E30、E31、E32、E34）。
  - S013 组：`apps/server/src/modules/platform-source/`、`apps/server/src/security/credential-vault.ts`、`apps/server/src/modules/scoring-engine/`、`apps/server/src/db/`、`apps/server/test/platform-source/`、`apps/server/test/scoring-engine/`、`packages/contracts/`、`.kiro/specs/voxward-s013-livestream/design.md`（E40、E41、E42）。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、拦截下的全量测试（E08）、两份 spec 的 check（E10）。
- 问题清单：N1–N9 建议登记到主线程 `tasks.md` 的问题清单，归属如上表。
- 探针、替身、拦截脚本、生成脚本与原始输出的副本在交付目录 `probes/`，复验时可直接复用（见 `probes/README.md`）。
