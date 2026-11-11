// Per-row outcome and evidence text for batch 5b. Keys are the live acceptance ids.
const GATES =
  "候选 5ce5bee 检出：install --frozen-lockfile、build、typecheck、test（97 个文件 1458 项）、check:deps（171 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。";

// ---------------- S006 ----------------
const S006_ROUTE =
  `${GATES}相对上一候选 b1a1471，路由、真值表、例外队列、处理状态与计分代码没有改动，本轮只改了 rules/normalize.ts（E33）。` +
  "原样复跑第 5a 批 E20 探针（66/66）：真值表 96 种组合（基础 PASS/REVIEW/BLOCK × 例外 × 付费 × 白名单 × 噪声 × 达到阈值）与按提案 §4.2 流程图建立的期望 96/96 一致；快速放行从不出现在例外、付费或基础未通过的组合；评分达阈值者标 UNSETTLED_FAST_PASS，白名单与噪声标 NONE。" +
  "路由器接真实基础检查与真实计分引擎：例外消息在基础检查之前已登记；例外加基础 BLOCK 直接终结，队列项 BASE_BLOCK，计分 REFUSED；例外加噪声、白名单、分数 99 仍为 REVIEW；例外加付费为 REALTIME_REVIEW，模型完成后下游 ALLOW、计分 REFUSED、账本 0 行；普通付费文本在白名单、分数 99 时仍进入 PAID_TEXT_REVIEW；噪声、白名单、高分三种快速放行下发 ALLOW 且账本调用 0 次，分数 9 进入审核；系统失败不产生裁决、不计分，可 RETRY 与 ESCALATE；人工接管后模型完成被拒（PROCESSING_TRANSITION_INVALID），人工 BLOCK 记 −5；丢弃以 DISCARDED 结算队列项（E20 §3–4；router.test 15 项、states.test 19 项、exception-queue.test 6 项、truth-table.test 106 项）。" +
  "噪声判定改读带浊点的副本：ﾊﾞﾊﾟﾊ 不再被当成 ハハハ 判为 NOISE，ｗｗｗ、草草草、８８８、😂😂😂 仍为 NOISE（E23）。下游只有 ALLOW 或 BLOCK，未决项 downstream 为 null。";

const S006_PARENT =
  "复用 VW-S006-AC001 在 5ce5bee 上的同次执行（E02–E08、E20、E23）。例外每条登记、基础拒绝可终结、其余进入 AI/人工、快速放行不预先加分、下游只有 ALLOW/BLOCK 均成立；例外 ∧ 付费 的分支顺序与提案 §4 流程图一致（96/96）。S006 的贡献是统一路由真值表、例外队列、处理状态与 Q22 计分接线，本轮未改。";

const S006_INHERIT_001 =
  "候选 5ce5bee 审查：b1a1471..5ce5bee 中 S006 返工只改 moderation-engine/rules/normalize.ts 与测试；没有改 package.json、锁文件、check-deps 分区或契约（E33），模块只导入 @voxward/contracts 与本模块文件（check:deps 171 个文件 0 违规，E06）；CONTRACT_VERSION 仍为 1。归一化只用 String.prototype.normalize 与 Unicode 属性正则，不调用外部服务或语言库。HTTPS/WSS 远端部署本单未触及。";

const S006_INHERIT_003 =
  "路由部分成立，同 VW-S006-AC001（E20）。B3 复验：第 5a 批 E20 与 E21 的全部输入在 5ce5bee 上符合期望（E20 66/66，E21 10/10）：归一化规则 バカ、ブス、デブ、ハゲ、ポンコツ 对半角 ﾊﾞｶ、ﾌﾞｽ、ﾃﾞﾌﾞ、ﾊｹﾞ、ﾎﾟﾝｺﾂ 为 BLOCK，正则 バカ 对 ﾊﾞｶ 为 BLOCK，归一化 バカ 对 ハ゛カ 为 BLOCK，归一化 ばか 对 U+200B、U+2060、U+00AD 夹在假名与浊点之间的写法为 BLOCK；ハカ 不命中 ﾊﾞｶ；扣分规则 カス 对「ｶﾞｽ代が高い」为 PASS、不扣分；转写表 {ガ: ga, カ: ka} 把 ｶﾞｶ 读作 gaka 且标为完整。" +
  "E22 用真实检查器逐条断言路由与原文区间（185 项，0 不符）：五个词各 15 种写法（半角、独立浊点、组合浊点或半角浊点前夹 U+200B、U+2060、U+00AD、U+FEFF、U+200D，归一化与正则）全部 BLOCK，区间只覆盖该词；对应的无浊点规则（ハカ、フス、テフ、ハケ、ホンコツ）对这些写法全部 PASS；第 4 批 B1 的 15 个对照输入路由与区间不变；新组合 12 类 69 例（全角半角混排、ﾊﾟ 与 ハ゜、多个格式字符连写与 bidi 控制符、组合标记加变体选择符 U+FE0F/U+FE0E/U+E0100 与 CGJ、拉丁重音加零宽字符、被格式字符隔开的韩文字母、越南语叠加声调、ヴ 与长音符、补充平面偏移与重复命中、昵称与正文组合范围、读音 ｶﾞｶ 与 ﾊﾟﾊ、关闭 stripCombiningMarks）既没有漏拦也没有误伤。" +
  "逐单元副本与整段归一化参照在 20 万个随机串、两种选项下 40 万次比较 0 处不同；3000 条随机嵌入写法的命中区间全部恰好落在该写法上；设计 4.11 例子表 14 行全部复现（E22、E24）。同一批有期望的用例在 b1a1471 上 140 处路由不符，说明这些用例能检出 B3。" +
  "剩余观察：谚文填充字符 U+3164、U+FFA0、U+115F、U+1160 夹在字母之间时三个版本都不命中（judgment N4，不属 B3 同类）。expected 与 VW-R-003 的原始要求在 5ce5bee 上成立。B3 的修改在提交 95b7997（VOXWARD-SUB-012）。";

const S006_INHERIT_004 =
  "VW-R-004 中本单触及的部分成立（E20 §4；scoring-engine 自 b1a1471 未改，E33）：Q22 让 BLOCK 携带命中的扣分组，两组扣分 9 与 2、违规分 5 时记 −9；人工完成的 BLOCK 记 −5；noise 与三种快速放行不调用计分；系统失败不计分。第 5a 批记下的误扣已消失：扣分规则 カス 对半角「ｶﾞｽ代が高い」与「ｶ + U+200B + U+3099 + ス代」为 PASS、扣分 0，「カスタード」仍按规则命中并扣 5（E21、E22 §1r）。";

const S006_INHERIT_005 =
  "VW-R-005 中本单触及的部分成立：UNSETTLED_FAST_PASS 只标在评分达阈值的普通消息上，白名单与噪声短路不标；例外主体从不快速放行，不会成为复盘对象（E20 §3–4）。Q8：持久表 subject_nickname_checks 不存在；apps/server/src/db 与数据字典自 b1a1471 未改（E33），第 5a 批迁移实测 E60 的结论仍适用；昵称检查保留 S004 的进程内缓存。复盘结算、跨条别名与候选词确认本单未触及，由 STORY-011 承接。";

const S006_INHERIT_009 =
  "审查：路由与基础检查不构造 AI 输入，不保存会话、提示或工具轨迹；例外队列项只含（channelId, platformMessageId）键、correlationId 与结算结果，不含正文（routing/ 自 b1a1471 未改，E33）。本轮的归一化改动只在内存中生成匹配副本，不写库、不写日志。AI 输入与会话清理本单未触及，由 STORY-008 承接。";

const S006_INHERIT_011 =
  "审查：路由不读写数据库，处理状态经 toStoredTaskStatus 映射到 tasks.status 现有取值；例外队列不复制正文；Q8 删除持久昵称检查表（db/ 自 b1a1471 未改，第 5a 批 E60 的空库与各前驱状态升级结论仍适用）。短事务提交、verdicts 与 deliveries 写入本单未触及，由 STORY-014 承接。";

const S006_INHERIT_012 =
  "审查：路由只消费调用方给出的事实，不暴露接口、页面或运行权限，不把待审正文交给任何工具；频道范围取自事件本身。Q12 的准入错误为 RULE_SET_INVALID: REGEX_GROUP_ALTERNATION 加固定提示，不回显模式原文（E20 §4）。鉴权与输出凭据本单未触及（STORY-003 已验收）。";

const S006_INHERIT_014 =
  "VW-R-014 中本单触及的部分成立：例外消息在任何短路之前登记；基础明确拒绝可直接结束；其余进入 REVIEW，例外 ∧ 付费按流程图走 REALTIME_REVIEW；白名单、噪声、高分对例外一律无效（96 组合与路由实测，E20 §3–4）；实时 BLOCK 与模型完成的计分都被例外守卫拒绝（REFUSED）。身份、复盘与人工调分的守卫属 STORY-005（已验收），恢复计分本单未触及。";

const S006_INHERIT_017 =
  "审查与实测：DISCARD 用于过期代次或已删除，非终态可转 DISCARDED，不产生裁决，例外队列项以 DISCARDED 结算；系统失败有 RETRY 与 ESCALATE 两个去向；终态拒绝后续步骤（E20 §4；states.test 19 项）。例外队列只有进程内实现，重启后丢失，S006 设计 §9 已列为缺口。删除编排、到期与恢复本单未触及，由 STORY-019、STORY-020 承接。";

// ---------------- S009 ----------------
const S009_OK_PARTS =
  "车道排队有上限，满了明确转人工（QUEUE_FULL，不丢弃、不放行），单条正文超过批字节上限转人工（INPUT_TOO_LARGE）；排队或运行中的任务到期由扫描转 PENDING_REVIEW 并记 TIMED_OUT/DEADLINE_EXCEEDED；可重试错误按 1000、2000 ms 退避，3 次耗尽或退避越过截止时间即转人工，不可重试错误直接转人工；迟到、代次变化、版本被人工裁决替代、已结算、数据删除、取消后以及重启后未知任务的结果都被丢弃，不写裁决、不写证据；没有任何路径放行或扣分（E30 §1–§4、§7）。";

const B5_TAIL =
  "Crew 执行器在 pump 与 cancelEvent 里依次 await Crew 的 cancel，Crew 的 cancel 不返回时，这次 pump、之后每次 pump 与执行器的 cancelEvent 都不再返回，任何频道的新任务都不再派工（E30 §7、E31；B5，归属 SUB-018）。";
const B5_SHORT = `「无全局无限屏障」不成立：${B5_TAIL}`;
const B5_SHARED = `共享的前半句「无全局无限屏障」不成立：${B5_TAIL}`;

const S009_AC001 =
  `${GATES}task-coordinator 的 8 个测试文件 88 项通过（E05）。实测只用进程内替身（E30–E32）：${S009_OK_PARTS}${B5_SHORT}` +
  "另两处问题不改变本行判定：同频道里更早的 BACKGROUND 任务会挡住 REALTIME 提交，直到后台任务自己的截止时间（B4，判在 INHERIT-006）；运行中的任务到期后、扫描之前结果先到，任务转为 DISCARDED 而不进人工队列（N1）。";

const S009_PARENT =
  `复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。无无限积压、超时不默认放行或扣分、过期任务不恢复为有效输出成立；${B5_SHORT}S009 的贡献是 TaskCoordinator 的有界调度、截止时间、有限重试、代次与提交确认、动态并发和 Crew 执行器。`;

const S009_INHERIT_001 =
  "审查：task-coordinator 只导入 @voxward/contracts 与本模块文件（E33；check:deps 171 个文件 0 违规，E06）；在副本中加入导入 db 与供应商 SDK 的临时文件时 check:deps 报 2 处违规并退出 1，删除后恢复（E09）。契约包、CONTRACT_VERSION（仍为 1）、注册表、app.ts、main.ts、package.json 与锁文件都没有改动（E33）。Crew 只以端口 CrewPort 出现，本包不启动 Crew、不连接网关：全量测试在拦截下对本机已有的 22 个监听端口 0 次连接，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。";

const S009_INHERIT_005 =
  "对照交付边界：本包只新增 task-coordinator 模块文件与测试，不改其它模块（E33）；注册表仍调用无选项的 createTaskCoordinator()，接线前对外行为不变。VW-R-005 的后台复盘由 STORY-011 实现，本包提供 BACKGROUND 车道：只用剩余容量，上限 4 时最多 3 个后台批次，上限 1 时暂停（E30 §5）；提交时由事实端口排除已结算、被人工替代、已删除与过期的对象（E30 §4）。BACKGROUND 任务对同频道实时提交的影响见 B4，判在 INHERIT-006。完整判据由 INIT 的 VW-AC-005 承载。";

const S009_INHERIT_006 =
  "VW-R-006 中「微批、大小、容量和等待均有界」「按宿主资源动态约束」「删除优先失效旧任务」成立（E30 §1–§2、§4、§6）。「付费优先、复盘让出实时容量」与「有限保序…保证实时可用性」不成立：保序门控只按 channelId 比较 platformOrder，不区分车道。同频道里一条更早的 BACKGROUND 任务（截止 10 分钟、仍在排队）使 REALTIME 结果的提交一直返回 waiting，直到实时任务自己到期转人工，后台任务仍在排队；付费结果也要等同频道更早的 REALTIME 任务（E30 §5；B4，归属 SUB-017）。" +
  B5_SHARED;

const S009_INHERIT_008 =
  "对照交付边界：执行器只接收 CrewReport 中已校验的 InferenceResultItem，不改 S007 的批结果校验与 AI 契约（E33）；同一任务缺条目或有两条条目时该任务转人工 INVALID_OUTPUT，会话 completed 本身不产生裁决（E30 §7）。VW-R-008 要求初版整批受控失败，completed 报告须先经 S007 的整批校验，这由 S029 的真实绑定承担，本包未验证（judgment N6）。完整判据由 INIT 的 VW-AC-008 承载。";

const S009_INHERIT_009 =
  "审查与实测：交给 Crew 的作业每项只有 taskId、correlationId 与正文三个键（E30 §7），不带昵称、发送者引用、平台 ID 或凭据；本包不保存会话、提示或工具轨迹。证据（ITEM_ID_MAP、VALIDATED_JSON）只在提交成功时写入技术日志，被丢弃的结果不留内容副本；80152 条技术日志条目全部通过审计库 prepareTechnicalWrite 的校验（E30）。结算后的任务记录在进程内存里保留正文直到重启（judgment N2）。Crew 端内容残留的清理由 S029 的真实绑定承担，本包未验证。";

const S009_INHERIT_010 =
  "VW-R-010 中本单触及的部分成立：Crew 会话状态不是裁决，裁决只来自校验后的条目，并经事实端口在事务内写入；Crew 拒绝作业或会话中途失联时任务转人工 CREW_UNAVAILABLE，不放行（E30 §7）。真实 Kiro Crew 未验证（S029）。" +
  B5_SHARED;

const S009_INHERIT_011 =
  "VW-R-011 中本单触及的部分成立：结果只经 TaskFactsPort.commitIfCurrent 在一个同步短事务内写入，检查与写入之间不让出；apply 只在事务内运行，事务外写入 0 次，重复提交只写一次；证据只随成功的提交写入技术日志（E30 §4）。结算后的任务记录在进程内存里保留正文（judgment N2）。" +
  B5_SHARED;

const S009_INHERIT_012 =
  "审查：本包不新增 HTTP 路由、页面或运行权限，app.ts 与注册表未改（E33）；错误信息只写字段或配置键名，不回显取值（TaskInputError、TaskConfigError，E30 §2–§3）；正文只作为作业数据交给 CrewPort，不作为工具指令。鉴权与输出凭据本单未触及。";

const S009_INHERIT_017 =
  "VW-R-017 中本单触及的部分成立：取消立即生效，车道排满时也能取消；运行中的任务在数据删除或代次变化后结果被丢弃（DATA_DELETED、GENERATION_CHANGED），不写裁决；重启后旧任务的结果按 UNKNOWN_TASK 丢弃，不恢复（E30 §3–§4、§7）。" +
  `${B5_SHARED}Crew 的 cancel 不返回时执行器的 cancelEvent 也不返回，删除流程会停在这里，尽管任务已先转 DISCARDED（E31）。`;

const SUB017_AC001 =
  `${GATES}SUB-017 承担的协调器部分成立（task-coordinator 测试 88 项通过，E05；E30 §1–§5）：无无限积压，每个车道的排队数有上限（默认 PAID 50、REALTIME 200、BACKGROUND 500；上限 3 时 10 条入队 3 条排队、7 条转人工 QUEUE_FULL；默认上限下 205 条入队 200 条排队，重试回队也不超过），单条超过 8192 字节转人工；无全局无限屏障，保序门控只在同一频道内，且只等到前序任务的截止时间，跨频道不等待；超时不默认放行或扣分，排队或运行中的任务到期转 PENDING_REVIEW 并记 TIMED_OUT，重试耗尽、退避越过截止时间、不可重试错误、提交异常都转人工，事实端口 apply 0 次；过期任务不恢复为有效输出，到期、取消、代次变化、版本被替代、已结算、重启后未知任务的结果都被丢弃，不写裁决。` +
  "本单代码中有三处问题不使本行不成立，但随返工处理：保序门控不区分车道（B4，判在 INHERIT-006）；到期后、扫描之前到达的结果把任务转为 DISCARDED 而不进人工队列，与提案 §6.2 和本单设计 §3 不符（N1）；结算后的任务记录不释放，每次调度调用都遍历全部记录（N2）。";

const SUB017_STORY =
  "复用 VW-SUB017-AC001 的同次执行（E05、E30–E32）。SUB-017 承担的「微批条数/大小/等待上限；付费优先、后台余量；有限重试退避；取消/代次；按通道有限保序」中，微批四种取批条件、后台余量、有限重试退避、取消与代次成立；付费优先与有限保序在提交环节被跨车道门控削弱（B4，判在 INHERIT-006）。本行只证明 SUB-017 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 failed（B5，不在 SUB-017 部分）。";

const SUB017_PARENT =
  `复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。${B5_SHORT}SUB-017 承担的协调器部分见 VW-SUB017-AC001。`;

const SUB018_AC001 =
  "并发随资源收缩且不突破上限成立：createDynamicConcurrency({min 1, max 4}) 对 NORMAL、两种 TIGHT、两种 CRITICAL、三种不可用读数（NaN、比例 1.5、负负载）、恢复 NORMAL 依次给出 4、2、2、1、1、1、1、1、4；min 0、max 小于 min、小数被拒；经执行器实测，CRITICAL 时已开的会话不被打断，打开的会话降到 1 以下之前不再启动，降到 0 时仍启动 1 个（无零并发屏障），恢复后回到 4；随机 400 步中同时打开的会话从未超过上限 6，每次启动时打开数都小于当时读到的上限（E30 §6）。" +
  "Crew 会话状态不作为业务最终裁决成立：completed 但缺某任务条目时该任务转人工 INVALID_OUTPUT，同一任务两条条目同样转人工，裁决只来自条目并经事实端口写入（E30 §7）。" +
  "「Crew 不可用时任务明确失败」只在 Crew 拒绝作业、会话中途失联或 start 不返回时成立：任务转人工 CREW_UNAVAILABLE 或到期转人工，槽位释放（E30 §7）。Crew 接下作业后不再响应、cancel 不返回时，执行器在回收空闲批次时 await 这个 cancel，pump 与 cancelEvent 都不返回，其它频道的新任务一直 QUEUED、不派工；按返回值逐次 await pump 的驱动方从此不再扫描，之后到期的任务也进不了人工队列；不 await 的驱动方每次 pump 都再挂起一个，任务到期才转人工（E30 §7、E31；B5，归属 SUB-018）。" +
  "固定版本的真实 Crew 实测按方法标为未验证：简报不允许连接真实 Crew，本轮只用进程内替身（E08：对本机已有监听端口 0 次连接，垫片 0 次调用）。";

const SUB018_STORY =
  "复用 VW-SUB018-AC001 的同次执行（E30–E32）。SUB-018 承担的「TaskCoordinator/Crew 适配」中，动态并发的上下限与随资源收缩、会话状态不作为裁决、Crew 拒绝与失联时明确失败成立；Crew 的 cancel 不返回时执行器停止派工，pump 与 cancelEvent 不返回（B5，在 SUB-018 部分）。固定版本真实 Crew 实测按方法未验证。本行只证明 SUB-018 承担的部分；VOXWARD-STORY-009 的完整判据 VW-S009-AC001 另行判定为 failed。";

const SUB018_PARENT =
  `复用 VW-S009-AC001 在 5ce5bee 上的同次执行（E02–E08、E30–E32）。${B5_SHORT}SUB-018 承担的动态并发与 Crew 执行器部分见 VW-SUB018-AC001。`;

const sub = (text, note) => `${text}${note}`;

export const ROWS = {
  // STORY-006
  "VW-S006-AC001": { outcome: "satisfied", actual: `${S006_ROUTE}expected 各部分在 5ce5bee 上成立。` },
  "VW-S006-PARENT": { outcome: "satisfied", actual: S006_PARENT },
  "VW-S006-INHERIT-001": { outcome: "satisfied", actual: S006_INHERIT_001 },
  "VW-S006-INHERIT-003": { outcome: "satisfied", actual: S006_INHERIT_003 },
  "VW-S006-INHERIT-004": { outcome: "satisfied", actual: S006_INHERIT_004 },
  "VW-S006-INHERIT-005": { outcome: "satisfied", actual: S006_INHERIT_005 },
  "VW-S006-INHERIT-009": { outcome: "satisfied", actual: S006_INHERIT_009 },
  "VW-S006-INHERIT-011": { outcome: "satisfied", actual: S006_INHERIT_011 },
  "VW-S006-INHERIT-012": { outcome: "satisfied", actual: S006_INHERIT_012 },
  "VW-S006-INHERIT-014": { outcome: "satisfied", actual: S006_INHERIT_014 },
  "VW-S006-INHERIT-017": { outcome: "satisfied", actual: S006_INHERIT_017 },
  // SUB-012
  "VW-SUB012-AC001": { outcome: "satisfied", actual: `${S006_ROUTE}SUB-012 是 STORY-006 唯一的子单，承担全部交付。expected 各部分在 5ce5bee 上成立。` },
  "VW-SUB012-STORY": {
    outcome: "satisfied",
    actual:
      "复用 VW-SUB012-AC001 的同次执行（E02–E08、E20–E24）。SUB-012 承担的名单与例外队列登记、付费文本审核不可跳过、meaningful/noise 内部分类、UNSETTLED_FAST_PASS、系统失败与人工接管状态都成立；本轮修改的匹配副本归一化（B3）复验通过。本行只证明 SUB-012 承担的部分；VOXWARD-STORY-006 的完整判据 VW-S006-AC001 另行判定为 satisfied。",
  },
  "VW-SUB012-PARENT": { outcome: "satisfied", actual: `${S006_PARENT}SUB-012 是 STORY-006 唯一的子单，承担全部交付。` },
  "VW-SUB012-INHERIT-001": { outcome: "satisfied", actual: S006_INHERIT_001 },
  "VW-SUB012-INHERIT-003": { outcome: "satisfied", actual: S006_INHERIT_003 },
  "VW-SUB012-INHERIT-004": { outcome: "satisfied", actual: S006_INHERIT_004 },
  "VW-SUB012-INHERIT-005": { outcome: "satisfied", actual: S006_INHERIT_005 },
  "VW-SUB012-INHERIT-009": { outcome: "satisfied", actual: S006_INHERIT_009 },
  "VW-SUB012-INHERIT-011": { outcome: "satisfied", actual: S006_INHERIT_011 },
  "VW-SUB012-INHERIT-012": { outcome: "satisfied", actual: S006_INHERIT_012 },
  "VW-SUB012-INHERIT-014": { outcome: "satisfied", actual: S006_INHERIT_014 },
  "VW-SUB012-INHERIT-017": { outcome: "satisfied", actual: S006_INHERIT_017 },
  // STORY-009
  "VW-S009-AC001": { outcome: "failed", actual: S009_AC001 },
  "VW-S009-PARENT": { outcome: "failed", actual: S009_PARENT },
  "VW-S009-INHERIT-001": { outcome: "satisfied", actual: S009_INHERIT_001 },
  "VW-S009-INHERIT-005": { outcome: "satisfied", actual: S009_INHERIT_005 },
  "VW-S009-INHERIT-006": { outcome: "failed", actual: S009_INHERIT_006 },
  "VW-S009-INHERIT-008": { outcome: "satisfied", actual: S009_INHERIT_008 },
  "VW-S009-INHERIT-009": { outcome: "satisfied", actual: S009_INHERIT_009 },
  "VW-S009-INHERIT-010": { outcome: "failed", actual: S009_INHERIT_010 },
  "VW-S009-INHERIT-011": { outcome: "failed", actual: S009_INHERIT_011 },
  "VW-S009-INHERIT-012": { outcome: "satisfied", actual: S009_INHERIT_012 },
  "VW-S009-INHERIT-017": { outcome: "failed", actual: S009_INHERIT_017 },
  // SUB-017
  "VW-SUB017-AC001": { outcome: "satisfied", actual: SUB017_AC001 },
  "VW-SUB017-STORY": { outcome: "satisfied", actual: SUB017_STORY },
  "VW-SUB017-PARENT": { outcome: "failed", actual: SUB017_PARENT },
  "VW-SUB017-INHERIT-001": { outcome: "satisfied", actual: sub(S009_INHERIT_001, "本单交付的是协调器部分（coordinator.ts 及纯函数文件）。") },
  "VW-SUB017-INHERIT-005": { outcome: "satisfied", actual: S009_INHERIT_005 },
  "VW-SUB017-INHERIT-006": { outcome: "failed", actual: sub(S009_INHERIT_006, "B4 在本单的 ordering.ts 与 coordinator.ts。") },
  "VW-SUB017-INHERIT-008": { outcome: "satisfied", actual: S009_INHERIT_008 },
  "VW-SUB017-INHERIT-009": { outcome: "satisfied", actual: S009_INHERIT_009 },
  "VW-SUB017-INHERIT-010": { outcome: "failed", actual: sub(S009_INHERIT_010, "按候选整体判定；B5 不在 SUB-017 部分。") },
  "VW-SUB017-INHERIT-011": { outcome: "failed", actual: sub(S009_INHERIT_011, "按候选整体判定；本单的事务提交部分成立，B5 不在 SUB-017 部分。") },
  "VW-SUB017-INHERIT-012": { outcome: "satisfied", actual: S009_INHERIT_012 },
  "VW-SUB017-INHERIT-017": { outcome: "failed", actual: sub(S009_INHERIT_017, "按候选整体判定；本单的取消与代次部分成立，B5 不在 SUB-017 部分。") },
  // SUB-018
  "VW-SUB018-AC001": { outcome: "failed", actual: SUB018_AC001 },
  "VW-SUB018-STORY": { outcome: "failed", actual: SUB018_STORY },
  "VW-SUB018-PARENT": { outcome: "failed", actual: SUB018_PARENT },
  "VW-SUB018-INHERIT-001": { outcome: "satisfied", actual: sub(S009_INHERIT_001, "本单交付的是 crew/adapter.ts 与 crew/capacity.ts。") },
  "VW-SUB018-INHERIT-005": { outcome: "satisfied", actual: S009_INHERIT_005 },
  "VW-SUB018-INHERIT-006": { outcome: "failed", actual: sub(S009_INHERIT_006, "按候选整体判定；本单承担的「按宿主资源动态约束」成立（E30 §6），B5 在本单的 crew/adapter.ts。") },
  "VW-SUB018-INHERIT-008": { outcome: "satisfied", actual: S009_INHERIT_008 },
  "VW-SUB018-INHERIT-009": { outcome: "satisfied", actual: S009_INHERIT_009 },
  "VW-SUB018-INHERIT-010": { outcome: "failed", actual: sub(S009_INHERIT_010, "B5 在本单的 crew/adapter.ts。") },
  "VW-SUB018-INHERIT-011": { outcome: "failed", actual: sub(S009_INHERIT_011, "B5 在本单的 crew/adapter.ts。") },
  "VW-SUB018-INHERIT-012": { outcome: "satisfied", actual: S009_INHERIT_012 },
  "VW-SUB018-INHERIT-017": { outcome: "failed", actual: sub(S009_INHERIT_017, "B5 在本单的 crew/adapter.ts。") },
};
