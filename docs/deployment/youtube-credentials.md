# YouTube 凭据配置与授权（部署方指引）

状态：草案，依据 `.kiro/specs/voxward-s012-youtube-auth/design.md`。本版本的授权处理器尚未挂载到运行中的服务。凭据保险箱的持久化与密钥来源还没有定义，所以下文中写明「尚未接入」的步骤，在本版本不能执行。

凡是需要平台审核、申请或登记的步骤，都标注「需部署方 / Owner 向平台申请」。这些步骤在本文撰写时均未完成，不能视为已完成。

## 1. 能力与凭据

| 操作 | 访问方式 | 所需 scope | 说明 |
| --- | --- | --- | --- |
| `PUBLIC_LIVE_CHAT_READ` | API key | 不需要 | 公开直播只读。提案 §3.1 要求优先评估这条路径。API key 的配置本版本未实现，需实测确认。 |
| `AUTHORIZED_DATA_READ` | OAuth | `https://www.googleapis.com/auth/youtube.readonly` | 读取需要授权的数据。scope 待对照官方列表核对。 |
| `PLATFORM_WRITE` | OAuth | `https://www.googleapis.com/auth/youtube.force-ssl` | 平台写操作，例如删除原生聊天室消息（提案 §7.3）。scope 待对照官方列表核对。 |

- 每次授权只请求该操作所需的 scope，不合并其它授权。
- 配额：连接、重连和其它 API 调用都计入配额（提案 §3.1）。部署前需核对各能力的配额成本。

## 2. 部署方需要准备的事项

1. 创建 Google 账号和 Google Cloud 项目，并启用所需 API。需部署方 / Owner 向平台申请。
2. 创建 OAuth 客户端（类型为 Web 应用），并登记回调地址。需部署方。
3. 配置 OAuth 同意屏，包括用户类型和应用信息。需部署方 / Owner 向平台申请。
4. 应用验证和 YouTube API 合规审核。是否需要，取决于请求的 scope 与用户范围。需部署方 / Owner 向平台申请。本版本未完成。
5. 隐私政策链接。尚未准备，见 `docs/policy/status-and-gaps.md`。

Cloud 项目、同意屏和合规审核是三件不同的事。自托管不构成普遍豁免。普通房管不需要各自建立 Cloud 项目（提案 §3.3）。

## 3. 回调地址

- 格式为 `https://<部署域名>/youtube/oauth/callback`，并在 OAuth 客户端中逐字符登记。协议、大小写和末尾斜杠都必须一致。
- 服务端只接受 HTTPS。http、IP 地址、通配符、用户信息和 fragment 都会被拒绝，状态显示为 `CALLBACK_MISCONFIGURED`。
- 本版本不接受 `http://localhost` 回调。

## 4. 客户端密钥

- 客户端密钥不得写入代码、仓库、日志，也不得通过 HTTP 接口提交。本版本的路由不接受密钥输入。
- 不得分发共享的 Client Secret，例如打包进公开发布的软件。
- 设计中的写入方式：经服务器本地运维入口写入加密保险箱，数据库只保存 `secretref:` 指针。该入口尚未接入。

## 5. 授权流程与状态

- 频道所有者（主播）发起授权，并选择操作类型。房管不能发起授权，也不获得 OAuth 密钥（提案 §2.1）。
- 授权记录（refresh token 与授予的 scope）整体封存在保险箱中。访问令牌不落库。
- 撤销时先请求 Google 撤销授权，确认成功后才在本地标记撤销。撤销失败会显示 `REVOKE_NOT_CONFIRMED`，本地记录保持不变。

| 状态 | 含义 | 处理 |
| --- | --- | --- |
| `NOT_CONFIGURED` | 尚未保存客户端密钥 | 部署方完成第 4 节的配置 |
| `CALLBACK_MISCONFIGURED` | 回调地址不合法或与登记值不一致 | 按第 3 节修正并重新登记 |
| `CLIENT_REJECTED` | 客户端密钥被拒绝，或客户端已删除 | 检查客户端密钥与客户端状态 |
| `NOT_AUTHORIZED` | 主播尚未授权，或拒绝了同意 | 主播重新发起授权 |
| `INSUFFICIENT_SCOPE` | 授予的范围不足以完成该操作 | 重新授权并勾选所需权限 |
| `REAUTHORIZATION_REQUIRED` | 授权已过期或失效 | 主播重新授权 |
| `REVOKED` | 授权已撤销 | 需要时重新授权 |
| `RECORD_UNREADABLE` | 保险箱中的记录无法读取 | 检查保险箱与密钥，必要时重新授权 |
| `PROBE_FAILED` | 在线核验失败，原因未知 | 查看日志后重试；在此之前不视为已授权 |

## 6. Testing 发布状态

- 若 OAuth 应用处于 Testing 发布状态，授权有效期可能较短。此时状态会附加 `TESTING_PUBLISHING_STATUS` 提示。
- 具体有效期以 Google 官方说明为准，见 https://developers.google.com/identity/protocols/oauth2#expiration。本指引不写死天数。
- 测试应用不能作为长期生产凭据方案。

## 7. 撤销与删除

- 撤销入口：VoxWard 中的撤销操作。也可在 Google 账户的第三方访问页面撤销：https://myaccount.google.com/permissions。
- 撤销后数据的删除时限受开发者政策约束，见 `docs/policy/data-processing.md` 第 5.3 节。部署方需自行核对。

## 8. 部署检查清单（草案）

实际部署前逐项确认：

- [ ] 凭据由谁创建，保存在哪里，读取身份是否受限（提案 §16）。
- [ ] 回调地址与实际域名一致，并已在 OAuth 客户端中登记。
- [ ] 请求的 scope 与实际功能一一对应，并已核对各项能力的配额成本。
- [ ] 理解发布状态（Testing 或正式）对授权有效期的影响。
- [ ] 撤销入口可用，撤销后的删除流程已验证。
- [ ] 隐私政策链接（尚未准备）。
- [ ] 配额监测与超限提示。

## 9. 来源

- Google OAuth 2.0 网页服务端文档：https://developers.google.com/identity/protocols/oauth2/web-server（本版本依据，2026-11-10 全文读取）
- 提案 `docs/proposal/y3_project_proposal.md` §2.1、§3.1、§3.3
- `docs/policy/self-hosting-responsibilities.md` §2
