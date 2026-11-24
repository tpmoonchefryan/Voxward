> 注：本ドキュメントは[英語版](../../../SECURITY.md)を正文とします · `synced-to: a4604fcd310a91971ac82f36677957567ee67d70eaeac9942a499063d82e6d65`

# セキュリティポリシー

[English](../../../SECURITY.md) · [简体中文](../zh-CN/SECURITY.md) · **日本語** · [한국어](../ko/SECURITY.md) · [Français](../fr/SECURITY.md)

## サポート対象バージョン

セキュリティ修正は現在の `main` ブランチおよび最新リリース（1.0 未満の開発段階では最新 `rc0.1.0` 系列）を対象とします。過去のプレリリーススナップショットへのバックポートは行いません。最新のリリースまたはコミットへ更新してください。

## 脆弱性の報告方法

セキュリティ上の問題は **GitHub Private Vulnerability Reporting** から非公開で報告してください：

- 報告ページ: https://github.com/tpmoonchefryan/Voxward/security/advisories/new

悪用コード、認証情報、非公開ログ、未修正の脆弱性詳細をパブリックの Issues / Pull Requests / Discussions に記載**しないでください**。

迅速なトリアージのため、以下の情報を含めてください：

1. 影響を受けるコンポーネント、ルート、または WebSocket / API 契約。
2. 再現手順または最小限の PoC。
3. セキュリティ上の影響（RBAC 回避、機密情報漏洩、XSS/HTML インジェクション、CSRF 回避、パストラバーサル等）。

メンテナー（`tpmoonchefryan`）は完了した報告に対しベストエフォートで **72 時間以内** の初回確認を目指します（個人オープンソース開発であり、正式な SLA を保証するものではありません）。有効な報告は一時的なプライベートフォークで修正後、調整された形で公開されます。

## セキュリティ設計と境界

| 境界 | VoxWard における実装 | 参照 |
| --- | --- | --- |
| **セッションと変更認証** | 本番環境で `HttpOnly; Secure; SameSite=Strict` セッション Cookie、全変更系リクエストでの `x-csrf-token` 検証、チャンネル単位の RBAC（`Deny > Grant > Not Set`）。 | [`docs/deployment/remote-deploy.md`](../../deployment/remote-deploy.md) |
| **下流出力の読み取り専用分離** | `/overlay/:channelId` は `vwo_*` 資格情報を URL フラグメント（`#cred=...`）のみから読み取り、クエリパラメータを拒否します。`output.feed` のみを許可し、クライアント送信フレームは遮断されます。 | [`docs/protocol/output-native-v1.md`](../../protocol/output-native-v1.md) |
| **信頼できないテキストの隔離** | 視聴者テキストやログ文字列は HTML エスケープおよび `<bdi>` 要素内で描画され、双方向制御文字を安全に隔離します。 | [`UntrustedText.tsx`](../../../apps/web/src/components/untrusted-text/UntrustedText.tsx) |
| **AI ワーカー最小権限** | モデルには一時 ID `item-*` と必要最小限の本文のみを渡し、OAuth トークン、サーバー鍵、恒久ユーザー ID、スコア台帳は送信しません。 | [`runtime-ai-least-privilege.md`](../../security/runtime-ai-least-privilege.md), [`ai-retention-boundary.md`](../../security/ai-retention-boundary.md) |
| **サンドボックス Fail-Closed 保護** | `deploy/sandbox/start-sandbox.mjs` は本番秘密鍵を検出すると起動を拒否します。本番入口 `main.ts` は `VOXWARD_SANDBOX_ENABLED` を拒否します。 | [`deploy/sandbox/README.md`](../../../deploy/sandbox/README.md), [`deploy/server/README.md`](../../../deploy/server/README.md) |
| **運用者責任** | TLS 終端、ループバック向けリバースプロキシ（`127.0.0.1:3000`）、AI CLI 用 OS ユーザー分離、ホスト NTP 時刻同期はセルフホスト運用者が管理します。 | [`troubleshooting-and-quotas.md`](../../deployment/troubleshooting-and-quotas.md) |
