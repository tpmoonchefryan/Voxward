# OBS Browser Source & Custom Dock Setup Guide

> Authoritative Chinese reference: [`setup.md`](./setup.md)

This guide explains how to connect OBS Studio to a self-hosted VoxWard transparent Stage Overlay (`/overlay/:roomId`) and moderator/streamer Custom Dock (`/dock/:roomId`).

## 1. OBS Browser Source (Stage Overlay)

1. In VoxWard **Integrations**, issue a read-only output grant (`POST /channels/:channelId/output-grants`, formatted as `vwo_...` — displayed once). Choose `OBS_OVERLAY` when scoping specifically for OBS Stage use.
2. In OBS Studio, add a **Browser** source:
   - **URL**: Point to your self-hosted service with the credential inside the **URL fragment (`#`)**:
     - `https://<your-voxward-host>/overlay/<roomId>#vwo_<credential>`
     - or `https://<your-voxward-host>/overlay/<roomId>#cred=vwo_<credential>`
   - **Width / Height**: Recommended `800 x 600` (adjust to your stream layout).
   - **Custom CSS (Transparent Background)**:
     ```css
     body { background-color: rgba(0, 0, 0, 0); margin: 0; overflow: hidden; }
     ```
   - Enable **Control audio via OBS** if you want OBS to mix stage notification audio, or toggle mute in the overlay header.

### Fragment Credential Safety (`Q16`)

- **Never use URL query parameters**: Do not pass `?cred=vwo_...` or `?token=vwo_...`. Query parameters enter HTTP request lines, reverse-proxy access logs, and browser history; the Overlay page explicitly refuses query credentials and aborts WebSocket connection.
- **Immediate Fragment Stripping**: On load, the page extracts the credential from `location.hash`, immediately strips the hash via `window.history.replaceState` while keeping the token in memory for reconnects, and connects to `/output/v1/room` using WebSocket subprotocols `["vw-output.v1", "vw-cred.<credential>"]`.
- **OBS Credential Rotation Guide**: Client scripts cannot rewrite the URL saved inside OBS Studio's local source configuration. To rotate credentials: (1) revoke the old `vwo_...` grant in VoxWard **Integrations** (active connections close immediately with `4403`); (2) issue a replacement grant; and (3) replace the URL in the OBS Browser Source properties dialog and click **Refresh cache of current page**.
- **Revocation & Expiration**: Revoking the grant disconnects the overlay with WebSocket close code `4403` (`GRANT_REVOKED`) and halts automatic reconnection. Reconnecting never replays expired Super Chats or past `WARD_BLOCKED` events.
- **Read-Only Display**: The overlay renders approved text and multilingual translations inside `<bdi>` isolation elements alongside `WARD_BLOCKED` notices without exposing blocked text, user identities, TTS, or secondary moderation controls.

## 2. OBS Custom Browser Dock (Streamer / Moderator Dock)

1. In OBS Studio, open **Docks -> Custom Browser Docks...**.
2. Add a dock pointing to `https://<your-voxward-host>/dock/<roomId>`.
3. Sign in inside the dock using an authenticated streamer or moderator account (`HttpOnly` session cookie + CSRF token); read-only output credentials (`vwo_...`) cannot trigger moderation or administrative actions.
