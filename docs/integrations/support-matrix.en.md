# Integration support matrix

| Integration | Verified scope |
| --- | --- |
| Native OBS overlay | Read-only `vw-output.v1` WebSocket, approved original and first available translation, grant revocation. See the [OBS guide](../obs/setup.en.md). |
| blivechat compatibility | Loopback protocol tests for join, heartbeat, approved text and revocation. Not certified against an external desktop release. |
| OneComme | No direct cloud push; the remote server's localhost is not the streamer's PC. |
| VTube Studio | No direct connection without a local plugin or bridge. OBS/browser read-only output is the supported alternative. |
| YouTube ingest and external AI | Contract and adapter work exist, but the production entry is not wired to real providers. |

Only share read-only output grants where read-only access is intended. Revocation closes WebSocket connections with code 4403. Blocked output carries no original, translation or identity.

[中文说明](./support-matrix.md)
