> 注：本ドキュメントは[英語版](../../../PRIVACY.md)を正文とします · `synced-to: 81667441df0d5f9ca92af42e0016261642eb30c1d3e06543031c14cff091bc58`

# プライバシーおよびデータ取り扱い

[English](../../../PRIVACY.md) · [简体中文](../zh-CN/PRIVACY.md) · **日本語** · [한국어](../ko/PRIVACY.md) · [Français](../fr/PRIVACY.md)

> VoxWard はプロジェクト作者が運営する SaaS ではなく、セルフホスト型のミドルウェアです。各インスタンスの運用主体は、それをデプロイする配信者またはシステム管理者となります。

## 1. テレメトリなし・チャンネル横断追跡なし

- **プロジェクトへのテレメトリ送信ゼロ**：利用統計、クラッシュレポート、チャットログ等を開発者側へ送信しません。
- **チャンネル閉域の信頼スコア**：信頼スコアおよびスコア例外フラグは、そのインスタンス内の単一チャンネルに限定されます。配信者・チャンネル横断型の視聴者評価ネットワークは構築しません。
- **ブラウザ側での機密永続化なし**：テーマ・言語設定はアカウント別サーバー設定（`/auth/shell-preferences`）またはゲスト時の一時メモリに保持され、`localStorage` や `sessionStorage` にチャット履歴や秘密情報を保存しません。

## 2. インスタンスが処理するデータ

運用設定に応じ、サーバーのローカル SQLite WAL データベースにはモデレーションと監査に必要な記録のみが保存されます：

1. **モデレーション・チャンネル設定**：チャンネル ID、ワードリスト分類・ルール、手動ブロックリスト、RBAC ロール、セッションハッシュ。
2. **スコープ付き証跡・監査ログ**：処理ログ（Technical Log）、変更監査ログ（Change Log）、マスク済み外部 HTTP 連携記録。それぞれ設定された保持日数（`changeLogDays`、`technicalLogDays`、`evidenceDays`）に従って期限管理されます。
3. **AI 呼び出し最小化**：モデルには一時 ID（`item-*`）と必要な本文のみを送信し、恒久的な YouTube ユーザー ID、OAuth シークレット、スコア台帳は送信しません。

詳細は [`docs/policy/data-processing.md`](../../policy/data-processing.md) および [`docs/security/ai-retention-boundary.md`](../../security/ai-retention-boundary.md) を参照してください。

## 3. データ削除およびスコア例外リクエスト

権限を持つデータ管理者は対象を検索し（`GET /channels/:channelId/data/subjects`）、以下のいずれかを登録・検証・実行できます：

- **`DELETE_DATA_ONLY`**：ローカルのスコア、台帳、キャッシュ、該当証跡を非同期削除対象に登録します（以後の採点ルール自体は変更しません）。
- **`DELETE_AND_EXCEPT`**：ローカルデータを削除対象とした上で最小限の**チャンネル内スコア例外フラグ**（チャンネル範囲 + 識別マーカー + フラグのみ。過去のスコアやニックネーム履歴は非保持）を記録し、以降のメッセージは採点せず手動審査へ回します。

> [!IMPORTANT]
> **外部コピーとの境界**：VoxWard インスタンス内でのデータ削除は、YouTube 上の元メッセージや外部 AI プロバイダー側の保持データを**削除しません**。本番認証情報を接続する前に [`docs/policy/self-hosting-responsibilities.md`](../../policy/self-hosting-responsibilities.md) を確認してください。

## 4. Kiroween サンドボックスモード

`node deploy/sandbox/start-sandbox.mjs`（または `/sandbox`）経由では、リポジトリ内の合成デモデータのみを使用し、実在の視聴者情報や外部 API 接続は一切行いません。
