# Downstream Integrations Support Matrix (Honesty Matrix)

> Authoritative Chinese reference: [`support-matrix.md`](./support-matrix.md)

This matrix follows `VW-S024-AC001` strict honesty rules: targets are marked supported only when verified end-to-end, unsupported cloud-to-local assumptions are stated explicitly, no unverified local daemon/proxy is assumed, and reverse-uploading chat replies is never substituted for official platform integration.

## 1. Support Overview

| Target | Status | Protocol / Entry | Verified Scope & Real Limits |
| --- | --- | --- | --- |
| **VoxWard Native OBS Overlay** | **Supported** | `/overlay/:roomId` + `vw-output.v1` (`/output/v1/room`) | Self-hosted WebSocket with `#`-fragment revocable `OBS_OVERLAY` grant; supports `HELLO`, `DELIVER` (text, multilingual `translations`, structured `payment`), `WARD_BLOCKED` (zero body/identity leak), and immediate `4403` disconnect on revocation. |
| **blivechat-Compatible WS Adapter** | **Protocol-Verified (Loopback E2E)** | `blivechat-v1.x-json-ws` (`/output/blivechat/v1/chat`) | Loopback HTTP+WS verified handshake, `JOIN_ROOM`, `HEARTBEAT` -> `HEARTBEAT_REPLY`, `ADD_TEXT`, `ADD_SUPER_CHAT` (with `ScPayment`), `WARD_BLOCKED` redaction, and `4403` revocation disconnect under `BLIVECHAT` grant isolation. **Upstream standalone blivechat desktop/Python binary was not launched in headless CI.** |
| **OneComme (わんコメ)** | **No Cloud Direct-Push** | Public [HTTP API](https://onecomme.com/docs/developer/http-api/) & [Plugin Docs](https://onecomme.com/docs/developer/plugin/) | A cloud server's `localhost:11180` is not the streamer's desktop. See [`onecomme.md`](./onecomme.md). |
| **VTube Studio (VTS)** | **No Direct Unproxied Connection** | VTS Local Plugin API (runs on streamer PC) | VTS plugin sockets only bind on the streamer's local machine outside headless server MVP scope. See [`vts.md`](./vts.md). |

## 2. Cloud-to-Streamer Topology & Security Boundaries

```text
[Official Platform Stream] ---> [Self-Hosted VoxWard Server] ---> (Read-Only WS: vw-output.v1 / blivechat-v1.x-json-ws) ---> [Streamer PC: OBS / Browser]
                                                              X (Cannot push directly to remote streamer localhost:11180 / VTS plugin port)
```

- **Read-Only & Revocable**: Every downstream grant is read-only and immediately revocable (`4403 GRANT_REVOKED`).
- **Zero-Leak Guarantee**: `WARD_BLOCKED` frames never emit original text, translations, payment info, or identities; `ADD_TEXT` and `ADD_SUPER_CHAT` frames never forward stable platform user IDs, trust scores, or internal moderation rationale.
- **Troubleshooting & Self-Checks**: See `/guides` in the web console and [`blivechat.md`](./blivechat.md).
