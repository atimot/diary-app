# diary-app

1日1つの日記を書き、週次の AI サマリーと MBTI 傾向を可視化する Next.js アプリ。

## 技術スタック

- Next.js 16 (App Router, Server Actions) + TypeScript strict
- Tailwind v4 + shadcn/ui
- Neon Postgres + Drizzle ORM
- Vercel AI SDK v6 + Google Gemini (`gemini-2.5-flash`)
- Better Auth + Google OAuth（メールホワイトリストで制限）
- Biome（フォーマッタ + リンタ）
- Vercel ホスティング（Production のみ、Preview は無効）

## 開発

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # ホワイトリスト純粋関数のテスト
npm run lint         # biome check
npm run db:push      # Drizzle schema を Neon に反映
npm run db:studio    # Drizzle Studio で DB を可視化
```

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

サインインは Google OAuth のみ。`ALLOWED_EMAILS` に列挙したメールアドレスでしかサインインできない。許可されていないメールでログインしようとすると `unable_to_create_user` で拒否される。

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

# 関連3テーブル (diary_entries / weekly_insights / mbti_snapshots) を全削除
SEED_USER_ID=<user-id> npm run db:seed:reset
```

## Vercel デプロイ

- `main` への push で自動デプロイ
- Preview デプロイは無効化（Google OAuth リダイレクト URI 管理の手間を避けるため）
- 環境変数を Vercel ダッシュボードで Production スコープに登録
- Google Cloud Console の OAuth client の Authorized redirect URI に本番 URL の `/api/auth/callback/google` を追加
- 手動再デプロイは Vercel ダッシュボードの Deployments → Redeploy

## マイルストーン

- M0: 環境構築（2026-06-08）
- M1: 日記の基本 CRUD（2026-06-08）
- M2: AI 週間サマリー + アドバイス（2026-06-08）
- M3: MBTI 4 軸の対立スライダー（2026-06-08）
- M1.5: バックデート編集 / 削除 / Markdown / プレビュー / ストリーク（2026-06-09）
- M4: 認証 + Vercel デプロイ（2026-06-10）

設計と実装プランは `docs/superpowers/specs/` および `docs/superpowers/plans/` を参照。
