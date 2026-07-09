# diary-app（ひとひ）

1日1つの日記を書き、直近7日分から AI サマリーとエニアグラム9タイプの傾向を生成・可視化する日記アプリ「ひとひ」。

本番: https://diary-app-atimot.vercel.app

## 技術スタック

- Next.js 16 (App Router, Server Actions) + TypeScript strict
- Tailwind v4 + shadcn/ui
- Tiptap v3（WYSIWYG エディタ。保存形式は Markdown）
- Neon Postgres + Drizzle ORM
- Vercel AI SDK (`ai` v7) + Google Gemini (`gemini-2.5-flash`)
- Better Auth + Google OAuth（メールホワイトリストで制限）
- Biome（フォーマッタ + リンタ）
- Vercel ホスティング（Production のみ、Preview は無効）

## 開発

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest（lib/ 配下の純粋関数のユニットテスト）
npm run lint         # biome check
npm run lint:design  # デザイントークン違反（生の色リテラル）の検出
npm run db:push      # Drizzle schema を Neon に反映
npm run db:studio    # Drizzle Studio で DB を可視化
npm run db:verify    # .env.local の DATABASE_URL で接続確認
```

## 開発フロー

- `main` への直 push は ruleset で拒否される。必ずブランチを切って PR を作る
- CI（lint / lint:design / tsc / vitest / build）が green になってから squash merge（マージ方式は squash のみ）
- `main` へのマージで Vercel が本番へ自動デプロイ
- 依存更新は Dependabot（週次・月曜朝）+ `/dependabot` コマンドで処理

## 環境変数

`.env.local` を以下の内容で作成する（本番は Vercel の Environment Variables で設定）。

| 変数 | 説明 |
|---|---|
| `DATABASE_URL` | Neon Postgres の接続文字列 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API キー |
| `BETTER_AUTH_SECRET` | Better Auth のセッション署名鍵 (`openssl rand -base64 32` で生成) |
| `BETTER_AUTH_URL` | サーバ側 baseURL（`http://localhost:3000` / 本番 URL） |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | クライアント側 baseURL（同上） |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `ALLOWED_EMAILS` | サインイン許可するメール（カンマ区切り） |

雛形は `.env.example` を参照。

## 認証とサインイン許可

サインインは Google OAuth のみ。ホワイトリストは初回サインイン（ユーザー作成）時に判定され、`ALLOWED_EMAILS` にないメールは `unable_to_create_user` で拒否される。一度作成された既存ユーザーは `ALLOWED_EMAILS` から外してもサインインを止められない（締め出すには DB の `user` 行を削除する）。

許可するメールを追加するには `ALLOWED_EMAILS` をカンマ区切りで拡張する：

```env
ALLOWED_EMAILS="me@example.com,partner@example.com"
```

本番では Vercel の Environment Variables を更新して **Redeploy** が必要（読み込みは起動時のため）。

## seed 投入

`scripts/seed.ts` は固定 user に紐づくため `SEED_USER_ID` を渡す。サインインで作られた `user.id` を Drizzle Studio (`npm run db:studio`) や DB クエリで確認して指定する。

```bash
# 30件のサンプルから N 件投入（デフォルト 7, 最大 30）
SEED_USER_ID=<user-id> npm run db:seed
SEED_USER_ID=<user-id> npm run db:seed 30

# 関連3テーブル (diary_entries / weekly_insights / enneagram_snapshots) から指定ユーザーの行を全削除
SEED_USER_ID=<user-id> npm run db:seed:reset
```

## Vercel デプロイ

- PR を squash merge して `main` が更新されると本番へ自動デプロイ（`main` への直 push は ruleset で不可）
- Preview デプロイは無効化（`vercel.json` の `git.deploymentEnabled`: `"**": false` + `"main": true`。Google OAuth リダイレクト URI 管理の手間を避けるため）
- 関数リージョンは `sin1` 固定（`vercel.json` の `regions`。Neon が aws-ap-southeast-1 のため DB と同居させて TTFB を確保。変更しない）
- install / build コマンドは `vercel.json` で npm を明示（pnpm 誤検出の事故防止）
- 環境変数を Vercel ダッシュボードで Production スコープに登録
- Google Cloud Console の OAuth client の Authorized redirect URI に `https://diary-app-atimot.vercel.app/api/auth/callback/google` を追加
- 手動再デプロイは Vercel ダッシュボードの Deployments → Redeploy

## マイルストーン

- M0: 環境構築（2026-06-08）
- M1: 日記の基本 CRUD（2026-06-08）
- M2: AI 週間サマリー + アドバイス（2026-06-08）
- M3: MBTI 4 軸の対立スライダー（2026-06-08）
- M1.5: バックデート編集 / 削除 / Markdown / プレビュー / ストリーク（2026-06-09）
- M4: 認証 + Vercel デプロイ（2026-06-10）
- M5: CI + PR ベース開発フロー（2026-06-11）
- M6: Dependabot 週次更新運用（2026-06-11）
- 以後の主な節目: MBTI 可視化をエニアグラム傾向に置換（2026-06-26, #23）、Tiptap WYSIWYG エディタ化（#25）、本番パフォーマンス改善・`sin1` 同居（#32〜#36）、デザイン全面刷新「ひとひ」＋SP 対応（2026-07-08〜, #62・#65）

設計と実装プランは `docs/superpowers/specs/` および `docs/superpowers/plans/` を参照。
