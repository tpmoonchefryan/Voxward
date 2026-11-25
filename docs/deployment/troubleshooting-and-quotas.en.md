# Troubleshooting and quotas

- **No events from a real YouTube channel:** the default runtime uses synthetic adapters. Confirm the integration is actually connected before trying keys or increasing quotas.
- **Platform permissions:** verify the exact callback URL, authorization scope and status against the [credentials guide](./youtube-credentials.en.md). A synthetic health check does not prove authorized access.
- **Platform quota:** check the Google Cloud project's live API metrics. Quotas and request costs differ by method and may change. Treat a quota response as a stop condition; avoid repeated reconnections until the provider allows them.
- **Missing translation:** confirm the channel's translation toggle, model and target order. UI language does not select the target. A provider can omit an unavailable target; a safety failure withholds the cue.
- **Missing or stale overlay:** check that the grant is current, the credential is in the fragment, and the reverse proxy allows the WebSocket upgrade. Old deliveries are not automatically replayed.

[中文说明](./troubleshooting-and-quotas.md) · [Integration support](../integrations/support-matrix.en.md)
