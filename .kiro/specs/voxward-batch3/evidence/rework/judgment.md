# 第 3 批 S003 返工复验判断（VOXWARD-STORY-003 组）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `cd91ba0`（9b7a7f8 之上合入 `voxward/s003-fix` 的 888888d B1、d3a343a B2、1762ed5 N1/N5/N6、5df96e2 自测；中间两个主线程提交只改 `.kiro/specs/`）。
- 范围：VOXWARD-STORY-003（work:fd4f81864ddb33703517e12f）、VOXWARD-SUB-006（work:dbbe21c0e4a859e27b5da62f）、VOXWARD-SUB-007（work:5039a470eef52b78249aa255）共 35 行验收。STORY-005、STORY-007 只核对路径（见末节），不写证据。逐条依据见 `rework/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立复验兼判断子代理（main 档），没有参与实现，也没有做上一轮验收。授权：minutes:fd542a49a57a9e6526440dac；本轮只读代码、只在检出里运行命令，没有改源码、没有 commit、没有写引擎工单。

| Story | 判定 | 行数 | 阻断 |
| --- | --- | --- | --- |
| VOXWARD-STORY-003（含 SUB-006、SUB-007） | **通过** | 35/35 satisfied（STORY 11、SUB-006 12、SUB-007 12），failed 0，unverified 0 | 无 |

- 上一轮的 12 行 failed 只因 B2；B2 与 B1 都在 cd91ba0 上复验通过，见下节。上一轮 satisfied 的 23 行：SUB-006 的 AC001 与 STORY 两行依据涉及有改动的 `auth/`，在 cd91ba0 上重跑 E20–E22 后判定；21 行 INHERIT 行在核对依据路径后复用结论，并在 actual 里写明复用依据。
- rejection 计数不变：实施包 P-S003 打回 1 次（SUB-006、SUB-007 各 1 次），本轮不新增。
- 门禁：install --frozen-lockfile、build、typecheck、test（45 个文件 430 项）、check:deps（94 个文件 0 违规）在 cd91ba0 上重跑全部退出 0；默认配置的启动冒烟四种组合通过。上一轮「不能写成本批门禁全绿」的限制对 S003 解除。
- Spec：`voxward-s003-auth/design.md` 受管段未变，工单内容未变（三单 contentImpact 的 changedMeaning=false），按上一轮复验范围不重跑 `kiro-specs check`。链写后 spec 报 SPEC_STALE 属预期（Q11）。三单的 revision 已因上一轮链写升到 5、4、4，链写 cd91ba0 证据时按读回的 revision 写。

## B1、B2 复验结论

### B1 默认配置下服务起不来（SUB-006）：已修

- 当前行为：不设 `VOXWARD_DATABASE_FILE`，`pnpm dev` 在检出根与 `apps/server` 下、打包产物在检出根与 `apps/server` 下，四次都在 1.1 s 内就绪，`/healthz` 200，未知账号登录 401（库已打开并迁移），只绑 127.0.0.1，按启动目录新建 `data/voxward.sqlite3`（WAL、28 张表、迁移 2 条），停止后无残留进程与监听（acceptance.md E07、E09）。带 scratch 库的打包冒烟通过，多级父目录事先不存在也被创建（E08）。目录建不出来时只打印 `DATABASE_SETUP_FAILED: DIRECTORY_UNAVAILABLE`，不回显路径（E09b）。
- 修复：`db/client.ts` 打开前递归创建父目录（`:memory:` 除外），失败时报 `DIRECTORY_UNAVAILABLE`。`default-config-startup.test.ts` 在空临时目录以默认配置启动并探测 `/healthz`；撤掉修复后该用例报出原症状（E29 M3）。
- 复验时的一个前提：主线程跑 A12 的默认配置冒烟后，检出里留下了被忽略的 `apps/server/data/voxward.sqlite3`。它存在时，「干净检出没有 data 目录」这个条件不成立，所以本轮先把它移开，跑完放回（见 lessons）。

### B2 放进 URL 查询串的令牌原样进入服务端日志（SUB-007）：已修

- 当前行为：上一轮 E24 的三个请求在 cd91ba0 上得 401、404 `{"error":"NOT_FOUND"}`、403；日志 url 不带查询串，`Route … not found` 行消失，日志、响应头与响应体中活的下游令牌与会话令牌 0 处（E24）。E21 的 104 行与 E22 的 40 行日志中口令、`vws_`、`vwo_`、`scrypt` 都是 0（上一轮 `vwo_` 1 行）。
- 修复：`app.ts` 的 `serializers.req` 只记 method、去掉查询串并经 `redactText` 的路径、host 与对端地址；`setNotFoundHandler` 返回固定体。`leak-scan.test.ts` 新增查询串负例，同时扫日志与 401、404 响应；撤掉序列化器或 404 处理器后用例报出泄漏（E29 M1、M2）。
- 新途径：另构造 37 种（编码查询串、路径参数、错误路由 400/404/413/414/415、请求头、绝对形式请求目标、畸形 HTTP、其它路由），标准写法全部 0 处。三类边角写法留下痕迹，见下节「阻断发现」与建议 R1、R2。

## 阻断发现

无。

本轮找到的三类边角写法逐一按触发条件与影响判断，都不阻断：

1. 整段百分号编码的令牌放进路径（E25 A5、B6），日志按编码形态记录，解码后就是活令牌。触发要求客户端把令牌的每个字符都编码，并把它放在路径而不是查询串里。令牌是 base64url，RFC 3986 §2.3 规定这些字符不应被编码，`encodeURIComponent` 等常见编码器也不编码它们；服务端不从 URL 读令牌，这样的配置第一次请求就失败。没有现实的生成者，所以不阻断。
2. 令牌放进 `Host` 头（D6），日志 `host` 字段原样。浏览器与 OBS 按 URL 主机名填 Host，正常配置不会出现。不阻断。
3. Fastify 路由层的 400 `FST_ERR_BAD_URL` 与 414 `FST_ERR_MAX_PARAM_LENGTH`（C1、C2、B5）把请求目标回显在响应体里，400 还包含查询串。触发要求路径里有非法百分号转义或超过 100 字符的参数。令牌只回到发出请求的客户端，这两种请求不写任何服务端日志，不会把令牌交给新的读者，与 B2 的影响（读日志或日志备份的人拿到令牌）不同。目前也没有接受令牌的下游 URL（覆盖页路由属于 STORY-021/023）。不阻断，但在引入下游 URL 之前应当修，见 R1。

其余发现（R3 的登录资源占用，R4 的文档与测试缺口）不涉及任何一行 expected，不影响判定。

## 必验项结论

1. 默认配置启动：`pnpm dev` 与 `node apps/server/dist/main.js` 在检出根与 `apps/server` 下都只绑 127.0.0.1、`/healthz` 200、停止后无残留进程（E07、E09）。成立。
2. 带 scratch 数据库的打包冒烟（E08）：成立，迁移不重复。
3. E21（35/35）、E22（12/12）、E24（0 处）与 leak-scan（6 项通过，负面对照有效）在 cd91ba0 上重做。活令牌在查询串时日志与 404 响应 0 处。新泄漏途径 37 种，至少 3 种的要求满足；结果见上节与 acceptance.md §2.2。
4. N1：E26 的 32 种畸形请求、E21 的 4 种与 E22 的 8 种被拒输入都得到 4xx，没有 5xx，没有 error 级日志。鉴权路由按设计返回 `INVALID_JSON`、`UNSUPPORTED_MEDIA_TYPE`、`PAYLOAD_TOO_LARGE`、`INVALID_REQUEST`。成立。
5. N5：新哈希为 PHC 字符串 `$scrypt$ln=17,r=8,p=1$…`，独立计算证实参数生效，等于 OWASP Password Storage Cheat Sheet 列出的第一组 scrypt 设置；校验读取存储的成本（ln=14、ln=16/p=2、ln=15/p=3 都可校验）；返工前的 `scrypt$盐$密钥` 格式被确定地拒绝（不运行 scrypt，登录 401）。前两项成立；第三项的行为明确，但只记在提交 1762ed5 的说明里（R4）。
6. S003 spec 与代码：一致（acceptance.md §1.2）。缺口三处：旧哈希格式的处理没写进设计；§4.7「其它 Fastify 4xx 返回 400」与代码「保留原状态码」措辞不同（目前结果相同）；路由层 400/414 不在「不回显 URL」的覆盖内。
7. 23 行复用：上一轮复验范围给出的路径 diff 不为空（`auth/login.ts`、`auth/routes.ts`、`security/redaction.ts`），所以按它的要求重跑了 E20（34/34），并重跑 E21、E22；INHERIT 行逐行写明依据路径是否变化。

## 与实施方自测的对照

- `rework-self-check.md`（实施模型 claude-haiku-5.5）的门禁、默认配置冒烟、打包 E24 复验（0/0/0）、N1 的四种状态码、登录耗时约 285 ms，本轮都复现。
- 自测 §6 列为未测的并发登录峰值内存，本轮测得：4 个及以上并发时峰值 RSS 升高约 511 MiB（284→795 MiB），与它估计的约 512 MiB 一致（E28）。反向代理访问日志仍未验证，属 STORY-029。
- 自测写「以 ln=14 写入的旧成本哈希仍可校验」，指的是 PHC 格式的旧成本；返工前的 `scrypt$盐$密钥` 格式不能校验，自测没有区分（R4）。
- 自测与新用例都没有覆盖路由层 400/414 与编码形态的令牌（R1、R2）；`refuses a stored cost that needs more memory than the cap` 用例靠密钥长度被拒，没有测到上限（E29 M4，R4）。

## 非阻断建议

R1 Fastify 路由层错误与非鉴权路由的错误体（SUB-007 范围的后续；交 STORY-021，STORY-023 接覆盖页时验证）
- 现状：路径含非法百分号转义时 400 `FST_ERR_BAD_URL` 回显含查询串的整个请求目标，参数超过 100 字符时 414 回显路径（E25 C1、C2、B5，E26）；这两种请求也不写请求日志。未知路由与 `POST /healthz` 的请求体错误返回 Fastify 默认错误体（E26），与鉴权路由的固定错误码不一致。
- 建议：在 `Fastify({ frameworkErrors })` 里对 `FST_ERR_BAD_URL`、`FST_ERR_MAX_PARAM_LENGTH` 返回固定体（例如 `INVALID_URL`、`URL_TOO_LONG`），让它们经过同一个请求日志序列化器；根实例加一个 `setErrorHandler`，把 Fastify 4xx 统一为固定错误码；leak-scan 增加这两种负例。STORY-021 引入可以放令牌的下游 URL 之前完成（Q16）。顺带把 design §4.7「其它 Fastify 4xx 返回 400」改成与代码一致的说法。

R2 请求日志的脱敏作用在未解码的 URL 上，host 不脱敏（SUB-007 范围的后续；交 STORY-021）
- 现状：整段百分号编码的令牌在路径中按编码形态进日志（E25 A5、B6）；`Host` 头原样进日志（D6）。
- 建议：日志记录已匹配路由的模板（`request.routeOptions.url`，例如 `/channels/:channelId/members`）而不是原始路径；未匹配的请求只记一个固定标记，或先安全解码再 `redactText`；`host` 同样经过 `redactText` 或不记录。

R3 登录的内存占用与限速（SUB-006 范围的后续；交 STORY-029，与已登记的登录限速一起做）
- 现状：N=2^17、r=8 每次校验约 128 MiB；不需要凭据的登录请求（不存在的账号也会算一次哈希）4 个并发就让峰值 RSS 增加约 511 MiB，libuv 默认 4 个线程使更多并发排队，16 个并发时最慢 1.27 s（E28）。OWASP 同一节把 N=2^14、r=8、p=5（16 MiB）或 N=2^15、r=8、p=3（32 MiB）列为相近的最低防护。
- 建议：在部署指引里写明内存预算与 `UV_THREADPOOL_SIZE` 的影响；STORY-029 做登录限速时加一个口令校验并发上限，或在目标主机实测后改用内存较低的等效参数。PHC 格式已经让改参数不影响旧哈希。

R4 旧哈希格式与成本上限的文档和测试（SUB-006 范围的后续；交 STORY-029，它负责首个账号的创建入口，Q17）
- 现状：返工前的 `scrypt$盐$密钥` 格式被拒绝，这一决定只写在提交 1762ed5 的说明里，design §4.3、数据字典与自测都没写，也没有用例；`redaction.ts` 的 scrypt 形态不再匹配旧格式。`refuses a stored cost that needs more memory than the cap` 用例的密钥只有 24 字节，靠长度检查被拒；去掉上限后它仍通过，而真正超限时 `verifyPassword` 会抛错、登录变成 500（E29 M4）。
- 建议：design §4.3 加一句「返工前格式不再接受；目前没有账号，不迁移」；补一个旧格式返回 false 的用例；成本上限用例改用 16 字节盐与 64 字节密钥。

上一轮建议的状态：N1、N6 已随返工完成（N6 剩 R1、R4 中的两处措辞）；N5 完成了成本与格式，登录限速仍在 STORY-029（R3）；N17 已落实（主线程 A12 现在包含默认配置冒烟）。N2、N3、N4、N7–N16 不变，已在问题清单 Q15–Q24。

## 问题清单更新建议

- 新增 Q25：R1、R2（Fastify 路由层 400/414 回显请求目标、非鉴权路由错误体、日志脱敏作用在未解码 URL 与 host 上）→ S021，S023 验证。在 Q16 的下游 URL 交付方式落地之前完成。
- 新增 Q26：R3（登录内存预算与校验并发上限）→ S029。
- 新增 Q27：R4（旧哈希格式写进设计并补用例；成本上限用例改为合法长度）→ S029。
- 批次表第 3 批：S003 复验通过（cd91ba0），三单可在 cd91ba0 链写；S005、S007 维持 9b7a7f8。

## STORY-005、STORY-007 路径核对（只报告，不写证据）

- 按上一轮 judgment.md「复验范围」第 2 条的命令，`git diff 9b7a7f8 cd91ba0 -- packages/contracts apps/server/src/modules apps/server/src/db/scoring-ledger.ts apps/server/src/db/repository.ts apps/server/src/db/transaction.ts apps/server/src/db/schema apps/server/src/db/migrations apps/server/test/scoring-engine apps/server/test/inference-provider packages/contracts/test pnpm-lock.yaml scripts/check-deps.mjs` 输出 0 行。两组在 9b7a7f8 上的结论不受影响。
- `apps/server/src/db/client.ts` 有 +20/−2（B1：打开前建父目录，目录已存在时不做任何事）。上一轮写明这项改动只在 S005、S007 改用新候选时才需要重跑 E40、E41；两组已以 9b7a7f8 完成，不改用新候选，所以没有重跑。cd91ba0 上全量测试中的计分账本用例（ledger-port 9、identity-events 7、compensation 5、concurrency 2）全部通过。

## lessons

`lessons.json` 记录 5 条本轮新确立、可跨工单复用的事实：Fastify 路由层错误绕过自定义处理与请求日志；请求日志脱敏作用在未解码 URL 上的盲区；scrypt OWASP 下限的内存与线程池账；主线程默认配置冒烟留下的 `apps/server/data` 会掩盖干净检出条件；在 scratch 副本里做 vitest 变异对照，以及「拒绝某种输入」的用例可能被更早的检查提前拦住。
