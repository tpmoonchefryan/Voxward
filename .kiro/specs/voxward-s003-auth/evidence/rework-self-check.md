# S003 返工自测证据（b3-s003-fix）

- 实际使用的模型：claude-haiku-5.5（经济档派工单指定的 kiro / claude-haiku-5.5 / max）。
- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s003-fix`，分支 `voxward/s003-fix`，基于 main `c63c9b1`。
- 代码提交（本证据之前的 HEAD 为 `1762ed5`）：
  - `888888d` VOXWARD-SUB-006 B1：打开数据库前创建父目录。
  - `d3a343a` VOXWARD-SUB-007 B2：请求日志去掉查询串，未知路由返回固定 404。
  - `1762ed5` VOXWARD-SUB-006 N1、N5、N6：客户端错误状态码，scrypt 成本与 PHC 格式，文档同步。
- 环境：Linux，Node v24.16.0，pnpm 12.18.0（非交互）。临时文件放在 `$KIROCREW_SCRATCH`。

## 1. 门禁（工作树根）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile 与依赖一致 |
| `pnpm build` | 0 | `apps/server/dist/main.js`，迁移复制到 `dist/migrations` |
| `pnpm typecheck` | 0 | packages/contracts、apps/server、apps/web 均通过 |
| `pnpm test` | 0 | 45 个文件，430 个用例全部通过（返工前 418） |
| `pnpm check:deps` | 0 | 94 个文件，0 违规 |

## 2. 启动冒烟（不设 `VOXWARD_DATABASE_FILE`）

- `pnpm dev`：`/healthz` 在约 1 s 后返回 200，body `{"status":"ok"}`。监听只有 `127.0.0.1:3000` 与 `127.0.0.1:5173`。发送 SIGTERM 后进程组全部退出，3000/5173 无监听。收尾时 pnpm 打印两行 `Failed`，是子进程被信号终止的输出。生成的 `apps/server/data/voxward.sqlite3`（含 `-wal`、`-shm`）已删除。
- `node apps/server/dist/main.js`（工作目录为工作树根）：`/healthz` 返回 200，监听只有 `127.0.0.1:3000`。发送 SIGTERM 后退出码 0，stderr 0 字节，无监听。生成的 `./data/voxward.sqlite3`（含 `-wal`、`-shm`）及 `./data` 目录已删除。
- 残留进程：按进程组与 `ss -ltn` 检查，启动的服务端、tsx、vite 均已退出。

## 3. E24 复验（打包产物，端口 4334，scratch 库，1 个频道与 1 个频道主播）

| 请求 | 状态码 | 响应体 |
| --- | --- | --- |
| 登录 | 200 | 不在检查范围 |
| 签发下游令牌 | 201 | 一次性返回，不在检查范围 |
| `GET /channels/channel-1/members?token=<活的 vwo_>` | 401 | 不回显令牌 |
| `GET /overlay/channel-1?session=<活的 vws_>` | 404 | `{"error":"NOT_FOUND"}` |
| `GET /channels/channel-1/members`，授权头带 `vwo_` | 403 | 不回显令牌 |

活的凭据在服务端标准输出（含 6 条 incoming request 行）、标准错误与三个响应体中的出现次数：

| 位置 | 活的下游令牌 | 活的会话令牌 | 口令 |
| --- | --- | --- | --- |
| 服务端标准输出 | 0 | 0 | 0 |
| 服务端标准错误（0 字节） | 0 | 0 | 0 |
| 401 响应体 | 0 | 0 | 0 |
| 404 响应体 | 0 | 0 | 0 |
| 403 响应体 | 0 | 0 | 0 |

修复前（`acceptance.md` E24）：日志中活的下游令牌 1 行、活的会话令牌 2 行，404 响应体含会话令牌。签发响应体中的令牌是设计上的一次性返回，不在本次扫描范围内。

## 4. 各项修复与修复前后的实测

每项都先写了新用例，在修复前的代码上运行，确认报出问题后才修复。

- **B1（SUB-006）默认配置启动失败**
  - 修复前：新用例报 `server exited with code 1: DATABASE_SETUP_FAILED: unexpected error`。
  - 修复后：默认配置在空的临时工作目录中启动，`/healthz` 返回 200，并生成 `data/voxward.sqlite3`。
  - 目录无法创建的负例：修复前 `DATABASE_SETUP_FAILED: SQLITE_CANTOPEN`，修复后 `DATABASE_SETUP_FAILED: DIRECTORY_UNAVAILABLE`，不回显路径。
- **B2（SUB-007）查询串令牌进入日志与 404 响应**
  - 修复前：泄漏扫描负例中，请求日志含下游令牌与会话令牌；404 响应体复述了 URL，其中含会话令牌。
  - 修复后：日志与 401、404 响应体中活令牌为 0，404 响应体为 `{"error":"NOT_FOUND"}`。packaged E24 复验结果见第 3 节。
- **N1（SUB-006）客户端错误被报成 500**
  - 修复前：畸形 JSON、urlencoded、multipart、超过 1 MiB 的请求体均得到 500，并以 error 级记录。
  - 修复后：畸形 JSON 得到 400 `INVALID_JSON`，不支持的内容类型得到 415 `UNSUPPORTED_MEDIA_TYPE`，超过 1 MiB 得到 413 `PAYLOAD_TOO_LARGE`。这些只以 warn 记录错误码。新用例全部通过。
- **N5（SUB-006）scrypt 参数与哈希格式**
  - 修复前：N=16384，哈希为 `scrypt$盐$密钥`。新用例报格式不符。
  - 修复后：新哈希为 `$scrypt$ln=17,r=8,p=1$<盐>$<密钥>`（N=2^17，即 OWASP 下限）。以 `ln=14` 写入的旧成本哈希仍可校验。脱敏模式可识别 PHC 格式。
  - 实测：N=2^17、r=8、p=1 在本机单次约 285 ms。内存上限 64 MiB 不够（`ERR_CRYPTO_INVALID_SCRYPT_PARAMS`），因此上限改为 512 MiB，存储成本超过 256 MiB 工作内存时直接拒绝。
- **N6（SUB-006、SUB-007）文档同步**
  - `design.md` 受管段（第 1 至 53 行）未改动，`cmp` 核对一致。
  - §5 对照表改为仓库中实际存在的测试文件。
  - 函数签名改为代码中的签名，包括 `createAccount(database, …)`、`issueOutputToken` 的 `createdByAccountId`、`authorizeChannel` 无 `now`、`permissions.ts` 的导出函数名。
  - 日志说法改为实际行为。
  - `docs/data-dictionary.md` 开头改为 27 张表（0000 的 24 张加 0001 的 3 张），`password_hash` 格式改为 PHC。
  - `schema.test.ts` 的「documents exactly the 27 schema tables」通过。

## 5. 附加核对（打包产物，N1 与登录耗时）

在 4335 端口运行 `apps/server/dist/main.js`，数据库为 scratch 库。脚本自行启动并在结束时停止服务。请求体在内存中生成，没有读取或发送任何本地文件，全部发往 127.0.0.1。

第一次尝试用 curl 发送请求时，命令因含 `--data-binary @` 形式被宿主安全策略拦截，并非用户操作。那条命令未执行，没有启动服务。该形式的 `@` 会读取 scratch 中的一个合成文件，但目标是回环地址，没有文件内容离开主机，属于过度拦截。之后改用上述脚本完成同一检查，没有改写原命令去绕过规则。

| 请求 | 修复前（`acceptance.md` E21、E22） | 修复后 |
| --- | --- | --- |
| 畸形 JSON | 500 `INTERNAL_ERROR`，error 级 | 400 `INVALID_JSON` |
| urlencoded 请求体 | 500 `INTERNAL_ERROR`，error 级 | 415 `UNSUPPORTED_MEDIA_TYPE` |
| multipart 请求体 | 500 `INTERNAL_ERROR`，error 级 | 415 `UNSUPPORTED_MEDIA_TYPE` |
| 超过 1 MiB 的请求体 | 500 `INTERNAL_ERROR`，error 级 | 413 `PAYLOAD_TOO_LARGE` |

- 日志：info 15 条，warn 4 条（错误码依次为 `FST_ERR_CTP_INVALID_JSON_BODY`、`FST_ERR_CTP_INVALID_MEDIA_TYPE` 两次、`FST_ERR_CTP_BODY_TOO_LARGE`），error 0 条。日志中没有口令，也没有超过 1 MiB 的请求体内容。
- 标准错误 0 字节，SIGTERM 后退出码 0，停止后端口关闭。
- 登录耗时（N=2^17）：正确口令 290 ms 返回 200；错误口令 280 ms 返回 401 `INVALID_CREDENTIALS`。本机直接计算 scrypt 的中位数：修复前 N=2^14 为 31 ms，修复后 N=2^17 为 285 ms。

## 6. 未验证项

- 并发登录的峰值内存未测。每次哈希约占用 128 MiB，libuv 线程池默认 4 个线程，最坏情况约 512 MiB。
- 登录限速不在本包，留给 S029。
- 反向代理或平台的访问日志是否记录查询串，本包未覆盖，未验证。
- 只在当前 Linux 环境验证，其它操作系统上的 better-sqlite3 原生构建未验证。
- 本证据是实施方的自测，不是独立验收。
