# YouTube credentials and authorization

**Production boundary:** the OAuth handlers and live stream ingestion are not bound to the running server. Use the synthetic sandbox without platform credentials. The following is planning guidance for operators implementing a live deployment, not a claim that setup is currently executable.

- Public live-chat reading with an API key is a planned path; verify current endpoint support and quota charges with YouTube.
- Authorized read operations use only the required read scope; writing or deleting chat messages is a separate authorization. Review Google's current scope documentation and verification requirements before deploying.
- Create the Google Cloud project, enable the YouTube Data API and register a Web application OAuth client under the operator's own account. Configure its consent screen and HTTPS callback exactly as registered (`https://<host>/youtube/oauth/callback`).
- Do not pass client secrets in HTTP requests, source files or logs. The planned persistent credential vault is not wired in this release.
- A Testing OAuth app is not a durable production credential. Check [Google’s token expiration guidance](https://developers.google.com/identity/protocols/oauth2#expiration). Do not treat unverified or revoked authorization as connected.

[中文说明](./youtube-credentials.md) · [Troubleshooting](./troubleshooting-and-quotas.en.md)
