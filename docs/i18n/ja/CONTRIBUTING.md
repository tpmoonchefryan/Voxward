> 注：本ドキュメントは[英語版](../../../CONTRIBUTING.md)を正文とします · `synced-to: 8109d13380bfcc2400e4bb2c6a5afe0d6d90121db45af63018d6e1b5070be1b9`

# コントリビューションガイド

[English](../../../CONTRIBUTING.md) · [简体中文](../zh-CN/CONTRIBUTING.md) · **日本語** · [한국어](../ko/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md)

VoxWard へのご関心とご協力に感謝します。本リポジトリへのコントリビューションはすべて [Apache-2.0 ライセンス](../../../LICENSE) に基づき提出されます。

## 1. 前提環境

- **Node.js**: `>= 24.0.0`
- **pnpm**: `12.x`（ルート `package.json` の `packageManager` に記載）

ロックファイルおよびリポジトリ同梱の `@tcrn/*@4.2.0` パッケージを使用して依存関係をオフラインインストールします：

```bash
pnpm install --frozen-lockfile
```

## 2. ワークスペース構成

- `packages/contracts`（`@voxward/contracts`）：共有型定義、Zod スキーマ、下流出力プロトコル（`output-native-v1`）。
- `apps/server`（`@voxward/server`）：Fastify API、WebSocket 出力アダプター、SQLite WAL + Drizzle ストレージ、採点・モデレーション・ライフサイクルエンジン、合成サンドボックス。
- `apps/web`（`@voxward/web`）：React + Vite フロントエンド（`@tcrn/ui-react` 4.2.0、Halloween / Light / Dark テーマ、5 言語辞書 `en` / `zh-CN` / `ja` / `ko` / `fr`）。
- `vendor/tcrn-ds/4.2.0/`：固定バージョンのデザインシステムパッケージ群と検証インデックス。

[`scripts/check-deps.mjs`](../../../scripts/check-deps.mjs) により、ドメイン層から HTTP 構成ルートへの依存や `@voxward/web` からのサーバーコード直接参照は禁止されています。

## 3. コーディングおよびデザインシステム規約

1. **Web Storage（`localStorage` / `sessionStorage`）の禁止**：ログイン済み UI 設定はサーバー（`/auth/shell-preferences`）に永続化し、未ログイン状態は React メモリ（`guest-prefs-context.tsx`）に保持します。
2. **デザイントークン専用**：`apps/web/src/styles/voxward.css` に生の hex/rgb/hsl カラー値を直書きせず、`@tcrn/ui-tokens` の CSS 変数を使用してください。
3. **下流出力の純粋性**：`/dock` および `/overlay` に内部分類（`ALLOW_MEANINGFUL`、`ALLOW_NOISE`）、審査ボタン、生のユーザー ID を一切出力しないでください。
4. **機密情報・ローカルパスの混入禁止**：OAuth トークン、API キー、個人メール、実視聴者データ、開発者のローカルパス（`/home/...`）をコミットしないでください。

## 4. PR 作成前の検証ゲート

以下のコマンドがすべて終了コード `0` で通過することを確認してください：

```bash
pnpm check:deps
pnpm check:ds
pnpm typecheck
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
pnpm test -- --run
```

ルートやシェルレイアウトを変更した場合は、ローカルプレビュー起動後に `tcrn-ds-check --layout-url` も実行してください。

## 5. 多言語ドキュメント同期ポリシー

ルートディレクトリの**英語版**が正文となります：

- `README.md` -> `README.{zh-CN,ja,ko,fr}.md`
- `SECURITY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/SECURITY.md`
- `PRIVACY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/PRIVACY.md`
- `CONTRIBUTING.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CODE_OF_CONDUCT.md`

すべての翻訳版先頭には「英語版が正文である旨」と英語原文の `synced-to: <sha256>` を明記します。英語版を更新する際は、同一 PR 内で 4 言語の翻訳と `synced-to` ダイジェストを更新してください。

## 6. コミュニティ・セキュリティ窓口

- 行動規範：[`CODE_OF_CONDUCT.md`](../../../CODE_OF_CONDUCT.md)
- 脆弱性報告：[`SECURITY.md`](../../../SECURITY.md)（GitHub Private Vulnerability Reporting のみ）
