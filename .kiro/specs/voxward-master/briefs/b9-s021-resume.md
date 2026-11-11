# S021 接手说明（接着 b8-s021.md 做）

先全文读同目录的 `b8-s021.md`，所有要求照旧。再读上一个子代理的报告 `/home/ryanlan/.kiro/crew/subagents/25a9acf1c4dbf1b0/result.txt`。下面只写不一样的地方。

## 为什么换人
上一个子代理装 `ws` 时被宿主规则误拦，只完成了不依赖 `ws` 的部分。现在 Owner 已经亲手装好了依赖，已提交为 `5c140a8`。你从这里接着做。

## 当前状态
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s021-output`，分支 `voxward/s021-output`，HEAD `5c140a8`。不要重装依赖，也不要再跑 `pnpm add`。
- 已提交的内容：
  - `92f5959`：spec；
  - `6d256a7`：SUB-039 第一部分（协议帧、授权存储、签发与撤销路由、Q25）；
  - `240102a`：SUB-040 第一部分（投递状态、有限发送、补发规则、协议文档、消费者样例）；
  - `5c140a8`：`ws` 和 `@types/ws`。
- 这个分支基于 0a3237c。main 之后又合入了 S011 第 2 次返工和 S015，`packages/contracts/src/index.ts` 会冲突（双方都在末尾加导出）。**先** `git merge main`，冲突按两边都保留的方式解决，单独提交，再开工。

## 要完成的部分（来自上一个子代理的报告）
- `adapters/native-output/socket.ts`：WebSocket 端点，升级鉴权走子协议 `vw-cred.<凭据>`（Q16），心跳超时 4408，积压超限 4413，授权复查不通过时真实断开（撤销后连接关闭）。
- `app.ts`：挂上升级处理和投递泵定时器。
- `apps/server/package.json` 的打包参数加 `--external:ws`，确保 dist 能启动。
- 端点级测试：401、4400、4403、4408、4413、撤销后断开、只发 PENDING 且未过期、SENT 后不重复。
- 消费者样例对本机端点复现（只连 127.0.0.1）。
- 证据文件 `.kiro/specs/voxward-s021-output/evidence/self-check.md`；tasks.md 本地段打勾。

## 被拒时
如果返回 `User denied tool execution`，停下来报告，写明被拦的命令。不要换写法绕过。
