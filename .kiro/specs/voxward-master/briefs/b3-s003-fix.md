你是 VoxWard 第 3 批 S003 返工包的实施子代理（economy 档；引擎 execution-policy-resolve 的结果是 kiro / claude-haiku-5.5 / max，rejections=1）。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底。只在本地分支提交，不推送。普通实现选择由你自己决定，写进报告即可。

## 背景
- 被打回的单：VOXWARD-STORY-003（work:fd4f81864ddb33703517e12f）、VOXWARD-SUB-006（work:dbbe21c0e4a859e27b5da62f）、VOXWARD-SUB-007（work:5039a470eef52b78249aa255）。打回发生在候选 9b7a7f8 的独立验收上。
- 原实现已经在 main 里。
- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s003-fix`，分支 voxward/s003-fix，基于 main c63c9b1。

## 必读
- 验收判断：工作树内 `.kiro/specs/voxward-batch3/evidence/judgment.md`。B1 在第 20–30 行，B2 在第 31–40 行。N1、N5、N6 用 grep 搜「^N1 」「^N5 」「^N6 」定位。
- 验收复现记录：`.kiro/specs/voxward-batch3/evidence/acceptance.md`。用 grep 定位 E07、E07b、E08、E09、E21、E22、E24 的命令和方法，每次最多读 200 行。
- S003 spec：`.kiro/specs/voxward-s003-auth/design.md` 和 `tasks.md`，只看受管段外的部分。
- 编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。

## 要修的项（只修这些）
1. **B1（SUB-006）**：默认配置下服务起不来。`databaseFile` 的默认值是相对路径 `data/voxward.sqlite3`，干净检出里没有 `data/` 目录，于是报 `DATABASE_SETUP_FAILED: unexpected error`。
   - 修法：打开数据库前先建好父目录（`:memory:` 除外）。
   - 报错要说出原因，但不回显路径。
   - 补一个测试：在临时 cwd 下用默认配置启动服务，探测 `/healthz`。
2. **B2（SUB-007）**：URL 查询串里的令牌会原样写进 Fastify 请求日志和 404 响应。
   - 给 logger 配 `serializers.req`：记录 url 时去掉查询串，或者先经过 `redactText`。
   - 用 `setNotFoundHandler` 返回固定的 404 响应体，不回显 URL。
   - leak-scan 测试加上负例：查询串里带 `vws_`、`vwo_` 令牌时，日志和 404 响应都要扫描到 0 处活令牌。
3. **N1（SUB-006）**：客户端错误被当成 500。畸形 JSON、不支持的 content-type、超过 1 MiB 的请求体，都应该返回对应的 4xx，并以 warn 或更低级别记录。
4. **N5（SUB-006，安全相关）**：
   - 把 scrypt 参数调到 OWASP Password Storage Cheat Sheet 的下限（N=2^17、r=8、p=1，或等强度组合）。
   - 哈希改用带参数的格式（例如 PHC 字符串），这样以后调整参数不会让旧哈希失效；当前还没有真实账号，不需要迁移旧哈希。
   - 登录限速不在本包，留给 S029。
5. **N6**：同步 `voxward-s003-auth/design.md` 和 `docs/data-dictionary.md`，让测试对照表、函数签名和日志说法与代码一致。不改受管段。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 不扩大到 N2/N3/N4/N7。
- B1、B2 各单独 commit（提交信息含 VOXWARD-SUB-006 或 SUB-007 和 B1/B2）；N1、N5、N6 可以合成一个 commit。
- 每个修复都要先用修复前的代码跑一遍新测试，确认它能报出问题，然后再修。
- 改了 `ServerConfig` 就要同步所有测试里的配置写法，typecheck 必须通过。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。不用 send_message 重复完成通知。

## 自测（全部要退出 0）
1. 在工作树根跑 `pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`。
2. 不设任何 `VOXWARD_DATABASE_FILE`，分别跑 `pnpm dev` 和 `node apps/server/dist/main.js`：只绑 127.0.0.1，`/healthz` 返回 200，停掉后没有残留进程，并删掉生成的数据库文件。
3. 重做 E24：日志和 404 响应里活令牌 0 处。

结果写到 `.kiro/specs/voxward-s003-auth/evidence/rework-self-check.md`，并提交。

## 交付报告（完成时一次给出）
- 实际使用的模型；
- commit hash 和改动文件；
- 每一项的修法，以及修复前后的实测结果；
- 自测命令和退出码；
- 未验证项。

停止条件：上面 5 项修复和证据都已提交；或者同一个失败分析了两次仍没有新证据，说明阻点后停止。
