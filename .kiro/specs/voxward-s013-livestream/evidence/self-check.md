# 自测证据：VOXWARD-STORY-013（P-S013，子单 VOXWARD-SUB-024、VOXWARD-SUB-025，Q28、Q20）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s013-livestream`，分支 `voxward/s013-livestream`，基线 `d819cbe`。
- 提交顺序：
  - `d8b2b9a VOXWARD-STORY-013: add spec`（含 init 生成的 requirements.md、source.json，以及本地设计与清单）
  - `6ac7f80 VOXWARD-STORY-013 Q28: bind OAuth codes to PKCE, keep owner state, retire old grants`
  - `aa39f4d VOXWARD-STORY-013 Q20: keep identity base in full and clamp only the final score`
  - `70875ce VOXWARD-SUB-024: implement streamList intake with dedupe, replay age and backoff`
  - `cf3e361 VOXWARD-SUB-025: add identity mapping, quota monitor and versioned business events`
  - 最后一个提交：本文件与清单勾选，信息 `VOXWARD-STORY-013: add self-check evidence`。
- 运行环境：node v24.16.0，pnpm 12.18.0，非交互（`CI=true`）。
- 实际模型：宿主上下文注明 claude-haiku-5.5，未检测到改用其它模型。
- 本证据不是独立验收。独立验收由批末验收代理按 VW-SUB024-AC001、VW-SUB025-AC001 另行判定。

## 命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=true pnpm install` | 0 | 首次安装 `Packages: +174`；`pnpm-lock.yaml` 未改变 |
| `pnpm build` | 0 | `apps/web` 构建成功；`apps/server` esbuild 打包与迁移复制完成 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 三包 `tsc` 全部通过（含测试目录） |
| `pnpm test` | 0 | `Test Files 106 passed (106)`，`Tests 1542 passed (1542)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 178 files checked, 0 violations` |
| `kiro-specs.mjs check`（同 init 参数） | 0 | `reasonCode: SPEC_CURRENT`，`workRevision 4`，`sourceDigest 7b3914aa…` |
| `smoke.sh <工作树> $KIROCREW_SCRATCH/s013-livestream-smoke` | 0 | dev 与 dist 的 `/healthz` 均返回 200；停止后 `no listeners` |

冒烟未设置 `VOXWARD_DATABASE_FILE`。SQLite 文件位于 `apps/server/data/`，该目录已在 `.gitignore` 中，没有 `.db` 文件进入提交。

## 改动区域的测试数（apps/server 内单独运行）

| 目录 | 测试数 |
| --- | --- |
| `test/platform-source/youtube-credentials`（含 PKCE、重新授权） | 50 通过 |
| `test/platform-source/youtube-stream`（VW-SUB024-AC001） | 42 通过 |
| `test/platform-source/youtube-identity`（VW-SUB025-AC001） | 20 通过 |
| `test/security`（保险箱删除） | 21 通过 |
| `test/scoring-engine`（身份路径） | 84 通过 |
| `test/db`（分数行落库） | 99 通过 |

## 变异验证

每项先把对应缺陷写回源码，运行相关测试，再从备份恢复并比对。恢复后相关目录全部通过。

| 变异 | 失败测试数 | 对应用例 |
| --- | --- | --- |
| Q28-A：回调把 `peek` 改回 `consume`（他人失败会消耗主播 state） | 1 | 「keeps the owner's state usable after another account's failed attempt」 |
| Q28-B：兑换不发送 `code_verifier` | 10 | 授权成功与 PKCE 用例全部失败 |
| Q28-C：重新授权不删除旧密文 | 2 | `reauthorization.test.ts` 两例 |
| Q20-A：身份路径改回运行中钳制 | 4 | 上限处升级再到期、既有期望 |
| Q20-B：基准分变化但实际变化为 0 时不落库 | 1 | 上限处账本用例 |
| SUB-024-M1：去重失效 | 4 | 跨重连只投递一次、批内重复帧 |
| SUB-024-M2：补发年龄失效 | 2 | 过时补发不投递 |
| SUB-024-M3：重连无退避 | 6 | 退避递增与上限、放弃、限流下限 |
| SUB-024-M4：接受任意 `kind` | 1 | 非官方条目被丢弃并计数 |
| SUB-025-M5：不确定观察当作确定 | 2 | 缺失标记不降级 |
| SUB-025-M6：`false` 当作证据 | 8 | 身份映射用例 |
| SUB-025-M7：配额忽略下一次连接成本与服务端答复 | 4 | 配额耗尽可见 |

## 验收映射

### Q28（OAuth 授权码绑定 PKCE，回调与旧凭据）

| 要求 | 证据 |
| --- | --- |
| 授权请求为 S256 PKCE，verifier 与 state 绑定 | `pkce.test.ts`：URL 只含 challenge；兑换时 verifier 的 SHA-256 等于 challenge |
| 他人的失败尝试不消耗主播 state | `pkce.test.ts`：「keeps the owner's state usable after another account's failed attempt」 |
| 别人的 state 加主播的授权码必须失败，且不存入授权 | `pkce.test.ts`：「refuses another channel's state paired with the owner's code」 |
| 缺 verifier 必须失败（不发请求） | `pkce.test.ts`：「refuses a code exchange without a verifier before any request reaches the provider」 |
| verifier 不对必须失败 | `pkce.test.ts`：「fails the exchange with a wrong verifier」 |
| 重新授权后旧行撤销、旧密文删除、旧凭据不可读 | `reauthorization.test.ts`，以及 `credential-vault-remove.test.ts` |

### Q20（身份基准分与最终钳制）

| 要求 | 证据 |
| --- | --- |
| 上限处升级再到期，行为分不变 | `identity-events.test.ts`：「at the upper limit ...」；`identity-decision.test.ts`：「expiry after an upgrade at the limit ...」 |
| 下限处同样精确 | `identity-events.test.ts`：「at the lower limit ...」 |
| 惩罚在上限处生效后，到期时仍保留 | `identity-decision.test.ts`：「keeps a penalty taken at the limit ...」 |
| 重复身份、零差额、关闭开关时不动分数 | `identity-decision.test.ts` 三例 |

### VW-SUB024-AC001（初连近期 SC、重复帧、断连恢复、直播结束，不重复计分或投递，不重播过时卡片，只接受官方来源，不无条件轮询）

| 验收要点 | 证据（`test/platform-source/youtube-stream/`） |
| --- | --- |
| 初连近期 SC 不重复计分或投递 | `runner.test.ts`：「delivers each message once across a reconnect ...」（`superChatEvent` 只投递一次） |
| 重复帧 | `runner.test.ts`：「delivers a message once when its ID repeats inside one batch」 |
| 断连恢复从游标继续 | `runner.test.ts`：同上（请求的游标为 `[null, "tok-1"]`）；「resumes from a stored cursor」 |
| 游标失效后重建，依赖去重 | `runner.test.ts`：「drops an expired cursor ...」 |
| 直播结束 | `runner.test.ts`：`offlineAt` 进入 ENDED；`liveChatEnded` 等四类终止答复 |
| 过时卡片不重播 | `runner.test.ts`：「does not deliver a message published before the replay limit」 |
| 只接受官方上游 | `runner.test.ts`：非官方 `kind` 被丢弃计数；`intake-pieces.test.ts`：解析拒绝表 |
| 不无条件高频轮询 | `runner.test.ts`：退避序列、上限、限流下限、连续失败后放弃 |

### VW-SUB025-AC001（缺失订阅标记不伪造，配额不足可见，进入流水线的是版本化业务事件）

| 验收要点 | 证据（`test/platform-source/youtube-identity/`） |
| --- | --- |
| 缺失订阅标记不伪造 | `identity.test.ts`：「never fabricates a subscription marker」；缺失字段为不确定，不降级 |
| 未知身份不解释为否 | `identity.test.ts`：「is uncertain, and so never a downgrade ...」 |
| 配额不足可见 | `quota.test.ts`：状态 OK、WARNING、EXHAUSTED，服务端答复优先；`to-business-event.test.ts`：运行结束于 QUOTA_EXHAUSTED，快照可见 |
| 版本化业务事件而非平台原始响应 | `to-business-event.test.ts`：`contractVersion`、`ChannelEvent` 字段，输出中不含平台频道 ID |

### VW-S013-AC001（父级完整判据）

本包只承担 SUB-024 与 SUB-025 的部分。完整判据不由本包判定。真实接入记为「待部署实测（S029）」。

### 继承行（VW-S013-INHERIT-*）

接口与依赖方向在 `design.md` 第 7 节记录。运行时完整验证由责任单承接，本包没有实测。

## 未验证项与边界

- 没有连接真实 YouTube 或 Google，没有使用真实 OAuth 凭据或 client secret。
- streamList 的真实 HTTP 或 gRPC 适配器没有实现。transport 端口只有测试替身。
- 路由未挂载到运行中的服务。组合层的接线未做：`ChannelEvent` 交给审核路由，`identityChange` 交给 `applyIdentityTransition`，`MessageIdStore` 绑定 `channel_events` 唯一索引，`senderRefOf` 的密钥派生。这些在 `design.md` 第 6 节列为接线点。
- 旧 refresh token 只从本地保险箱删除，没有调用 Google 撤销端点。是否撤销，待 Owner 决定。
- 以下事项未在本次核对的官方页面中确认：`quotaExceeded` 的原因字符串；每日配额的重置时区；`chatEndedEvent` 消息类型。结束判定以 `offlineAt` 与 `liveChatEnded` 为准（已核对）。
- streamList 连接成本为 5 单位（已对官方页核对）。其它 YouTube API 调用本期不发起，未计入。
- 没有做性能测量，不对吞吐或延迟作承诺。
- 进程内去重表重启后失效。生产环境需绑定数据库唯一索引。

## 自定的选择

- 身份优先级：CHANNEL_OWNER、MODERATOR、PAID_MEMBER、VERIFIED_ACCOUNT。
- 缺失字段为不确定观察，不产生降级。四个字段都显式为 false 时，为确定的 UNKNOWN。
- 去重容量 10 000；补发年龄 300 000 ms；重连退避初始 1 000 ms，因子 2，上限 60 000 ms，限流下限 30 000 ms；连续失败 8 次后放弃。
- 配额预算 10 000 单位，预警比例 0.8，UTC 日窗口。
- 身份迁移只在变化时发出（同一身份的重复观察不发出）。从未见过的主体，任何确定观察都发出一次。
- 认证失败后的 state 在通过所有者与账号校验后即消费，不论提供方随后如何答复。
- 所有 PKCE 与重新授权的行为细节，见 `design.md` 第 3 节。

## 与子单交付清单的偏离

- VOXWARD-SUB-024 新增 `apps/server/src/modules/platform-source/youtube/config.ts`，放置阈值（自定）。清单未列此文件。
- VOXWARD-SUB-025 的四个交付文件全部存在。`to-business-event.ts` 输出 `ChannelEvent` 包装体，没有直接调用 ModerationEngine。接线点写在 `design.md` 第 6 节。
- Q28 修改了 `oauth.ts`、`routes.ts`、`credentials.ts`、`credential-vault.ts`。Q20 修改了 `identity-events.ts`、`clamp.ts`、`db/scoring-ledger.ts`。这两项是故障修复，不在子单清单内，按简报要求完成。

## 既有测试的期望变化

- `test/platform-source/youtube-credentials/credentials.test.ts`：授权 URL 与待决记录的构造补入 `codeChallenge` 与 `codeVerifier`；状态消费测试改为先 `peek` 后 `consume`。
- `test/scoring-engine/ledger/identity-events.test.ts`：「records only the part of an identity change that fits within the limit」的基准分期望由 10 改为 30。基准分全额记入，当前分仍截断为 10，`actual_delta` 仍为 10。这是 Q20 的设计内变化。
- `test/platform-source/youtube-credentials/fixtures.ts`：假授权服务器校验 S256 verifier；角色表加入第二频道的所有者。

## 与同批其它包可能的合并冲突

- `apps/server/src/modules/platform-source/index.ts`（导出列表）。
- `apps/server/src/security/credential-vault.ts`（接口增加 `remove`）。
- `apps/server/src/db/scoring-ledger.ts`（`persistWrite` 的签名与条件）。
- `apps/server/src/modules/scoring-engine/identity-events.ts`、`clamp.ts`。
- `apps/server/src/modules/platform-source/youtube/` 下的 `oauth.ts`、`routes.ts`、`credentials.ts`。

未改动：`package.json`、`pnpm-lock.yaml`、`ServerConfig` 与配置 schema、`scripts/check-deps.mjs`、`app.ts`、`registry.ts`、`packages/contracts`、`task-coordinator/`。
