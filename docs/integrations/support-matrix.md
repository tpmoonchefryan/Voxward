# 下游集成支持矩阵（Honesty Matrix）

本文对应工单 `VOXWARD-STORY-024`（子单 `VOXWARD-SUB-045`），严格遵循 `VW-S024-AC001` 真实诚实准则：仅在端到端验证通过后标为支持，不可行或未测范围明确标注，不把云服务器 `localhost` 当作主播本机，不开发新的本机代理，不以反向上传弹幕取代官方平台接入。

## 1. 支持矩阵总览

| 集成目标 | 当前状态 | 协议 / 入口 | 已验证范围与真实限制 |
| --- | --- | --- | --- |
| **VoxWard 原生 OBS Overlay** | **支持** | `/overlay/:roomId` + `vw-output.v1`（`/output/v1/room`） | 自托管 WebSocket + `#` 片段携带只读可撤销凭据；支持 `HELLO`、`DELIVER`、`WARD_BLOCKED`（无原文/身份）与撤销 `4403` 断开。 |
| **blivechat 兼容 WS 协议适配** | **协议适配已验证（限本机 loopback E2E）** | `blivechat-v1.x-json-ws`（`/output/blivechat/v1/chat`） | 本机 loopback HTTP+WS 已验证握手、`JOIN_ROOM`、`HEARTBEAT`->`HEARTBEAT_REPLY`、`ALLOW DELIVER` 映射为 `ADD_TEXT`（含 `text` 与 `translation`）、`WARD_BLOCKED` 不泄密及撤销 `4403` 断开；**本环境未启动上游独立 blivechat 桌面/Python 二进制进程联调**。 |
| **OneComme（わんコメ）** | **不支持云端直推** | 官方公开 [HTTP API](https://onecomme.com/docs/developer/http-api/) 与 [插件文档](https://onecomme.com/docs/developer/plugin/) | 云服务器上的 `localhost:11180` 不是主播本机；不开发新本机代理，禁止以反向上传弹幕取代官方平台接入。详见 [onecomme.md](./onecomme.md)。 |
| **VTube Studio (VTS)** | **不支持无本地插件/代理直连** | VTS 本机插件 API（主播 PC 本机运行） | VTS 插件 API 仅在主播 PC 本机运行，超出无本机代理 MVP 范围；替代方案仅可由 OBS/浏览器消费只读事件。详见 [vts.md](./vts.md)。 |

## 2. 云端-主播 PC 拓扑与权限边界

```text
[平台官方流] ---> [远端自托管 VoxWard 服务端] ---> (只读 WS: vw-output.v1 / blivechat-v1.x-json-ws) ---> [主播 PC: OBS / 浏览器]
                                                 X (不可直推主播本机 localhost:11180 / VTS 本机插件 API)
```

- **只读与撤销**：所有输出凭据均为只读、可随时撤销。撤销后服务端立即以 WebSocket 关闭码 `4403`（`GRANT_REVOKED`）断开连接。
- **零泄密**：`WARD_BLOCKED` 绝不输出原文、译文或身份；`ADD_TEXT` / `ADD_SUPER_CHAT` 绝不透传稳定用户 ID、内部评分、名单或审核对话。
- **测试事件自检与常见故障排查**：见 `/guides` 页面与 [blivechat.md](./blivechat.md)。
