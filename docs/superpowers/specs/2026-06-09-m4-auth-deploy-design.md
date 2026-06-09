# M4: 認証 + Vercel デプロイ 設計ドキュメント

- **作成日**: 2026-06-09
- **対象**: M0〜M3 で個人ユースとして完成した日記アプリに、Better Auth + Google OAuth を導入し、Vercel に本番デプロイする
- **位置づけ**: 初期 spec (`2026-06-08-diary-app-design.md`) で「M4 で Better Auth を予定」と仮置きしていたものを、2026 年 6 月時点のトレンド調査を経て本決定とした
- **ステータス**: 設計合意済み（合意日 2026-06-09）

## 1. 概要

現在の日記アプリは `DEFAULT_USER_ID = 'me'` を全クエリで使うシングルユーザー前提で動いている。M4 ではこの前提を外し、

- 認証ライブラリで「自分」を識別し、自分のデータだけ操作できるようにする
- Vercel にデプロイしてスマホ・他デバイスから使えるようにする
- 将来「他人に開放するかどうか」の判断を後回しにできるよう、当面は自分のメールアドレスだけホワイトリストで許可する

ことを目的とする。マルチユーザー対応のデータモデルは既にスキーマで用意されている（全テーブルに `userId text` 列、`(userId, ...) unique` 制約）ため、データモデル変更は最小限。

### 1.1 含める機能

1. **Better Auth + Google OAuth** によるサインイン / サインアウト
2. **メールアドレスホワイトリスト**で許可するアカウントを制限（`.env` で管理）
3. **ミドルウェアによるルート保護**（保護ルートに未認証アクセスしたら `/sign-in` へリダイレクト）
4. **Server Action / クエリの userId スコープ化**（既存の `USER_ID` 定数を `session.user.id` に全置換）
5. **HeaderNav にサインアウトボタン追加**
6. **Vercel デプロイ**（Hobby プラン、Production 1 環境）
7. **既存データのリセット**（`DEFAULT_USER_ID='me'` のシードを捨て、認証後の自分の user_id で再 seed）

### 1.2 含めない機能（YAGNI）

- Email + Password 認証 / Magic Link
- メール検証フロー（Google OAuth が認証済み email を返すので不要）
- 2FA / Passkey
- 退会機能（必要になったら手動で DB から削除）
- プロフィール編集画面
- ユーザー管理画面 / 管理者ロール / RBAC
- ホワイトリスト管理 UI（`.env` で管理する運用）
- 課金 / Stripe
- Vercel Preview デプロイ（PR ごとに OAuth リダイレクト URI 追加が手間）
- E2E テスト自動化（手動で重要パスを 1 周）

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────── Browser ────────────────────┐
│ 未ログイン  → /sign-in (Google でサインインボタン)│
│ ログイン済  → / (今日の日記) / /history など      │
└────────────────────┬───────────────────────────┘
                     │
            ┌────────▼─────────┐
            │  middleware.ts    │ ← 全リクエストでセッション cookie 確認
            │  ・未認証で保護ルート → /sign-in にリダイレクト
            │  ・/sign-in と /api/auth/* だけ素通し
            └────────┬─────────┘
                     │
       ┌─────────────▼──────────────┐
       │  Server Actions / Pages     │
       │  ・getSession() で userId 取得│ ← 既存の USER_ID 定数を全置換
       │  ・全クエリに userId スコープ │
       └─────────────┬──────────────┘
                     │
              ┌──────▼───────┐
              │  Neon Postgres │
              │  既存テーブル   │ ← userId 列がそのまま生きる
              │  + Better Auth │
              │    管理テーブル  │
              └────────────────┘
```

### 2.2 セッション方式

**Database session** を採用（Better Auth デフォルト）。

| 観点 | Database session | JWT session |
|---|---|---|
| revoke | 即時可能（DB から消す） | exp 待ち or blocklist 必要 |
| Edge runtime | 軽い middleware で OK（cookie 読むだけは edge 可） | 純粋に edge で完結 |
| 個人試作 | ◎ シンプル | △ オーバースペック |

「異常があればすぐログアウトさせたい」を優先して Database session。

### 2.3 Better Auth が追加するテーブル

Drizzle adapter で以下 4 テーブルが追加される（Better Auth が標準で定義）：

| テーブル | 役割 |
|---|---|
| `user` | ユーザー本体（id, email, name, image, emailVerified） |
| `account` | OAuth プロバイダごとの紐付け（Google ユーザー ID 等） |
| `session` | 有効なセッション（cookie で参照） |
| `verification` | メール検証用一時トークン |

既存テーブル (`diary_entries`, `weekly_insights`, `mbti_snapshots`) の `userId` 列は `user.id` への外部キー（CASCADE DELETE）にする。これにより `user` 行削除で関連データが自動掃除される。

## 3. 認証フロー

### 3.1 サインインフロー

```
1. 未ログインで保護ルートにアクセス → middleware が /sign-in にリダイレクト
2. /sign-in: 「Google でサインイン」ボタンのみ
3. クリック → Better Auth が Google OAuth URL にリダイレクト
4. Google ログイン画面 → 同意 → /api/auth/callback/google にコールバック
5. Better Auth が code を access token に交換、ユーザー情報を取得
6. ★ホワイトリスト判定★（次項）
7. 許可されていれば user/account 行を作成（初回）or 取得（再ログイン）
8. session を作成、cookie をセット
9. / にリダイレクト
```

### 3.2 ホワイトリスト判定

- Better Auth の `signIn.before` フック（または database hook）で `email` を検査
- 環境変数 `ALLOWED_EMAILS` を `,` で split したリストに含まれていなければ `throw` してエラーを返す
- ホワイトリスト判定関数 `isAllowedEmail(email: string, allowList: string[]): boolean` を `lib/auth/whitelist.ts` に純粋関数として実装（テスト容易）
- 不許可時はユーザーを `/sign-in?error=not_allowed` 等にリダイレクトし、`/sign-in` 画面でエラーメッセージを表示

### 3.3 サインアウトフロー

- HeaderNav に「サインアウト」ボタン
- クリックで Better Auth クライアントの `signOut()` 呼び出し → session 削除 → `/sign-in` にリダイレクト

### 3.4 ミドルウェアによるルート保護

`middleware.ts`（プロジェクトルート）に実装：

```
保護ルート（未認証 → /sign-in リダイレクト）:
  /
  /diary/*
  /history
  /insights
  /api/* (auth 以外)

素通し:
  /sign-in
  /api/auth/*
  /_next/static, /_next/image, /favicon.ico
```

middleware は Better Auth の session cookie の存在確認のみ行い、有効性は Server 側で再確認する。

### 3.5 Server Action / クエリでの認可（二重防御）

middleware で弾いているが、Server Action は内部呼び出しなど middleware を通らない経路があり得るため、各関数の冒頭で session 取得を必須にする。

対象ファイル（既存の `USER_ID` 定数を全箇所置換）:

```
lib/actions/diary.ts          ← saveDiaryEntry, deleteDiaryEntry
lib/actions/insight.ts        ← regenerateInsight
lib/db/queries/diary.ts       ← getDiaryEntry, listDiaryEntries
lib/db/queries/insight.ts     ← getLatestInsight
lib/db/queries/mbti.ts        ← getLatestMbti
```

各関数の頭で:

```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) throw new Error('Unauthorized');
const userId = session.user.id;
```

`USER_ID = process.env.DEFAULT_USER_ID ?? 'me'` 行および環境変数 `DEFAULT_USER_ID` は削除する。

## 4. UI 変更

| ファイル | 変更 |
|---|---|
| `app/sign-in/page.tsx` | 新規。Google サインインボタン + `?error=...` 時のエラーメッセージ表示 |
| `app/layout.tsx` | path に応じて HeaderNav の出し分け（`/sign-in` だけ非表示） |
| `components/layout/HeaderNav.tsx` | 「サインアウト」ボタンを追加。サインインユーザーの email or 名前を表示 |
| `lib/auth/client.ts` | 新規。Better Auth クライアントインスタンス（`signIn.social`, `signOut` 等の薄いラッパ） |
| `lib/auth/server.ts` | 新規。Better Auth サーバインスタンス + 設定 |
| `lib/auth/whitelist.ts` | 新規。`isAllowedEmail` 純粋関数 |
| `app/api/auth/[...all]/route.ts` | 新規。Better Auth ハンドラ |
| `middleware.ts` | 新規。ルート保護 |

なお HeaderNav は M3 で追加済み（初期 spec / project memory 参照）。

## 5. 環境変数

| 変数 | 用途 | スコープ |
|---|---|---|
| `DATABASE_URL` | 既存（Neon） | Local + Vercel |
| `GOOGLE_GENERATIVE_AI_API_KEY` | 既存（Gemini） | Local + Vercel |
| `BETTER_AUTH_SECRET` | **新規**。`openssl rand -base64 32` で生成 | Local + Vercel |
| `BETTER_AUTH_URL` | **新規**。`http://localhost:3000` / `https://<vercel-domain>` | Local + Vercel |
| `GOOGLE_CLIENT_ID` | **新規** | Local + Vercel |
| `GOOGLE_CLIENT_SECRET` | **新規** | Local + Vercel |
| `ALLOWED_EMAILS` | **新規**。カンマ区切り | Local + Vercel |
| ~~`DEFAULT_USER_ID`~~ | **削除** | — |

`.env.example` を同期更新する。

## 6. デプロイ手順

### 6.1 Google Cloud Console

1. https://console.cloud.google.com でプロジェクト作成（既存可）
2. APIs & Services → Credentials → OAuth client ID（Web application）
3. **承認済みリダイレクト URI** に 2 つ登録:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<vercel-domain>/api/auth/callback/google`（本番デプロイ後に追加）
4. Client ID / Secret を控える

### 6.2 Vercel

1. https://vercel.com で GitHub リポジトリ `atimot/diary-app` を import
2. Framework Preset: Next.js（自動検出）
3. 環境変数を Production スコープに追加（§5 の表）
4. **Preview デプロイは無効化**
5. Deploy → 本番 URL が発行される
6. その URL を Google Cloud の承認済みリダイレクト URI に追加
7. `BETTER_AUTH_URL` を本番 URL に更新して再デプロイ

## 7. 実装フロー（作業順）

```
[Local]
1. Better Auth インストール + Drizzle schema 統合（4 テーブル追加）
2. drizzle-kit push でマイグレーション
3. lib/auth/server.ts, lib/auth/client.ts, lib/auth/whitelist.ts を実装
4. app/api/auth/[...all]/route.ts を実装
5. middleware.ts を実装（保護ルート定義）
6. app/sign-in/page.tsx を実装
7. components/layout/HeaderNav.tsx にサインアウト追加
8. app/layout.tsx で sign-in 時の HeaderNav 非表示
9. lib/actions/diary.ts, insight.ts と lib/db/queries/*.ts の USER_ID 定数を session 取得に全置換（6 ファイル）
10. db:seed:reset で 'me' データを全削除
11. 自分の Google アカウントで初回サインイン → user.id を確認
12. scripts/seed.ts を「現在 user テーブルに存在する単一ユーザー」を使うように調整して再 seed
13. ローカルで手動 E2E（§8 のチェックリスト）

[Vercel]
14. Vercel に import + 環境変数登録
15. Production デプロイ → URL を Google OAuth の Redirect URI に追加 → BETTER_AUTH_URL 更新 → 再デプロイ
16. 本番で手動 E2E
17. README に運用メモ追記（環境変数一覧、ホワイトリスト追加方法、再デプロイ手順）
```

## 8. テスト戦略

### 8.1 ユニットテスト

- `isAllowedEmail(email, allowList)` のみ。純粋関数で副作用なし。
- 既存スタックに Vitest は入っていないため、本テストのために最小構成の `vitest` を追加するか、`node:test` を使う。スコープは「この関数 1 つ」に絞る。

### 8.2 手動 E2E（Local と本番で同じシナリオ）

| シナリオ | 期待動作 |
|---|---|
| 未ログインで `/` にアクセス | `/sign-in` にリダイレクト |
| 未ログインで `/diary/2026-06-09` にアクセス | `/sign-in` にリダイレクト |
| Google サインイン（許可メール） | `/` に着地、自分のデータが表示 |
| Google サインイン（許可外メール） | エラー画面、`/` にアクセス不可 |
| 日記の保存・編集・削除 | userId が自分にスコープされて動く |
| HeaderNav サインアウト | `/sign-in` にリダイレクト、cookie 消失 |
| 別タブで session 削除後にアクセス | `/sign-in` にリダイレクト |
| Server Action を直接 curl で叩く（cookie なし） | 401 / Unauthorized |

## 9. リスクと回避

| リスク | 回避 |
|---|---|
| Better Auth + Next.js 16 の組合せに未対応の落とし穴 | 実装直前に context7 で Better Auth 最新ドキュメントを確認 |
| ホワイトリストを書き忘れて自分が締め出される | 初回デプロイ前に `.env.production` の値をパスワードマネージャに保存。ローカルで `BETTER_AUTH_URL` を差し替えれば復旧可 |
| Vercel build で環境変数不足 | README に必須環境変数を明記、build 前に確認 |
| Google OAuth Consent Screen 未公開状態（Testing モード）で許可ユーザー以外がブロックされる | Testing モードのまま、Test users に自分の Google アカウントを追加。公開モード（Production）にしないことで OAuth 利用範囲を絞れる |
| Better Auth の Drizzle adapter スキーマと既存 schema.ts の競合 | adapter 用テーブルは `auth_*` プレフィックス、もしくは Better Auth 公式の `user` / `account` / `session` / `verification` 名そのままで衝突確認後に採用 |

## 10. 関連ドキュメント

- 初期 spec: `docs/superpowers/specs/2026-06-08-diary-app-design.md`
- M1.5 spec: `docs/superpowers/specs/2026-06-09-m1.5-diary-improvements-design.md`
- Better Auth docs: https://www.better-auth.com/
- Next.js 16 App Router: `node_modules/next/dist/docs/`
