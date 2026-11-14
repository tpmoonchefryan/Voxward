# blivechat 兼容输出协议适配（`blivechat-v1.x-json-ws`）

状态：**协议适配已实现并通过本机 loopback HTTP+WS 端到端验证**。
**未验证边界**：本测试环境未启动上游独立 blivechat 桌面端或 Python 二进制进程进行联调；当前验证范围为 VoxWard 服务端提供的 `blivechat-v1.x-json-ws` WebSocket 端点与协议状态机。

本文对应工单 `VOXWARD-STORY-024`（子单 `VOXWARD-SUB-044`）。

## 1. 端点与鉴权

- 协议版本标识：`blivechat-v1.x-json-ws`
- WebSocket 升级路径：`/output/blivechat/v1/chat`（与原生 `/output/v1/room` 共存于同一 HTTP 服务）
- 鉴权方式：在 `Sec-WebSocket-Protocol` 中提供 `blivechat-v1.x-json-ws` 与 `vw-cred.<credential>`。服务端只回显 `blivechat-v1.x-json-ws`，绝不回显或记录凭据。
- 拒绝策略：未知路径返回 `404`；缺少凭据、凭据格式不合法或已撤销返回 `401`。
- 撤销断开：凭据被撤销后，在线连接立即以 WebSocket 关闭码 `4403`（`GRANT_REVOKED`）断开。

## 2. 帧映射与安全约束

### 客户端上行（只读控制）

仅允许以下 JSON 命令帧；任何试图上传弹幕或发送未知命令的数据帧将以 `4400`（`CLIENT_DATA_NOT_ACCEPTED`）关闭连接：

- `JOIN_ROOM`（`cmd: 1`）：加入对应授权频道（实际频道完全由凭据对应的 `OutputGrantPort` 决定），并注册进 `OutputSubscriberRegistry`。
- `HEARTBEAT`（`cmd: 2`）：服务端回复 `HEARTBEAT_REPLY`（`cmd: 3`）。

### 服务端下行（仅获准内容）

- `DELIVER` -> `ADD_TEXT`（`cmd: 10`）或 `ADD_SUPER_CHAT`（`cmd: 12`）：
  - 仅映射 `content`（`text`）、`translation`、`id`（`deliveryId`）与匿名安全占位 `authorName: ""`。
  - **绝不透传**：稳定用户 ID（`uid`）、内部评分、名单/审核理由、`correlationId` 或 `subjectRef`。
- `WARD_BLOCKED`：
  - `WARD_BLOCKED` 本身不含原文与身份。由于 blivechat 协议无原生无身份拦截帧，本适配层**安全忽略** `WARD_BLOCKED`（不向客户端下发任何帧），确保被截原文与身份绝不泄露。
