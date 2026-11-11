// Row outcomes and evidence text for batch 6 (candidate 0b929d3). Read by build-out.mjs.
// One entry per live acceptance row (E01). The same text goes into acceptance.md and evidence-records.json.

const GATES =
  "候选 0b929d3 检出：install --frozen-lockfile、build、typecheck、test（106 个文件 1558 项）、check:deps（178 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。";

// ---------------------------------------------------------------- S009 group
const S009_BARRIER =
  "无全局无限屏障：Crew 的 cancel、start、done 分别永不结束时，pump 与 cancelEvent 都在 1 s 计时内返回，其它频道照常派工并提交，替身记录的同时打开会话数不超过上限（E34 B1–B7、E30 F3、E31；第 5b 批 B5 已修复）";
const S009_GATE =
  "保序门控只等同频道同车道的前序，且只等到前序截止时间，同频道更早的后台任务不论排队还是运行都不挡实时与付费，付费也不被同频道实时挡（E30 §5、E34 A1–A10；B4 已修复）";
const S009_TIMEOUT =
  "超时不默认放行或扣分：排队或运行中的任务到期都转 PENDING_REVIEW（DEADLINE_EXCEEDED），扫描与结果谁先到都一样（E30 F1 两例；第 5b 批 N1 已修复），重试耗尽、不可重试错误、提交异常都转人工，事实端口 apply 0 次（E30 §2–§4）";
const S009_STALE =
  "过期任务不恢复为有效输出：到期、取消、代次变化、版本被人工裁决替代、已结算、重启后未知任务的结果都被丢弃，不写裁决、不写证据（E30 §4、§7）";
const S009_RESIDUAL =
  "残余：Crew 一直不接受取消时该批次的槽位一直保留，全部取消都挂起时派工在占满上限后停止，新任务到截止时间转人工（E34 B3）；有界取消归 S029 的真实绑定（judgment N1）。";
const S009_CONTROL = "同一批用例在上一候选 5ce5bee 上 E30 有 7 项、E34 有 17 项不符。";

const S009_AC001 = `${GATES}task-coordinator 的 8 个测试文件 104 项通过（E05）。实测只用进程内替身（E30–E32、E34）：无无限积压：每个车道排队有上限，满了转人工 QUEUE_FULL，单条正文超过批字节上限转人工 INPUT_TOO_LARGE（E30 §1）。${S009_BARRIER}；${S009_GATE}。${S009_TIMEOUT}。${S009_STALE}。${S009_CONTROL}${S009_RESIDUAL}`;

const S009_PARENT = (part) =>
  `复用 VW-S009-AC001 在 0b929d3 上的同次执行（E02–E08、E30–E34）。无无限积压、无全局无限屏障、超时不默认放行或扣分、过期任务不恢复为有效输出四项都成立；第 5b 批的 B4、B5 与 N1 在本候选上不再复现（E30、E34 各 0 项不符；对照 5ce5bee 分别 7 项、17 项不符）。${part}`;

const S009_I001 =
  "审查：task-coordinator 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E33）；check:deps 178 个文件 0 违规（E06），副本中给 task-coordinator 加入导入 db 与 @anthropic-ai/sdk 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。自 6d395c9 起契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json、锁文件与 scripts/ 都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。";

const S009_I005 =
  "对照交付边界：返工只改 task-coordinator 模块文件、测试与 S009 设计（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；同频道更早的后台任务不论排队还是运行，都不再挡实时与付费结果的提交（E30 §5 F2、E34 A1–A4；B4 已修复）。提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。完整判据由 INIT 的 VW-AC-005 承载。";

const S009_I006 = (tail) =>
  `VW-R-006 中本单触及的各项成立：微批、大小、容量和等待均有界（E30 §1–§2）；按宿主资源动态约束，资源读取抛异常时按 CRITICAL 收缩到下限（E30 §6–§7；第 5b 批 N7 已修复）；付费优先、复盘让出实时容量：门控只比较同频道同车道的前序，同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 与 PAID，PAID 不被同频道 REALTIME 挡（E30 §5 F2 与 PAID 场景、E34 A1–A6）；有限保序：同车道内仍保序，只等到前序截止时间并记 PREDECESSOR_UNFINISHED（E34 A7–A10，三个车道各一组）；删除优先失效旧任务（E30 §4）。共享的前半句也成立：${S009_BARRIER}。上一候选 5ce5bee 上 A1–A6、A10 与 B1–B3 都不符（E34 对照）。${tail}`;

const S009_I008 =
  "对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。第 5b 批 N6 已写进契约注释与设计 §9：completed 报告须先经 S007 的整批校验（VW-R-008），由 S029 的真实绑定实现与验证，本包未验证。完整判据由 INIT 的 VW-AC-008 承载。";

const S009_I009 =
  "审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。任务结算时释放正文：完成、取消（排队与运行）、提交时被判过期、失败、到期、晚到与入队被拒共 8 种结算方式各 50 条，强制 GC 后的堆快照里 0 条正文残留，仍在排队的 50 条都在（E34 §C；同一检查在 5ce5bee 上 400 条全部残留；第 5b 批 N2 已修复）。证据只在提交成功时写入技术日志，80153 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。残余：Crew 的 start 或 done 一直不返回时，执行器为该会话保留作业（含正文）直到 Crew 应答（E34 B5、B6，judgment N1）。Crew 端内容残留的清理由 S029 的真实绑定承担（契约注释已写明），本包未验证。";

const S009_I010 = (tail) =>
  `VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。共享的前半句成立：Crew 的 cancel 不返回时 pump、之后的 pump 与执行器的 cancelEvent 都返回，其它频道照常派工，到期任务照常转人工（E30 F3、E31、E34 B1–B3；B5 已修复）；start、done 不返回时同样（E34 B4–B6）。真实 Kiro Crew 未验证（S029）。${tail}`;

const S009_I011 = (tail) =>
  `VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后不再保留正文（E34 §C），调度调用只读未结任务：结算 6 万条后单次 commit、sweep、takeBatch 为 1、0、2 µs（E31；第 5b 批为 2433、633、2031 µs），8 万条时 takeBatch 22 µs（E30 §8；5ce5bee 3416 µs）。共享的前半句「无全局无限屏障」成立（E34 §B、E31；B5 已修复）。真实数据库版事实端口不在本包，事务原子性只在替身上验证。${tail}`;

const S009_I012 =
  "审查：返工不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。";

const S009_I017 = (tail) =>
  `VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。删除流程不再卡在执行器：Crew 的 cancel 不返回时，执行器的 cancelEvent 在协调器取消完成后返回，任务为 DISCARDED（CANCELLED），被取消任务写入 0 次（E34 B2、E31；B5 已修复）；被取消任务的正文随结算释放（E34 §C）。共享的前半句「无全局无限屏障」成立（E34 §B）。${tail}`;

// ---------------------------------------------------------------- S013 group
const S013_TESTS =
  "platform-source 相关测试：youtube-credentials 50 项、youtube-stream 42 项、youtube-identity 20 项，保险箱删除 3 项，身份计分路径 17 项（E05）。";
const S013_RESTART =
  "范围说明：进程重启后默认的进程内去重存储为空，2 分钟前的消息会再次投递（E42 S2）；计分账本对已生效的条目幂等（E42 S3），首次没有效果的条目会在重放时生效（E42 S3b）；设计 §5 把跨重启去重定为组合层绑定 channel_events_dedupe_uq，本包不接线，这一场景依赖接线，未验证（judgment N3）。";

const S013_AC001 = `${GATES}${S013_TESTS}实测只用替身（E40–E42），没有连接真实 YouTube 或 Google。不重复计分/投递：按平台消息 ID 去重，同批重复帧与重连后的补发只投递一次（sc1、t1、t2、t3 各一次，重复 4 次，游标按 null、tok-1、tok-2 续接）；初连时平台补发的 2 分钟前的 Super Chat 投递一次，同一去重存储下再次初连不再投递（E42 S1–S2）。不重播过时卡片：发布时间早于补发年龄 5 分钟的 Super Chat 不投递，计为 staleReplay（E42 S2）。缺失订阅标记不伪造：身份只来自 isChatOwner、isChatModerator、isChatSponsor、isVerified 四个布尔字段，订阅固定为 NOT_PROVIDED，字段缺失或不是布尔值时为不确定的 UNKNOWN，不产生降级；未知身份按无身份处理（E42 S4）。只接受官方上游来源：只有 kind 为 youtube#liveChatMessage 且有 id、publishedAt、authorDetails.channelId 的条目通过，其余 5 种丢弃并计数；模块不导入 db 或供应商 SDK，不直接联网（E42 S6、E09、E33）。直播结束、配额不足、权限失效、聊天不可用都有明确的终止状态（E42 S5）。Q28 与 Q20 也在本候选上实测通过（E40、E41）。真实 streamList 接入按方法标为未验证：没有凭据，简报也不允许连接真实 YouTube。${S013_RESTART}另有三处发现不改变本行判定：Super Chat 的留言没有进入事件正文（judgment N4）、补发年龄按本机时钟作用于全部批次（N5）、sink 抛异常时消息最多投递一次（N3）。`;

const S013_PARENT = (part) =>
  `复用 VW-S013-AC001 在 0b929d3 上的同次执行（E02–E08、E40–E42）。不重复计分/投递或重播过时卡片、缺失订阅标记不伪造、只接受官方上游来源三项在模块层成立；跨进程重启的去重依赖组合层接线，未验证（judgment N3）；真实接入未验证。S013 的贡献是 streamList 接入（连接、恢复、结束、平台消息 ID 去重、补发年龄、退避、配额门）、身份能力映射、配额监测、版本化业务事件，以及 Q28、Q20 两项修复。${part}`;

const S013_I001 = (tail) =>
  `审查：platform-source 只导入 @voxward/contracts 与本模块文件；新文件没有 require、动态导入、node: 模块、fetch 或子进程，散列与随机数用全局 crypto（E33）；check:deps 178 个文件 0 违规（E06），副本中给 platform-source/youtube 加入导入 db 与 googleapis 的临时文件时报 2 处违规并退出 1，删除后恢复（E09）。契约包（CONTRACT_VERSION 仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件没有改动（E33）；streamList 只经端口 StreamListTransport 进入，模块向流水线输出版本化 ChannelEvent，不带平台原始响应或平台作者 ID（E42 S7）。OAuth 路由仍未挂载。远端部署本单未触及。${tail}`;

const S013_I002 = (tail) =>
  `VW-R-002 中本单触及的部分成立：输入只来自 streamList 端口，去重、重连补发、结束、配额都有实测（E42 S1–S2、S5）；凭据或权限失效由传输层映射为 forbidden，进入 PERMISSION_LOST，不再重连（E42 S5），401 等答复到 forbidden 的映射在尚未实现的传输适配器里，未验证；API key 与 OAuth 的能力区分沿用 S012 的操作表，本包的传输端口不区分。身份按平台字段映射并保留来源字段名，unknown 不冒充订阅关系（E42 S4、S7）。真实接入按方法未验证。跨进程重启的补发依赖组合层绑定持久去重（judgment N3）。${tail}`;

const S013_I007 =
  "对照交付边界：本包新增 platform-source/youtube 下的接入、身份、配额与业务事件文件，修改 OAuth 三个文件与保险箱（Q28），以及 scoring-engine 的身份路径与 db/scoring-ledger.ts 的落库条件（Q20）（E33）。Q20 只改身份路径：裁决计分与人工补偿仍按提案 §5.1 的运行钳制，engine.ts、compensation.ts 未改（E33、E41）。VW-R-007 的人工裁决、晚到覆盖与重复结算由其它 Story 实现；本包提供的平台消息 ID 去重与身份事件的 youtube:<消息ID> 幂等来源，使同一平台消息在一个进程内只投递一次、计分端只结算一次（E42 S1、S3、S7）。「拒绝并从平台删除」本单未触及。完整判据由 INIT 的 VW-AC-007 承载。";

const S013_I009 =
  "审查：本包不调用 AI，不创建会话、提示或工具轨迹。进入流水线的事件只带正文、内部频道 ID、平台消息 ID、顺序号与组合层派生的 senderRef，不带平台作者 ID、显示名或原始响应（E42 S7）。进程内只保留平台消息 ID（有界，默认 10 000）、每个 senderRef 最近一次确定身份（有界）和 10 分钟内有效的授权 state 与 PKCE verifier（E33、E40）。";

const S013_I011 =
  "审查与实测：Q20 的落库改动仍在 commitInTransaction 的短事务内：身份基准分在上限处变化、当前分不变时也写分数行与账本行，在迁移后的真实 SQLite 上实测（E41）。接入层不写数据库，不建队列，不复制正文：消息经 sink 立即交给组合层，去重存储只记平台消息 ID（E33、E42）。浏览器与 AI 不直写。跨重启去重绑定 channel_events_dedupe_uq（schema 已有该唯一索引）由组合层实现，本包未接线。";

const S013_I012 =
  "审查与实测：OAuth 开始与查看状态只允许频道所有者；回调的 state 绑定发起账号与频道，他人账号、同频道房管、无角色账号用主播的 state 回调都返回 400 且不消耗 state（E40 Q28-4）；授权码绑定 S256 PKCE，verifier 只在服务端、只随兑换请求发送，不出现在 URL 或响应里（E40 Q28-1）；他人 state 加主播授权码、缺失或错误的 verifier 都不产生授权（E40 Q28-2、Q28-3）；保险箱删除按用途校验，用途不符时拒绝并保留（E40 Q28-5）。配置错误只报键名（YouTubeConfigError）。消息正文作为不可信数据进入事件，不作为指令。输出凭据本单未触及。";

const S013_I017 =
  "审查本单涉及的数据与恢复：失败与结束状态都有明确去向：ENDED、CHAT_UNAVAILABLE、PERMISSION_LOST、QUOTA_EXHAUSTED、REQUEST_REJECTED、GAVE_UP 为运行结果的终止状态，过时补发计为 staleReplay，配额状态可查询（E42 S5）；重新授权后旧授权行撤销，旧密文从保险箱删除并清零，旧值不可读（E40 Q28-5）。本单新增的进程内数据：平台消息 ID（有界）、每个 senderRef 最近一次确定身份（有界）、10 分钟内有效的授权 state；都随进程结束消失，不落盘、不进日志。删除请求目前不会清掉身份缓存里对应的 senderRef；进程重启后平台补发的 5 分钟内消息会再次投递，若含已删除观众的消息，接线后会重新进入流水线。设计没有写明这两点与删除流程的关系（judgment N3、N7，交 STORY-019 与接线 Story）。删除编排本单未触及，没有实测删除路径。";

const SUB024_AC001 = `${GATES}youtube-stream 测试 42 项通过（E05）。SUB-024 承担的接入部分成立（E42 S1、S2、S5、S6，替身传输）：不重复计分/投递：按平台消息 ID 先占用后处理，同批重复帧与重连补发都只投递一次，断开后从最后的 nextPageToken 续接，pageTokenInvalid 时清空游标重建并依靠去重；初连时 2 分钟前的 Super Chat 投递一次，再次初连不再投递。不重播过时卡片：发布时间早于 5 分钟的补发不投递。只接受官方上游来源：只有带 id、publishedAt、authorDetails.channelId 的 youtube#liveChatMessage 条目通过，其余丢弃并计数；模块不直接联网，只经 StreamListTransport。不出现无条件高频轮询：不使用 list 轮询，只在连接结束后重连，间隔 1 s 起翻倍到 60 s，限流答复至少 30 s，连续 8 次失败进入 GAVE_UP；每次连接先过配额门。直播结束（offlineAt 或 liveChatEnded）进入 ENDED，不再连接。真实 streamList 接入按方法标为未验证。${S013_RESTART}另有两处观察不改变本行判定：平台每批之后都关闭连接时重连间隔为 1 s，由配额门兜底（E42 S6）；补发年龄按本机时钟作用于全部批次（E42 S9，judgment N5）。`;

const SUB025_AC001 = `${GATES}youtube-identity 测试 20 项通过（E05）。缺失订阅标记不伪造：YouTube 不提供订阅字段，subscription 固定为 NOT_PROVIDED，IdentityKind 没有订阅者一类；身份按 CHANNEL_OWNER、MODERATOR、PAID_MEMBER、VERIFIED_ACCOUNT 的顺序取第一个为 true 的布尔字段，并记下来源字段；字段缺失或不是布尔值时为不确定的 UNKNOWN，不产生身份变化，四个字段都明确为 false 时才是确定的 UNKNOWN（E42 S4）。配额不足可见：每次连接计 5 单位，预算不够下一次连接时不连接并进入 QUOTA_EXHAUSTED；平台答复 quotaExceeded 时监测器立即为 EXHAUSTED，快照可查；用量达 80% 为 WARNING（E42 S5）。进入流水线的是版本化业务事件：输出 {contractVersion, kind: CHANNEL_MESSAGE, event, identity}，event 的键与 ChannelEvent 契约一致，发送者是组合层派生的 senderRef，序列化结果里没有平台作者 ID、snippet、authorDetails 或 etag；身份变化以 youtube:<消息ID> 为幂等来源（E42 S7）。真实接入记录按方法未补：没有凭据。发现：按官方资源形状给出的 Super Chat 事件正文为空字符串，留言没有进入流水线（E42 S7、R1，judgment N4）；本行 expected 不涉及正文内容，不改变判定。`;

export const ROWS = {
  // STORY-009
  "VW-S009-AC001": ["satisfied", S009_AC001],
  "VW-S009-PARENT": ["satisfied", S009_PARENT("S009 的贡献是 TaskCoordinator 的有界调度、截止时间、有限重试、代次与提交确认、动态并发和 Crew 执行器。")],
  "VW-S009-INHERIT-001": ["satisfied", S009_I001],
  "VW-S009-INHERIT-005": ["satisfied", S009_I005],
  "VW-S009-INHERIT-006": ["satisfied", S009_I006("")],
  "VW-S009-INHERIT-008": ["satisfied", S009_I008],
  "VW-S009-INHERIT-009": ["satisfied", S009_I009],
  "VW-S009-INHERIT-010": ["satisfied", S009_I010("")],
  "VW-S009-INHERIT-011": ["satisfied", S009_I011("")],
  "VW-S009-INHERIT-012": ["satisfied", S009_I012],
  "VW-S009-INHERIT-017": ["satisfied", S009_I017("")],
  // SUB-017
  "VW-SUB017-AC001": ["satisfied", `${GATES}SUB-017 承担的协调器部分成立（task-coordinator 测试 104 项通过，E05；E30 §1–§5、E34 §A、§C）：无无限积压，各车道排队有上限（默认 PAID 50、REALTIME 200、BACKGROUND 500；上限 3 时 10 条入队 3 条排队、7 条转人工 QUEUE_FULL），单条超过 8192 字节转人工；无全局无限屏障：${S009_GATE}，跨频道、跨车道都不等待（E34 A11）；${S009_TIMEOUT}；${S009_STALE}。结算后释放正文，未结任务按车道与频道建索引，调度调用不再遍历历史（E34 §C、E31；第 5b 批 N2 已修复）。残余：结算后的轻量记录仍随累计任务数增长，约 514 字节/条（E34 §C，judgment N2）。`],
  "VW-SUB017-STORY": ["satisfied", "复用 VW-SUB017-AC001 的同次执行（E05、E30–E34）。SUB-017 承担的「微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序」都成立：微批四种取批条件、后台余量、有限重试退避、取消与代次（E30 §1–§5）；付费优先与按车道有限保序在提交环节成立（E30 §5、E34 A1–A10；B4 已修复）。本行只证明 SUB-017 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 satisfied。"],
  "VW-SUB017-PARENT": ["satisfied", S009_PARENT("SUB-017 承担的协调器部分见 VW-SUB017-AC001。")],
  "VW-SUB017-INHERIT-001": ["satisfied", `${S009_I001}本单交付的是协调器部分（coordinator.ts、ordering.ts 及纯函数文件）。`],
  "VW-SUB017-INHERIT-005": ["satisfied", S009_I005],
  "VW-SUB017-INHERIT-006": ["satisfied", S009_I006("B4 的修复在本单的 ordering.ts 与 coordinator.ts。")],
  "VW-SUB017-INHERIT-008": ["satisfied", S009_I008],
  "VW-SUB017-INHERIT-009": ["satisfied", S009_I009],
  "VW-SUB017-INHERIT-010": ["satisfied", S009_I010("按候选整体判定；本单的协调器部分不涉及 Crew 调用。")],
  "VW-SUB017-INHERIT-011": ["satisfied", S009_I011("按候选整体判定；事务提交与未结任务索引在本单的 coordinator.ts。")],
  "VW-SUB017-INHERIT-012": ["satisfied", S009_I012],
  "VW-SUB017-INHERIT-017": ["satisfied", S009_I017("按候选整体判定；本单的取消与代次部分成立。")],
  // SUB-018
  "VW-SUB018-AC001": ["satisfied", "并发随资源收缩且不突破上限成立：createDynamicConcurrency({min 1, max 4}) 对 NORMAL、两种 TIGHT、两种 CRITICAL、三种不可用读数、恢复 NORMAL 依次给出 4、2、2、1、1、1、1、1、4，资源读取抛异常时为 1（E30 §6–§7；第 5b 批 N7 已修复）；经执行器实测每次启动时打开的会话数都小于当时读到的上限，随机 400 步从未超过上限 6（E30 §6）；cancel、start、done 分别挂起的 7 组场景中，替身记录的同时打开会话数都不超过上限（E34 B1–B7）。唯一的例外是 start 晚于任务截止时间才返回：执行器在它返回时立即发起取消，取消被接受之前 Crew 侧比上限多 1 个（E34 B4；设计 §9 已写明，5ce5bee 行为相同）。Crew 不可用时任务明确失败而非默认放行：拒绝作业、会话中途失联转人工 CREW_UNAVAILABLE；cancel、start、done 不返回时 pump 与 cancelEvent 按时返回，任务到截止时间转人工（E30 §7、E34 B1–B7、E31；B5 已修复）。Crew 会话状态不作为业务最终裁决：completed 但缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，裁决只来自条目并经事实端口写入（E30 §7）。固定版本的真实 Crew 实测按方法标为未验证：简报不允许连接真实 Crew，本轮只用进程内替身（E08）。残余见 judgment N1。"],
  "VW-SUB018-STORY": ["satisfied", "复用 VW-SUB018-AC001 的同次执行（E30–E34）。SUB-018 承担的「TaskCoordinator/Crew 适配」中，动态并发的上下限与随资源收缩、会话状态不作为裁决、Crew 拒绝与失联时明确失败成立；Crew 的 cancel、start、done 不返回时执行器不再停止派工（B5 已修复，E34 §B）。固定版本真实 Crew 实测按方法未验证。本行只证明 SUB-018 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 satisfied。"],
  "VW-SUB018-PARENT": ["satisfied", S009_PARENT("Crew 的 cancel 不返回时 pump 与 cancelEvent 按时返回，其它频道照常派工（E30 F3、E31、E34 B1–B3）。SUB-018 承担的动态并发与 Crew 执行器部分见 VW-SUB018-AC001。")],
  "VW-SUB018-INHERIT-001": ["satisfied", `${S009_I001}本单交付的是 crew/adapter.ts 与 crew/capacity.ts。`],
  "VW-SUB018-INHERIT-005": ["satisfied", S009_I005],
  "VW-SUB018-INHERIT-006": ["satisfied", S009_I006("本单承担的「按宿主资源动态约束」与 B5 的修复在 crew/capacity.ts、crew/adapter.ts。")],
  "VW-SUB018-INHERIT-008": ["satisfied", S009_I008],
  "VW-SUB018-INHERIT-009": ["satisfied", S009_I009],
  "VW-SUB018-INHERIT-010": ["satisfied", S009_I010("B5 的修复在本单的 crew/adapter.ts。")],
  "VW-SUB018-INHERIT-011": ["satisfied", S009_I011("B5 的修复在本单的 crew/adapter.ts。")],
  "VW-SUB018-INHERIT-012": ["satisfied", S009_I012],
  "VW-SUB018-INHERIT-017": ["satisfied", S009_I017("B5 的修复在本单的 crew/adapter.ts。")],
  // STORY-013
  "VW-S013-AC001": ["satisfied", S013_AC001],
  "VW-S013-PARENT": ["satisfied", S013_PARENT("")],
  "VW-S013-INHERIT-001": ["satisfied", S013_I001("")],
  "VW-S013-INHERIT-002": ["satisfied", S013_I002("")],
  "VW-S013-INHERIT-007": ["satisfied", S013_I007],
  "VW-S013-INHERIT-009": ["satisfied", S013_I009],
  "VW-S013-INHERIT-011": ["satisfied", S013_I011],
  "VW-S013-INHERIT-012": ["satisfied", S013_I012],
  "VW-S013-INHERIT-017": ["satisfied", S013_I017],
  // SUB-024
  "VW-SUB024-AC001": ["satisfied", SUB024_AC001],
  "VW-SUB024-STORY": ["satisfied", "复用 VW-SUB024-AC001 的同次执行（E05、E42）。SUB-024 承担的「streamList 连接/恢复/结束；平台 ID 去重与补发年龄；不无条件高频轮询」成立；跨进程重启的去重依赖组合层接线（judgment N3）。本行只证明 SUB-024 承担的部分；VOXWARD-STORY-013 的完整判据 VW-S013-AC001 另行判定为 satisfied。"],
  "VW-SUB024-PARENT": ["satisfied", S013_PARENT("SUB-024 承担的接入部分见 VW-SUB024-AC001。")],
  "VW-SUB024-INHERIT-001": ["satisfied", S013_I001("本单交付的是 stream-list.ts、dedup.ts、replay-age.ts 与 config.ts（config.ts 偏离交付清单，已在设计 §2 记录）。")],
  "VW-SUB024-INHERIT-002": ["satisfied", S013_I002("本单承担连接、恢复、结束、去重与补发年龄。")],
  "VW-SUB024-INHERIT-007": ["satisfied", S013_I007],
  "VW-SUB024-INHERIT-009": ["satisfied", S013_I009],
  "VW-SUB024-INHERIT-011": ["satisfied", S013_I011],
  "VW-SUB024-INHERIT-012": ["satisfied", S013_I012],
  "VW-SUB024-INHERIT-017": ["satisfied", S013_I017],
  // SUB-025
  "VW-SUB025-AC001": ["satisfied", SUB025_AC001],
  "VW-SUB025-STORY": ["satisfied", "复用 VW-SUB025-AC001 的同次执行（E05、E42）。SUB-025 承担的「能力来源/unknown；配额监控」成立，官方消息以版本化业务事件交给组合层；Super Chat 留言的映射见 judgment N4。本行只证明 SUB-025 承担的部分；VOXWARD-STORY-013 的完整判据 VW-S013-AC001 另行判定为 satisfied。"],
  "VW-SUB025-PARENT": ["satisfied", S013_PARENT("SUB-025 承担的身份、配额与业务事件部分见 VW-SUB025-AC001。")],
  "VW-SUB025-INHERIT-001": ["satisfied", S013_I001("本单交付的是 identity.ts、quota.ts 与 to-business-event.ts。")],
  "VW-SUB025-INHERIT-002": ["satisfied", S013_I002("本单承担身份映射与配额。")],
  "VW-SUB025-INHERIT-007": ["satisfied", S013_I007],
  "VW-SUB025-INHERIT-009": ["satisfied", S013_I009],
  "VW-SUB025-INHERIT-011": ["satisfied", S013_I011],
  "VW-SUB025-INHERIT-012": ["satisfied", S013_I012],
  "VW-SUB025-INHERIT-017": ["satisfied", S013_I017],
};
