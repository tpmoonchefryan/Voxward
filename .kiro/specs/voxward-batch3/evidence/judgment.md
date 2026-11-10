# 第 3 批判断（VOXWARD-STORY-003、STORY-005、STORY-007）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `9b7a7f8`（在 `9a508e0` 与 briefs 提交 `5f1c986` 之上依次合入 `voxward/s003-auth`、`voxward/s005-scoring`、`voxward/s007-ai-contracts`）。
- 范围：9 张工单、105 行验收。satisfied 93 行，failed 12 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch3/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；本批验收只有一片，按小轮条件一次完成验收、判断与 lessons。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-003 | **打回** | 23 satisfied、12 failed（STORY 4、SUB-006 3、SUB-007 5） | B1、B2 | SUB-006（B1）、SUB-007（B2） |
| VOXWARD-STORY-005 | **通过** | 35/35 satisfied（STORY 11、SUB-010 12、SUB-011 12） | 无 | — |
| VOXWARD-STORY-007 | **通过** | 35/35 satisfied（STORY 11、SUB-013 12、SUB-014 12） | 无 | — |

- rejection 计数：实施包 P-S003 打回 1 次，SUB-006（B1）与 SUB-007（B2）各记 1 次；下次派工按 master A8 用 `--rejections 1` 解析模型。SUB-006 的本单行（AC001、STORY）为 satisfied，它失败的 PARENT 与 INHERIT-011/012 三行原因在 SUB-007（B2），但 B1 本身归 SUB-006，所以两张都计。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（418/418）、`pnpm check:deps`（94 个文件 0 违规）通过；启动冒烟在数据库指向 scratch 时两种入口都通过，默认配置下两种入口都失败（B1）。Q9 打包问题已修。主线程汇报时不能写成「本批门禁全绿」。
- Spec：三份为 SPEC_CURRENT（rev 4）。设计与代码的不一致见下文 B2、N6、N8。

## 阻断发现

### B1 默认配置下服务起不来（归属 SUB-006）

- 触发：在干净检出（没有 `apps/server/data/`）上运行 `pnpm dev`；或不设 `VOXWARD_DATABASE_FILE` 运行 `node apps/server/dist/main.js`，在检出根或 `apps/server` 下都一样（acceptance.md E07、E09）。
- 当前行为：服务端进程输出一行 `DATABASE_SETUP_FAILED: unexpected error` 后退出 1。`pnpm dev` 中 Vite 仍在 5173，但 3000 没有监听，`/healthz` 不可达，经 Vite 代理的 `/healthz` 返回 500（`ECONNREFUSED`）。给 `VOXWARD_DATABASE_FILE` 指一个已存在目录下的文件后两种入口都正常（E07b、E08）。
- 根因：`4a68a38`（SUB-006）让 `main.ts` 在监听前打开数据库并迁移。默认 `databaseFile` 是相对 cwd 的 `data/voxward.sqlite3`，干净检出里没有 `data/`；SQLite 不创建目录，better-sqlite3 抛出没有 `code` 的 `TypeError: Cannot open database because the directory does not exist`，`describeDatabaseError` 只能输出 `unexpected error`。同一提交把 `startup-errors.test.ts` 改为给 `VOXWARD_DATABASE_FILE` 指 scratch 路径，实施方自测与主线程集成门禁都没有用默认配置启动过。
- 契约：第 1 批已验收的 VW-SUB001-AC001「Fastify 服务与 Vite 前端可启动」与 VW-S001-AC001「服务可启动」（第 1 批用 `pnpm dev` 验证）；本批派工的必验项 1 要求 `pnpm dev` 下 `/healthz` 返回 200。`5f1c986` 的 `main.ts` 不打开数据库，`pnpm dev` 可以启动，所以这是本批引入的回归。本批没有哪一行 expected 写到启动，B1 不改变行判定，与第 2 批 B1 一样属于门禁失败。
- 影响：新克隆或干净检出上 `pnpm dev` 得不到可用的服务端，后续每个 Story 的启动冒烟与本地演示都要先手动建目录或设环境变量；报错不说明原因，排查要读源码。生产部署只要把 `VOXWARD_DATABASE_FILE` 指向已存在的持久卷目录就不受影响。
- 文件：`apps/server/src/main.ts`（`openDatabaseOrExit`、`describeDatabaseError`），`apps/server/src/db/client.ts`（`openDatabase`），`apps/server/test/app/startup-errors.test.ts`。
- 修复方向（实现由 SUB-006 选择，验收只看结果）：打开前为 `databaseFile` 的父目录执行 `mkdirSync(dirname(file), { recursive: true })`（`:memory:` 除外），或让 dev 脚本显式设置可写路径；让这一行报错说出原因（例如目录不存在），仍不回显路径；补一个在临时 cwd 用默认配置启动并探测 `/healthz` 的用例。
- 复验：干净检出上不设 `VOXWARD_DATABASE_FILE` 跑 `pnpm dev` 与 `node apps/server/dist/main.js`，`/healthz` 200、只绑 127.0.0.1、停止后无残留进程；带 scratch 数据库的打包冒烟（E08）；`pnpm test`。

### B2 放进 URL 查询串的令牌原样进入服务端日志（归属 SUB-007）

- 触发：任何请求把令牌放在 URL 查询串里。例如把下游令牌拼进 OBS Browser Source 的地址 `GET /channels/channel-1/members?token=vwo_…`，或 `GET /overlay/channel-1?session=vws_…`（acceptance.md E24、§2.1）。
- 当前行为：服务端拒绝这类请求（401、404），但 Fastify 默认的请求日志以 info 级别记录含查询串的 `req.url`；对不存在的路由，默认 404 处理再写一行 `Route GET:/overlay/channel-1?session=vws_… not found`，并把同一句放进 404 响应体。实测活的下游令牌进入日志 1 行，活的会话令牌 2 行。同一令牌放在 Authorization 头里时 0 行，请求体里的口令 0 行（E21 扫描 104 行）。
- 契约：VW-SUB007-AC001 与 VW-S003-AC001「密钥不进入前端、日志、模型或演示」，SUB-007 场景含「扫描前端响应、日志……中的凭据」，SUB-007 scope 含「日志与响应脱敏」；提案 §16「凭据隔离：……应用会话……不进入前端包、模型上下文、演示或日志」。S003 设计 §4.6 写「令牌不接受 URL 参数，避免进入访问日志」：不接受只保证这样的令牌无效，不保证它不进日志。实施方的 leak-scan 用例把下游令牌列为不得进日志的凭据，但只测了请求头。`redactText` 已能识别 `vws_`、`vwo_` 形态，没有接到日志上（`security/` 之外没有调用）。
- 影响：能读服务日志或日志备份的人拿到在撤销前一直有效的下游令牌；会话令牌意味着可以冒用该账号。下游接入（STORY-021、STORY-023）多半只能配置一个 URL，运营者把令牌拼进地址的可能性很高，这不是假设性的触发。
- 文件：`apps/server/src/app.ts`（`Fastify({ logger })` 与 404 处理），`apps/server/src/security/redaction.ts`，`apps/server/test/security/leak-scan.test.ts`。
- 修复方向：给 Fastify logger 配 `serializers.req`，记录 `url` 时去掉查询串或先经 `redactText`；用 `setNotFoundHandler` 返回固定的 404 响应体，不回显 URL；leak-scan 增加查询串携带 `vws_`、`vwo_` 的负例，同时扫描日志与 404 响应。
- 复验：重做 E24（日志与 404 响应中 0 处活令牌）、E21、E22 与 leak-scan 测试；STORY-003 组 12 行 failed 在新候选上重新判定。

## 必验项结论

1. 启动冒烟：数据库指向 scratch 时，`pnpm dev` 与 `node apps/server/dist/main.js` 都只绑 127.0.0.1、`/healthz` 200、打包产物打开数据库并完成迁移、停止后无残留（E07b、E08）；Q9 已修。默认配置两种入口都失败（B1）。
2. Spec：三份 SPEC_CURRENT（E10）。设计与代码大体一致；S003 §4.6 的日志说法不成立（B2），S003 §5 测试对照表与 §4.3 签名、数据字典开头范围说明过时（N6），S005 §3「后续裁决变化也不再计分」只在首次决策改变分数时成立（N8）。
3. S003：服务端鉴权强制、客户端不能跳过，成立；凭据不进前端与错误码成立，不进日志不成立（B2）；不可信文本渲染边界在脚本、HTML、控制字符、超长输入上成立（bidi 字符见 N2）；会话固定、过期、注销的负例都成立；运行时 AI 最小权限契约与提案 §9.2、§16 逐条一致。
4. S005：计分幂等成立（N8 为首次零效果的边界）；冷却与钳制成立（N10 为身份基准分语义）；例外守卫在身份奖励、实时、复盘、人工调分 6 个入口全部拒绝（N11 为模块层以下的兜底）；人工补偿接口成立（N9、N13）；模块不导入 db 成立。
5. S007：三类 Schema 与提案 §8.2 逐项一致，enum 为 ALLOW_MEANINGFUL、ALLOW_NOISE、BLOCK；提案 §8.3 清单每一项都有反例被拒；Q3 的 itemId 契约成立；错误不回显模型正文。
6. 迁移：只有 S003 新增 `0001`，S005 没有改迁移或 schema（派工简报的「两个包都改了」与实际不符）；序号、journal、快照链无重复无缺号，数据字典与实库 27 张表 0 差异，旧库可升级（E50–E52）。
7. 阻断依据：B1 依据已验收契约与当前行为，B2 依据明确契约、可信安全边界与当前行为，触发与影响如上。其余发现都不阻断。

## 两处实施方提出的差异

- 下游令牌在签发响应中返回一次（S003 self-check 第 6 节）：不是缺陷。提案 §13 与 §14 要求下游以可撤销的只读凭据订阅，接入指引要写失效与撤销方式，这个凭据必须交到主播手里；§16 凭据隔离列举的是平台 OAuth、模型访问凭据与应用会话。实现只把它给持有 tokens.manage 的主播、响应 cache-control: no-store、库内只存哈希、之后不再显示（E21），符合这个用途。不需要 Owner 另作决定，交付方式在 STORY-021、STORY-024 的指引里写清即可。
- 下游凭据没有用 `credential_refs` 与 `output_grants`（S003 设计 §9）：可以接受。对服务端签发的不记名令牌，只存 SHA-256 比存可解密的 secretref 更严格。`output_grants` 目前无人使用，STORY-021 定下游授权模型时决定合并还是删除，并同步数据字典（N7）。

## 与实施方自测的对照

- S003：self-check 的测试与 Q9 打包实测在合并后的候选上复现（418 项、E08）；它列为未验证或部分通过的 WebSocket、真实模型输入、运行期演示，本轮结论一致。self-check 没有用默认配置启动（B1）；泄漏扫描只覆盖放在请求头里的令牌（B2）。
- S005：self-check 报告的账本、身份、补偿、例外与 4 进程并发全部复现。本轮另做了 6 进程并发（E41）、外层事务回滚（E43）、首次零效果后的重放与改判（N8）、跨频道 operationId（N9）、钳制后的身份往返（N10）、绕过模块直调端口（N11）。
- S007：self-check 的契约与批校验测试全部复现。本轮另按提案 §8.3 逐项做了 68 个反例（E30），包括 `__proto__` 键、JSON 形态的字符串、10 万条恶意输出与错误不回显。

## 非阻断建议

N1 客户端错误被报成 500（SUB-006；可随 B1、B2 返工一并修改，不作为复验门槛）
- 畸形 JSON、urlencoded 与 multipart 请求体、超过 1 MiB 的请求体都得到 500 `INTERNAL_ERROR`，并以 error 级记录（E21、E22）。原因是 `routes.ts` 的错误处理把所有非 `RouteFailure` 都映射为 500。没有泄漏，但会让监控把客户端错误当成服务故障。建议对带 4xx `statusCode` 的 Fastify 错误保留原状态码与固定错误码。

N2 bidi 与零宽字符原样保留（SUB-007；交 STORY-022）
- U+202E、U+2066–U+2069、U+200B、U+FEFF 等格式字符不在 C0/C1 范围内，`UntrustedText` 与 `stripControlCharacters` 都保留，组件也没有 bidi 隔离（E20）。它们不会执行任何东西，但能让同一段落里后面的文字显示顺序被改写。页面接入队列与日志查看器时，用 `<bdi>` 或 `unicode-bidi: isolate` 包住每条不可信文本。

N3 浏览器类下游带不了 Authorization 头（SUB-006；交 STORY-021、STORY-023）
- 守卫只从 Authorization 头读下游令牌。OBS Browser Source 与浏览器里的 WebSocket、EventSource 都无法设置这个头，只能配置一个 URL。STORY-021 定原生协议时需要一个不经查询串的交付方式（例如 URL 片段在页面内读取后放进首条消息或 `Sec-WebSocket-Protocol`），并且要在 B2 修复之后再引入。

N4 没有创建首个账号与频道的入口（SUB-006；交 STORY-029、STORY-022）
- 只有 `createAccount` 仓储函数，没有 CLI 或页面；频道也只能直接写库。真实部署在这之前无法登录。部署管理员的初始化方式属于 STORY-029 的运维交付，成员邀请界面属于 STORY-022。

N5 登录没有限速；scrypt 参数低于 OWASP 下限（SUB-006；交 STORY-029）
- scrypt 用 N=2^14、r=8、p=1。OWASP Password Storage Cheat Sheet 的最低组合是 N=2^17、r=8、p=1，同强度下 N=2^14 需要 p=5。参数写死在代码里、不随哈希保存，以后调高会使旧哈希无法验证。建议改用带参数的哈希格式（如 PHC 字符串）并调到 OWASP 下限；同时给登录加速率限制（设计 §6 已列为不做），因为每次校验占用 libuv 线程池。

N6 文档与代码不一致（SUB-006、SUB-007；随返工修改）
- `voxward-s003-auth/design.md` §5 测试对照表列出的 5 个测试文件不存在，用例实际在 `auth.test.ts`、`routes.test.ts`、`security.test.ts`、`leak-scan.test.ts`；§4.3 写 `createAccount(tx, …)`，代码为 `createAccount(database, …)`；§4.6 的日志说法随 B2 修正。`docs/data-dictionary.md` 开头仍写「24 张表，对应初始迁移 0000_initial.sql」。

N7 `output_grants` 与 `credential_refs` 中的输出用途无人使用（SUB-006；交 STORY-021）
- 见上节差异 2。

N8 首次零效果的决策不留幂等记录（SUB-011；交 STORY-014，并修正 S005 设计 §3 的措辞）
- 账本只记 actualDelta≠0。第一次决策是 noise、冷却、钳制、关闭或 0 扣分时既不写行也不留幂等键，同一事件之后再次 `applyVerdict` 会按当时状态计分：先 ALLOW_NOISE 后 BLOCK 得 −3；下限处钳为 0 的 BLOCK 在分数回升后重放得 −3（E40）。账本仍等于实际变化，单个事件也不会两次生效，所以不阻断。设计 §3「同一事件至多计一次，后续裁决变化也不再计分」只在第一次决策改变了分数时成立。STORY-014 的人工改判按提案 §7.1 走补偿接口，不要重放 `applyVerdict`；若要保证「至多计一次」，需要为零效果决策也留一条处理记录。

N9 人工补偿与身份事件的幂等键是全局的（SUB-011；交 STORY-014）
- 键为 `manual:<operationId>`、`identity:<sourceEventRef>`，重复路径直接返回已有行的主体与 delta，不核对主体和频道。ch-b 的补偿用了 ch-a 用过的 operationId，结果返回 ch-a 主体的 subjectRef 与 delta 5，ch-b 没有任何写入（E40）。STORY-014 应由服务端生成全局唯一的 operationId，或把键限定到频道与主体，并在收到 duplicate 时核对主体，不一致时报冲突。

N10 钳制后身份基准分不对称（SUB-010、SUB-011；需 Owner 决定语义，交 STORY-026 验证）
- 分数在上限 6 时升为 PAID_MEMBER（配置差 +4）得 0；之后到期回到 UNKNOWN 得 −4，最终身份基准分 −4、分数 2（E40）。没当过会员的同样行为分主体是 6。实现是运行钳制，每个分量只累计实际生效的变化（设计 §3 已写明）；提案 §5.2 建议「把身份基准与行为调整分开记录，再计算最终钳制分数」，那样往返后基准分回到 0。两种都满足本批验收行，选择影响观众感受与可解释性，建议 Owner 在 STORY-026 前定下。

N11 例外守卫只在模块层（SUB-011；交 STORY-014、STORY-019）
- 6 个模块入口都拒绝例外主体，但 `ScoringLedgerPort.commitScoreDecision` 执行调用方给的任何决策：直接调用端口、给一个不看 `exceptionActive` 的决策，对例外主体写入成功（E40）。目前没有这样的调用方。建议端口在事务内读到 `exceptionActive` 时自己拒绝写入，作为兜底。另外端口会为不存在的主体新建行，STORY-019 接线删除流程时，计分前要在同一事务里做任务代次与删除状态检查。

N12 Verdict 不带规则命中列表（SUB-010；交 STORY-006）
- BLOCK 统一扣一次 `violationPenalty`，多条规则命中也只扣一次；`selectPenalty` 的取最大值只在纯函数层测试。按规则设不同扣分时，STORY-006 要把命中列表传给计分。

N13 计分入口与业务事务的组合（SUB-011；交 STORY-014）
- `ScoringEngine.applyVerdict` 按 S001 契约返回 Promise，在 `runShortTransaction` 回调里返回它会得到 `AsyncTransactionError`；端口本身是同步的，在外层事务里作为 savepoint，外层失败时一起回滚（E43）。提案 §7.2 要求人工裁决、计分与投递意图同一事务提交，STORY-014 需要同步的组合方式。§7.1 的补偿要「依据原账本的实际生效变化」，目前没有显式的账本读取接口，只能从重复路径拿到原 delta。

N14 SC 的 BLOCK 条目译文命中规则会使整批失败（SUB-014；交 STORY-010）
- 设计 §4.5 选择「不论分类都检查生成文本」。BLOCK 的 SC 条目若 translatedText 命中规则，得到 GENERATED_TEXT_REJECTED 并使整批失败（E30），而提案 §8.3 规定被拒的 SC 本来就不输出小抄。结果是 AI 正确的 BLOCK 变成系统失败，转人工。STORY-010 可要求 BLOCK 条目的生成字段为空，或对 BLOCK 条目跳过检查并丢弃这些文本。

N15 输出条数与错误数没有上限（SUB-014；交 STORY-008）
- 10 万条恶意输出对 2 条输入的批，114 ms 返回 99998 个错误（E30）。建议在逐条校验前，按输入条数限制输出长度并截断错误列表；`checkInput` 也可以检查输入 itemId 不超过 64 个码点，避免适配器的错误让每一批都失败。

N16 契约不导出 JSON Schema 文档（SUB-013；交 STORY-008，接入支持原生结构化输出的提供方时处理）
- 校验器与提案 §8.2 的 Schema 等价（acceptance.md §4.0），但没有 JSON Schema 对象可交给提供方的原生结构化输出。Kiro 路径按提案用提示、解析与严格校验，不受影响。

N17 集成门禁加默认配置的启动冒烟（主线程，master A12）
- A12 的五条命令都不启动服务，B1 因此在交给验收前没被发现。建议 A12 末尾加一步：干净检出上不设 `VOXWARD_DATABASE_FILE` 跑 `pnpm dev` 并探测 `/healthz`。

## 问题清单更新建议

- Q9：打包问题已修（E08），默认路径的启动失败另记为 B1，随 S003 返工处理。
- Q3：S007 部分已完成（AiBatchInput、AiItemIdMapping/AiItemIdMap 与校验）；生成 itemId、记录映射、改 InferenceRequest 仍归 STORY-008。
- 建议新增：N3（STORY-021/023）、N8、N9、N13（STORY-014）、N10（Owner 决定，STORY-026）、N11（STORY-014/019）、N14（STORY-010）、N15、N16（STORY-008）、N2（STORY-022）、N4、N5（STORY-029）、N12（STORY-006）。

## 复验范围

- B1、B2 的修复只应改 S003 的启动、日志与相关测试（`main.ts`、`db/client.ts`、`app.ts`、`security/`、`auth/routes.ts`、对应测试与 spec 文档）。在新候选上重跑：`pnpm install --frozen-lockfile`（锁文件不变时可复用 E02）、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`；默认配置的 `pnpm dev` 与 `node apps/server/dist/main.js`（E07、E09 应变为通过）、带 scratch 数据库的打包冒烟（E08）；E21、E22、E24 与 leak-scan。STORY-003 组 12 行 failed 用新证据判定；其余 23 行在 `git diff 9b7a7f8 <新候选> -- apps/server/src/auth apps/server/src/security apps/web/src docs/security apps/server/src/db/schema apps/server/src/db/migrations` 为空时可复用结论，重新盖 codeVersion，否则重跑 E20。
- STORY-005、STORY-007：70 行已在 `9b7a7f8` 上 satisfied，可直接以 `9b7a7f8` 链写。若改用修复后的新候选，先确认 `git diff 9b7a7f8 <新候选> -- packages/contracts apps/server/src/modules apps/server/src/db/scoring-ledger.ts apps/server/src/db/repository.ts apps/server/src/db/transaction.ts apps/server/src/db/schema apps/server/src/db/migrations apps/server/test/scoring-engine apps/server/test/inference-provider packages/contracts/test pnpm-lock.yaml scripts/check-deps.mjs` 为空；B1 若改动 `apps/server/src/db/client.ts`，另重跑 E40、E41。
- 三份 spec 的 check 不需要重跑，除非修复改动了受管来源（工单内容）。链写后三份 spec 会按第 2 批 lesson 报 SPEC_STALE，属预期。

## lessons

`lessons.json` 记录 5 条本轮新确立、可跨工单复用的事实：默认数据库路径使启动失败及冒烟要求、Fastify 默认日志记录查询串、计分端口的幂等边界与全局键、async 计分入口与同步事务的组合、不改检出的验收探针做法。
