# 原生只读输出协议 v1（vw-output.v1）

状态：契约、帧、凭据授权、投递状态与补发规则已实现并有测试。WebSocket 端点的接入（`ws` 传输层、心跳计时器、
本机复现）待依赖安装完成后接入。在那之前，本文描述的端点不能连接。

本文对应工单 VOXWARD-STORY-021（子单 SUB-039、SUB-040）。依据：提案 §6.3、§13.1、§16。

## 1. 范围

下游（OBS 覆盖层、远端页面或其它只读消费者）通过一个可撤销凭据订阅一个房间的获准展示事件。协议只从服务端
到消费者单向发送 JSON 文本帧。消费者不上传弹幕，也不发送任何内容。

输出不包含：稳定平台用户 ID、内部评分、名单、完整审核理由、提示词或模型对话、关联 ID、主体 ID。

## 2. 端点与子协议

- 路径：`/output/v1/room`。房间由凭据对应的授权决定，客户端不选择房间。
- 子协议：客户端提供 `vw-output.v1` 和 `vw-cred.<凭据>`。服务端只选中 `vw-output.v1` 回显，从不回显凭据项。
- 凭据不放在 URL 查询串，也不放在 `Authorization` 头。浏览器 WebSocket 不能设置该头，查询串会被访问日志记录。
- 浏览器类消费者：把凭据放在页面地址的片段（`#`）中。页面脚本读取后立即清除该片段，再用子协议连接。片段不会进入
  HTTP 请求、访问日志或 Referer。

升级前的拒绝（不回显请求内容）：

| 情形 | 响应 |
| --- | --- |
| 路径不是 `/output/v1/room` | 404 |
| 子协议列表不含 `vw-output.v1` | 400 |
| 缺少凭据项，凭据未知、已撤销或范围不符 | 401 |

凭据为 `vwo_` 加 32 字节随机数的 base64url。服务端只保存其 SHA-256 摘要，不保存凭据本身。

## 3. 帧

所有帧都是 JSON 文本帧，字段列表固定，不含其它字段。

`HELLO`（凭据被接受后发送一次）：

```json
{ "type": "HELLO", "version": 1, "protocol": "vw-output.v1", "heartbeatMs": 15000 }
```

`DELIVER`（ALLOW，展示已批准文本）：

```json
{
  "type": "DELIVER",
  "version": 1,
  "deliveryId": "<投递 ID>",
  "deliverySequence": 1,
  "platformOrder": 7,
  "validUntil": "2026-11-10T10:05:00.000Z",
  "display": { "label": null, "text": "<已批准文本>", "translation": "<译文或 null>" }
}
```

`WARD_BLOCKED`（BLOCK，拦截舞台事件）：

```json
{
  "type": "WARD_BLOCKED",
  "version": 1,
  "deliveryId": "<投递 ID>",
  "deliverySequence": 2,
  "platformOrder": 8,
  "validUntil": "2026-11-10T10:05:00.000Z"
}
```

`WARD_BLOCKED` 不含原文、译文、昵称或任何身份字段。拦截事件不会因为重连而补播。

`display.label` 当前恒为 `null`。显示昵称或安全称呼没有入库，本协议不推算它。

## 4. 客户端到服务端

消费者只能发送 WebSocket 控制帧 pong。收到任何数据帧，服务端以关闭码 4400 断开。

## 5. 心跳与断连

- 服务端每 `heartbeatMs` 毫秒发送一次 WebSocket ping。默认 15000 毫秒（自定，未经测量）。
- 超过 10000 毫秒未收到 pong，以关闭码 4408 断开。
- 浏览器会自动回复 pong，消费者不需要额外处理。
- 每个心跳周期，服务端重新读取授权状态。授权已撤销时以 4403 断开。

关闭码（每个码只有一个固定原因文本）：

| 码 | 原因 | 含义 |
| --- | --- | --- |
| 4400 | `CLIENT_DATA_NOT_ACCEPTED` | 客户端发送了数据帧 |
| 4403 | `GRANT_REVOKED` | 授权或凭据已撤销 |
| 4408 | `HEARTBEAT_TIMEOUT` | 心跳未回应 |
| 4413 | `SUBSCRIBER_BACKPRESSURE` | 发送积压超过限制，连接被断开 |

## 6. 投递 ID、状态与去重

每个投递行有稳定的 `deliveryId`。它是 `deliveries.id`，同一投递的所有帧都带同一个 ID。

投递状态：

| 状态 | 含义 |
| --- | --- |
| `PENDING` | 等待发送。没有在线消费者时保持此状态，待消费者连接后发送。 |
| `SENT` | 已交给当前在线的全部消费者。不代表消费者已展示。 |
| `EXPIRED` | `validUntil` 已过，从未发送。 |
| `FAILED` | 发送失败次数达到上限（自定 3 次），或已批准文本不存在（原因 `CONTENT_UNAVAILABLE`，不是违规）。 |
| `CANCELLED` | 已被其它流程取消。 |

规则：

- 只发送 `PENDING`、`validUntil` 未过、且属于当前裁决的行。
- 状态变更是比较状态的写入：只有行仍是原状态时才改变。
- 同一频道内按投递顺序发送。前一行未成功时，后面的行等待。
- 行只在当时在线的全部消费者都接受后才标记为 `SENT`。部分失败时，已收到的消费者可能再收到一次。
  消费者按 `deliveryId` 去重即可。
- 重连时，只发送仍为 `PENDING` 且未过期的行。`SENT` 行和 `EXPIRED` 行不会因重连再次发送。

消费者去重：

- 对每个 `deliveryId` 只展示一次。
- `validUntil` 已过的帧不展示。
- 协议不承诺消费者网络之间的严格"只展示一次"。
- 样例见 `examples/consumer-dedup/`。

## 7. 补发

补发是明确的操作，由决策服务发起。补发会创建一条新的投递行，有自己的有效期（自定 60 秒）。输出端从不自动补发：

- `EXPIRED` 行不会被输出端发送。
- `SENT` 行不能补发。决策服务以 `ALREADY_SENT` 拒绝。
- 未过期的行不能补发。决策服务以 `NOT_EXPIRED` 拒绝。
- 补发的新行和其它 `PENDING` 行一样，只发送一次。

## 8. 撤销

- 签发：`POST /channels/:channelId/output-grants`，需要频道所有者的 `tokens.manage` 能力。响应 201，`cache-control: no-store`，
  凭据只返回一次。
- 撤销：`DELETE /channels/:channelId/output-grants/:grantId`，返回 204。凭据立即失效，该授权名下的连接以 4403 断开。
  撤销后的重连返回 401。

## 9. 不承诺的事

- 消费者网络之间的严格"只展示一次"。
- 显示昵称或安全称呼（`label` 为 `null`）。
- 付费展示信息（没有来源字段）。
- 送达确认。服务端不接收消费者的确认。

## 10. 来源缺口与自定选择

- 凭据保险库未接入运行时。输出凭据在 `credential_refs.secret_ref` 中保存为 `secretref:` 加 SHA-256 摘要，
  而不是保险库条目（自定，见 `apps/server/src/db/output-store.ts`）。
- 心跳、积压限制、失败次数、每轮批量与补发有效期都是自定值，未经负载测量。
- 旧的 Bearer 只读令牌（S003 的 `auth_output_tokens`）仍服务既有接口，不能订阅原生端点。
- 本地复现依赖 WebSocket 端点接入，尚未完成。
