# M0: 環境構築 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 + Tailwind + Biome + Drizzle + Neon Postgres の空アプリが `pnpm dev` で立ち上がり、Neon に `SELECT 1` を投げて結果が返るところまで持っていく。

**Architecture:** `create-next-app` で雛形を作成し、Drizzle ORM を追加して Neon Postgres と接続する。シングルユーザー前提・認証なし。git は既に初期化済み（設計ドキュメントが初回コミット）。

**Tech Stack:** Node.js 22 (LTS) / pnpm / Next.js 16 / TypeScript / Tailwind CSS v4 / Biome / Drizzle ORM / @neondatabase/serverless / tsx

**Source spec:** [`docs/superpowers/specs/2026-06-08-diary-app-design.md`](../specs/2026-06-08-diary-app-design.md) の §5「M0」

---

## ファイル構成（このプラン終了時点）

このプランで触る/作る対象：

```
diary-app/
├── docs/superpowers/                     # 既存
├── .git/                                  # 既存
├── app/                                   # create-next-app で生成
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/                                # create-next-app で生成
├── lib/db/
│   └── client.ts                          # 新規作成 (Drizzle クライアント)
├── scripts/
│   └── verify-db.ts                       # 新規作成 (接続確認用)
├── .env.example                           # 新規作成 (テンプレ)
├── .env.local                             # 新規作成 (Neon URL を貼る・git追跡しない)
├── .gitignore                             # create-next-app で生成 + `.env.local` 追加確認
├── biome.json                             # create-next-app で生成
├── drizzle.config.ts                      # 新規作成
├── next.config.ts                         # create-next-app で生成
├── package.json                           # create-next-app で生成
├── pnpm-lock.yaml                         # pnpm install で生成
└── tsconfig.json                          # create-next-app で生成
```

---

## Task 1: Node.js 環境の確認

**目的:** Node.js 22 (LTS) と pnpm が使える状態にする。

**Files:** なし（環境のみ）

- [ ] **Step 1: Node.js のバージョン確認**

```bash
node --version
```

Expected: `v22.x.x` または `v20.x.x` 以上。
- `v22.x.x` か `v20.x.x` 以上が出れば Step 4 へ
- `command not found` または古いバージョンの場合は Step 2 へ

- [ ] **Step 2: mise のインストール（Node.js がなければ）**

Homebrew がない場合は先に Homebrew を入れる（https://brew.sh の手順）。

```bash
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc
```

Expected: `mise --version` でバージョンが表示される。

- [ ] **Step 3: Node.js 22 をインストール**

```bash
mise use --global node@22
node --version
```

Expected: `v22.x.x` が表示される。

- [ ] **Step 4: pnpm を有効化**

Node.js に同梱の corepack を使って pnpm を有効化する。

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Expected: pnpm のバージョン番号（例: `9.x.x`）が表示される。

---

## Task 2: 既存ドキュメントを退避

**目的:** `create-next-app` を空ディレクトリ判定で動かすため、既存の `docs/` を一時退避する。`.git/` は残してOK。

**Files:**
- Move: `docs/` → `/tmp/diary-app-docs-backup/`

- [ ] **Step 1: docs ディレクトリを退避**

```bash
mv docs /tmp/diary-app-docs-backup
ls -la
```

Expected: `.git` だけが残り、`docs` は消えている状態。

---

## Task 3: Next.js 雛形の作成

**目的:** `create-next-app` で App Router + TypeScript + Tailwind + Biome の構成で雛形を作る。

**Files:**
- Create: 多数（create-next-app が生成）

- [ ] **Step 1: create-next-app を実行**

カレントディレクトリ（`.`）に対して非対話モードで作成。

```bash
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --biome \
  --app \
  --import-alias '@/*' \
  --use-pnpm
```

Expected:
- 「Would you like to use ESLint?」など対話プロンプトは出ない（フラグで指定済み）
- `app/`, `public/`, `package.json` などが生成される
- `pnpm install` まで自動実行される
- 完了メッセージで `Success! Created ...` が表示される

トラブル: 「The directory contains files...」と出たら、`.git` 以外のファイルを再確認してから `y` で続行。

- [ ] **Step 2: 退避していた docs を戻す**

```bash
mv /tmp/diary-app-docs-backup docs
ls docs/superpowers/specs/
```

Expected: `2026-06-08-diary-app-design.md` が表示される。

- [ ] **Step 3: .gitignore に env ファイルが含まれているか確認**

```bash
grep -E '^\.env' .gitignore
```

Expected: `.env*` `.env*.local` `.env.local` のいずれかパターンが1行以上出る。
何も出ない場合は次の行を追記:

```bash
echo '' >> .gitignore
echo '# local env files' >> .gitignore
echo '.env*.local' >> .gitignore
```

- [ ] **Step 4: コミット**

```bash
git add .
git commit -m "chore: scaffold Next.js 16 with App Router, Tailwind, Biome"
```

Expected: コミットが成功し、`git log --oneline` で2件目のコミットが見える。

---

## Task 4: 開発サーバーが立ち上がるか確認

**目的:** 雛形が動くことを確認する。

**Files:** なし（実行のみ）

- [ ] **Step 1: 開発サーバー起動**

```bash
pnpm dev
```

Expected:
- ターミナルに `Ready in X.Xs` と `- Local: http://localhost:3000` が表示される
- エラーが出ていない

- [ ] **Step 2: ブラウザで確認**

ブラウザで http://localhost:3000 を開く。

Expected: Next.js のデフォルトトップ画面（黒背景に "Get started by editing" など）が表示される。

- [ ] **Step 3: サーバー停止**

ターミナルで `Ctrl+C` を押す。

---

## Task 5: Neon プロジェクトの作成

**目的:** Neon にプロジェクトを作って接続URLを取得する。**ここはブラウザ操作のマニュアル作業。**

**Files:** なし（外部サービス）

- [ ] **Step 1: Neon にサインアップ**

https://console.neon.tech にアクセスし、GitHub アカウント等でサインアップする。クレジットカード登録は不要。

- [ ] **Step 2: プロジェクト作成**

ダッシュボードから「Create project」を押し、以下を設定:
- Project name: `diary-app`
- Postgres version: 17（デフォルトでOK）
- Region: 一番近いリージョン（Asia Pacific (Tokyo) など）
- Database name: `diary_db`（任意）

「Create project」をクリック。

- [ ] **Step 3: 接続URL を取得**

プロジェクト作成直後の「Connection string」セクションで、Pooled connection の URL（`postgresql://user:password@.../diary_db?sslmode=require` の形式）を**コピー**する。後で `.env.local` に貼り付ける。

Expected: `postgresql://` で始まる長い文字列が手元にある状態。

> ⚠️ この URL は秘密情報。誰にも見せない・git にコミットしない。

---

## Task 6: 環境変数ファイルの整備

**目的:** `.env.local` に Neon の接続URLを設定し、`.env.example` をリポジトリに残す。

**Files:**
- Create: `.env.example`
- Create: `.env.local`（git追跡しない）

- [ ] **Step 1: .env.example を作成**

```bash
cat > .env.example <<'EOF'
# Neon Postgres - https://console.neon.tech から取得
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# シングルユーザー前提の固定 ID（M4 認証導入時に削除）
DEFAULT_USER_ID="me"
EOF
```

- [ ] **Step 2: .env.local を作成**

Task 5 でコピーした URL を埋め込む。`YOUR_NEON_URL_HERE` を実際のURLに置き換える。

```bash
cat > .env.local <<'EOF'
DATABASE_URL="YOUR_NEON_URL_HERE"
DEFAULT_USER_ID="me"
EOF
```

その後、エディタで `.env.local` を開き `YOUR_NEON_URL_HERE` を実際の Neon 接続URL（Task 5-Step 3 でコピーしたもの）に置き換える。

- [ ] **Step 3: .env.local が git に追跡されないことを確認**

```bash
git status
```

Expected: `.env.example` は untracked として表示されるが、`.env.local` は**表示されない**こと。

`.env.local` が表示される場合は `.gitignore` に `.env*.local` を追記する。

- [ ] **Step 4: コミット（.env.example のみ）**

```bash
git add .env.example
git commit -m "chore: add .env.example with required variables"
```

---

## Task 7: Drizzle ORM のインストール

**目的:** Drizzle 本体と Neon serverless ドライバ、Drizzle Kit、tsx をインストール。

**Files:**
- Modify: `package.json`（pnpm が自動で書き換え）

- [ ] **Step 1: ランタイム依存をインストール**

```bash
pnpm add drizzle-orm @neondatabase/serverless
```

Expected: `package.json` の `dependencies` に `drizzle-orm` と `@neondatabase/serverless` が追加される。

- [ ] **Step 2: 開発依存をインストール**

```bash
pnpm add -D drizzle-kit tsx dotenv
```

Expected: `package.json` の `devDependencies` に 3 つが追加される。

- [ ] **Step 3: package.json を確認**

```bash
cat package.json | grep -A 10 dependencies
```

Expected: 上記4パッケージが見える。

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install drizzle-orm, drizzle-kit, neon serverless"
```

---

## Task 8: Drizzle 設定ファイルの作成

**目的:** Drizzle Kit が DB の場所を知るための `drizzle.config.ts` を作る。

**Files:**
- Create: `drizzle.config.ts`

- [ ] **Step 1: drizzle.config.ts を作成**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

> 注: `lib/db/schema.ts` は M1 で作る。今は参照だけ書いておく（このプランでは Drizzle Kit を起動しないので、ファイルがなくても問題なし）。

- [ ] **Step 2: コミット**

```bash
git add drizzle.config.ts
git commit -m "feat: add drizzle config pointing to neon postgres"
```

---

## Task 9: DB クライアントの作成

**目的:** アプリ全体で使い回す Drizzle クライアントを `lib/db/client.ts` に定義する。

**Files:**
- Create: `lib/db/client.ts`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p lib/db
```

- [ ] **Step 2: lib/db/client.ts を作成**

```typescript
// lib/db/client.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool });
```

- [ ] **Step 3: コミット**

```bash
git add lib/db/client.ts
git commit -m "feat: add drizzle db client backed by neon serverless"
```

---

## Task 10: DB 接続確認スクリプト

**目的:** Neon に対して `SELECT 1` を投げ、レスポンスが返ってくることを確認する。これが M0 のゴールチェック。

**Files:**
- Create: `scripts/verify-db.ts`
- Modify: `package.json`（npm script 追加）

- [ ] **Step 1: scripts/verify-db.ts を作成**

```bash
mkdir -p scripts
```

```typescript
// scripts/verify-db.ts
import 'dotenv/config';
import { db } from '../lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Connecting to database...');
  const result = await db.execute(sql`SELECT 1 AS ok`);
  console.log('Result:', result.rows);
  console.log('✅ DB connection OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ DB connection FAILED');
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: package.json に npm script を追加**

`package.json` の `scripts` セクションに `"db:verify"` を追加する。`package.json` を開いて編集：

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "db:verify": "tsx scripts/verify-db.ts"
  }
}
```

> 既存の `scripts` 内容は触らず、`"db:verify"` の行だけ追加する。

- [ ] **Step 3: スクリプトを実行**

```bash
pnpm db:verify
```

Expected:
```
Connecting to database...
Result: [ { ok: 1 } ]
✅ DB connection OK
```

エラーが出る場合のチェックポイント:
- `.env.local` の `DATABASE_URL` が正しいか
- Neon の URL が `?sslmode=require` を含むか
- Neon ダッシュボードでプロジェクトが Active か（スリープしてれば自動起動）

- [ ] **Step 4: コミット**

```bash
git add scripts/verify-db.ts package.json
git commit -m "feat: add db:verify script to check neon connectivity"
```

---

## Task 11: GitHub にプッシュ

**目的:** リモートリポジトリを作成して push。後の Vercel 連携の下地。

**Files:** なし

- [ ] **Step 1: GitHub にリポジトリ作成**

ブラウザで https://github.com/new を開き、以下で作成:
- Repository name: `diary-app`
- Visibility: `Private`（公開しない）
- Initialize repository: **何もチェックしない**（README/`.gitignore`/license のいずれも追加しない）

「Create repository」をクリック。

- [ ] **Step 2: リモートを追加して push**

GitHub の画面に表示されているコマンドの「…or push an existing repository」セクションを参考に：

```bash
git remote add origin git@github.com:<YOUR_GITHUB_USER>/diary-app.git
git push -u origin main
```

`<YOUR_GITHUB_USER>` を自分の GitHub ユーザー名に置き換える。HTTPS で接続する場合は `https://github.com/<YOUR_GITHUB_USER>/diary-app.git`。

Expected: `Branch 'main' set up to track remote branch 'main' from 'origin'.` のメッセージ。

- [ ] **Step 3: GitHub で確認**

ブラウザで `https://github.com/<YOUR_GITHUB_USER>/diary-app` を開く。

Expected:
- `docs/`, `app/`, `lib/`, `scripts/` などが見える
- `.env.local` は**ない**（重要：あったら直ちに対処）
- 最新コミットが Task 10 のもの

---

## 完了基準

すべての Task のチェックボックスが埋まり、以下が満たされていれば M0 完了：

1. `pnpm dev` で `localhost:3000` に Next.js デフォルト画面が表示される
2. `pnpm db:verify` で `✅ DB connection OK` が出る
3. GitHub のリポジトリに `.env.local` が **含まれていない**
4. `git log --oneline` で 6 つ前後のコミットが並んでいる

これを満たしたら、M1（日記の基本機能 CRUD）の実装プランを別途作成する。

---

## トラブルシューティング簡易ガイド

| 症状 | 対処 |
|---|---|
| `pnpm dev` で `EADDRINUSE` | 別プロセスが3000番を使用中。`lsof -i :3000` で確認して終了 |
| `pnpm db:verify` で `password authentication failed` | `.env.local` の URL に typo がないか、改行が混入していないか確認 |
| `pnpm db:verify` で `getaddrinfo ENOTFOUND` | インターネット未接続 or Neon URL のホスト名誤り |
| `git push` で 403 | SSH 鍵未登録 or 認証失敗。GitHub 設定を確認 |
| `create-next-app` が対話モードに入る | フラグ指定が足りない。コマンドを正確にコピペ |

---

## このプランで意図的に**やらないこと**

- DB スキーマ作成（M1 で `diary_entries` を作る時に着手）
- マイグレーション実行（同上）
- shadcn/ui のセットアップ（M1 で日記エディタ作る時に着手）
- Vercel デプロイ（M4）
- AI SDK インストール（M2）
- Recharts インストール（M3）

「M0 = アプリの空箱と DB の疎通だけ」に絞ることで、毎ステップの確認がシンプルに保たれる。
