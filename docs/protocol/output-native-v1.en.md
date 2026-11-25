# Native Read-Only Output Protocol v1 (`vw-output.v1`)

> Authoritative Chinese reference: [`output-native-v1.md`](./output-native-v1.md)

Status: Contract, frames, credential grants, delivery states, resend rules, WebSocket endpoint, and delivery pump are implemented and tested. A reference deduplicating consumer is available at `examples/consumer-dedup/README.md`.

## 1. Scope

Downstream consumers (OBS browser overlay, native desktop connectors such as `blivechat`, or remote read-only views) subscribe to approved display events for one channel using a revocable read-only credential. The protocol sends JSON text frames **unidirectionally** from server to consumer. Consumers never upload messages or write moderation controls.

Outputs **never** contain: stable platform user IDs, internal trust scores, list memberships, full moderation rationale, prompts or model conversations, correlation IDs, or subject IDs.

## 2. Endpoint & Subprotocols

- **Path**: `/output/v1/room`. The target channel is resolved strictly from the credential's grant; clients never select a room.
- **Subprotocols**: Clients offer `["vw-output.v1", "vw-cred.<credential>"]`. The server selects only `"vw-output.v1"` in the handshake response and never echoes `"vw-cred.<credential>"`.
- **Credential placement**: Never place credentials in URL query parameters or `Authorization` headers. Browser-based overlays read the credential from the URL fragment (`#vwo_...` or `#cred=vwo_...`) and strip it via `window.history.replaceState` before opening the WebSocket so the credential never enters HTTP requests, access logs, or `Referer` headers.
- **Credential grants**: One-time grants (`vwo_` + 32 random base64url bytes) store only a SHA-256 lookup digest (`secretref:<sha256>`) and carry `output_kind`: `NATIVE_V1`, `OBS_OVERLAY`, or `BLIVECHAT`.

Pre-upgrade HTTP rejections (empty body, nothing echoed):

| Condition | HTTP Status |
| --- | --- |
| Path is not `/output/v1/room` | `404` |
| Missing `vw-cred.<credential>`, missing `vw-output.v1`, or invalid format | `401` |
| Unknown, revoked, or out-of-scope credential grant | `401` |

## 3. Frames

All WebSocket frames are fixed-schema JSON text frames:

### `HELLO`

Sent once immediately after authentication, before any delivery frames:

```json
{ "type": "HELLO", "version": 1, "protocol": "vw-output.v1", "heartbeatMs": 15000 }
```

### `DELIVER` (`ALLOW`)

```json
{
  "type": "DELIVER",
  "version": 1,
  "deliveryId": "<delivery-id>",
  "deliverySequence": 1,
  "platformOrder": 7,
  "validUntil": "2026-11-10T10:05:00.000Z",
  "display": {
    "label": null,
    "text": "<approved-text>",
    "translation": "<primary-translation-or-null>",
    "translations": [
      { "language": "en", "translatedText": "<translated-text>" }
    ],
    "payment": {
      "amountMicros": 5000000,
      "currency": "USD",
      "amountDisplay": "$5.00",
      "tier": 3
    }
  }
}
```

- `display.label` is currently always `null`.
- `display.translations` and `display.payment` are optional: included when multilingual translations or structured paid Super Chat metadata exist. Unknown/unmapped payment amounts use neutral styling rather than fabricating currency or tier numbers.

### `WARD_BLOCKED` (`BLOCK`)

```json
{
  "type": "WARD_BLOCKED",
  "version": 1,
  "deliveryId": "<delivery-id>",
  "deliverySequence": 2,
  "platformOrder": 8,
  "validUntil": "2026-11-10T10:05:00.000Z"
}
```

- `WARD_BLOCKED` contains no message text, translation, nickname, payment, or identity fields.
- When an already delivered message (`DELIVER`) is manually overturned to `BLOCK`, the server emits a `WARD_BLOCKED` frame referencing the same `platformOrder` so downstream overlays immediately retract the previously rendered item.

## 4. Client to Server

Consumers may only send WebSocket control `pong` frames. Sending any data frame closes the connection with `4400` (`CLIENT_DATA_NOT_ACCEPTED`).

## 5. Heartbeat, Close Codes & Backpressure

- Server pings every `heartbeatMs` (default `15000` ms) and disconnects after `10000` ms without `pong`.
- Revoking an output grant immediately closes active connections using that grant (`4403`).

| Close Code | Reason | Meaning |
| --- | --- | --- |
| `4400` | `CLIENT_DATA_NOT_ACCEPTED` | Client sent a data frame |
| `4403` | `GRANT_REVOKED` | Output grant revoked |
| `4408` | `HEARTBEAT_TIMEOUT` | Heartbeat `pong` timed out |
| `4413` | `SUBSCRIBER_BACKPRESSURE` | Queued bytes exceeded 1 MiB or write exceeded 5 s |

## 6. Delivery IDs, Ordering & Deduplication

Delivery rows move across `PENDING`, `SENT`, `EXPIRED`, `FAILED`, and `CANCELLED` via compare-and-set state transitions ordered by `(platformOrder, deliverySequence, id)`:

- Reconnecting clients receive remaining `PENDING` unexpired deliveries (`SENT` and `EXPIRED` rows are not replayed automatically).
- Consumers should deduplicate by `deliveryId` and discard frames whose `validUntil` has passed.

## 7. Resends & Revocation

- **Resend**: Explicit decision-service action creating a fresh `PENDING` row for `EXPIRED` messages within `resendMaxAgeMs` (default 10 min), valid for `resendValidityMs` (default 60 s). `SENT` or unexpired rows are refused (`ALREADY_SENT`, `NOT_EXPIRED`).
- **Issue / Revoke Grants**:
  - Issue: `POST /channels/:channelId/output-grants` (requires `tokens.manage`, optional `outputKind`: `NATIVE_V1` | `OBS_OVERLAY` | `BLIVECHAT`, returns secret once with `cache-control: no-store`).
  - Revoke: `DELETE /channels/:channelId/output-grants/:grantId` (returns `204`, disconnects active subscribers with `4403`, subsequent reconnect attempts return `401`).
