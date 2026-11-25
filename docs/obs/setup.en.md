# Set up OBS Browser Source and Dock

1. As a channel operator with output-grant permission, create a read-only output grant. Copy its `vwo_…` credential when issued; the server does not reveal it again.
2. Add a **Browser** source in OBS. Use `https://<host>/overlay/<roomId>#cred=<credential>`. Start at 800 × 600 and adjust to your scene. The overlay shows approved originals and the first available configured translation; it does not speak text or decide moderation again.
3. For a control-room view, open **Docks → Custom Browser Docks** and add `https://<host>/dock/<roomId>`. Sign in with the correct channel account. An output grant is not a login credential.

Do not place a credential in a query parameter. The overlay removes the URL fragment before connecting with the WebSocket subprotocol. A revoked grant closes the connection with code 4403. Expired messages are not replayed.

[中文说明](./setup.md) · [Native protocol](../protocol/output-native-v1.en.md)
