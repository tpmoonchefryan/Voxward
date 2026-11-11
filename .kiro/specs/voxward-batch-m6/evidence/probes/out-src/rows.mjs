// Outcome and basis of every live acceptance row (E01), keyed by acceptanceId. Used by build-out.mjs.
const S = "satisfied";
const F = "failed";

const GATES =
  "候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。";

// ---------------------------------------------------------------- S010
const S010_OK =
  "关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核，BLOCK 照报，无小抄，SC 模型 0 次调用（E50 D1）。拦截不输出小抄：BLOCK 条目为 VERDICT_BLOCK，译文命中规则只扣该条（GENERATED_TEXT_REJECTED），没有规则引擎端口时整批拒绝、没有任何小抄；40223e2 上同一 SC 输出整批失败（E50 B1、C2、C6）。不扩大外发字段：模型输入只有 itemId 与 text，称呼与读音只在本地取，且只给可出小抄的条目取（E50 C4、C5）。能力设置：不支持的模型与 reasoning 按问题码拒绝、不写入，能力变化后读取时报 MODEL_NOT_SUPPORTED、不替换保存值，真实适配器下全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。";
const S010_FAIL =
  "不成立的部分：参数能力真实、无静默更换服务。精翻关时 runScBatch 只用所选 SC 模型核对能力报告，调用安全审核端口时不带它。选择 synthetic-model-a/high（报告里有）时，适配器按 synthetic-model-b 构造，假 CLI 收到 --model synthetic-model-b；适配器不带模型构造，argv 里没有 --model；两次都返回 ok，结果里看不出所用模型（E50 F，judgment B1）。设计 §3.3 写两种情况都使用 scTranslation 的选择。";
const S010_PARENT =
  "复用 VW-S010-AC001 在 5482e5d 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、不扩大外发字段成立；参数能力真实、无静默更换服务在精翻关闭路径不成立：所选 SC 模型只用于核对，安全审核按适配器构造时的模型运行（E50 F，B1）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复。";
const S010_I008 =
  "复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定：精翻关闭路径不使用所选模型（E50 F，B1），「参数能力真实，无静默更换服务」不成立。";
const S010_I010 =
  "复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」在设置层成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒，真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。前半句同 Story 主验收行，按整体结果判定：精翻关时所选 SC 模型与 reasoning 不传给安全审核，运行用适配器构造时的模型（E50 F，B1）。";
const S010_I001 =
  "审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 200 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包只给 InferenceCapabilities 加可选字段 models（InferenceModelCapability），CONTRACT_VERSION 仍为 1；Q40 只改 platform-source 的 stream-list.ts 里取正文的函数。package.json、锁文件、app.ts、registry 与 adapters/ 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。";
const S010_I005 =
  "对照交付边界：小抄的安全称呼与读音经 addressFor 端口由组合层绑定 S004 的本地流程（设计 G7），本模块不导入 moderation-engine，不改昵称缓存；模型输入不含称呼，称呼只给可出小抄的条目取（E50 C4、C5）；读音不可靠时置空、小抄照常显示（cue-sheet.ts，提案第 190 行）。VW-R-005 的复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。";
const S010_I006 =
  "对照交付边界：runScBatch 是单批函数，不导入、不修改 task-coordinator；付费任务进 PAID 车道、优先派工由组合层用 S009 的 enqueueInLane(\"PAID\", …) 完成，本单没有接线（设计 §6）。单批条数受 maxItems 限制，空批、超限与重复 correlationId 在调用模型前拒绝（pipeline.ts）。ChannelEvent 不带消息类型或付费标记，接线时要补（judgment N1）。完整判据由 VW-AC-006 承载。";
const S010_I009 =
  "审查本单接触的 AI 输入：精翻开时模型输入只有临时 itemId 与正文，itemId 每批新生成，映射只在本批内存里（E50 C4）；精翻关时经 S008 适配器发给 CLI 的条目只有 itemId 与 text（safety-only.test.ts，E50 D1）。小抄与设置都不落库、不写日志，本单不新增会话、提示或工具轨迹的副本。真实 Kiro 会话的清理由 S008、S029 承担，本单未触及。";
const S010_I011 =
  "审查：模型设置只有 ModelSettingsStore 端口与内存实现（设计 G2），小抄只随返回值给出，不落库、不写日志（设计 §4）；本单没有数据库写入，不让浏览器或 AI 直写，也不在队列或日志里复制正文。Q40 只改解析，不改去重与落库。";
const S010_I012 =
  "审查本单暴露的接口：设置路由是与框架无关的处理函数，没有注册到 Fastify（G3）；写入整体替换、字段逐项校验，问题只回问题码与路径，不回显输入值（E50 E1）。处理函数不接收操作者与频道，设置是一个全局对象；注册时要加角色鉴权，并按提案 §2.1 定设置归属（judgment N3）。SC 正文只作为 JSON 条目的 text 交给模型，不当作指令；本单不涉及输出凭据。";
const S010_I017 =
  "审查本单涉及的数据：设置与小抄都在进程内或随返回值给出，不落库；批次内的 itemId 映射随调用结束释放；Q40 改动不新增缓存。删除代次与失效由调度与提交方承担，本单与删除流程没有接点，不会重建已删数据。";

// ---------------------------------------------------------------- S011
const S011_TESTS = "moderation-engine review 3 个文件 36 项、candidates 2 个文件 14 项、task-coordinator 9 个文件 109 项（含 Q38 的 retention 5 项）通过（E05）。";
const S011_AC =
  "实测用真实协调器、真实计分引擎与迁移后的 SQLite 计分端口（E60 §C）。无重复计分：一次结算账本一行 +2，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息一个 SETTLED、一个 NOT_ELIGIBLE，账本一行（E60 C1、C2）。无依据计分：选入后人工先处理、删除开始，结算时 NOT_ELIGIBLE，账本 0 行；例外主体由端口拒绝，记 REFUSED，账本 0 行（E60 C3、C5）。失效数据不恢复：证据到期标 UNSETTLED_EXPIRED，不送模型、不计分；删除中的待计分项在重放时记 NOT_REQUIRED（E60 C4，runner.ts resumePendingScoring）。AI 不直接修改规则：复盘提出的词只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId 与 sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并带规则版本（E60 F1、F4）。Q27 前半：BLOCK 结算写一条不含正文的复核记录（OPEN），ALLOW 不写（E60 D1）。";
const S011_OUT_OF_SCENE =
  "与实时共用协调器（B2）、模型输出不合整批契约（B3）、任务不经 runBatch 结束时的正文残留（B4）不在本行场景内，分别在 INHERIT-006、INHERIT-008、INHERIT-017 判定。";
const S011_PARENT =
  "复用 VW-S011-AC001 在 5482e5d 上的同次执行（E02–E08、E60）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2、B3、B4 判在各单的 INHERIT-006、INHERIT-008、INHERIT-017。";
const S011_I001 =
  "审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；Q38 只改 task-coordinator 内部并新增 retainedRecords()。契约包、package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。";
const S011_I005 =
  "复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认（E60 F）。昵称缓存部分不在本单。前半句同 AC001，成立。";
const S011_I006_FAIL =
  "对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响：复盘入队只用 BACKGROUND 车道（E60 A1）。运行器取批用协调器的通用 takeBatch，它按 PAID > REALTIME > BACKGROUND 取任何车道的批次；运行器对不认识的任务一律 reportFailure(REVIEW_TASK_UNKNOWN)，这个错误码不可重试。同一个协调器里排着一条 REALTIME 任务时，第一次 runBatch 取走它并转为 PENDING_REVIEW（E60 A2）。反过来，S009 的 Crew 执行器 pump 取走 BACKGROUND 复盘任务，按普通审核 writeVerdict 提交，复盘结算被绕开，消息仍是 UNSETTLED_FAST_PASS（E60 A3）。改用两个协调器时，后台与实时不再共享并发上限，后台余量不起作用。VW-R-006 的「复盘让出实时容量」与「并发按宿主资源约束」不成立，实时路径的任务被复盘运行器转人工（judgment B2）。";
const S011_I008_FAIL =
  "复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3「缺项或重复项使该批进入受控失败处理」）。运行器只用契约包的 validateReviewBatchResult 校验单条字段，再按 itemId 建 Map：重复的 itemId 后一条覆盖前一条，缺项只让该条失败、同批其它条照常结算，批外 itemId 被忽略。实测 [i0 BLOCK, i0 ALLOW_MEANINGFUL] 时 i0 以 ALLOW_MEANINGFUL 结算并 +2、没有复核记录，i1 为 AI_OUTPUT_INCOMPLETE；[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL] 时两条都 +2，BLOCK 消失；缺项、批外 ID 时其余条目照常结算。同样的输出交给 inference-provider 的 validateReviewBatch 都被整批拒绝（ITEM_ID_DUPLICATE、OUTPUT_TOO_MANY_ITEMS、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN）（E60 G1–G4；合法输出的对照 G5 正常）。judgment B3。";
const S011_I009 =
  "复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。";
const S011_I010 =
  "对照交付边界：复盘的 ReviewModelPort 只收 AiBatchInput，不带模型选择；用哪个模型由组合层按 S010 的 review 设置绑定，本单未接线（设计 §8，judgment N7）。本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。";
const S011_I011 =
  "审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。本单不新增持久副本。运行器为每个任务保存的整条事件含正文、在任务不经 runBatch 结束时留在内存，判在 INHERIT-017（B4）。";
const S011_I012 =
  "审查：候选词路由先查能力再读输入，列表要 queue.read，确认要 review.decide；按真实角色矩阵，DATA_ADMIN 确认得 403 且不发布，其它频道的房管得 404（E60 F2、F3）；卡片视图不返回决定者引用。待审正文只作为模型输入的 text，带任务别名前缀。确认与 S014 词条入库用的能力不同（review.decide 与 list.edit），现在授给同样的角色（judgment N5）。本单不涉及输出凭据。";
const S011_I017_FAIL =
  "审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。但运行器的 entries 表为每个入队任务保存整条 ChannelEvent（含正文），只在 runBatch 的结算与失败路径里删除。任务因删除被 cancelEvent 取消、或在协调器里到期，都不经过 runBatch，记录一直留下。实测 20 条取消、20 条到期的任务在存储行删除后，堆快照里 20、20 条正文标记都在，经 runBatch 结算的对照 0 条（E61 H1–H3）。这是删除流程清不到的正文副本，数量没有上限（judgment B4）。";

// ---------------------------------------------------------------- S014
const S014_TESTS = "decision-service 6 个文件 38 项、db decision-store 3 项、scoring-engine/ledger 6 个文件 32 项、db schema 33 项与 migrate 5 项通过（E05）。";
const S014_AC_FAIL =
  "实测用迁移后的临时 SQLite 与真实角色矩阵（E70）。成立的部分：仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN，同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，库里裁决、投递、账本、Change Log 各 1 行（E70 A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决（来源、分类、seq），并发冲突的 current.verdictId 都是存下的那一条（E70 A1、A2、B2）。无旧结果重建：主体代次或事件版本变化后，提交、改判、补发都被拒，不写入（E70 A3、E2，overturn.test.ts）。无机械加回配置分：在下限处只扣 −1 的 BLOCK 改判后纠分 +1，不是配置的 3；同一事件只纠一次（E70 C1–C3）。显式补发受有效期限制：只补已过期的投递，到达 10 分钟内，新投递有效 60 s，同操作标识幂等（E70 E1）。不成立的部分：补发必须明确。改判一条 2 小时前被 BLOCK 的消息为放行，存储层同时插入一条 PENDING、下游结论 ALLOW、有效 5 分钟的投递，overturn 还返回 DeliveryIntent；同一消息走显式补发得 WINDOW_CLOSED（E70 D1、D2，judgment B5）。提案 §7.1：误判放行时「是否补发到下游由独立、明确的补发操作决定」；§6.3：「补发必须是明确操作，并受输出有效期限制」。";
const S014_PARENT =
  "复用 VW-S014-AC001 在 5482e5d 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分成立；补发必须明确不成立：改判自动生成 5 分钟有效的放行投递，绕过显式补发与它的 10 分钟时限（E70 D1，B5）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。";
const S014_I001 =
  "审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 与表 score_outcomes 在 db 分区；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包新增端口 ports/decision-store.ts，并改写 DecisionService（commit 的参数与返回值，新增 overturn 与 resend），CONTRACT_VERSION 仍为 1（设计 §0：当前没有其它实现者，judgment N9）。迁移 0005 由 drizzle-kit 生成。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。";
const S014_I002_Q19 =
  "对照交付边界：本单不改 platform-source。身份事件的幂等键与 subject_identities.source_event_ref 改为带频道与主体（Q19②），同一平台引用在不同频道各算一次，同频道同主体仍只一次（E70 L3；40223e2 上第二个频道不生效）。数据字典对 source_event_ref 的说明「身份事件的幂等引用」仍然成立。完整判据由 INIT 的 VW-AC-002 承载。";
const S014_I007_FAIL =
  "复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定：改判自动生成可投递的放行意图，补发必须明确不成立（E70 D1，B5）。";
const S014_I009 =
  "审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本单不新增会话、提示或工具轨迹的副本。";
const S014_I011 =
  "审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3）；本单不在队列或日志里复制正文。新表 score_outcomes 只存幂等键、主体、结果与原因（E70 M1）。";
const S014_I012 =
  "审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。";
const S014_I017 =
  "审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（judgment N6）。本单不让旧任务重建已删数据。";

export const ROWS = {
  // ======================================================== VOXWARD-STORY-010
  "VW-S010-AC001": [F, `${GATES}本组相关测试 inference-provider 8 个文件 95 项、youtube-stream 与 youtube-identity 5 个文件 65 项通过（E05）。成立的部分：${S010_OK}${S010_FAIL}`],
  "VW-S010-PARENT": [F, S010_PARENT],
  "VW-S010-INHERIT-001": [S, S010_I001],
  "VW-S010-INHERIT-005": [S, S010_I005],
  "VW-S010-INHERIT-006": [S, S010_I006],
  "VW-S010-INHERIT-008": [F, S010_I008],
  "VW-S010-INHERIT-009": [S, S010_I009],
  "VW-S010-INHERIT-010": [F, S010_I010],
  "VW-S010-INHERIT-011": [S, S010_I011],
  "VW-S010-INHERIT-012": [S, S010_I012],
  "VW-S010-INHERIT-017": [S, S010_I017],
  // ======================================================== VOXWARD-SUB-019
  "VW-SUB019-AC001": [S, `${GATES}model-settings 3 个文件 31 项通过（E05）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立（E50 E1–E4）：选项只来自适配器报告，没有默认模型、没有回退；不支持的模型为 MODEL_NOT_SUPPORTED，不支持的等级为 REASONING_NOT_SUPPORTED，要求等级时缺少为 REASONING_REQUIRED，都返回 422，已保存的设置不变；切换模型整体替换写入，读取时按当前报告重查；适配器去掉某模型后读取显示 MODEL_NOT_SUPPORTED、保存值不被替换，运行门槛拒绝；真实 Kiro CLI 适配器的 describe() 不含 models，任何选择都是 CAPABILITY_NOT_REPORTED（G1）。设置本身不外发字段。本行只判本单承担的部分；所选模型在精翻关闭路径没有交给安全审核，出在 SUB-020 的流水线（B1），由各单 PARENT 与 INHERIT-008、INHERIT-010 行反映。`],
  "VW-SUB019-STORY": [S, "复用 VW-SUB019-AC001 的同次执行（E02–E08、E50 E1–E4）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立：能力只来自适配器报告，不支持即明确报错且不写入，能力变化后不静默替换保存值。本行只证明 SUB-019 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 判为 failed（B1）。"],
  "VW-SUB019-PARENT": [F, `${S010_PARENT}SUB-019 承担的设置与校验部分见 VW-SUB019-AC001。`],
  "VW-SUB019-INHERIT-001": [S, `${S010_I001}本单交付的是 model-settings/ 与契约的 models 字段。`],
  "VW-SUB019-INHERIT-005": [S, "对照交付边界：模型设置不涉及昵称缓存、安全称呼与复盘，也不改其它模块（E11）。VW-R-005 的称呼部分由 SUB-020 经 addressFor 端口承担（E50 C5），复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。"],
  "VW-SUB019-INHERIT-006": [S, "对照交付边界：模型设置不改 task-coordinator，也不决定并发，只决定各任务用哪个模型（E11）。完整判据由 VW-AC-006 承载。"],
  "VW-SUB019-INHERIT-008": [F, `${S010_I008}SUB-019 的设置与校验部分成立，B1 出在 SUB-020 的流水线。`],
  "VW-SUB019-INHERIT-009": [S, "审查：模型设置不接触 AI 输入与会话；问题列表只有问题码与字段路径，不回显输入值（settings.ts，E50 E1）。本单不新增会话、提示或工具轨迹的副本。"],
  "VW-SUB019-INHERIT-010": [F, `${S010_I010}SUB-019 承担的设置与能力核对成立，B1 出在 SUB-020 的流水线。`],
  "VW-SUB019-INHERIT-011": [S, "审查：设置只有端口与内存实现，落库需要新表，不在本单（设计 G2）；本单没有数据库写入，不让浏览器或 AI 直写，不在队列或日志里复制正文。"],
  "VW-SUB019-INHERIT-012": [S, S010_I012],
  "VW-SUB019-INHERIT-017": [S, "审查本单涉及的数据：设置只含模型 ID、reasoning 值与精翻开关，不含观众数据；在进程内保存，不落库，与删除流程没有接点。"],
  // ======================================================== VOXWARD-SUB-020
  "VW-SUB020-AC001": [S, `${GATES}sc-translation 3 个文件 24 项、validation 2 个文件 40 项通过（E05）。关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核，BLOCK 照报，无小抄，SC 模型 0 次调用（E50 D1）。拦截不输出小抄：BLOCK 条目的生成字段不检查也不展示（VERDICT_BLOCK）；译文命中规则只扣该条（GENERATED_TEXT_REJECTED），同批其它条照常出小抄；没有规则引擎端口时整批拒绝（E50 B1、C2、C6；40223e2 上同一输出整批失败）。原文与生成文本有标识：VIEWER_ORIGINAL 与 AI_GENERATED 分块（E50 C3）。不为补全注音扩大外发数据：模型输入只有 itemId 与 text，称呼与读音只由本地 addressFor 给出，且只给可出小抄的条目取（E50 C4、C5）。跨语种样本：中文、日文、英文与混合四条都出小抄（E50 C1）。安全审核与精翻在同一任务里完成（提案 §8.3），小抄只给分类不是 BLOCK、生成文本通过检查的条目。SC 精翻路径按方法用端口替身，真实适配器还不能返回 SC 字段（G6）。`],
  "VW-SUB020-STORY": [S, "复用 VW-SUB020-AC001 的同次执行（E02–E08、E50 B–D）。SUB-020 承担的「精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼」成立：开关关闭时只审核不出小抄，开启时逐条给出小抄，原文与生成文本分块标识，称呼与读音只在本地取。本行只证明 SUB-020 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 判为 failed（B1 出在本单的 runScBatch 精翻关闭分支）。"],
  "VW-SUB020-PARENT": [F, `${S010_PARENT}SUB-020 承担的流水线部分见 VW-SUB020-AC001；B1 出在本单 runScBatch 的精翻关闭分支。`],
  "VW-SUB020-INHERIT-001": [S, `${S010_I001}本单交付的是 sc-translation/ 与 Q23 的 validation 改动。`],
  "VW-SUB020-INHERIT-005": [S, `${S010_I005}本单交付的是 cue-sheet.ts 与 pipeline.ts 的称呼流程。`],
  "VW-SUB020-INHERIT-006": [S, S010_I006],
  "VW-SUB020-INHERIT-008": [F, `${S010_I008}B1 出在本单的 runScBatch。`],
  "VW-SUB020-INHERIT-009": [S, S010_I009],
  "VW-SUB020-INHERIT-010": [F, `${S010_I010}B1 出在本单的 runScBatch。`],
  "VW-SUB020-INHERIT-011": [S, "审查：小抄只随返回值给出，不落库、不写日志；流水线不写数据库，不让浏览器或 AI 直写，也不在队列或日志里复制正文（设计 §4）。"],
  "VW-SUB020-INHERIT-012": [S, "审查：流水线不暴露路由；SC 正文只作为条目的 text 交给模型，模型输出经 validateScBatch 校验后才使用，生成文本经规则引擎检查（E50 C）；本单不涉及输出凭据与角色。"],
  "VW-SUB020-INHERIT-017": [S, S010_I017],
  // ======================================================== VOXWARD-STORY-011
  "VW-S011-AC001": [S, `${GATES}${S011_TESTS}${S011_AC}${S011_OUT_OF_SCENE}`],
  "VW-S011-PARENT": [S, S011_PARENT],
  "VW-S011-INHERIT-001": [S, S011_I001],
  "VW-S011-INHERIT-005": [S, S011_I005],
  "VW-S011-INHERIT-006": [F, S011_I006_FAIL],
  "VW-S011-INHERIT-008": [F, S011_I008_FAIL],
  "VW-S011-INHERIT-009": [S, S011_I009],
  "VW-S011-INHERIT-010": [S, S011_I010],
  "VW-S011-INHERIT-011": [S, S011_I011],
  "VW-S011-INHERIT-012": [S, S011_I012],
  "VW-S011-INHERIT-017": [F, S011_I017_FAIL],
  // ======================================================== VOXWARD-SUB-021
  "VW-SUB021-AC001": [S, `${GATES}${S011_TESTS}SUB-021 承担的复盘触发、选择、别名与统一结算成立，实测用真实协调器、真实计分引擎与 SQLite 计分端口（E60 §B、§C）。无重复计分：一次结算账本一行，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息只结算一次（C1、C2）。无依据计分：人工先处理、删除开始后结算时 NOT_ELIGIBLE，例外主体由端口拒绝记 REFUSED，账本都是 0 行（C3、C5）。失效数据不恢复：删除中的待计分项在重放时记 NOT_REQUIRED（runner.ts）。证据到期标记未结算到期，不编造评分结果：证据到期的项标 UNSETTLED_EXPIRED，不送模型、不计分（C4）。重复任务：同一事件重复入队只得到一个任务，选择时同一事件只计一次（selection.test.ts）。${S011_OUT_OF_SCENE}`],
  "VW-SUB021-STORY": [S, "复用 VW-SUB021-AC001 的同次执行（E02–E08、E60）。SUB-021 承担的「周期/数量/下播触发；任务内临时作者别名；已处理/例外/删除/过期排除；统一结算」在本行场景下成立：三种触发（triggers-alias.test.ts）、排除与到期（E60 C3、C4）、别名（E60 B）、经同一计分引擎结算一次（E60 C1、C2）。本行只证明 SUB-021 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。B2、B3、B4 出在本单的 runner.ts，判在本单的 INHERIT-006、INHERIT-008、INHERIT-017。"],
  "VW-SUB021-PARENT": [S, `${S011_PARENT}SUB-021 承担的复盘部分见 VW-SUB021-AC001。`],
  "VW-SUB021-INHERIT-001": [S, `${S011_I001}本单交付的是 review/ 与 Q38。`],
  "VW-SUB021-INHERIT-005": [S, `${S011_I005}本单承担复盘选择与别名。`],
  "VW-SUB021-INHERIT-006": [F, `${S011_I006_FAIL}本单交付的 runner.ts 是这一接法的一方。`],
  "VW-SUB021-INHERIT-008": [F, `${S011_I008_FAIL}本单交付的 runner.ts 负责这一校验。`],
  "VW-SUB021-INHERIT-009": [S, S011_I009],
  "VW-SUB021-INHERIT-010": [S, S011_I010],
  "VW-SUB021-INHERIT-011": [S, S011_I011],
  "VW-SUB021-INHERIT-012": [S, "审查：复盘运行器不暴露路由；待审正文只作为模型输入的 text，带任务别名前缀，模型输出经 validateReviewBatchResult 校验字段后才使用（整批契约的缺口见 INHERIT-008）；本单不涉及输出凭据与角色。"],
  "VW-SUB021-INHERIT-017": [F, `${S011_I017_FAIL}本单交付的 runner.ts 持有这份副本。`],
  // ======================================================== VOXWARD-SUB-022
  "VW-SUB022-AC001": [S, `${GATES}candidates 2 个文件 14 项通过（E05）。AI 不直接修改规则：复盘结果里的候选词经 propose 只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId、sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并记决定者与时间（E60 F1、F4）。无权限人员确认：按真实角色矩阵 DATA_ADMIN 得 403，其它频道的房管得 404，都不发布（E60 F2、F3）。确认后规则版本更新：房管确认后规则端口调用一次，卡片带规则版本 2；再次确认 409，不再发布（E60 F4、F5）。同频道同一规范化词只建一张卡片（store.test.ts）。规则发布的数据库绑定不在本包，只在端口替身上验证。没有驳回接口（judgment N5）。`],
  "VW-SUB022-STORY": [S, "复用 VW-SUB022-AC001 的同次执行（E02–E08、E60 F）。SUB-022 承担的「候选词卡片及确认接口」成立：卡片只待确认，确认要频道内的 review.decide，确认后以新规则版本发布，来源与状态保留。本行只证明 SUB-022 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。"],
  "VW-SUB022-PARENT": [S, `${S011_PARENT}SUB-022 承担的卡片部分见 VW-SUB022-AC001。`],
  "VW-SUB022-INHERIT-001": [S, `${S011_I001}本单交付的是 candidates/。`],
  "VW-SUB022-INHERIT-005": [S, `${S011_I005}本单承担「候选词须人工确认」。`],
  "VW-SUB022-INHERIT-006": [S, "对照交付边界：候选词卡片与确认路由不接协调器、不入队，也不改其它模块（E11）。复盘运行器与协调器的问题（B2）出在 SUB-021 的交付，本单未触及。完整判据由 VW-AC-006 承载。"],
  "VW-SUB022-INHERIT-008": [F, `${S011_I008_FAIL}本单承担的卡片也受影响：重复 itemId 时，卡片里的候选词取自后一条结果。`],
  "VW-SUB022-INHERIT-009": [S, `${S011_I009}本单的卡片只含候选词、备注与来源引用，不含正文与发送者引用。`],
  "VW-SUB022-INHERIT-010": [S, "对照交付边界：候选词卡片不调用模型，不涉及模型选择；本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。"],
  "VW-SUB022-INHERIT-011": [S, "审查：卡片存储只有内存实现，确认用一次比较交换改状态；规则发布经 CandidateRulePort，由数据库绑定在一个事务里写 rule_versions 与 rule_terms（store.ts 注释，绑定不在本包）。卡片只含候选词、备注与来源引用，不含正文；AI 不直写规则（E60 F1）。"],
  "VW-SUB022-INHERIT-012": [S, "审查本单暴露的接口：路由先查能力再读输入，列表要 queue.read，确认要 review.decide，卡片 ID 校验形状；按真实角色矩阵 DATA_ADMIN 确认得 403，其它频道房管得 404，重复确认 409（E60 F2–F5）；卡片视图不返回决定者引用。确认用 review.decide 而 S014 的词条入库用 list.edit，现在两者授给同样的角色（judgment N5）。本单不涉及输出凭据。"],
  "VW-SUB022-INHERIT-017": [S, "审查本单涉及的数据：卡片在内存里，带来源 correlationId 与任务 ID，不含正文；确认后的规则只经规则端口写入，本单不重建已删数据。删除流程本批没有实现，卡片与删除索引的关系要在 S019 定，设计还没有写明（judgment N6）。"],
  // ======================================================== VOXWARD-STORY-014
  "VW-S014-AC001": [F, `${GATES}${S014_TESTS}${S014_AC_FAIL}`],
  "VW-S014-PARENT": [F, S014_PARENT],
  "VW-S014-INHERIT-001": [S, S014_I001],
  "VW-S014-INHERIT-002": [S, S014_I002_Q19],
  "VW-S014-INHERIT-007": [F, S014_I007_FAIL],
  "VW-S014-INHERIT-009": [S, S014_I009],
  "VW-S014-INHERIT-011": [S, S014_I011],
  "VW-S014-INHERIT-012": [S, S014_I012],
  "VW-S014-INHERIT-017": [S, S014_I017],
  // ======================================================== VOXWARD-SUB-026
  "VW-SUB026-AC001": [S, `${GATES}decision-service/service 2 个文件 10 项、db decision-store 3 项、scoring-engine/ledger 6 个文件 32 项通过（E05）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立（E70）。仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN、计分不变；同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，裁决、投递、账本、Change Log 各 1 行（A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决，并发冲突的 current 都指向存下的那一条（A1、A2、B2）。旧任务结果无效：代次、事件版本变化后提交被拒且不写入；计分失败时裁决与投递一起回滚（A3、G1）。超时重试：同一种任务对同一事件版本只有一行，重试的 AI 提交按 A1 得 TASK_NOT_OPEN。多进程只做了 6 个进程的一次同时提交，未做压力测试。`],
  "VW-SUB026-STORY": [S, "复用 VW-SUB026-AC001 的同次执行（E02–E08、E70 A、B、G）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立：提交守卫在事务内重读任务状态、事件版本、主体代次与当前裁决，冲突返回当前结果，不覆盖、不重复结算。本行只证明 SUB-026 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 判为 failed（B5 出在 SUB-027）。"],
  "VW-SUB026-PARENT": [F, `${S014_PARENT}SUB-026 承担的部分见 VW-SUB026-AC001。`],
  "VW-SUB026-INHERIT-001": [S, `${S014_I001}本单交付的是 service.ts、concurrency.ts、routes.ts、提交的数据库绑定，以及 Q19、Q21 的计分改动与迁移 0005。`],
  "VW-SUB026-INHERIT-002": [S, `${S014_I002_Q19}身份键的改动在本单的提交（a5bc073）里。`],
  "VW-SUB026-INHERIT-007": [F, `${S014_I007_FAIL}本单承担的人工接管、乐观并发与任务代次成立，见 VW-SUB026-AC001。`],
  "VW-SUB026-INHERIT-009": [S, S014_I009],
  "VW-SUB026-INHERIT-011": [S, S014_I011],
  "VW-SUB026-INHERIT-012": [S, S014_I012],
  "VW-SUB026-INHERIT-017": [S, `${S014_I017}score_outcomes 由本单引入。`],
  // ======================================================== VOXWARD-SUB-027
  "VW-SUB027-AC001": [F, `${GATES}decision-service/compensation 3 个文件 22 项通过（E05）。成立的部分：无旧结果重建或机械加回配置分：改判按原账本行的 actual_delta 取反、经当前上下限钳制（下限处只扣 −1 的 BLOCK 纠 +1）；同一事件只纠一次；同操作标识幂等；代次变化后改判被拒（E70 C1–C3，overturn.test.ts 10 项）。名单与词条操作按权限拒绝：按真实角色矩阵 DATA_ADMIN 的名单与词条编辑都被拒、不写入；房管与所有者可编辑，黑白名单互斥（E70 F1、F2）。显式补发受有效期限制：只补已过期的投递，到达 10 分钟内，新投递有效 60 s，同操作标识幂等，代次变化后拒绝（E70 E1、E2）。不成立的部分：补发必须明确。改判一条 2 小时前被 BLOCK 的消息为放行时，存储层插入一条 PENDING、下游结论 ALLOW、有效 5 分钟的投递并返回 DeliveryIntent，消息不经补发动作、也不受补发的 10 分钟时限就会重新投递；同一消息走补发得 WINDOW_CLOSED（E70 D1、D2，judgment B5）。另：后续条目触及上下限时纠分不重算（E70 C5，judgment N4）。`],
  "VW-SUB027-STORY": [F, "复用 VW-SUB027-AC001 的同次执行（E02–E08、E70）。SUB-027 承担的「实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作」中，按实际账本补偿、名单与词条权限、显式补发动作成立；改判绕过显式补发重新投递（B5），「补发必须明确」不成立。可重建范围只按该条自己的账本变化纠分，见 N4。本行只证明 SUB-027 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 判为 failed。"],
  "VW-SUB027-PARENT": [F, `${S014_PARENT}B5 出在本单的改判（db/decision-store.ts 的 commitOverturnInTransaction 与 decision-service/compensation.ts）。`],
  "VW-SUB027-INHERIT-001": [S, `${S014_I001}本单交付的是 compensation.ts、resend.ts、list-permissions.ts 与改判、补发、名单词条的数据库绑定。`],
  "VW-SUB027-INHERIT-002": [S, "对照交付边界：改判、补发、名单与词条与 platform-source 没有接点；本单不改接入、身份映射与配额（E11）。完整判据由 VW-AC-002 承载。"],
  "VW-SUB027-INHERIT-007": [F, `${S014_I007_FAIL}B5 出在本单的改判。`],
  "VW-SUB027-INHERIT-009": [S, S014_I009],
  "VW-SUB027-INHERIT-011": [S, S014_I011],
  "VW-SUB027-INHERIT-012": [S, S014_I012],
  "VW-SUB027-INHERIT-017": [S, `${S014_I017}改判与补发的代次守卫由本单实现。`],
};
