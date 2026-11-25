# Native read-only output protocol v1

Connect to `/output/v1/room` with subprotocols `vw-output.v1` and `vw-cred.<credential>`. The selected room belongs to the grant. Start browser clients with the grant in the URL fragment and remove it before connecting. Do not send credentials in query strings or logs.

The server sends `HELLO` first. Deduplicate `DELIVER` by `deliveryId` and stop displaying it at `validUntil`. Its `display` object contains `label`, `text`, `translation`, and optional `payment` (integer `amountMicros`, ISO currency code, and optional tier 1–7). Translation is the first available approved target in the channel's order, or null. Source/target labels, alternate translations, cues and pronunciation remain in the authenticated operator feed. The blivechat adapter maps the same primary translation to its legacy text field.

`label` is `SC <amount>` when an approved paid sandbox message has a display amount; otherwise it is null. The server does not guess a nickname or safe alias.

`WARD_BLOCKED` contains no display payload or identity. A revoked grant closes with code 4403; stop reconnecting with that credential. Output grants cannot read moderation logs, change policy or issue commands.

An OBS token issued from Integrations also works on the native endpoint, but not on blivechat. Revocation closes an existing OBS-token connection on the next heartbeat check.

[完整中文协议规范](./output-native-v1.md) · [OBS setup](../obs/setup.en.md)
