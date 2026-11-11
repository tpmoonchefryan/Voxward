// Outcome and evidence text of every acceptance row, keyed by acceptance id. One source for acceptance.md and the
// evidence records. Texts avoid backslashes and double quotes on purpose.
const GATES = "候选 b1a1471 检出：install --frozen-lockfile、build、typecheck、test（88 个文件 941 项）、check:deps（162 个文件 0 违规）均退出 0（E02–E06），外连与真实 CLI 拦截下全量测试同样通过（E31）。";

// ---------- S006 ----------
const S006_CORE = "真值表 96 种组合（基础 PASS/REVIEW/BLOCK × 例外 × 付费 × 白名单 × 噪声 × 达到阈值）与按提案 §4.2 流程图独立建立的期望 96/96 一致：例外 ∧ 付费 ∧ 基础未拒绝 现在走 REALTIME_REVIEW 且例外标记为是（第 4 批 N1 已按流程图修正）；快速放行从不出现在例外、付费或基础未通过的组合；评分达阈值者标 UNSETTLED_FAST_PASS，白名单与噪声标 NONE（E20 §3；truth-table.test 106 项）。路由器接真实基础检查与真实计分引擎：例外消息在基础检查之前已登记；例外加基础 BLOCK 直接终结，队列项 BASE_BLOCK，计分 REFUSED；例外加噪声、白名单、分数 99 仍为 REVIEW；例外加付费为 REALTIME_REVIEW，模型完成后下游 ALLOW、计分 REFUSED、账本 0 行、队列项 MODEL；普通付费文本在白名单、分数 99 时仍进入 PAID_TEXT_REVIEW；噪声、白名单、高分三种快速放行下发 ALLOW 且账本调用 0 次，分数 9 进入审核；系统失败不产生裁决、不计分，可 RETRY 与 ESCALATE；人工接管后模型完成被拒（PROCESSING_TRANSITION_INVALID），人工 BLOCK 记 −5；丢弃以 DISCARDED 结算队列项（E20 §4；router.test 15 项、states.test 19 项、exception-queue.test 6 项）。下游只有 ALLOW 或 BLOCK，未决项 downstream 为 null。";
const S006_PARENT = "复用 VW-S006-AC001 在 b1a1471 上的同次执行（E02–E06、E20、E31）。例外每条登记、基础拒绝可终结、其余进入 AI/人工、快速放行不预先加分、下游只有 ALLOW/BLOCK 均成立；例外 ∧ 付费 的分支顺序已与提案 §4 流程图一致（96/96）。S006 的贡献是统一路由真值表、例外队列、处理状态与 Q22 计分接线。";
const S006_I001 = "候选 b1a1471 审查：fa5dc19..b1a1471 中 S006 返工只改 moderation-engine 的 rules/（normalize、transliterate、groups、engine）、routing/truth-table.ts、index.ts 与对应测试；没有改 package.json、check-deps 分区或契约，模块只导入 @voxward/contracts 与本模块文件（check:deps 162 个文件 0 违规，E06）。新增问题码 NORMALIZATION_MISMATCH 是模块内类型；CONTRACT_VERSION 仍为 1；路由不含供应商对象。HTTPS/WSS 远端部署本单未触及。";
const S006_I003 = "路由部分成立：例外先入队列，付费文本始终进入安全审核，白名单与噪声先经基础检查，下游统一 ALLOW/BLOCK（同 VW-S006-AC001，E20）。第 4 批 B1 的复验输入全部符合（E20 §1）：拉丁字母绕过仍被拦截；ば/は、バ/ハ 的全角写法不再互相命中；正则 ばか、バカ、café 命中原文；含 が 键的转写表能构建并把 がか 读作 gaka。「继续遵守 VW-R-003」仍不成立：匹配副本逐单元做 NFKC，半角浊点与半浊点 U+FF9E、U+FF9F 各自成单元，变成组合浊点后无法与前一个假名组合，随后被删除；格式字符 U+200B、U+2060、U+00AD 夹在假名与组合浊点之间时浊点同样丢失（E20 §1–2、E21）。结果：归一化规则 バカ、ブス、デブ、ハゲ、ポンコツ 对半角的 ﾊﾞｶ、ﾌﾞｽ、ﾃﾞﾌﾞ、ﾊｹﾞ、ﾎﾟﾝｺﾂ 全部 PASS，正则 バカ 对 ﾊﾞｶ PASS，归一化规则 ばか 对上述三种夹格式字符的写法 PASS；反向，归一化规则 ハカ 命中 ﾊﾞｶ，扣分规则 カス 命中「ｶﾞｽ代が高い」；转写表 {ガ: ga, カ: ka} 把 ｶﾞｶ 读成 kaka 且标为完整。即 B1 的浊点丢失、バ/ハ 互相命中与转写误读，在 NFKC 等价的写法下仍在。S004 基线 f4808fb 结果相同，c67db24 只因两侧都删全部标记而偶然命中。见 B3，归属 SUB-012。";
const S006_I004 = "VW-R-004 中本单触及的部分成立：Q22 让 BLOCK 携带命中的扣分组，两组扣分 9 与 2、违规分 5 时记 −9；人工完成的 BLOCK 记 −5；noise 与三种快速放行不调用计分；系统失败不计分（E20 §4；scoring-engine index.test 14 项、rules.test 8 项）。B3 的误命中（例如归一化扣分规则 カス 命中半角的「ｶﾞｽ代が高い」，E21）会让无辜消息按规则扣分，该问题归 VW-R-003，不在本行重复判定。";
const S006_I005 = "VW-R-005 中本单触及的部分成立：UNSETTLED_FAST_PASS 只标在评分达阈值的普通消息上，白名单与噪声短路不标（E20 §3–4）；例外主体从不快速放行，不会成为复盘对象；Q8 的持久表 subject_nickname_checks 在空库与 0000–0003 各状态升级到 0004 后都不存在（E60），昵称检查保留 S004 的进程内缓存。复盘结算、跨条别名与候选词确认本单未触及，由 STORY-011 承接。";
const S006_I009 = "审查：路由与基础检查不构造 AI 输入，不保存会话、提示或工具轨迹；例外队列项只含（channelId, platformMessageId）键、correlationId 与结算结果，不含正文（routing/exception-queue.ts，本轮未改）。AI 输入与会话清理本单未触及，由 STORY-008 承接。";
const S006_I011 = "审查：路由不读写数据库，处理状态经 toStoredTaskStatus 映射到 tasks.status 现有取值；例外队列不复制正文；Q8 删除持久昵称检查表（E60：空库与各前驱状态升级后都没有该表）。短事务提交、verdicts 与 deliveries 写入本单未触及，由 STORY-014 承接。";
const S006_I012 = "审查：路由只消费调用方给出的事实，不暴露接口、页面或运行权限，不把待审正文交给任何工具；频道范围取自事件本身。Q12 的准入错误为 RULE_SET_INVALID: REGEX_GROUP_ALTERNATION at alt 加固定提示，不回显模式原文（E20 §4）。鉴权与输出凭据本单未触及（STORY-003 已验收）。";
const S006_I014 = "VW-R-014 中本单触及的部分成立：例外消息在任何短路之前登记；基础明确拒绝可直接结束；其余进入 REVIEW，例外 ∧ 付费按流程图走 REALTIME_REVIEW；白名单、噪声、高分对例外一律无效（96 组合与路由实测，E20 §3–4）；实时 BLOCK 与模型完成的计分都被例外守卫拒绝（REFUSED）。身份、复盘与人工调分的守卫属 STORY-005（已验收），恢复计分本单未触及。";
const S006_I017 = "审查与实测：DISCARD 用于过期代次或已删除，非终态可转 DISCARDED，不产生裁决，例外队列项以 DISCARDED 结算；系统失败有 RETRY 与 ESCALATE 两个去向；终态拒绝后续步骤（E20 §4；states.test 19 项）。例外队列只有进程内实现，重启后丢失，S006 设计 §9 已列为缺口。删除编排、到期与恢复本单未触及，由 STORY-019、STORY-020 承接。";

// ---------- S008 ----------
const S008_GATES = "候选 b1a1471 检出：install --frozen-lockfile、build、typecheck、test（88 个文件 941 项）、check:deps（162 个文件 0 违规）均退出 0（E02–E06）。";
const S008_IN = "外发：假 CLI 截获的 stdin 只有 6 行固定任务说明与 {items:[{itemId,text}]}，itemId 为每批新生成的 UUID v4；两个 correlationId（含伪造的平台 ID 与昵称片段）、batchId、vws_ 秘密与探针进程里的 KIRO_API_KEY 都不在 stdin 或 argv 中；argv 恰为 chat --no-interactive --output-format stream-json --agent-engine v2 --trust-tools=；CLI 环境只有调用方给定的 3 个键；运行中 cwd 模式 700，只有 .voxward-session 与 session.json（600）（E30 §1）。";
const S008_PERM = "宿主权限：固定参数不信任任何工具，禁用 --trust-all-tools/-a、--cloud、--repo、--resume/-r、--resume-id、--trust-workspace；本机 kiro-cli 已自动升级为 3.2.0，这些参数在 3.2.0 的 chat --help 中仍存在、含义不变，--list-sessions 与 -f json 也已列出（E11）。deploy/kiro-runtime 新增 agent.template.json（tools、allowedTools、mcpServers 为空）与 README §1.1 分账号启动说明，都标为部署要求或待实测（第 4 批 N3）。无业务库直写：适配器在 adapters 区，不导入 db 区（check:deps 0 违规），CLI 环境里没有数据库路径。";
const S008_CLEAN = "本地残留：成功、CLI 失败（stderr 私密标记不进错误对象）、模型多给条目、输出不是 JSON、输出超过 1 MiB、超时、取消 7 种结局后运行根都为空，CLI 进程已退出；成功与取消都按运行流里的会话 ID 发出 chat --delete-session；空批次在启动进程前以 REQUEST_INVALID 拒绝（E30 §2）；会话 ID 在 CLI 仍运行时已写入 session.json（E30 §3）。异常重启（第 4 批 B2 复验）：扮演服务端的子进程被 SIGKILL 后，session.json 为 running、pid 为 CLI、kiroSessionId 已记录，CLI 仍存活；重启后的扫描先读 /proc/PID/cwd 确认身份为 RUNS_IN，再对进程组发 SIGTERM、SIGKILL，CLI 结束后才发删除请求：报告 removed 1、terminated 1、kiroSessions {requested 1, failed 0, notObserved 0}，删除请求恰 1 次且在该运行目录内，目录已删除（E30 §4）。没有流出会话 ID 的存活孤儿在终止后经 chat --list-sessions -f json 找到会话并删除，notObserved 0（E30 §4b）。pid 复用反例：同用户的无关进程（cwd 不同）被判 OTHER，从未收到信号且仍存活；另一用户的进程（pid 1）身份无法确认，不发信号，目录保留并写 needs-manual.json（IDENTITY_UNCONFIRMED）（E30 §5）。列表为空、列表不可读、未配置 CLI、删除失败各有确定去向，失败的删除在下一轮扫描重试成功；本进程运行中的批次不被扫描；周期扫描能处理启动后才出现的孤儿（E30 §6–7；crash-drill.test 1 项、orphan-sweep.test 12 项、cleanup.test 11 项、lifecycle.test 8 项）。执行后没有残留的假 CLI 进程。";
const S008_BOUNDARY = "留存边界：docs/security/ai-retention-boundary.md 新增崩溃恢复路径一节，仍写明 DELETE_REQUESTED 只表示 CLI 以退出码 0 接受删除命令，应用侧清理不等于提供方删除，Archive 与回收区不算删除，并列出未覆盖的窗口（记录 pid 之前崩溃、分账号部署下的信号权限、同一运行根只能有一个服务进程）。";
const S008_REAL = "真实 Kiro：按本行方法（minutes:8fc0b8640384844e0b2a1787#D1）以假 CLI 替身测试，真实 Kiro 调用未验证，移到 STORY-029 部署演练；本轮只运行了 kiro-cli --version 与 chat --help（E11），全量测试中 kiro-cli 垫片调用 0 次（E31）。";
const S008_AC = `${S008_GATES}${S008_IN}${S008_PERM}${S008_CLEAN}${S008_BOUNDARY}${S008_REAL}expected 各部分在 b1a1471 上成立。`;
const S008_PARENT = `复用 VW-S008-AC001 在 b1a1471 上的同次执行（E02–E06、E11、E30、E31）。受限输入、无业务库直写与宿主权限、成功/失败/取消/超时与服务端崩溃后的清理（删除请求 1 次、notObserved 0、存活孤儿确认身份后才终止、pid 复用不误杀）、留存边界说明均成立，第 4 批 B2 已修复。${S008_REAL}`;
const S015_AC = `${S008_GATES}${S008_IN}运行流不被当作业务结果：tool_call 等非文本事件被忽略，只拼接 agent_message_chunk 文本；业务文本前加说明文字时整批 RUN_OUTPUT_NOT_JSON（E30 §2；run-stream.test 10 项）。业务 JSON 只经注入的校验器生效：模型多给一条自造 itemId 时整批 RUN_OUTPUT_INVALID，validationCodes 只有 OUTPUT_TOO_MANY_ITEMS，不回显该 itemId；通过后结果每项带 correlationId、模型看到的 itemId、classification、reasonCodes，有命中时带 matchedSpan，itemId 与 stdin 中的一致（第 4 批 N4，E30 §1）。Q24 边界不变：2 条输入对 1 万条输出只报 1 条 OUTPUT_TOO_MANY_ITEMS，60 条错误 itemId 截为 50 条且末条 ERRORS_TRUNCATED，64 个 emoji 的 itemId 通过、65 个被拒（E32）。能力声明 providerName kiro-cli、supportsCancel true，取消经假 CLI 实测；KIRO_CLI_TESTED_VERSION 为 3.1.0，所用参数在本机 3.2.0 的 chat --help 中仍成立（E11）。按本行方法，无可用环境时以替身测试：真实 Kiro 调用未验证，stream-json 事件形状、--agent-engine v2 与空 --trust-tools= 的真实行为待实测（真实演练在 STORY-029）。expected 各部分在 b1a1471 上成立。`;
const S015_STORY = "复用 VW-SUB015-AC001 的同次执行（E11、E30、E32）：SUB-015 承担的能力声明、headless 运行流与业务 JSON 分离、必要文本与临时编号输入、结果项回传 itemId 与理由码都成立，真实调用按方法标明未验证。本行只证明 SUB-015 承担的部分；VOXWARD-STORY-008 的完整判据 VW-S008-AC001 当前为第 2 版（本行 expected 写的 @1 是 D1 改版前的版本号），另行判定为 satisfied。";
const S016_AC = `${S008_GATES}无业务库直写：适配器不导入 db 区，CLI 环境由调用方完整给出、不继承服务端环境（E30 §1）。${S008_PERM}${S008_CLEAN}${S008_BOUNDARY}${S008_REAL}expected 各部分在 b1a1471 上成立。`;
const S016_STORY = `复用 VW-SUB016-AC001 的同次执行（E30）。SUB-016 承担的取消、成功与失败清理、服务端崩溃后的孤儿清理（确认身份后终止、删除请求 1 次、notObserved 0、无法处理时保留目录并写原因码）、Crew 元数据与内容隔离（运行目录只有标记与元数据）都成立；独立受限运行环境只有模板与说明（deploy/kiro-runtime）。${S008_REAL}本行只证明 SUB-016 承担的部分；VOXWARD-STORY-008 的完整判据 VW-S008-AC001 当前为第 2 版，另行判定为 satisfied。`;
const S008_I001 = "候选 b1a1471 审查：返工改动只在 apps/server/src/adapters/kiro-cli（新增 active-runs.ts、process-probe.ts）、合成适配器、contracts 的 inference-provider.ts（结果项增加 itemId、reasonCodes、matchedSpan）、deploy/kiro-runtime 与 docs/security；适配器只用 Node 内置模块与契约，不导入模块区或 db 区（check:deps 0 违规，E06）；没有新增依赖；未接入组合根（registry.ts、main.ts 未改）；业务层只见 InferenceProvider 契约。契约改动由类型检查覆盖（E04），CONTRACT_VERSION 仍为 1，仓库外没有消费者。";
const S008_I005 = "本单交付不改变 VW-R-005 对应模块的职责：模型输入不含昵称、昵称历史或称呼（E30 §1），昵称缓存与安全称呼仍在 moderation-engine。复盘、跨条别名与候选词本单未触及，由 STORY-011 承接；本行完整判据仍由 INIT 的 VW-AC-005 承载。";
const S008_I006 = "并发池、微批与调度本单未触及，由 STORY-009 承接。适配器为调度提供有界的执行单元：同一 batchId 重复提交被拒，批大小上限 maxItems 由调用方给出，超时、stdout 上限与取消在 E30 §2 实测；周期孤儿扫描不重叠运行，计时器不阻止进程退出（orphan-sweep.ts，E30 §7）。没有改变其它模块职责；完整判据仍由 INIT 的 VW-AC-006 承载。";
const S008_I008 = "本单对 VW-R-008 的连接证据：Q24 边界在 b1a1471 上不变（E32：1 万条输出对 2 条输入只报 OUTPUT_TOO_MANY_ITEMS；60 条错误截为 50 条，末条 ERRORS_TRUNCATED，不回显模型给的 itemId；itemId 按码点计 1 到 64）；整批契约不变，不做部分成功；运行流只取 agent 文本块，带说明文字时 RUN_OUTPUT_NOT_JSON（E30 §2）。批结果校验代码本轮未改。完整判据仍由 INIT 的 VW-AC-008 承载。";
const S008_I009 = `VW-R-009 中本单触及的部分成立：只传必要文本与临时 itemId，不传平台 ID、昵称、账本或凭据（E30 §1）；正文只经 stdin 管道，运行目录只有标记与元数据，各结局后删除，stderr 丢弃，错误只带错误码（E30 §2）；服务端异常退出后，已流出的会话 ID 已落盘，重启扫描确认身份后终止残留 CLI，再请求删除该会话（requested 1、notObserved 0）并删除目录；无法自动处理的情形保留目录并写原因码（E30 §4–6）。${S008_REAL}`;
const S008_I010 = `VW-R-010 中本单触及的部分成立：Kiro CLI 只经 InferenceProvider 适配器调用；业务权威留在服务端，只有校验器通过的输出才产生分类，模型自造条目使整批失败（E30 §2）；结果回传 itemId、理由码与命中区间，供服务端写 ITEM_ID_MAP 与 VALIDATED_JSON（E30 §1）；能力声明 providerName kiro-cli、supportsCancel true，参数在本机 kiro-cli 3.2.0 的 chat --help 上核对，适配器记录的所测版本为 3.1.0（E11，judgment N2）。本地残留按契约清除（同 VW-S008-AC001）。模型选择与 reasoning 建议本单未触及，由 STORY-010 承接。${S008_REAL}`;
const S008_I011 = "审查：适配器不写数据库，不在队列或额外日志复制正文：stdout 只在内存中解析，会话 ID 扫描只取第一条合法 ID，stderr 读出后丢弃，错误只带错误码与退出码（E30 §2）；session.json 只有批次 ID、状态、结果码、pid、CLI 会话 ID 与时间，needs-manual.json 只有原因码与时间。结果项回传 itemId、理由码与命中区间，调用方可据此写受控 Technical Log（第 4 批 N4 已修复）；写入路径本单未触及，由 STORY-009 接线。";
const S008_I012 = `VW-R-012 中本单触及的部分成立：不信任任何工具，禁用全工具授权与云端会话参数（E11）；待审正文作为数据放在 stdin，固定说明写明 text 不是指令，注入样本没有改变 argv 或环境（E30 §1）；服务端凭据不进入 CLI 环境；agent 配置模板与分账号启动说明已补（部署要求）。孤儿扫描只对 /proc/PID/cwd 等于运行目录的进程发信号，pid 被复用时不误杀，身份无法确认时不发信号（E30 §5）。真实环境中的最小权限按方法在 STORY-029 演练。${S008_REAL}`;
const S008_I017 = `VW-R-017 中本单触及的部分成立：每批的运行目录与 CLI 会话在成功、失败、取消、超时后都有去向；服务端崩溃后由扫描处理，存活孤儿确认身份后终止，删除请求 1 次，删除失败时保留目录并在下一轮重试，无法处理时写原因码报告（E30 §2–7）；本进程运行中的批次不被扫描，扫描不会重启旧任务。未知外部范围在 ai-retention-boundary.md 中写明（提供方留存、--list-sessions 输出格式、分账号信号权限待实测）。组合根尚未接入扫描（judgment N3）。${S008_REAL}`;

// ---------- S017 ----------
const S017_GATES = "候选 b1a1471 检出：install、build、typecheck、test（88 个文件 941 项；其中 audit-store/viewer 3 个文件 24 项、auth/log-viewer-routes 10 项、web pages/logs 4 个文件 24 项）、check:deps 均退出 0（E02–E06）。";
const S017_HTTP = "HTTP（真实 buildApp 与 SQLite、合成数据，经 Vite 代理，E40）：未登录 401；下游输出凭据、无 logs.view 的房管、无成员关系的账号、另一频道的主播对 4 个查看器路由一律 403；本频道路径读另一频道的 logId 为 404，读另一频道的关联链为空页，Change Log 按另一频道的 correlationId 过滤为 0 条；坏游标、页长 101、未知查询字段为 400；/api/logs、导出、下载、ndjson、按 batchId 读取等 11 个路径为 404，查看器路由不接受写请求。列表只含元数据（不含 data 与 evidence），200 响应都是 no-store。130 条的关联链在默认页长下分 50/50/30 三页、页长 100 分 100/30、页长 7 分 19 页，序号严格递增，三种翻页得到同一组条目，含重试序号 1 与 2、批次 batch-7。字段权限：主播看到 VALIDATED_JSON、ITEM_ID_MAP、TRANSLATION 与 MESSAGE_TEXT；带日志权限的房管只看到 MESSAGE_TEXT 与 TRANSLATION；带日志权限的数据管理员只看到 ITEM_ID_MAP 与 VALIDATED_JSON；无权限的种类整段不出现。微批：成员一的详情只含自己的正文与 JSON，不含同批成员二的文本，链只含自己的 3 条，没有按 batchId 读取的接口。到期：证据过 7 天显示 EXPIRED 且 payload 为 null，元数据过 30 天的条目从列表、链与详情中消失。删除：先读成员二的详情使其进入缓存，再经 S016 的 removeSubject 删除 subject-2，详情立即 404，链为空，列表不再出现，同链 Change Log 摘要变为 DATA_REQUEST_CERTIFICATE，成员一不受影响。";
const S017_UI = "浏览器交互（Chrome for Testing headless shell，CDP 真实鼠标事件，经 Vite 页面 /logs/channel-1，E41）：Technical Log 入口首屏 50 行，加载更多后追加到 100 行且首行不变；点中第 55 行之后的一条中段条目，关联链翻页加载完 130 条并高亮该条；下一条、上一条各移一位，直接点选首条时上一条禁用、末条时下一条禁用；Change Log 入口的处理链按 correlationId 打开同一链并选中首条。JSON 面板标出任务 task-1、模型 model-synthetic-x、契约版本 1、规则模板版本 rules-synthetic-3；三个内容区默认折叠，展开后校验后 JSON 缩进显示。带日志权限的房管只看到译文与消息原文区，没有校验后 JSON 与临时编号映射；无日志权限的房管和访问另一频道时页面只显示拒绝提示，没有条目。不可信文本（含 U+202E、U+200B、U+2067）原样保留在 bdi 元素内，计算样式 unicode-bidi 为 isolate（Q15）。页面打开时删除 subject-2，切回该条显示这条日志不存在或已经到期，返回列表后其条目消失。";
const S017_PARENT = "复用 VW-S017-AC001 在 b1a1471 上的同次执行（E40、E41）。跨页完整链、未授权正文不可读、批 JSON 不串条、删除与到期后不再显示、无公开或下游查询与原始下载均成立。S017 的贡献是内部查询接口与查看器页面。";
const S017_I001 = "候选 b1a1471 审查：查看器代码在 modules/audit-store/viewer/（只导入 @voxward/contracts 与本模块文件），HTTP 绑定在 auth/log-viewer-routes.ts，访问适配器 auth/log-viewer-access.ts 由组合根传入；契约新增 viewer/log-viewer.ts 与 AuditLogPort 的读方法；web 新增 @voxward/contracts 工作区依赖（锁文件随之更新），没有新增外部依赖；分区规则未改（check:deps 162 个文件 0 违规，E06）。查看器只在服务端内部，经远端管理页面使用，没有引入新的本机代理或托管服务。";
const S017_I009 = "审查：查看器只读 Technical Log 与 Change Log，不构造 AI 输入、不保存会话或提示；内容字段按权限逐次裁剪，列表不含内容；缓存只在进程内保存单条详情原始行，随删除事件或最早到期时间失效，不落盘（cache.ts；cache.test 7 项）。AI 会话本单未触及，由 STORY-008 承接。";
const S017_I011 = "审查：查看器只有 GET 路由，不写数据库；读端口（db/audit-log.ts）按频道与到期时间过滤，不复制正文到其它表或日志；路由错误日志只记错误码（log-viewer-routes.ts）。写入路径属 S016（已验收）与后续接线。";
const S017_I012 = "VW-R-012 中本单触及的部分成立：每次请求都校验会话、频道成员关系、logs.view 与内容字段能力；下游输出凭据、无日志权限的房管、非成员、另一频道主播一律 403；跨频道对象为 404 或空页；错误体只含固定代码；页面不可信文本经 S003 组件渲染并以 bdi 隔离（E40、E41）。查看器路由只接受 GET，不涉及 CSRF。";
const S017_I013 = "本单交付不改变 VW-R-013 对应模块（数据面板）的职责：查看器只读日志，不登记或执行数据请求；数据面板由 STORY-018 承接（本轮另行判定）。完整判据仍由 INIT 的 VW-AC-013 承载。";
const S017_I014 = "本单交付不改变 VW-R-014 对应模块的职责：查看器只读，不改变例外、计分或审核路径；例外与计分守卫属 STORY-005、STORY-006。完整判据仍由 INIT 的 VW-AC-014 承载。";
const S017_I015 = "VW-R-015 中本单触及的部分成立：查看器只有 Change Log 与 Technical Log 两个入口，没有第三类日志；模型建议（Technical Log 的校验后 JSON）与已生效事实（Change Log）分开显示；已删除的条目不再显示，同链 Change Log 摘要为处理凭证；密钥与完整会话不在查看器中（E40、E41）。";
const S017_I016 = "VW-R-016 中本单触及的部分成立：任一 Technical Log 可跨分页打开同关联的全部获准条目，按 sequence 稳定排序，可上一条、下一条、直接选择并保持选中项；详情折叠显示格式化的校验后 JSON，并标出任务、模型与契约版本；内部查询每次授权（E40、E41）。taskId、batchId、attempt 都在条目中。契约版本取读取时的常量，目前只有版本 1（judgment N5）。";
const S017_I017 = "审查与实测：删除经 S016 的 removeSubject 发布失效事件，缓存按 logId 与 correlationId 清除，删除后详情 404、链与列表不再出现（E40、E41）；到期按查询时刻过滤，缓存项在最早到期时间失效；关联关系不延长保留期，链读取不重建已删数据。main.ts 由 buildApp 自建失效总线，删除路径接入时必须共用同一总线（judgment N4，STORY-019）。";
const S017_I019 = "VW-R-019 中本单触及的部分成立：两类日志查看器页面 /logs/:channelId 已提供，由路由目录扫描注册，可在浏览器中经 Vite 使用（E41）；页面只显示合成数据。演示 sandbox 本单未触及。";

// ---------- S018 ----------
const S018_GATES = "候选 b1a1471 检出：install、build、typecheck、test（88 个文件 941 项；其中 data-lifecycle-service 7 个文件 46 项、db/data-request-store 8 项、db/data-requests-migration 2 项、web pages/data 3 个文件 20 项）、check:deps 均退出 0（E02–E06）。";
const S018_HTTP = "HTTP（真实 buildApp 与 SQLite、合成数据，经 Vite 代理，E50）：capabilities 对数据管理员为 true，对主播、房管、带日志权限的房管为 false，对非成员 403、未登录 401、下游凭据 403；主体视图、请求列表与登记对主播（无 DATA_ADMIN）、房管、带日志权限的房管、非成员、另一频道主播、下游凭据一律 403；数据管理员读另一频道的主体为 404，走另一频道路径为 403；没有按昵称或平台身份查找的路由。subject-1 与 subject-2 的昵称摘要相同，按稳定 ID 定位得到各自的评分（12 与 −4）、名单与例外，面板不含昵称摘要或平台键。缺 CSRF 令牌的登记为 403 CSRF_INVALID；两种删除都只登记（201，AWAITING_VERIFICATION）；核验缺方式、方式为 NICKNAME、带多余字段、删除缺 mode、访问请求带 mode 均为 400；核验通过（ACCOUNT_OWNERSHIP）后为 AWAITING_EXECUTION，再次核验 409 ALREADY_DECIDED；拒绝后为 REJECTED 且执行状态 CANCELLED；访问请求核验后停在 NOT_EXECUTED_HERE。登记与核验后 subject-1 的有效例外仍在、评分 12、处理代次 0、账本 1 行，subject-2 没有新增例外，名单不变。模拟 STORY-019 写入部分失败后，状态为 PARTIAL_FAILED，计数完成 1、失败 1、待处理 1，失败目标带错误码。没有材料或导出路由；数据请求的 Change Log 摘要都是固定模板。";
const S018_UI = "页面（Chrome for Testing headless shell，CDP 真实鼠标与输入，E51）：数据管理员按稳定 ID 查询 subject-1，看到当前评分 12、身份来源付费会员、名单无、记分例外有效、评分记录 1 条与三类保留数据及天数；仅删除数据写明不新增、也不撤销记分例外；删除并加入记分例外名单写明之后不再计分、每条新消息进入审核、登记时尚未生效；最小偏好说明写明需要保留一条最小偏好记录、不保存旧分数或昵称历史、之后的发言仍会进入审核；页面写明登记本身不删除任何数据，并显示 YouTube 原始内容与平台侧副本不由本实例删除的固定说明。选择后先出现确认，确认后显示已登记、待核验、尚未删除任何数据；核验后显示已核验、等待执行、本页面不执行删除；部分失败显示部分失败、范围计数与失败条目，没有执行完成。同昵称的 subject-2 显示 −4、黑名单、记分例外无，登记组合删除后库中没有新增例外。主播、房管、非成员打开面板只看到无数据管理权限的提示，页面没有输入框和按钮。";
const S018_MIG = "迁移（E60、E61）：journal 0000–0004 idx 连续、when 严格递增，快照 prevId 成链；从 0000、0001、0002、0003 四种前驱状态升级到 0004 都保留原有请求与删除目标（request_kind 回填 DELETE、mode 保留、verification_method 为空），26 张表，integrity_check ok，外键检查 0 处；空库到 0004 再跑一次不变；新增 CHECK 拒绝缺 mode 的删除、带 mode 的访问与无方式的 VERIFIED；含已核验但无方式旧行的 0003 库升级失败并整体回滚。数据字典与实库逐项一致（26 张表、211 列、43 个索引、55 个 CHECK、36 个外键，0 处差异）；drizzle-kit check 通过，generate 无变化。";
const S018_PARENT = "复用 VW-S018-AC001 在 b1a1471 上的同次执行（E50、E51、E60）。不凭昵称核验、两种操作效果清楚、外部范围与失败如实显示、普通删除不撤销既有例外均成立。S018 的贡献是请求登记、核验状态、主体定位与面板入口；主播账号本身不持有 data.handle，同一账号也不能兼任 DATA_ADMIN（E52，judgment N7）。";
const S018_I001 = "候选 b1a1471 审查：模块 modules/data-lifecycle-service 只导入 @voxward/contracts 与本模块文件（请求体校验手写），端口实现在 db/data-request-store.ts 与 db/subject-read.ts，HTTP 绑定在 auth/data-routes.ts，组合根 app.ts 装配；契约新增 ports/data-request.ts；web 新增 contracts 工作区依赖；分区规则未改，check:deps 0 违规（E06）；迁移 0004 由 drizzle-kit 生成骨架，schema 与迁移无漂移（E61）。没有供应商对象进入业务层。";
const S018_I009 = "审查：面板与请求流程不调用 AI，不保存会话或提示；受控材料只含标识与计数，不含昵称、评分历史、正文、证据内容、日志 ID 或 Change Log 原文（export-material.ts；material.test 4 项）；页面写明外部处理不由本实例控制，没有宣称提供方删除。";
const S018_I011 = "审查：每次登记与核验各是一个短事务，请求行与 Change Log 行在同一事务写入，核验用 PENDING 条件更新保证只成功一次（db/data-request-store.ts；E50 的 409）；浏览器只经带 CSRF 的 HTTP 路由写入；Change Log 摘要是固定模板，不复制用户文本或正文（E50）；迁移 0004 在旧库升级时保留行，失败时整体回滚（E60）。";
const S018_I012 = "VW-R-012 中本单触及的部分成立：数据路由逐次校验会话、频道成员关系与 data.handle，写操作校验 CSRF，下游凭据一律 403；普通房管、主播（无 DATA_ADMIN）、非成员、另一频道主播都被拒绝，模块处理器再检查一次；页面对无权限者不渲染任何操作；不可信标识经 S003 组件渲染并包 bdi（E50、E51）。主播账号不能同时兼任 DATA_ADMIN，见 judgment N7。";
const S018_I013 = "VW-R-013 中本单触及的部分成立：面板提供请求受理、核验与状态（含部分失败与外部不可控范围），以及仅删除数据、删除并加入记分例外名单两个入口；两者只登记，页面如实说明尚未执行（E50、E51）。组合操作在事务内先确认偏好、失效旧任务并登记删除再清理，以及重试幂等，属 STORY-019，本单未触及；页面写明登记到执行之间仍会计分。";
const S018_I014 = "VW-R-014 中本单触及的部分成立：普通删除登记与核验后既有例外保持有效，不新增例外；组合删除登记不提前写例外；停止计分请求只登记（E50、E51）。面板写明加入名单只保留最小偏好记录、之后发言仍会审核。例外的建立与恢复计分属 STORY-019，本单未触及。";
const S018_I015 = "本单交付不改变 VW-R-015 对应模块的职责：数据请求只写 DATA_REQUEST_CHANGED 类 Change Log，不新增日志类型；保留类别取自 S016 的 locateSubjectLogs 计数与 RETENTION_DAYS（证据 7 天、元数据 30 天）。完整判据仍由 INIT 的 VW-AC-015 承载。";
const S018_I016 = "本单交付不改变 VW-R-016 对应模块（Technical Log 与查看器）的职责：面板只显示日志计数，不提供日志读取；查看器由 STORY-017 承接（本轮另行判定）。完整判据仍由 INIT 的 VW-AC-016 承载。";
const S018_I017 = "审查与实测：登记不改处理代次、评分、账本、名单与例外（E50）；执行状态 RUNNING、COMPLETED、PARTIAL_FAILED 只由执行路径写入，面板如实显示部分失败与待处理项（E50、E51）；外部范围用固定说明标出。删除代次失效、清理与恢复属 STORY-019、STORY-020，本单未触及。";
const S018_I019 = "VW-R-019 中本单触及的部分成立：数据面板页面 /data/:channelId 已提供，经 Vite 在浏览器中完成查询、登记、核验与状态查看（E51）；只用合成主体。演示 sandbox 本单未触及。";

const ok = (actual) => ({ outcome: "satisfied", actual });
const failed = (actual) => ({ outcome: "failed", actual });

export const ROWS = {
  // STORY-006
  "VW-S006-AC001": ok(`${GATES}${S006_CORE}expected 各部分在 b1a1471 上成立。`),
  "VW-S006-PARENT": ok(S006_PARENT),
  "VW-S006-INHERIT-001": ok(S006_I001),
  "VW-S006-INHERIT-003": failed(S006_I003),
  "VW-S006-INHERIT-004": ok(S006_I004),
  "VW-S006-INHERIT-005": ok(S006_I005),
  "VW-S006-INHERIT-009": ok(S006_I009),
  "VW-S006-INHERIT-011": ok(S006_I011),
  "VW-S006-INHERIT-012": ok(S006_I012),
  "VW-S006-INHERIT-014": ok(S006_I014),
  "VW-S006-INHERIT-017": ok(S006_I017),
  // SUB-012
  "VW-SUB012-AC001": ok(`${GATES}${S006_CORE}expected 各部分在 b1a1471 上成立。`),
  "VW-SUB012-STORY": ok("复用 VW-SUB012-AC001 的同次执行（E02–E06、E20）。SUB-012 承担的名单与例外队列登记、付费文本审核不可跳过、meaningful/noise 内部分类、UNSETTLED_FAST_PASS、系统失败与人工接管状态都成立。本行只证明 SUB-012 承担的部分；VOXWARD-STORY-006 的完整判据 VW-S006-AC001 另行判定为 satisfied。"),
  "VW-SUB012-PARENT": ok(`${S006_PARENT}SUB-012 是 STORY-006 唯一的子单，承担全部交付。`),
  "VW-SUB012-INHERIT-001": ok(S006_I001),
  "VW-SUB012-INHERIT-003": failed(`${S006_I003}Q6 与 B1 的修改在提交 58e2ced（VOXWARD-SUB-012）。`),
  "VW-SUB012-INHERIT-004": ok(S006_I004),
  "VW-SUB012-INHERIT-005": ok(S006_I005),
  "VW-SUB012-INHERIT-009": ok(S006_I009),
  "VW-SUB012-INHERIT-011": ok(S006_I011),
  "VW-SUB012-INHERIT-012": ok(S006_I012),
  "VW-SUB012-INHERIT-014": ok(S006_I014),
  "VW-SUB012-INHERIT-017": ok(S006_I017),
  // STORY-008
  "VW-S008-AC001": ok(S008_AC),
  "VW-S008-PARENT": ok(S008_PARENT),
  "VW-S008-INHERIT-001": ok(S008_I001),
  "VW-S008-INHERIT-005": ok(S008_I005),
  "VW-S008-INHERIT-006": ok(S008_I006),
  "VW-S008-INHERIT-008": ok(S008_I008),
  "VW-S008-INHERIT-009": ok(S008_I009),
  "VW-S008-INHERIT-010": ok(S008_I010),
  "VW-S008-INHERIT-011": ok(S008_I011),
  "VW-S008-INHERIT-012": ok(S008_I012),
  "VW-S008-INHERIT-017": ok(S008_I017),
  // SUB-015
  "VW-SUB015-AC001": ok(S015_AC),
  "VW-SUB015-STORY": ok(S015_STORY),
  "VW-SUB015-PARENT": ok(`${S008_PARENT}SUB-015 承担受限输入、运行流与业务 JSON 分离、能力声明与结果回传（第 4 批 N4）。`),
  "VW-SUB015-INHERIT-001": ok(`${S008_I001}SUB-015 承担其中的契约改动、结果回传与运行流解析。`),
  "VW-SUB015-INHERIT-005": ok(S008_I005),
  "VW-SUB015-INHERIT-006": ok(S008_I006),
  "VW-SUB015-INHERIT-008": ok(`${S008_I008}Q24 改动在 SUB-015 的提交中。`),
  "VW-SUB015-INHERIT-009": ok(`${S008_I009}SUB-015 承担其中的输入部分。`),
  "VW-SUB015-INHERIT-010": ok(`${S008_I010}SUB-015 承担其中的能力声明与结果回传。`),
  "VW-SUB015-INHERIT-011": ok(S008_I011),
  "VW-SUB015-INHERIT-012": ok(`${S008_I012}SUB-015 承担其中的输入与参数部分。`),
  "VW-SUB015-INHERIT-017": ok(`${S008_I017}SUB-015 的部分是运行流中会话 ID 的增量解析。`),
  // SUB-016
  "VW-SUB016-AC001": ok(S016_AC),
  "VW-SUB016-STORY": ok(S016_STORY),
  "VW-SUB016-PARENT": ok(`${S008_PARENT}B2 的修复在本单（提交 70ce4e3）。`),
  "VW-SUB016-INHERIT-001": ok(`${S008_I001}SUB-016 承担其中的生命周期、清理、孤儿扫描与 deploy/kiro-runtime 说明。`),
  "VW-SUB016-INHERIT-005": ok(S008_I005),
  "VW-SUB016-INHERIT-006": ok(S008_I006),
  "VW-SUB016-INHERIT-008": ok(S008_I008),
  "VW-SUB016-INHERIT-009": ok(`${S008_I009}异常恢复部分（B2）归属本单，已修复。`),
  "VW-SUB016-INHERIT-010": ok(S008_I010),
  "VW-SUB016-INHERIT-011": ok(S008_I011),
  "VW-SUB016-INHERIT-012": ok(`${S008_I012}SUB-016 承担其中的孤儿扫描身份确认与部署模板。`),
  "VW-SUB016-INHERIT-017": ok(`${S008_I017}SUB-016 承担其中的清理与扫描。`),
  // STORY-017
  "VW-S017-AC001": ok(`${S017_GATES}${S017_HTTP}${S017_UI}expected 各部分在 b1a1471 上成立：不是仅过滤当前页；未授权正文不可读；批 JSON 不泄露其他消息；删除后缓存与查询同步失效；没有公开、下游通用查询或原始下载。`),
  "VW-S017-PARENT": ok(S017_PARENT),
  "VW-S017-INHERIT-001": ok(S017_I001),
  "VW-S017-INHERIT-009": ok(S017_I009),
  "VW-S017-INHERIT-011": ok(S017_I011),
  "VW-S017-INHERIT-012": ok(S017_I012),
  "VW-S017-INHERIT-013": ok(S017_I013),
  "VW-S017-INHERIT-014": ok(S017_I014),
  "VW-S017-INHERIT-015": ok(S017_I015),
  "VW-S017-INHERIT-016": ok(S017_I016),
  "VW-S017-INHERIT-017": ok(S017_I017),
  "VW-S017-INHERIT-019": ok(S017_I019),
  // SUB-031
  "VW-SUB031-AC001": ok(`${S017_GATES}${S017_HTTP}缓存只存单条详情的原始行，权限在读缓存之前判断，到期时间取元数据与证据中最早的一个（cache.ts；cache.test 7 项）。expected 各部分在 b1a1471 上成立。`),
  "VW-SUB031-STORY": ok("复用 VW-SUB031-AC001 的同次执行（E40）：SUB-031 承担的列表、详情与关联内部接口，跨分页完整链、稳定排序（列表按时间加 id，链内按 sequence），字段级权限都成立；选中项的保持在页面中实测（E41）。本行只证明 SUB-031 承担的部分；VOXWARD-STORY-017 的完整判据 VW-S017-AC001 另行判定为 satisfied。"),
  "VW-SUB031-PARENT": ok(`${S017_PARENT}SUB-031 承担服务端部分。`),
  "VW-SUB031-INHERIT-001": ok(`${S017_I001}SUB-031 承担其中的服务端查询、权限与缓存。`),
  "VW-SUB031-INHERIT-009": ok(S017_I009),
  "VW-SUB031-INHERIT-011": ok(S017_I011),
  "VW-SUB031-INHERIT-012": ok(S017_I012),
  "VW-SUB031-INHERIT-013": ok(S017_I013),
  "VW-SUB031-INHERIT-014": ok(S017_I014),
  "VW-SUB031-INHERIT-015": ok(S017_I015),
  "VW-SUB031-INHERIT-016": ok(S017_I016),
  "VW-SUB031-INHERIT-017": ok(S017_I017),
  "VW-SUB031-INHERIT-019": ok(S017_I019),
  // SUB-032
  "VW-SUB032-AC001": ok(`${S017_GATES}${S017_UI}expected 各部分在 b1a1471 上成立。契约版本取自读取时的 CONTRACT_VERSION 常量，不是写入时记录的值，当前只有版本 1，显示正确（judgment N5）。`),
  "VW-SUB032-STORY": ok("复用 VW-SUB032-AC001 的同次执行（E41）：SUB-032 承担的两类日志入口、上一条、下一条与直接选择、JSON 折叠与模型、任务、契约版本标示都成立。本行只证明 SUB-032 承担的部分；VOXWARD-STORY-017 的完整判据 VW-S017-AC001 另行判定为 satisfied。"),
  "VW-SUB032-PARENT": ok(`${S017_PARENT}SUB-032 承担页面部分。`),
  "VW-SUB032-INHERIT-001": ok(`${S017_I001}SUB-032 承担其中的页面与前端依赖声明。`),
  "VW-SUB032-INHERIT-009": ok(S017_I009),
  "VW-SUB032-INHERIT-011": ok(S017_I011),
  "VW-SUB032-INHERIT-012": ok(S017_I012),
  "VW-SUB032-INHERIT-013": ok(S017_I013),
  "VW-SUB032-INHERIT-014": ok(S017_I014),
  "VW-SUB032-INHERIT-015": ok(S017_I015),
  "VW-SUB032-INHERIT-016": ok(S017_I016),
  "VW-SUB032-INHERIT-017": ok(S017_I017),
  "VW-SUB032-INHERIT-019": ok(S017_I019),
  // STORY-018
  "VW-S018-AC001": ok(`${S018_GATES}${S018_HTTP}${S018_UI}${S018_MIG}expected 各部分在 b1a1471 上成立：不凭昵称完成核验；两种操作效果清楚；外部范围与失败真实显示；普通删除不撤销既有例外。删除执行与组合操作的事务属 STORY-019，本单只登记并显示状态，页面如实说明。`),
  "VW-S018-PARENT": ok(S018_PARENT),
  "VW-S018-INHERIT-001": ok(S018_I001),
  "VW-S018-INHERIT-009": ok(S018_I009),
  "VW-S018-INHERIT-011": ok(S018_I011),
  "VW-S018-INHERIT-012": ok(S018_I012),
  "VW-S018-INHERIT-013": ok(S018_I013),
  "VW-S018-INHERIT-014": ok(S018_I014),
  "VW-S018-INHERIT-015": ok(S018_I015),
  "VW-S018-INHERIT-016": ok(S018_I016),
  "VW-S018-INHERIT-017": ok(S018_I017),
  "VW-S018-INHERIT-019": ok(S018_I019),
  // SUB-033
  "VW-SUB033-AC001": ok(`${S018_GATES}${S018_HTTP}${S018_MIG}expected 各部分在 b1a1471 上成立：不凭昵称完成核验；外部范围与失败真实显示；普通房管没有数据管理权限，路由与模块两层都拒绝。`),
  "VW-SUB033-STORY": ok("复用 VW-SUB033-AC001 的同次执行（E50、E60）：SUB-033 承担的访问、更正、删除、停止计分请求状态，受控材料生成函数（只供服务端调用，不挂 HTTP；material.test 4 项）与普通房管权限区别都成立。本行只证明 SUB-033 承担的部分；VOXWARD-STORY-018 的完整判据 VW-S018-AC001 另行判定为 satisfied。"),
  "VW-SUB033-PARENT": ok(`${S018_PARENT}SUB-033 承担服务端部分。`),
  "VW-SUB033-INHERIT-001": ok(`${S018_I001}SUB-033 承担其中的模块、端口、路由与迁移。`),
  "VW-SUB033-INHERIT-009": ok(S018_I009),
  "VW-SUB033-INHERIT-011": ok(S018_I011),
  "VW-SUB033-INHERIT-012": ok(S018_I012),
  "VW-SUB033-INHERIT-013": ok(S018_I013),
  "VW-SUB033-INHERIT-014": ok(S018_I014),
  "VW-SUB033-INHERIT-015": ok(S018_I015),
  "VW-SUB033-INHERIT-016": ok(S018_I016),
  "VW-SUB033-INHERIT-017": ok(S018_I017),
  "VW-SUB033-INHERIT-019": ok(S018_I019),
  // SUB-034
  "VW-SUB034-AC001": ok(`${S018_GATES}${S018_UI}expected 各部分在 b1a1471 上成立。仅删除数据的说明末句「之后的发言仍按现有规则计分」对已有例外的主体容易误读（judgment N9）。`),
  "VW-SUB034-STORY": ok("复用 VW-SUB034-AC001 的同次执行（E51）：SUB-034 承担的评分、身份、名单、例外、保留类别与到期展示，两种删除按钮与最小偏好说明都成立。本行只证明 SUB-034 承担的部分；VOXWARD-STORY-018 的完整判据 VW-S018-AC001 另行判定为 satisfied。"),
  "VW-SUB034-PARENT": ok(`${S018_PARENT}SUB-034 承担页面部分。`),
  "VW-SUB034-INHERIT-001": ok(`${S018_I001}SUB-034 承担其中的页面与前端依赖声明。`),
  "VW-SUB034-INHERIT-009": ok(S018_I009),
  "VW-SUB034-INHERIT-011": ok(S018_I011),
  "VW-SUB034-INHERIT-012": ok(S018_I012),
  "VW-SUB034-INHERIT-013": ok(S018_I013),
  "VW-SUB034-INHERIT-014": ok(S018_I014),
  "VW-SUB034-INHERIT-015": ok(S018_I015),
  "VW-SUB034-INHERIT-016": ok(S018_I016),
  "VW-SUB034-INHERIT-017": ok(S018_I017),
  "VW-SUB034-INHERIT-019": ok(S018_I019),
};
