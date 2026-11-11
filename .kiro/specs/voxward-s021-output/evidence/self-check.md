# S021 自测证据

工单：VOXWARD-STORY-021（work:26274628cbb8f691b6cf430c）。子单：VOXWARD-SUB-039（work:ac327b9a81a9326b33711ffb）、VOXWARD-SUB-040（work:a86848777f015b0c0a1d9611）。
工作树：`/home/ryanlan/Code/Voxward/.worktrees/s021-output`，分支 `voxward/s021-output`。门禁对应代码提交 `eeadec9`。未推送，未发布，未改引擎工单。

## 1. 执行信息

- 实际模型：会话标注为 claude-haiku-5.5，未独立核实宿主实际执行的模型。
- 接手：上一子代理（25a9acf1c4dbf1b0）停在 `240102a`，原因是 `ws` 安装命令被宿主误拦。Owner 已安装依赖，提交为 `5c140a8`。
- 合并 main：main 为 `8687bb4`（含 S011 第 2 次返工与 S015）。冲突 1 处，位于 `packages/contracts/src/index.ts` 末尾的导出；两边都保留，合并提交 `b345e78`。

## 2. 提交

| 提交 | 子单 | 内容 |
| --- | --- | --- |
| `b345e78` | STORY-021 | 合并 main，导出两边都保留 |
| `cb4545b` | SUB-039 1.5 | WebSocket 传输：子协议凭据、升级鉴权、心跳、授权复查、关闭码 |
| `f8b2a5f` | SUB-039 1.7 | `app.ts` 装配端点与投递泵；构建外置 `ws` |
| `c5f2020` | SUB-039 1.5 修正 | 写回调成功值为 `null` |
| `71e4b21` | SUB-039 1.9 | 端点级测试；本地任务 1.4 至 1.9 勾选 |
| `c17755b` | SUB-040 2.1 修正 | 投递泵发送时读取消费者；偏离记录 |
| `c1f0e0d` | SUB-040 2.5 | 协议文档与端点一致 |
| `eeadec9` | SUB-039 1.5 修正 | 授权读取失败时失败即关闭，异常不逃逸到计时器 |
| 本提交 | SUB-040 2.8 | 本证据文件，任务 2.8 与 3.1 至 3.3 勾选 |

此前的 `92f5959`（spec）、`6d256a7`（SUB-039 第一部分）、`240102a`（SUB-040 第一部分）、`5c140a8`（依赖）已在分支上。

## 3. 门禁（代码 `eeadec9`）

| 门禁 | 命令 | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| 安装 | `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped` |
| 构建 | `pnpm build` | 0 | `apps/server build: Done`；`apps/web build: ✓ built in 1.14s` |
| 类型检查 | `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均为 Done |
| 测试 | `pnpm test` | 0 | `Test Files 144 passed (144)`；`Tests 1860 passed (1860)` |
| 分区 | `pnpm check:deps` | 0 | `check-deps: ok, 213 files checked, 0 violations` |
| 规范 | `kiro-specs.mjs check`（工作 ID 与 spec 目录按简报） | 0 | `reasonCode: SPEC_CURRENT`，`workRevision: 4` |
| 冒烟 | `env -u VOXWARD_DATABASE_FILE bash .kiro/specs/voxward-master/tools/smoke.sh <工作树> <scratch>` | 0 | dev `/healthz` 200（2 秒）；dist `/healthz` 200（1 秒）；`no listeners` |

冒烟日志中的 `Failed` 行出现在停止进程组时，服务在此之前已返回 200。

## 4. 本包测试（最终运行）

| 文件 | 用例 | 覆盖 |
| --- | --- | --- |
| `test/output-adapter/protocol/socket.test.ts` | 11 | 端点级：升级 401、404；子协议选中与首帧 HELLO；4400、4408、4413、4403；撤销后重连 401；PENDING、过期、BLOCK、SENT 规则；授权读取失败 |
| `test/output-adapter/delivery/pump.test.ts` | 11 | 顺序、SENT 比较状态、无消费者时等待、过期不发、缺正文为 FAILED、失败计数、消费者离开、消费者中途加入 |
| `test/output-adapter/delivery/resend-contract.test.ts` | 4 | 补发拒绝（ALREADY_SENT、NOT_EXPIRED）；输出端不自动重发 |
| `test/output-adapter/delivery/consumer-dedup.test.ts` | 5 | 按 `deliveryId` 去重；有效期 |
| `test/output-adapter/protocol/frames.test.ts` | 5 | 帧字段白名单；BLOCK 无原文 |
| `test/output-adapter/protocol/subscription-registry.test.ts` | 3 | 注册表；撤销时批量关闭 |
| `test/db/output-store.test.ts` | 8 | 授权存储与投递端口 |
| `test/auth/output-grants.test.ts` | 3 | 签发、权限、撤销路由 |
| `test/security/url-redaction.test.ts` | 4 | 百分号编码凭据与 Host 脱敏（Q25） |
| `test/app/error-responses.test.ts` | 4 | 框架错误固定响应体（Q25） |

## 5. 验收行逐条结果

### VW-SUB039-AC001：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效

结果：通过。

- 字段：HELLO、DELIVER、WARD_BLOCKED 的键集合与 `NATIVE_FRAME_FIELDS` 逐一相等（`socket.test.ts`，`frames.test.ts`）。
- 不上传：消费者发送任何数据帧，服务端以 4400 断开（`socket.test.ts`）。
- 撤销后失效：路由撤销后连接立即以 4403 断开，同一凭据重连返回 401（`socket.test.ts`）。数据库直接撤销时，连接在一个心跳周期内以 4403 断开（`socket.test.ts`）。

### VW-SUB040-AC001：重复投递按投递 ID 去重；过期 SC 不自动补播；补发须明确并受有效期限制；不承诺严格一次

结果：通过。

- 去重：`consumer-dedup.test.ts`；样例见第 6 节。
- 过期不补播：`pump.test.ts` 中 EXPIRED 行不发送；`socket.test.ts` 中过期行不到达消费者，SENT 行在重连后不再发送。
- 补发：`resend-contract.test.ts`，ALREADY_SENT 与 NOT_EXPIRED 被拒，输出端不自动重发。
- 不承诺严格一次：`docs/protocol/output-native-v1.md` 第 9 节。

### 父级与继承判据

- VW-S021-AC001、VW-SUB039-PARENT、VW-SUB040-PARENT：BLOCK 只发 WARD_BLOCKED，不含原文（`socket.test.ts`，`pump.test.ts`）；重复投递按 ID 去重；断连（4408、4413、断开后重连）；过期不发；人工补发由决策服务拒绝；凭据撤销（4403）。
- INHERIT-001：`check-deps` 0 违规；`adapters/native-output` 只导入 contracts、`ws` 与 builtin。
- INHERIT-009、011、017：凭据只保存 SHA-256 摘要；正文只在证据表与 DELIVER 帧中；日志断言中不含凭据（`socket.test.ts`）。
- INHERIT-010、012、018、019：只核对接口与依赖方向。完整运行时验证由责任单承接，本包未声称已验证。

### Q16、Q18、Q25、m6 复验 N2（Q56）

- Q16：凭据不走查询串，不走 `Authorization`。查询串或 `Authorization` 中带凭据时返回 401，日志不含凭据（`socket.test.ts`）。
- Q18：授权按 `credential_refs` 与 `output_grants` 判定，撤销后断开（`output-grants.test.ts`，`socket.test.ts`）。
- Q25：Fastify 400、414 与未知路由为固定响应体；日志中的路径与 Host 脱敏（`error-responses.test.ts`，`url-redaction.test.ts`）。该部分由前一子代理提交，本次运行通过。
- N2：SENT 为比较状态写入；只读取 PENDING 且未过期的行；EXPIRED 不发送；SENT 后补发被拒 ALREADY_SENT（`pump.test.ts`，`resend-contract.test.ts`）。

## 6. 消费者样例在本机端点上的复现

方法：临时测试在 scratch 库中写入一条 ALLOW（`d-r1`）和一条 BLOCK（`d-r2`），在 `127.0.0.1:3100` 启动端点。样例消费者经环境变量读取凭据后连接。复现结束后删除临时测试文件，未提交。

结果：

- 正确凭据，输出：

  ```text
  connected: vw-output.v1, heartbeat every 15000 ms
  d-r1 approved text from the reproduction
  d-r2 WARD_BLOCKED
  ```

  消费者被 `timeout 6` 结束，退出码 124；连接在此之前保持打开。BLOCK 的原文没有出现。
- 错误凭据（格式正确、未知）：输出 `connection failed`，退出码 1。
- 凭据字符串没有出现在消费者输出或测试日志中（计数 0）。

## 7. 本包发现并修正的缺陷

1. 写回调成功值（`c5f2020`）：ws 与 Node 在写入成功时回调传入 `null`。原判定 `error === undefined` 把每次成功写入都计为失败，行变为 FAILED。端点测试发现。
2. 投递泵读取消费者的时机（`c17755b`）：泵在轮次开始时读取一次消费者。消费者离开后，行仍被标为 SENT；消费者在发送期间加入时，行被标为 SENT，而该消费者没有收到。审查发现，新增两条测试。
3. 授权读取异常（`eeadec9`）：SQLite 异常若在升级处理函数或心跳计时器中未被捕获，会终止进程。现在升级返回 500；心跳复查失败视为已撤销。新增一条测试。

## 8. 自定选择

以下数值未经负载测量。完整说明见设计文档第 13 节。

- 心跳 15 秒、pong 超时 10 秒：协议值，取自 `packages/contracts/src/output/native-v1.ts`。
- 积压上限 1 MiB；单帧写入超时 5 秒；关闭宽限 1 秒。
- 投递泵：每 250 毫秒一轮；每频道每轮 50 行；每轮过期最多 500 行；失败上限 3 次。
- 凭据为 `vwo_` 加 32 字节随机数，服务端只保存 SHA-256 摘要，不经保险库。
- 不做 Origin 同源判断，凭据是唯一授权依据。
- 4413 判定：发送前已排队超过 1 MiB，或单帧 5 秒内未写入套接字。对端不读取时，关闭帧排在积压之后，无法送达。测试在服务端记录关闭码 4413，并确认连接被断开；线上未读取到该码。

## 9. 与设计的偏离（设计文档第 13 节）

- 订阅策略（1.4）：心跳常量与关闭码放在 contracts；注册表仍在 `modules/output-adapter/subscription.ts`。`adapters` 分区不能导入 `modules`。
- `app.ts` 装配已完成；设计表原先写的「尚未装配」已更新。
- FAILED 不记录原因码：`deliveries` 表没有原因列。
- 投递泵在发送时读取消费者（第 6 节，SUB-040 修正）。
- `display.label` 恒为 `null`；付费展示信息没有来源。
- `deliver()` 唤醒未接入：注册表仍为合成适配器（设计第 8 节的自定）。行由 250 毫秒计时器取出。

## 10. 未验证项与来源缺口

- 真实 OBS Browser Source 与真实浏览器的片段（`#`）流程：未实测。
- 负载、延迟、心跳与积压阈值：未测。
- 凭据保险库未接入运行时。输出凭据只保存摘要。
- 显示昵称与付费展示信息没有来源。
- 合并进来的 S011、S015 业务代码未在本包内审查。它们只参与全量测试（1860 个通过）。
- 复现只在 127.0.0.1 上进行，没有远端访问。

## 11. 与同批其它包可能的合并冲突

- `packages/contracts/src/index.ts`：与 S011、S015 的导出已在 `b345e78` 解决。
- `apps/server/src/app.ts`：导入与 `buildApp` 装配段。
- `apps/server/package.json`：构建脚本增加 `--external:ws`；依赖 `ws` 与 `@types/ws`。
- `pnpm-lock.yaml`：`ws` 与 `@types/ws`。
- `scripts/check-deps.mjs` 与配置 schema：本包未改动。

## 12. 改动文件（相对 main，共 36 个，绝对路径；A 为新增，M 为修改；本提交另加本证据文件与 tasks.md）

- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/.kiro/specs/voxward-s021-output/design.md
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/.kiro/specs/voxward-s021-output/requirements.md
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/.kiro/specs/voxward-s021-output/source.json
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/.kiro/specs/voxward-s021-output/tasks.md
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/package.json
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/adapters/native-output/socket.ts
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/app.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/auth/output-grants.ts
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/auth/routes.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/db/output-store.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/modules/output-adapter/delivery.ts
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/modules/output-adapter/index.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/modules/output-adapter/native-protocol.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/modules/output-adapter/resend.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/modules/output-adapter/subscription.ts
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/src/security/redaction.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/app/error-responses.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/auth/output-grants.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/db/output-store.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/delivery/consumer-dedup.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/delivery/helpers.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/delivery/pump.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/delivery/resend-contract.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/protocol/frames.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/protocol/socket.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/output-adapter/protocol/subscription-registry.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/apps/server/test/security/url-redaction.test.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/docs/protocol/output-native-v1.md
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/examples/consumer-dedup/README.md
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/examples/consumer-dedup/consumer.mjs
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/examples/consumer-dedup/dedupe.d.mts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/examples/consumer-dedup/dedupe.mjs
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/packages/contracts/src/index.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/packages/contracts/src/output/native-v1.ts
- A /home/ryanlan/Code/Voxward/.worktrees/s021-output/packages/contracts/src/ports/output-port.ts
- M /home/ryanlan/Code/Voxward/.worktrees/s021-output/pnpm-lock.yaml

## 13. 状态

子单 SUB-039 与 SUB-040 的本地实施已完成并提交。正式工单状态未改动。未推送，未发布，未改引擎工单。
