// Per-row outcome and evidence text for batch m7b. build-out.mjs turns these into acceptance.md sections and
// evidence-records.json rows. Keys are acceptance ids; every live row of the four work items must have an entry.

const GATES =
  "候选 7400f39 检出：install --frozen-lockfile、build、typecheck、test（144 个文件 1860 项）、check:deps（213 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）；S021 的 10 个测试文件 58 项通过（E05）。";
const HARNESS =
  "E60 用真实 buildApp（迁移后的临时 SQLite、真实签发与撤销路由、真实 ws 端点与投递泵、真实时钟）、真实 ws 客户端与手工握手的 TCP 消费者；S 节用与 app.ts 相同的端点、注册表、db 端口与投递泵，只换成可设置的时钟，改判与补发经 S014 的决策服务与真实存储。";
const FRONT =
  "不输出稳定用户 ID、分数、名单、审核理由或对话：DELIVER、WARD_BLOCKED、HELLO 的键与 NATIVE_FRAME_FIELDS 逐一相同，display 只有 label（恒为 null）、text、translation，帧里没有主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：文本或二进制数据帧一律 4400 断开（C2）。不承诺严格只展示一次：协议文档 §6、§9 与样例 README 写明，消费者按 deliveryId 去重（E62）。";
const SCENARIO =
  "场景：违规消息只发 WARD_BLOCKED、原文不进帧（D2、S1）；重复投递时同一 deliveryId 被重发、样例只显示一次（S9、C4b、E62 E2）；断连有 4408、4413、4403，断开后重连只收到 HELLO（C3、C4、G8、S3）；过期 SC 不补播（S1、S3、S7）；人工补发只有明确操作产生新行且只发一次，SENT 行补发被拒（S5、S6）；凭据撤销后连接 4403 断开、重连 401（G6、G8、G9）。";
const B7_NOTE =
  "B7（改判在一个投递轮次中提交时，投递泵仍按轮次开头的读数发出该行原文，E61）不在本行 expected 列举的项内，判在 Story 与 SUB-040 的 INHERIT-018。";
const B7_DETAIL =
  "不成立的部分（B7）：投递泵每轮对一个频道只读一次可发送的行（delivery.ts:62），逐行 await 发送（:66），发后面的行之前只按新时钟查有效期，不再核对状态与所属裁决；markSent 的比较条件也只有 status 与 valid_until（output-store.ts:231）。某次发送不能同步写完时，这一轮后面的行就按旧读数发出。E61 R1 用真实应用、真实投递泵与真实 ws：一个消费者正常读取、另一个暂停读取；第 1 行写给慢消费者时，房管经 S014 把第 2 行改判为 BLOCK 并已提交（旧裁决 is_current=0，新裁决 BLOCK），26 ms 后正常的消费者收到第 2 行的 DELIVER 与被拦截的原文，该行标为 SENT，之后才收到改判的 WARD_BLOCKED。R2（受控，挂起一次发送）相同；R3：一行在该轮中被标 CANCELLED 后照样发出。对照：R4 时钟越过有效期时被跳过；副本中每行发送前重读一次可发送的行（fix-recheck）后 R1–R3 都成立，E60 其余各项不变。违反设计 §6 与协议文档 §6「只发送 PENDING、validUntil 未过、且属于当前裁决的行」、提案 §13.1 与 VW-R-018「拦截仅无原文/身份的 WARD_BLOCKED」。";

const R001_REVIEW =
  "审查：modules/output-adapter 只导入 @voxward/contracts 与本模块文件；adapters/native-output/socket.ts 只导入 contracts、ws 与 node:http、node:stream 的类型；db/output-store.ts 只导入 contracts、drizzle-orm、node:crypto 与 db 分区；auth/output-grants.ts 导入 db 与本分区（E11）。check:deps 0 违规（E06）；副本中 adapter 导入模块或 db、模块导入 ws 或 db、契约包导入包外路径、db 导入模块都报违规（E09，6 处）。新增运行时依赖只有 ws，esbuild 以 --external:ws 打包，dist 只 import \"ws\"（E07）。契约包新增 output/native-v1.ts 与 ports/output-port.ts 的导出，已有类型未改，CONTRACT_VERSION 仍为 \"1\"（E11）。端口只有平台中性的类型，ws 与 Fastify 只在 adapter 与组合层，不进业务模块。不引入托管服务或本机代理。远端部署与 WSS 终止本单未触及（S029）。";

const R009_REVIEW =
  "审查本单接触的材料：S021 不调用 AI，不构造模型输入（E11）。输出帧只带已批准的正文与译文，发送时从 Technical Log 的 MESSAGE_TEXT、TRANSLATION 证据读出，过期证据不读，不另存副本（output-store.ts readApproved，E60 D1）。日志只写状态、原因码与错误名，不含正文、URL 或凭据（E60 G11、E11）。凭据只存 SHA-256 摘要（G2）。本单不涉及会话、提示或工具轨迹，也不对清理作任何宣称。";

const R010_REVIEW =
  "对照本单与 VW-R-010 对应模块（inference-provider、adapters/kiro-cli、task-coordinator）的接口与实际影响：S021 没有改动这些模块（E11），它们的测试照常通过（E05、E08）。原生输出只读投递表与证据，不经推理适配器。完整判据由 VW-AC-010 承载。";

const R011_REVIEW =
  "审查：签发在一次短事务内写 credential_refs 与 output_grants，撤销在一次短事务内设置两行的 revoked_at（E60 G2、G8）；输出端的状态变更 expireDue、markSent、recordSendFailure、markFailed 各是一次同步短事务，不跨 await，都是比较状态的写入（output-store.ts；S2、S9）；网络发送期间没有打开的事务。投递队列就是 deliveries 表，deliver 只唤醒，不写第二份意图，也不复制正文（index.ts）；正文只在 Technical Log 证据与内存中的帧里。消费者不能写（4400，C2），浏览器与 AI 不直写。没有迁移，表结构未改（E11）。";

const R017_REVIEW =
  "审查本单涉及的数据与恢复：到期与失败有真实去向，validUntil 已过的 PENDING 行比较状态改为 EXPIRED（E60 S2），发送失败 3 次为 FAILED（S9），已批准文本缺失为 FAILED（pump.test.ts）；表没有原因列，原因码未记录（设计 §13 已登记）。输出端不留正文副本（同 INHERIT-011）。重启后只按持久状态发送仍为 PENDING 且未过期的行，SENT 与 EXPIRED 不补播（S3）；改判放行写成 EXPIRED，不会被恢复自动发出（S7）。删除流程（S019）还没有写入方；E61 R3 显示一行在一轮之中被标 CANCELLED 后仍会发出，接入删除前要先按 B7 修复。";

const R019_REVIEW =
  "对照本单与 VW-R-019 对应模块（apps/web 的 Dock、Overlay 与指引页）的接口与实际影响：S021 没有改 apps/web（E11），只提供页面将来使用的原生协议；协议文档写了浏览器类消费者用页面地址的片段交付凭据，真实 OBS 与浏览器未验证（设计 §11）。显示昵称（label 恒为 null）与付费展示信息没有来源。完整判据由 VW-AC-019 承载。";

const R006_PART =
  "VW-R-006 的投递部分成立：有限保序，同一频道按 platformOrder、deliverySequence、id 发送，前一行未成功时后面的行等待（E60 D4、S9），每轮每频道 50 行、过期每轮 500 行、失败 3 次为上限（S8、S9）；投递 ID/状态，deliveryId 稳定，PENDING、SENT、EXPIRED、FAILED 由输出端以比较状态的写入改变（S1、S2、S9）；有效期，过期行不发、重连不补播，补发的新行只有 60 s（S1、S3、S6）。推理并发、微批与付费优先不在本单。";

const R012_PART =
  "VW-R-012 的本单部分成立：WebSocket 在升级前逐连接鉴权，每个心跳周期重读授权（E60 G6）；凭据只读、可撤销（G8、G9），不走查询串、Authorization、Cookie 或其它头（G5），日志与错误体不含凭据（G11、Q1–Q4）；签发与撤销要求频道所有者的 tokens.manage 与 CSRF，房管、数据管理员、其它频道所有者被拒（G3、G8）；房间由授权决定，频道隔离（G7）；原生凭据打不开任何 HTTP 路由（G10）；400、414、404 用固定响应体（Q1–Q3）。WSS 由部署终止，未验证（S029）。非阻断：服务端 maxPayload 仍是 ws 默认的 100 MiB，同一授权的连接数不限（M1、M2，judgment N3）。";

// ------------------------------------------------------------------ SUB-049
const BENCH =
  "候选 7400f39：pnpm typecheck 含 bench:typecheck 退出 0（E04）；三个脚本在拦截与垫片下运行（E70）。";
const SAMPLES =
  "样本来源合法且有记录：73 条全部由本项目合成（provenance synthetic-authored、contains_real_viewer_data false），不来自真实观众、平台或第三方数据集，禁词是占位词，昵称是虚构称呼，senderRef 是 bench- 占位；来源类别、作者、合成方法、许可（与仓库相同，仓库没有 LICENSE 文件，仅限项目内部使用）与覆盖矩阵写在 bench/samples/SOURCES.md；内容扫描没有 YouTube 频道 ID、URL、电子邮件、@ 账号、长数字串或 live chat ID（E71 V3）；校验对非合成来源、真实观众标记、重复 ID、跨条缺线程、非跨条带线程、未知路由、空正文、某组少于 5 条都报错（E71 V2）。覆盖 zh 11、ja 7、en 8、mixed 6、homophone 6、nickname-combo 8、cross-line 8（3 个线程）、noise 6、evasion 7、false-positive 6（V1）。";
const REPRO =
  "脚本可复现：pnpm bench:quality 两次与直接运行的输出 sha256 都是 a50a0c3968e92914778ad4a9bc08f58aea6cd28671041ba6bd13b51a0d639463，与实施自测记录的值相同；latency 与 cleanup 含时间与环境，结构稳定（E70）。分别输出：quality 有 rules、realtime（synthetic、fakeCli）、sc（翻译关闭、开启、注入多余条目）、review 四块，另有 crossLine 与 notMeasured，每个替身块 qualityMeaningful=false（E70）。";
const GATE =
  "默认只跑合成适配器与假 CLI：只给 --real-model 时拒绝（退出 2），参数加 VOXWARD_BENCH_REAL_MODEL=1 时三个脚本也拒绝（本包没有真实绑定），只设环境变量时照常只跑替身、输出相同（E70）。本轮垫片调用 0 次、基准运行没有网络连接、没有写 docs/reports/、检出无改动（E70）。";
const RECORDING =
  "latency 输出记录硬件（平台、CPU 型号与核数、内存、Node 版本）、替身名（kiro-cli adapter + fake CLI，no model runs）、配置（批大小 10、并发 1/2/4、每档 24 批、静态 20 轮、超时 500 ms、输出上限探针）、规模（73 条）、时间（generatedAt）；cleanup 记录成功、失败、校验失败、取消、超时与异常重启后的残留运行目录、存活进程与会话删除请求，五个场景 clean，重启场景经孤儿清理删除 1 个目录、终止 1 个进程后为 0（E70）。候选与实测分开：替身块 qualityMeaningful=false，说明不测量模型，未测项单列（队龄、改判率、配额、费用、跨条整体判定、复盘结算）；没有设目标、没有模型排名、没有速度或零留存的说法（E70）。";
const UNTOUCHED = (modules) =>
  `对照本单与该需求对应模块（${modules}）的接口与实际影响：bench 只按相对路径调用已有导出，不改 apps/、packages/ 与这些模块（E11），这些模块的测试照常通过（E05）。`;

export const rows = {
  // ================================================================ STORY-021
  "VW-S021-AC001": { outcome: "satisfied", actual: `${GATES}${HARNESS}${FRONT}${SCENARIO}${B7_NOTE}` },
  "VW-S021-PARENT": {
    outcome: "satisfied",
    actual: `复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 AC001）。S021 的贡献是原生协议与帧、凭据签发与两表判定、WebSocket 传输与心跳、投递泵与补发契约、协议文档与去重样例；OBS 页面、显示昵称与付费展示信息不在本单（设计 §1、§11）。${B7_NOTE}`,
  },
  "VW-S021-INHERIT-001": { outcome: "satisfied", actual: R001_REVIEW },
  "VW-S021-INHERIT-006": { outcome: "satisfied", actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。${R006_PART}` },
  "VW-S021-INHERIT-009": { outcome: "satisfied", actual: R009_REVIEW },
  "VW-S021-INHERIT-010": { outcome: "satisfied", actual: R010_REVIEW },
  "VW-S021-INHERIT-011": { outcome: "satisfied", actual: R011_REVIEW },
  "VW-S021-INHERIT-012": { outcome: "satisfied", actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。${R012_PART}` },
  "VW-S021-INHERIT-017": { outcome: "satisfied", actual: R017_REVIEW },
  "VW-S021-INHERIT-018": {
    outcome: "failed",
    actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60），另加 E61。前半句成立（同 AC001）。VW-R-018 的「输出获准必要展示字段；拦截仅无原文/身份的 WARD_BLOCKED，不输出分值/稳定 ID/审核对话」在常规路径上成立（E60 D1–D5、S1）。${B7_DETAIL}`,
  },
  "VW-S021-INHERIT-019": { outcome: "satisfied", actual: R019_REVIEW },

  // ================================================================ SUB-039
  "VW-SUB039-AC001": {
    outcome: "satisfied",
    actual: `${GATES}${HARNESS}不输出稳定用户 ID、分数、名单、审核理由或对话：帧的键是固定白名单，帧里没有主体键、平台消息引用、correlationId、主体、裁决、任务 ID、分数、理由、房管或凭据（E60 D1–D3、G4）。下游不上传弹幕：文本或二进制数据帧一律 4400 断开（C2）。撤销后订阅失效：所有者撤销后该授权的两个连接立即 4403，其它授权的连接不受影响，重连 401（G8）；只撤销 credential_refs 或 output_grants、purpose、kind 或频道不符时，在线连接一个心跳内 4403、重连 401（G6）；不应答关闭帧的消费者在宽限后被断开 TCP（G9）；原生凭据打不开 HTTP 路由（G10）。违规消息只发 WARD_BLOCKED（D2）；断连有 4408、4413（C3、C4）。`,
  },
  "VW-SUB039-STORY": {
    outcome: "satisfied",
    actual:
      "复用 VW-SUB039-AC001 的同次执行（E02–E08、E60）。本单承担的「原生协议、字段/版本/鉴权/心跳断连说明；统一 ALLOW/BLOCK；无原文身份的 WARD_BLOCKED」成立：子协议 vw-output.v1、版本 1，凭据只在子协议列表，不走查询串、Authorization、Cookie 或其它头（E60 G4、G5），HELLO 先于投递帧（G4），心跳 ping 与 4408（C1、C3），4400、4403、4413 各有固定原因（C2、C4、C5）；ALLOW 与 ALLOW_NOISE 都是 DELIVER、BLOCK 都是 WARD_BLOCKED，同一房间的所有消费者收到相同的帧（D1、D4、D5）；frameFor 对 BLOCK 不读正文。B7 出在 SUB-040 的投递泵选行，不在本单的帧构造与传输。本行只证明 SUB-039 承担的部分；VOXWARD-STORY-021 的完整判据 VW-S021-AC001 另行判定为 satisfied。",
  },
  "VW-SUB039-PARENT": {
    outcome: "satisfied",
    actual: `复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 VW-S021-AC001）。SUB-039 承担的部分见 VW-SUB039-AC001。${B7_NOTE}`,
  },
  "VW-SUB039-INHERIT-001": { outcome: "satisfied", actual: `${R001_REVIEW}本单交付契约、帧、订阅注册表、传输、签发与撤销路由。` },
  "VW-SUB039-INHERIT-006": {
    outcome: "satisfied",
    actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单承担的心跳与断连成立：答 ping 的消费者保持连接（C1），不答 4408（C3），积压 4413（C4），撤销 4403（G8）；投递顺序、状态与有效期由 SUB-040 交付，同 Story 行：${R006_PART}`,
  },
  "VW-SUB039-INHERIT-009": { outcome: "satisfied", actual: R009_REVIEW },
  "VW-SUB039-INHERIT-010": { outcome: "satisfied", actual: R010_REVIEW },
  "VW-SUB039-INHERIT-011": { outcome: "satisfied", actual: R011_REVIEW },
  "VW-SUB039-INHERIT-012": { outcome: "satisfied", actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。${R012_PART}` },
  "VW-SUB039-INHERIT-017": { outcome: "satisfied", actual: R017_REVIEW },
  "VW-SUB039-INHERIT-018": {
    outcome: "satisfied",
    actual:
      "复用 VW-S021-AC001 的同次执行（E02–E08、E60），另见 E61。前半句成立（同 AC001）。本单承担的帧构造与传输部分成立：frameFor 对 BLOCK 只造 WARD_BLOCKED、不读正文，DELIVER 只带白名单字段（E60 D1–D3），传输只发出投递泵交给它的帧，不选行。B7（一轮之中被改判的行仍按旧读数发出原文）出在 SUB-040 的投递泵 delivery.ts 与 markSent，本单未触及；VOXWARD-STORY-021 与 SUB-040 的 INHERIT-018 判为 failed。",
  },
  "VW-SUB039-INHERIT-019": { outcome: "satisfied", actual: R019_REVIEW },

  // ================================================================ SUB-040
  "VW-SUB040-AC001": {
    outcome: "satisfied",
    actual: `${GATES}${HARNESS}重复投递可按投递 ID 去重：一个消费者发送失败时，该行在下一轮以同一 deliveryId 重发给全部在线消费者（E60 S9 3 次、C4b 2 次），样例 consumer.mjs 按 deliveryId 只打印一次（E62 E2），dedupe.mjs 跳过 validUntil 已过的帧（consumer-dedup.test.ts 5 项，E05）。过期 SC 不自动补播：EXPIRED 与过期的 PENDING 行不发并被标 EXPIRED，重连不补播（S1–S3）；改判放行写成 EXPIRED，不自行发出（S7）。补发须明确动作且受有效期限制：补发只经 S014 的 resendDelivery，SENT 行有效期内 NOT_EXPIRED、过期后 ALREADY_SENT（Q56），EXPIRED 行补发得到新 deliveryId、60 s 有效期，只发一次；同一操作为 duplicate；数据管理员 denied；消息到达 10 分钟后 WINDOW_CLOSED（S5、S6）。不承诺严格只展示一次：协议文档 §6、§9（E62）。`,
  },
  "VW-SUB040-STORY": {
    outcome: "satisfied",
    actual:
      "复用 VW-SUB040-AC001 的同次执行（E02–E08、E60、E62）。本单承担的「投递 ID 和状态；有限发送与补发契约」成立：deliveryId 即 deliveries.id，重发不换 ID（E60 S9）；读行条件为 PENDING、未过期、当前裁决（S1），全部在线消费者接受后以比较状态的单语句短事务标 SENT（S2）；没有在线消费者时保持 PENDING、不计次数（S4）；每轮每频道 50 行（S8），失败 3 次 FAILED 且后面的行等待（S9），积压 4413（C4）；补发规则同 AC001（S5–S7）。本单交付的投递泵在发送前不再核对状态与当前裁决（B7），判在本单与 Story 的 INHERIT-018，不在本行 expected 列举的项内。本行只证明 SUB-040 承担的部分；VOXWARD-STORY-021 的完整判据 VW-S021-AC001 另行判定为 satisfied。",
  },
  "VW-SUB040-PARENT": {
    outcome: "satisfied",
    actual: `复用 VW-S021-AC001 在 7400f39 上的同次执行（E02–E08、E60、E62）。expected 的三项都成立（同 VW-S021-AC001）。SUB-040 承担的部分见 VW-SUB040-AC001。${B7_NOTE}`,
  },
  "VW-SUB040-INHERIT-001": { outcome: "satisfied", actual: `${R001_REVIEW}本单交付投递泵、补发规则、db 端口实现、协议文档与去重样例。` },
  "VW-SUB040-INHERIT-006": { outcome: "satisfied", actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单承担的就是投递顺序、状态与有效期：${R006_PART}` },
  "VW-SUB040-INHERIT-009": { outcome: "satisfied", actual: R009_REVIEW },
  "VW-SUB040-INHERIT-010": { outcome: "satisfied", actual: R010_REVIEW },
  "VW-SUB040-INHERIT-011": { outcome: "satisfied", actual: R011_REVIEW },
  "VW-SUB040-INHERIT-012": {
    outcome: "satisfied",
    actual:
      "复用 VW-S021-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。本单部分成立：投递泵只把一个频道的行发给该频道的订阅者（注册表按 channelId 取，E60 G7），不读授权，不接受消费者的任何数据；补发要 review.decide，数据管理员 denied（S6）。凭据、握手与 CSRF 由 SUB-039 与路由承担，见 Story 行。",
  },
  "VW-SUB040-INHERIT-017": { outcome: "satisfied", actual: R017_REVIEW },
  "VW-SUB040-INHERIT-018": {
    outcome: "failed",
    actual: `复用 VW-S021-AC001 的同次执行（E02–E08、E60），另加 E61。前半句成立（同 AC001）。常规路径上本单的投递泵只把 BLOCK 行交给帧构造为 WARD_BLOCKED，原文不进帧（E60 D2、S1）。${B7_DETAIL}出错的 delivery.ts 与 markSent 都是本单的交付。`,
  },
  "VW-SUB040-INHERIT-019": { outcome: "satisfied", actual: R019_REVIEW },

  // ================================================================ SUB-049
  "VW-SUB049-AC001": { outcome: "satisfied", actual: `${BENCH}${SAMPLES}${REPRO}${GATE}` },
  "VW-SUB049-STORY": {
    outcome: "satisfied",
    actual:
      "复用 VW-SUB049-AC001 的同次执行（E04、E70、E71）。本单承担的「合法样本来源；中日英/混合/谐音/昵称组合/跨条样本；规则/实时/SC/复盘分别评测」的样本与脚本部分成立（同 AC001）。跨条线程的整体期望只计数不计分（规则引擎逐条判定），复盘只测审核模型输出的契约与裁决一致性，结算循环未接（设计 §14，quality notMeasured）。本行只证明 SUB-049 承担的部分；VOXWARD-STORY-027 的完整判据 VW-S027-AC001 按简报本轮不判。",
  },
  "VW-SUB049-PARENT": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70、E71）。expected 的记录项在本单交付中成立：${RECORDING}scenario 中「所选模型」在代表性流量下的真实运行属 SUB-050（Q60），本轮未验证；脚本里超时与输出过大有替身探针，限流没有对应的替身模式（judgment N6）。`,
  },
  "VW-SUB049-INHERIT-001": {
    outcome: "satisfied",
    actual:
      "审查：bench 只按相对路径导入已有导出（契约包 index、moderation-engine 的 index 与 rules/groups、normalize、transliterate，inference-provider index，synthetic 与 kiro-cli 适配器、errors、orphan-sweep），与设计 §4 所列一致，不导入 apps/server/test（E11）；不改 apps/、packages/、vitest.workspace.ts 与 check-deps（E11）；没有新依赖，tsx 与 tsc 来自 apps/server 的开发依赖；根 package.json 只加 bench:* 脚本并把 bench:typecheck 并入 typecheck（E04、E11）。假 CLI 是测试替身，不是本机代理，不贯穿业务层。",
  },
  "VW-SUB049-INHERIT-002": { outcome: "satisfied", actual: `${UNTOUCHED("platform-source/youtube")}基准不抓取 YouTube，样本全部合成（E71）。完整判据由 VW-AC-002 承载。` },
  "VW-SUB049-INHERIT-003": {
    outcome: "satisfied",
    actual: `${UNTOUCHED("moderation-engine")}基准用真实规则引擎与占位规则集 bench-synth-v1（BLOCK 组归一化 3 条与受约束正则 1 条、REVIEW 组读音 1 条、DEDUCT 组精确 1 条），完整消息含昵称，rules 73/73 与期望一致（E70）；结果只对占位规则集成立。完整判据由 VW-AC-003 承载。`,
  },
  "VW-SUB049-INHERIT-004": { outcome: "satisfied", actual: `${UNTOUCHED("scoring-engine")}基准不计分、不写账本。完整判据由 VW-AC-004 承载。` },
  "VW-SUB049-INHERIT-005": {
    outcome: "satisfied",
    actual: `${UNTOUCHED("moderation-engine 的昵称与复盘、inference-provider 的复盘契约")}昵称经引擎的昵称源接口给出；复盘只把合成输出交给 validateReviewBatch（契约拒绝 0、候选词 8），不入队、不结算（E70）。完整判据由 VW-AC-005 承载。`,
  },
  "VW-SUB049-INHERIT-006": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：${RECORDING}VW-R-006 的本单部分：并发档位 1、2、4 只是测量点，不固定子代理数；批大小 10 有界；超时探针 RUN_TIMEOUT（539.9 ms），输出过大 RUN_OUTPUT_TOO_LARGE（E70）。队列最老消息年龄未测，原因已写明（需要任务协调器接线）。`,
  },
  "VW-SUB049-INHERIT-007": { outcome: "satisfied", actual: `${UNTOUCHED("decision-service")}基准不做人工裁决、名单或词条操作。完整判据由 VW-AC-007 承载。` },
  "VW-SUB049-INHERIT-008": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：${RECORDING}VW-R-008 的本单部分：实时假 CLI 经真实 kiro-cli 适配器与 validateModerationBatch；SC 经 runScBatch 的真实批次校验与生成文本检查，注入多余条目时 8/8 批被拒（OUTPUT_TOO_MANY_ITEMS），翻译开启时 8 条译文被规则拒绝（GENERATED_TEXT_REJECTED）；复盘经 validateReviewBatch；清理观察的校验失败场景为 RUN_OUTPUT_INVALID（E70）。`,
  },
  "VW-SUB049-INHERIT-009": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：${RECORDING}VW-R-009 的本单部分：实时与 SC 只把正文与 correlationId 交给适配器，由适配器换成临时 itemId（quality.ts），昵称与 senderRef 不进模型输入；假 CLI 日志与运行目录都在 $KIROCREW_SCRATCH/bench 下，每次运行后删除（E70：运行后该目录为空）；五个场景残留为 0，异常重启经孤儿清理后为 0；cleanup 的 notMeasured 写明真实账号内的会话留存未测，没有把应用清理说成提供方删除。`,
  },
  "VW-SUB049-INHERIT-010": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70）。前半句成立：${RECORDING}VW-R-010 的本单部分：替身用 declareModels 声明 bench-declared-model 只为通过模型选择闸门，README 写明不是能力声明，适配器本身未改；没有模型或 reasoning 建议，没有为未测模型排名；真实模型由 SUB-050 测（Q60）。`,
  },
  "VW-SUB049-INHERIT-011": {
    outcome: "satisfied",
    actual: "审查：基准不打开数据库、不写 SQLite，不在队列或额外日志复制正文（E11）；假 CLI 日志只在本次运行的 scratch 里，运行结束删除（E70）。",
  },
  "VW-SUB049-INHERIT-012": {
    outcome: "satisfied",
    actual:
      "审查本单暴露的接口与运行权限：基准不开端口、不读凭据、不接触输出凭据与权限模块（E11）；假 CLI 的环境只有 PATH、FAKE_KIRO_LOG、FAKE_KIRO_MODE，由适配器以精简环境启动；样本文本只作为批次条目的 text 字段进入替身，不当作命令；真实模型闸门默认关闭且本包拒绝真实运行（E70）。",
  },
  "VW-SUB049-INHERIT-013": { outcome: "satisfied", actual: `${UNTOUCHED("data-lifecycle-service 与数据面板")}完整判据由 VW-AC-013 承载。` },
  "VW-SUB049-INHERIT-014": { outcome: "satisfied", actual: `${UNTOUCHED("记分例外相关的 moderation-engine、scoring-engine 与 data-lifecycle-service")}完整判据由 VW-AC-014 承载。` },
  "VW-SUB049-INHERIT-015": { outcome: "satisfied", actual: `${UNTOUCHED("audit-store 的两类日志")}基准不写 Change Log 或 Technical Log。完整判据由 VW-AC-015 承载。` },
  "VW-SUB049-INHERIT-016": { outcome: "satisfied", actual: `${UNTOUCHED("audit-store 的日志查看器")}完整判据由 VW-AC-016 承载。` },
  "VW-SUB049-INHERIT-017": {
    outcome: "satisfied",
    actual:
      "审查本单涉及的数据与清理：每个脚本只在 $KIROCREW_SCRATCH/bench（未设置时为已被 .gitignore 忽略的 bench/.tmp）下建本次运行的目录，结束时删除；清理观察的残留统计与孤儿清理结果如实输出，不因结果改写判据（E70）。基准不持久化任何业务数据，不重建已删数据。",
  },
  "VW-SUB049-INHERIT-018": { outcome: "satisfied", actual: `${UNTOUCHED("output-adapter 与原生输出")}完整判据由 VW-AC-018 承载。` },
  "VW-SUB049-INHERIT-019": { outcome: "satisfied", actual: `${UNTOUCHED("apps/web 的页面与 sandbox")}完整判据由 VW-AC-019 承载。` },
  "VW-SUB049-INHERIT-020": {
    outcome: "satisfied",
    actual: `复用 VW-SUB049-AC001 的同次执行（E70、E71）。前半句成立：${RECORDING}VW-R-020 的本单部分：合法来源（合成）；覆盖中日英、混合、昵称组合、噪声、跨条、规避，另有谐音与误报（E71 V1）；规则、实时、SC 与复盘分别评测；测静态与端到端 P50/P95、结构失败（注入故障）、误拦漏检；队龄、改判、配额与费用列为未测并写明原因；注明硬件、替身名、规模、并发与时间（E70）。替身结果不代表模型质量；真实模型测量属 SUB-050（Q60）。`,
  },
};
