# M4: 認証 + Vercel デプロイ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 日記アプリに Better Auth + Google OAuth + メールホワイトリストを導入し、`DEFAULT_USER_ID='me'` 固定運用を session ベースに切り替え、Vercel に Production デプロイする

**Architecture:** middleware で未認証アクセスを `/sign-in` にリダイレクト。Server Action / クエリでは `requireSession()` ヘルパで二重防御。Better Auth は Drizzle adapter で既存 Neon に同居させ、既存テーブルの `userId` 列を `user.id` への外部キーに昇格。テストは Vitest 最小構成で純粋関数のみ。

**Tech Stack:** Better Auth, Drizzle ORM, Neon Postgres, Next.js 16 App Router, Vitest, Vercel

**承認済み spec:** `docs/superpowers/specs/2026-06-09-m4-auth-deploy-design.md`

---

## File Structure

### 新規作成

| パス | 責務 |
|---|---|
| `lib/auth/server.ts` | Better Auth サーバインスタンス。Drizzle adapter + Google provider + signIn.before フックでホワイトリスト判定 |
| `lib/auth/client.ts` | Better Auth クライアントインスタンス（`signIn.social`, `signOut`） |
| `lib/auth/whitelist.ts` | `isAllowedEmail(email, allowList)` 純粋関数 |
| `lib/auth/whitelist.test.ts` | ホワイトリスト関数の単体テスト |
| `lib/auth/session.ts` | `requireSession()` ヘルパー（Server Action / クエリ用） |
| `app/api/auth/[...all]/route.ts` | Better Auth Next.js ハンドラ |
| `app/sign-in/page.tsx` | サインインページ（Google ボタン + エラー表示） |
| `middleware.ts` | ルート保護 |
| `vitest.config.ts` | Vitest 最小設定 |

### 修正

| パス | 変更 |
|---|---|
| `package.json` | `better-auth`, `vitest` 追加。`test` スクリプト追加 |
| `.env.example` | 新規環境変数の追加、`DEFAULT_USER_ID` 削除 |
| `lib/db/schema.ts` | Better Auth 4 テーブル追加。既存3テーブルの `userId` に FK |
| `lib/actions/diary.ts` | `USER_ID` 定数削除、`requireSession()` 取得に置換 |
| `lib/actions/insight.ts` | 同上 |
| `lib/db/queries/diary.ts` | 同上 |
| `lib/db/queries/insight.ts` | 同上 |
| `lib/db/queries/mbti.ts` | 同上 |
| `scripts/seed.ts` | `userId` を引数 or env から動的に取得（`DEFAULT_USER_ID` 依存を除去） |
| `scripts/seed-reset.ts` | 同上 |
| `components/layout/HeaderNav.tsx` | サインアウトボタン + ユーザー名（email）表示 |
| `app/layout.tsx` | `/sign-in` 配下では HeaderNav を非表示にする出し分け |
| `README.md` | 環境変数一覧、ホワイトリスト追加方法、再デプロイ手順 |

---

## Task 1: 依存パッケージのインストールと Vitest 最小設定

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 依存パッケージのインストール**

Run:
```bash
npm install better-auth
npm install -D vitest @vitest/coverage-v8
```

Expected: `package.json` の `dependencies` に `better-auth`、`devDependencies` に `vitest`, `@vitest/coverage-v8` が追加される。

- [ ] **Step 2: `package.json` の scripts に test を追加**

`package.json` の `scripts` に以下を追加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: `vitest.config.ts` を作成**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: テスト実行で 0 件パスを確認**

Run: `npm test`
Expected: テストファイルが無いため exit code 0 で「No test files found」のメッセージ。

- [ ] **Step 5: コミット**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install better-auth and vitest"
```

---

## Task 2: ホワイトリスト純粋関数を TDD で実装

**Files:**
- Create: `lib/auth/whitelist.ts`
- Create: `lib/auth/whitelist.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`lib/auth/whitelist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isAllowedEmail } from './whitelist';

describe('isAllowedEmail', () => {
  it('returns true for exact match', () => {
    expect(isAllowedEmail('daichi.tomita@vivion.jp', ['daichi.tomita@vivion.jp'])).toBe(true);
  });

  it('returns false for non-matching email', () => {
    expect(isAllowedEmail('other@example.com', ['daichi.tomita@vivion.jp'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAllowedEmail('DAICHI.tomita@VIVION.JP', ['daichi.tomita@vivion.jp'])).toBe(true);
  });

  it('trims whitespace in allow list entries', () => {
    expect(isAllowedEmail('foo@bar.com', [' foo@bar.com ', 'baz@bar.com'])).toBe(true);
  });

  it('returns false for empty allow list', () => {
    expect(isAllowedEmail('foo@bar.com', [])).toBe(false);
  });

  it('returns false for empty email', () => {
    expect(isAllowedEmail('', ['foo@bar.com'])).toBe(false);
  });
});
```

- [ ] **Step 2: テスト実行で失敗を確認**

Run: `npm test`
Expected: FAIL — `Cannot find module './whitelist'`

- [ ] **Step 3: 最小実装を書く**

`lib/auth/whitelist.ts`:

```ts
export function isAllowedEmail(email: string, allowList: string[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return allowList.some((entry) => entry.trim().toLowerCase() === normalized);
}

export function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
```

- [ ] **Step 4: テスト実行で全件パスを確認**

Run: `npm test`
Expected: PASS — 6 件すべて成功。

- [ ] **Step 5: コミット**

```bash
git add lib/auth/whitelist.ts lib/auth/whitelist.test.ts
git commit -m "feat: add email allowlist pure function with tests"
```

---

## Task 3: Better Auth サーバインスタンスを実装

**Files:**
- Create: `lib/auth/server.ts`
- Modify: `.env.example`

- [ ] **Step 1: context7 で Better Auth の Drizzle adapter + Google provider の最新 API を確認**

実装直前に context7 で `Better Auth` を引いて以下を確認：
- `betterAuth()` の引数構造
- `drizzleAdapter` のインポートパスと使い方
- `socialProviders.google` の指定方法
- `databaseHooks` または `signIn.before` フックの正確な signature
- session の Database / cookie 設定のデフォルト

下記の雛形は標準的なパターン。差分があれば context7 のドキュメントに合わせて調整。

- [ ] **Step 2: `lib/auth/server.ts` を作成**

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client';
import { isAllowedEmail, parseAllowList } from './whitelist';

const allowList = parseAllowList(process.env.ALLOWED_EMAILS);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  // signIn 直前のフックで email を検査
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email, allowList)) {
            throw new Error('NOT_ALLOWED');
          }
          return { data: user };
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
```

注: フックの正確な API は Better Auth のバージョンで異なる可能性あり。context7 の最新ドキュメントが優先。

- [ ] **Step 3: `.env.example` を更新**

`.env.example` を以下に書き換える（既存項目は維持、`DEFAULT_USER_ID` を削除、新規 5 項目を追加）：

```env
# Neon Postgres
DATABASE_URL="postgresql://..."

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=""

# Better Auth
BETTER_AUTH_SECRET=""          # openssl rand -base64 32 で生成
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (Google Cloud Console で取得)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# サインイン許可するメールアドレス（カンマ区切り）
ALLOWED_EMAILS="daichi.tomita@vivion.jp"
```

- [ ] **Step 4: ローカル `.env.local` も同様の変数を追加（手動、コミット対象外）**

Run:
```bash
openssl rand -base64 32
```
で生成した値を `BETTER_AUTH_SECRET` に設定。Google OAuth credentials は Task 16 で取得して入れる。一旦空でも OK。

- [ ] **Step 5: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add lib/auth/server.ts .env.example
git commit -m "feat: add Better Auth server instance with Google provider and allowlist hook"
```

---

## Task 4: Drizzle schema に Better Auth テーブル追加 + FK 設定

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: context7 で Better Auth の Drizzle スキーマ定義を確認**

Better Auth の Drizzle adapter が要求するテーブル定義（`user`, `account`, `session`, `verification`）の正確な列構成を context7 で確認。Better Auth は `npx @better-auth/cli generate` でスキーマを生成するコマンドもある — まずそれを試す案も検討。

- [ ] **Step 2: `lib/db/schema.ts` の冒頭に Better Auth テーブル追加**

既存 import の後、`diaryEntries` の定義より前に以下を追加（具体的な列定義は context7 確認後の最新仕様に従う。下記は典型例）：

```ts
import { boolean } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: 既存3テーブルの `userId` を `user.id` への FK にする**

`diaryEntries`, `weeklyInsights`, `mbtiSnapshots` 各テーブル定義の `userId: text('user_id').notNull(),` を以下に置換：

```ts
userId: text('user_id')
  .notNull()
  .references(() => user.id, { onDelete: 'cascade' }),
```

- [ ] **Step 4: Drizzle スキーマ生成 / push の確認**

まず `db:seed:reset` で既存データを全削除（FK 追加時に `'me'` が `user.id` に無いと当たらないため）：

```bash
npm run db:seed:reset
```

Expected: 既存 diary_entries, weekly_insights, mbti_snapshots が全削除される。

次にマイグレーション：

```bash
npm run db:push
```

Expected: 新規4テーブル作成 + 既存3テーブルに FK 制約追加。

- [ ] **Step 5: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add lib/db/schema.ts
git commit -m "feat: extend schema with Better Auth tables and userId FK"
```

---

## Task 5: Better Auth API ハンドラを実装

**Files:**
- Create: `app/api/auth/[...all]/route.ts`

- [ ] **Step 1: context7 で Better Auth の Next.js ハンドラパターンを確認**

Better Auth は Next.js 用に `toNextJsHandler` のような統合ヘルパーを提供している。最新ドキュメントで正確な import 名と使い方を確認。

- [ ] **Step 2: `app/api/auth/[...all]/route.ts` を作成**

```ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/server';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: dev サーバで `/api/auth/session` などのエンドポイントが応答することを確認**

Run:
```bash
npm run dev
```

別ターミナルで:
```bash
curl -s http://localhost:3000/api/auth/session
```

Expected: 200 で `null` 等の JSON が返る（未ログイン時）。404 が返るならルート定義に問題あり。

- [ ] **Step 4: コミット**

```bash
git add app/api/auth/\[...all\]/route.ts
git commit -m "feat: add Better Auth Next.js route handler"
```

---

## Task 6: Better Auth クライアントを実装

**Files:**
- Create: `lib/auth/client.ts`

- [ ] **Step 1: context7 で `createAuthClient` の最新 API を確認**

- [ ] **Step 2: `lib/auth/client.ts` を作成**

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '',
});

export const { signIn, signOut, useSession } = authClient;
```

注: クライアントから baseURL を参照するには `NEXT_PUBLIC_` プレフィックス付きの env が必要。`.env.example` と Vercel に `NEXT_PUBLIC_BETTER_AUTH_URL` も追加する。

- [ ] **Step 3: `.env.example` を更新**

`BETTER_AUTH_URL` の直下に以下を追加：

```env
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

- [ ] **Step 4: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/auth/client.ts .env.example
git commit -m "feat: add Better Auth React client"
```

---

## Task 7: requireSession ヘルパーを実装

**Files:**
- Create: `lib/auth/session.ts`

- [ ] **Step 1: `lib/auth/session.ts` を作成**

```ts
import { headers } from 'next/headers';
import { auth } from './server';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
}
```

- [ ] **Step 2: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: コミット**

```bash
git add lib/auth/session.ts
git commit -m "feat: add requireSession helper for server-side authorization"
```

---

## Task 8: middleware でルート保護

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: context7 で Better Auth + Next.js 16 middleware の最新パターンを確認**

特に確認するポイント:
- session cookie の名前（`better-auth.session_token` 等）
- edge runtime での `getSessionCookie` 等のヘルパー有無
- `NextResponse.redirect` の正しい使い方（Next.js 16）

- [ ] **Step 2: `middleware.ts` を作成**

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PROTECTED_PATTERNS = [
  /^\/$/,
  /^\/diary(\/|$)/,
  /^\/history(\/|$)/,
  /^\/insights(\/|$)/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 素通し: /sign-in, /api/auth/*, 静的アセット
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATTERNS.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

注: `getSessionCookie` の正確な import パスは context7 で要確認。Better Auth は edge runtime 向けに専用ヘルパを用意している。

- [ ] **Step 3: dev サーバで未ログイン時のリダイレクトを確認**

Run: `npm run dev`

ブラウザで `http://localhost:3000/` にアクセス → `/sign-in` に飛ばされることを確認（`/sign-in` ページはまだ無いので 404 になるが、リダイレクトは発生する）。

- [ ] **Step 4: コミット**

```bash
git add middleware.ts
git commit -m "feat: add middleware to redirect unauthenticated users to sign-in"
```

---

## Task 9: サインインページを実装

**Files:**
- Create: `app/sign-in/page.tsx`

- [ ] **Step 1: `app/sign-in/page.tsx` を作成**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth/client';

function SignInContent() {
  const params = useSearchParams();
  const error = params.get('error');

  const handleGoogle = () => {
    signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
  };

  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-6 p-6 pt-24">
      <h1 className="text-2xl font-bold">サインイン</h1>
      <p className="text-sm text-muted-foreground">
        Google アカウントでサインインしてください
      </p>
      <Button type="button" onClick={handleGoogle} className="w-full">
        Google でサインイン
      </Button>
      {error === 'not_allowed' && (
        <p className="text-sm text-destructive">
          このメールアドレスはサインインを許可されていません。
        </p>
      )}
      {error && error !== 'not_allowed' && (
        <p className="text-sm text-destructive">サインインに失敗しました（{error}）。</p>
      )}
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: dev サーバで `/sign-in` が表示されることを確認**

Run: `npm run dev`

ブラウザで `http://localhost:3000/sign-in` を開く → ボタンとタイトルが表示される。
クリックは Google OAuth credentials が設定されていないと動かないが、ボタン自体は表示される。

- [ ] **Step 3: コミット**

```bash
git add app/sign-in/page.tsx
git commit -m "feat: add /sign-in page with Google OAuth button"
```

---

## Task 10: HeaderNav にサインアウト + ユーザー名を追加

**Files:**
- Modify: `components/layout/HeaderNav.tsx`

- [ ] **Step 1: `components/layout/HeaderNav.tsx` を全置換**

```tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth/client';

const links = [
  { href: '/', label: '日記', match: (p: string) => p === '/' || p.startsWith('/diary') },
  { href: '/history', label: '履歴', match: (p: string) => p.startsWith('/history') },
  { href: '/insights', label: '分析', match: (p: string) => p.startsWith('/insights') },
];

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <nav className="container mx-auto flex max-w-3xl items-center justify-between gap-6 p-4">
      <div className="flex items-center gap-6">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      {session?.user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{session.user.email}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
            サインアウト
          </Button>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: コミット**

```bash
git add components/layout/HeaderNav.tsx
git commit -m "feat: add sign-out button and user email to HeaderNav"
```

---

## Task 11: サインインページではヘッダーを非表示にする

**Files:**
- Modify: `components/layout/HeaderNav.tsx`

`app/layout.tsx` 側を分岐させると client component 化が必要で波及が大きい。HeaderNav 自身が `/sign-in` で `null` を返すのが最小変更。Task 10 で HeaderNav は既に `'use client'` で `usePathname()` を使っているのでコストゼロ。

- [ ] **Step 1: HeaderNav の関数冒頭に early return を追加**

`components/layout/HeaderNav.tsx` の `export function HeaderNav() { ... }` の中、 `const { data: session } = useSession();` 行の直後に以下を追加：

```tsx
  if (pathname.startsWith('/sign-in')) return null;
```

完成後の冒頭は以下の形になる：

```tsx
export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  if (pathname.startsWith('/sign-in')) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <nav className="container mx-auto flex max-w-3xl items-center justify-between gap-6 p-4">
      {/* ... 既存 JSX ... */}
    </nav>
  );
}
```

- [ ] **Step 2: dev サーバで `/sign-in` にヘッダーが出ないこと、`/` ではヘッダーが出ることを確認**

Run: `npm run dev`

ブラウザで `/sign-in` と `/`（リダイレクト後）を切り替えてヘッダーの有無を目視。

- [ ] **Step 3: コミット**

```bash
git add components/layout/HeaderNav.tsx
git commit -m "feat: hide HeaderNav on /sign-in route"
```

---

## Task 12: USER_ID 定数を Server Action から除去（`lib/actions/diary.ts`）

**Files:**
- Modify: `lib/actions/diary.ts`

- [ ] **Step 1: 現状確認**

Run: `grep -n "USER_ID\|DEFAULT_USER_ID" lib/actions/diary.ts`
Expected: 数行ヒット（const USER_ID = ..., 関数内で参照）

- [ ] **Step 2: 修正**

冒頭の `const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';` を削除し、ファイル先頭の import に以下を追加：

```ts
import { requireSession } from '@/lib/auth/session';
```

各 Server Action（`saveDiaryEntry`, `deleteDiaryEntry`）の関数冒頭で：

```ts
const session = await requireSession();
const userId = session.user.id;
```

そして関数内で参照されている `USER_ID` を全て `userId` に置換。

- [ ] **Step 3: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add lib/actions/diary.ts
git commit -m "refactor: use requireSession instead of DEFAULT_USER_ID in diary actions"
```

---

## Task 13: USER_ID 定数を `lib/actions/insight.ts` から除去

**Files:**
- Modify: `lib/actions/insight.ts`

- [ ] **Step 1: 現状確認**

Run: `grep -n "USER_ID\|DEFAULT_USER_ID" lib/actions/insight.ts`
Expected: 数行ヒット（`const USER_ID = ...`、`regenerateInsight` 内での参照）

- [ ] **Step 2: 修正**

ファイル冒頭の `const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';` 行を削除。import 文に以下を追加：

```ts
import { requireSession } from '@/lib/auth/session';
```

`regenerateInsight` 関数の冒頭（最初の処理より前）に以下を挿入：

```ts
const session = await requireSession();
const userId = session.user.id;
```

関数内の `USER_ID` 参照を全て `userId` に置換。具体的には `userId: USER_ID,`（onConflictDoUpdate 等の引数で出てくる）と、targetIndex の `[weeklyInsights.userId, weeklyInsights.periodStart]` のように `userId` を直接参照する箇所のうち、ローカル変数 `USER_ID` を使っていた箇所のみ。

- [ ] **Step 3: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add lib/actions/insight.ts
git commit -m "refactor: use requireSession instead of DEFAULT_USER_ID in insight actions"
```

---

## Task 14: USER_ID 定数を `lib/db/queries/*.ts` 3 ファイルから除去

**Files:**
- Modify: `lib/db/queries/diary.ts`
- Modify: `lib/db/queries/insight.ts`
- Modify: `lib/db/queries/mbti.ts`

- [ ] **Step 1: 3 ファイルそれぞれを修正**

各ファイルの冒頭で `const USER_ID = ...` を削除し、import に追加：

```ts
import { requireSession } from '@/lib/auth/session';
```

各 export 関数（`getDiaryEntry`, `listDiaryEntries`, `getLatestInsight`, `getLatestMbti` 等）の冒頭で：

```ts
const session = await requireSession();
const userId = session.user.id;
```

関数内の `USER_ID` 参照を `userId` に全置換。

- [ ] **Step 2: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: コミット**

```bash
git add lib/db/queries/diary.ts lib/db/queries/insight.ts lib/db/queries/mbti.ts
git commit -m "refactor: use requireSession instead of DEFAULT_USER_ID in db queries"
```

---

## Task 15: seed スクリプトを userId 動的化

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `scripts/seed-reset.ts`

`scripts/*.ts` はサーバランタイム外（tsx 実行）なので `requireSession` は使えない。代わりに引数 or env から `userId` を受け取る。

- [ ] **Step 1: `scripts/seed.ts` を修正**

冒頭の `const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';` を以下に置換：

```ts
const USER_ID = process.env.SEED_USER_ID;
if (!USER_ID) {
  console.error(
    'SEED_USER_ID が未設定です。`SEED_USER_ID=<your-user-id> npm run db:seed` で実行してください。',
  );
  process.exit(1);
}
```

`db:seed` を打つときに `SEED_USER_ID` を指定する運用にする。

- [ ] **Step 2: `scripts/seed-reset.ts` を修正**

冒頭の `const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';` を以下に置換：

```ts
const USER_ID = process.env.SEED_USER_ID;
if (!USER_ID) {
  console.error(
    'SEED_USER_ID が未設定です。`SEED_USER_ID=<your-user-id> npm run db:seed:reset` で実行してください。',
  );
  process.exit(1);
}
```

- [ ] **Step 3: TypeScript チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add scripts/seed.ts scripts/seed-reset.ts
git commit -m "refactor: require SEED_USER_ID env in seed scripts (drop DEFAULT_USER_ID)"
```

---

## Task 16: Google OAuth 設定 + ローカル E2E

**Files:** （コード変更なし。ブラウザ作業 + 動作確認）

- [ ] **Step 1: Google Cloud Console で OAuth credentials を発行**

1. https://console.cloud.google.com にアクセス、プロジェクト作成（既存可）
2. APIs & Services → OAuth consent screen → User type: External、Test users に自分の Google アカウントを追加
3. APIs & Services → Credentials → OAuth client ID（Application type: Web application）
4. 承認済みリダイレクト URI:
   - `http://localhost:3000/api/auth/callback/google`
5. Client ID, Client Secret を控える

- [ ] **Step 2: `.env.local` を更新**

```env
BETTER_AUTH_SECRET="<openssl rand -base64 32 の結果>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<Google Cloud から>"
GOOGLE_CLIENT_SECRET="<Google Cloud から>"
ALLOWED_EMAILS="daichi.tomita@vivion.jp"
```

`DEFAULT_USER_ID` の行は削除。

- [ ] **Step 3: dev サーバ起動して E2E 手動確認**

Run: `npm run dev`

ブラウザで以下のシナリオを確認（spec §8.2）:

1. `/` にアクセス → `/sign-in` にリダイレクト ✓
2. `/diary/2026-06-10` にアクセス → `/sign-in` にリダイレクト ✓
3. Google でサインイン（許可メール）→ `/` に着地 ✓
4. ヘッダーに自分の email が表示される ✓
5. サインアウト → `/sign-in` にリダイレクト、cookie 消失 ✓
6. 別のテスト用 Google アカウントを Test users から外して試行 → エラー画面（可能なら）

- [ ] **Step 4: 自分の user.id を確認して seed**

ログイン状態で psql or Drizzle Studio で `SELECT id, email FROM "user";` を実行し、自分の `id` を控える。

Run:
```bash
SEED_USER_ID=<your-user-id> npm run db:seed
```

Expected: 自分の userId で diary_entries が投入される。

- [ ] **Step 5: dev で日記が表示されることを確認**

`/history` に行き、seed されたカレンダーが見える。`/insights` に行き、AI 分析が動く（必要ならボタン押下）。

- [ ] **Step 6: コミット（変更があれば）**

ローカル E2E でコード変更が必要になった場合のみコミット。無ければスキップ。

---

## Task 17: Vercel に Production デプロイ

**Files:** （Vercel ダッシュボード作業）

- [ ] **Step 1: Vercel でプロジェクトを import**

1. https://vercel.com → New Project → GitHub `atimot/diary-app` を import
2. Framework Preset: Next.js（自動検出）
3. Settings → Git → **Preview Deployments** を無効化

- [ ] **Step 2: 環境変数を Production スコープで登録**

| 変数 | 値 |
|---|---|
| `DATABASE_URL` | `.env.local` から |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `.env.local` から |
| `BETTER_AUTH_SECRET` | `.env.local` から |
| `BETTER_AUTH_URL` | 暫定 `https://placeholder.vercel.app`（後で更新） |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 同上 |
| `GOOGLE_CLIENT_ID` | `.env.local` から |
| `GOOGLE_CLIENT_SECRET` | `.env.local` から |
| `ALLOWED_EMAILS` | `.env.local` から |

- [ ] **Step 3: Deploy → 本番 URL を取得**

Expected: `https://<project>.vercel.app` 形式の URL が発行される。

- [ ] **Step 4: Google Cloud Console に本番リダイレクト URI を追加**

OAuth client の Authorized redirect URIs に `https://<project>.vercel.app/api/auth/callback/google` を追加。

- [ ] **Step 5: `BETTER_AUTH_URL` と `NEXT_PUBLIC_BETTER_AUTH_URL` を本番 URL に更新 → 再デプロイ**

Vercel の環境変数を本番 URL に書き換え、Deployments → Redeploy。

- [ ] **Step 6: 本番 E2E**

Task 16 と同じシナリオを本番 URL で確認。

---

## Task 18: README に運用メモを追記

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README に以下のセクションを追加**

```markdown
## 環境変数

| 変数 | 説明 |
|---|---|
| `DATABASE_URL` | Neon Postgres 接続文字列 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API キー |
| `BETTER_AUTH_SECRET` | Better Auth セッション署名鍵 (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | サーバ側 baseURL (`http://localhost:3000` / 本番 URL) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | クライアント側 baseURL（同上） |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `ALLOWED_EMAILS` | サインイン許可するメール（カンマ区切り） |

## サインイン可能なメールを追加

Vercel の Environment Variables で `ALLOWED_EMAILS` の値にメールを追加してカンマ区切りで列挙 → Redeploy。

## seed 実行

```bash
# 自分の Google user.id で投入
SEED_USER_ID=<user-id> npm run db:seed

# 全削除
SEED_USER_ID=<user-id> npm run db:seed:reset
```

`<user-id>` は Drizzle Studio (`npm run db:studio`) で `user` テーブルから取得。

## Vercel 再デプロイ

`main` への push で自動デプロイ。手動再デプロイは Vercel ダッシュボードの Deployments → Redeploy。
```

- [ ] **Step 2: コミット**

```bash
git add README.md
git commit -m "docs: add M4 operational notes (env vars, allowlist, seed, redeploy)"
```

- [ ] **Step 3: main を push**

```bash
git push origin main
```

Expected: Vercel が自動再デプロイする（既に Task 17 でデプロイ済みなので、これは README 更新の反映）。

---

## 完了条件

- [ ] ローカルで未ログイン → `/sign-in` リダイレクトが動く
- [ ] ローカルで Google サインイン → `/` 表示、自分の日記が見える
- [ ] ローカルで許可外メールはサインインできない
- [ ] サインアウト → `/sign-in` リダイレクト
- [ ] 本番 URL で同じシナリオが全て動く
- [ ] `npm test` でホワイトリスト関数のテストがパスする
- [ ] `npx tsc --noEmit` がパスする
- [ ] `DEFAULT_USER_ID` の参照がコードから消えている (`grep -r "DEFAULT_USER_ID" lib scripts app` で 0 件)
