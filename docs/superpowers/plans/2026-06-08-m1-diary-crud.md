# M1: 日記の基本機能 CRUD 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日記を「今日の編集 / 履歴一覧 / 日付指定で閲覧・再編集」できるシングルユーザー日記アプリを完成させる。AI機能はなし。`pnpm dev` で全機能が動く状態に到達する。

**Architecture:** Server Components で履歴・詳細を読み取り、Server Actions で書き込み（upsert）。Zod でフォーム入力をバリデーション。Drizzle ORM の `onConflictDoUpdate` で「1日1つ」制約を活かしながら新規作成/更新を統一する。UI は shadcn/ui ベース。

**Tech Stack:** Next.js 16 App Router / Server Actions / Server Components / Drizzle ORM (`onConflictDoUpdate`) / drizzle-kit push / Zod / shadcn/ui (Button, Textarea) / Tailwind v4

**Source spec:** [`docs/superpowers/specs/2026-06-08-diary-app-design.md`](../specs/2026-06-08-diary-app-design.md) の §5「M1」

**前提:** M0 が完了済み（Next.js 16 scaffolded、Drizzle 導入済み、Neon Postgres 接続確認済み、`.env.local` に `DATABASE_URL` と `DEFAULT_USER_ID="me"` 設定済み）。

---

## このプランで作る/触るファイル

```
diary-app/
├── drizzle.config.ts                      # 修正: .env.local を明示的に読む
├── package.json                            # 修正: db:push, db:studio スクリプト追加
├── components.json                         # 新規: shadcn 設定 (init で生成)
├── components/
│   ├── ui/                                 # 新規: shadcn 由来 (button, textarea)
│   └── diary/
│       └── DiaryEditor.tsx                # 新規: クライアントエディタ
├── lib/
│   ├── db/
│   │   ├── schema.ts                       # 新規: diary_entries テーブル定義
│   │   └── queries/
│   │       └── diary.ts                    # 新規: 読み取りクエリ (get, list)
│   ├── validation/
│   │   └── diary.ts                        # 新規: Zod スキーマ
│   └── actions/
│       └── diary.ts                        # 新規: Server Actions (save)
├── app/
│   ├── layout.tsx                          # 修正: ヘッダーナビ追加
│   ├── page.tsx                            # 修正: 今日の日記編集画面
│   ├── history/
│   │   └── page.tsx                        # 新規: 履歴一覧
│   └── diary/
│       └── [date]/
│           └── page.tsx                    # 新規: 日付指定の詳細
└── drizzle/                                # 新規: drizzle-kit が自動生成
```

### 各ファイルの責務

| ファイル | 責務 |
|---|---|
| `lib/db/schema.ts` | DBスキーマの定義のみ。クエリは持たない |
| `lib/db/queries/diary.ts` | 純粋な読み取りクエリ（getDiaryEntry, listDiaryEntries） |
| `lib/validation/diary.ts` | フォーム入力の検証ルール（Zod）のみ |
| `lib/actions/diary.ts` | Server Actions = 書き込み（saveDiaryEntry）。DB と Validation に依存 |
| `components/diary/DiaryEditor.tsx` | クライアントUI。Server Actions を action として呼ぶ |
| `app/page.tsx` | 今日の日記編集 = Server Component で queries を呼んで DiaryEditor へ渡す |
| `app/history/page.tsx` | 履歴一覧 = Server Component で list を取得 |
| `app/diary/[date]/page.tsx` | 詳細 = Server Component で1件取得し DiaryEditor へ渡す |
| `app/layout.tsx` | 共通ヘッダーナビ |

依存方向: `app/` → `components/` & `lib/db/queries/` → `lib/actions/` & `lib/db/schema.ts` → `lib/validation/`

---

## Task 1: M0 latent issue 修正 + DB スクリプト追加

**目的:** `drizzle.config.ts` が `.env.local` を読まない問題を解消し、`pnpm db:push` / `pnpm db:studio` を使えるようにする。

**Files:**
- Modify: `drizzle.config.ts`
- Modify: `package.json`

- [ ] **Step 1: drizzle.config.ts を修正**

`/Users/tomitad/work/diary-app/drizzle.config.ts` の内容を以下に置き換える:

```typescript
import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

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

変更点: `import 'dotenv/config'` から `config({ path: '.env.local' })` へ。これにより drizzle-kit から `.env.local` を確実に読める。

- [ ] **Step 2: package.json に db スクリプト追加**

`package.json` の `scripts` セクションに以下2行を追加。既存の `dev`, `build`, `start`, `lint`, `format`, `db:verify` は触らない:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write",
    "db:verify": "tsx --env-file=.env.local scripts/verify-db.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 3: drizzle-kit が config を読めるか確認**

```bash
pnpm exec drizzle-kit --help
```

Expected: drizzle-kit のヘルプ出力が表示される（エラーなし）。

- [ ] **Step 4: コミット**

```bash
git add drizzle.config.ts package.json
git commit -m "chore: fix drizzle config to load .env.local + add db:push/db:studio scripts"
```

---

## Task 2: diary_entries スキーマ定義

**目的:** Drizzle で `diary_entries` テーブルを TypeScript で定義する。まだ DB に push はしない。

**Files:**
- Create: `lib/db/schema.ts`

- [ ] **Step 1: schema.ts を作成**

```typescript
// lib/db/schema.ts
import { pgTable, text, date, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    entryDate: date('entry_date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: uniqueIndex('diary_entries_user_date_unique').on(table.userId, table.entryDate),
  }),
);

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;
```

設計意図:
- `id`: UUID（`defaultRandom()` で DB 側生成）
- `userId`: 当面は固定値 `"me"`（M4 で UUID に切替）
- `entryDate`: 日付（時刻なし）。「1日1つ」の単位
- `uniqueIndex` で `(user_id, entry_date)` の組を UNIQUE に → 同日複数禁止を DB レベルで保証
- `$inferSelect` / `$inferInsert` で型を export → 他層で利用

- [ ] **Step 2: 型推論が効くか確認**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add lib/db/schema.ts
git commit -m "feat: define diary_entries schema with one-per-day unique constraint"
```

---

## Task 3: Neon Postgres にスキーマを push

**目的:** Drizzle のスキーマを Neon の実 DB に反映する。

**Files:**
- Create: `drizzle/` （drizzle-kit が自動生成）

- [ ] **Step 1: drizzle-kit push を実行**

```bash
pnpm db:push
```

Expected:
- 「Reading config file...」
- 「Will create:」と表示され `diary_entries` テーブル + ユニークインデックスが提示される
- 確認プロンプト（`y/N` または対話メニュー）で `y` を選択
- 「Changes applied」または同等の成功メッセージ

非対話で進めたい場合は `pnpm db:push --force` を試す（ただし破壊的変更は無いので通常の `push` で問題ない）。

- [ ] **Step 2: テーブルが存在することを確認**

`scripts/verify-db.ts` を一時的に流用して確認するか、Drizzle Studio で目視確認:

```bash
pnpm db:studio
```

Drizzle Studio がブラウザで起動する。表示された URL（通常 https://local.drizzle.studio）にアクセスし、`diary_entries` テーブルが存在し空であることを確認。確認後 Ctrl+C で停止。

または CLI で確認したい場合、tsx で1行スクリプト:

```bash
pnpm exec tsx --env-file=.env.local -e "
import { Pool } from '@neondatabase/serverless';
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await p.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='diary_entries' ORDER BY ordinal_position;\");
console.log(r.rows);
await p.end();
"
```

Expected: `id`, `user_id`, `entry_date`, `content`, `created_at`, `updated_at` の6行が表示される。

- [ ] **Step 3: drizzle ディレクトリをコミット**

drizzle-kit は `drizzle/` 配下にメタ情報を生成する可能性がある。生成された場合はコミットする:

```bash
git add drizzle/ 2>/dev/null || true
git status
```

`drizzle/` 配下に何もない or 既に追跡対象なら、このステップはスキップ。

- [ ] **Step 4: コミット**

何もファイル変更がなければスキップ。あれば:

```bash
git add drizzle/
git commit -m "chore: drizzle migration metadata for diary_entries"
```

---

## Task 4: Zod バリデーション + 読み取りクエリ + Server Actions

**目的:** 設計の3層分離に従って実装する:
- `lib/validation/diary.ts`: 入力検証ルール
- `lib/db/queries/diary.ts`: 純粋な読み取り（Server Components から直接呼ぶ）
- `lib/actions/diary.ts`: 書き込み Server Action（フォームから呼ぶ）

**Files:**
- Create: `lib/validation/diary.ts`
- Create: `lib/db/queries/diary.ts`
- Create: `lib/actions/diary.ts`

- [ ] **Step 1: zod をインストール**

```bash
pnpm add zod
```

Expected: `dependencies` に `zod` が追加される。

- [ ] **Step 2: lib/validation/diary.ts を作成**

```bash
mkdir -p lib/validation
```

```typescript
// lib/validation/diary.ts
import { z } from 'zod';

export const diaryEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)'),
  content: z
    .string()
    .min(1, '本文を入力してください')
    .max(50000, '本文が長すぎます (最大50,000文字)'),
});

export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;
```

- [ ] **Step 3: lib/db/queries/diary.ts を作成（読み取り専用）**

```bash
mkdir -p lib/db/queries
```

```typescript
// lib/db/queries/diary.ts
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { diaryEntries, type DiaryEntry } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getDiaryEntry(entryDate: string): Promise<DiaryEntry | undefined> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, USER_ID), eq(diaryEntries.entryDate, entryDate)))
    .limit(1);
  return rows[0];
}

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  return db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, USER_ID))
    .orderBy(desc(diaryEntries.entryDate));
}
```

設計意図:
- `'use server'` を**付けない**: Server Components から普通の関数として呼ぶ
- 読み取り専用。書き込みは Server Action 側へ
- `USER_ID`: M4 で本物のセッションに置き換える前提の固定値

- [ ] **Step 4: lib/actions/diary.ts を作成（書き込み Server Action）**

```bash
mkdir -p lib/actions
```

```typescript
// lib/actions/diary.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { diaryEntries } from '@/lib/db/schema';
import { diaryEntrySchema } from '@/lib/validation/diary';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveDiaryEntry(formData: FormData): Promise<SaveResult> {
  const parsed = diaryEntrySchema.safeParse({
    entryDate: formData.get('entryDate'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '入力が不正です' };
  }

  try {
    await db
      .insert(diaryEntries)
      .values({
        userId: USER_ID,
        entryDate: parsed.data.entryDate,
        content: parsed.data.content,
      })
      .onConflictDoUpdate({
        target: [diaryEntries.userId, diaryEntries.entryDate],
        set: {
          content: parsed.data.content,
          updatedAt: new Date(),
        },
      });

    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/diary/${parsed.data.entryDate}`);

    return { ok: true };
  } catch (err) {
    console.error('Failed to save diary entry:', err);
    return { ok: false, error: '保存に失敗しました' };
  }
}
```

設計意図:
- `'use server'` ディレクティブ: ファイル全体を Server Actions として扱う
- `onConflictDoUpdate`: 新規 or 更新を1クエリで処理（upsert）。「1日1つ」制約と組み合わせて使う
- `revalidatePath`: 該当ページの Next.js キャッシュを破棄して再描画
- 戻り値は判別可能なタグ付きユニオン（`{ ok: true }` or `{ ok: false; error }`）

- [ ] **Step 5: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 6: コミット**

```bash
git add lib/validation lib/db/queries lib/actions package.json pnpm-lock.yaml
git commit -m "feat: add diary validation, read queries, and save server action"
```

---

## Task 5: shadcn/ui セットアップ

**目的:** Button と Textarea を shadcn/ui で導入する。

**Files:**
- Create: `components.json`
- Create: `components/ui/button.tsx`
- Create: `components/ui/textarea.tsx`
- Modify: `app/globals.css`（shadcn が CSS 変数を追記）
- Modify: `package.json`（shadcn が依存追加）

- [ ] **Step 1: shadcn init**

```bash
pnpm dlx shadcn@latest init
```

対話プロンプトが出る。以下のように答える:
- **Which style would you like to use?** → `New York` （または `Default`、好み）
- **Which color would you like to use as base color?** → `Neutral`
- **Do you want to use CSS variables for colors?** → `yes`

完了するとプロジェクト直下に `components.json` が生成され、`app/globals.css` に shadcn 用 CSS 変数が追記される。

> 💡 もしプロンプトの内容が異なる場合は、推奨デフォルトを選ぶ。`-d` (--defaults) フラグでデフォルト一括選択も可能: `pnpm dlx shadcn@latest init -d`

- [ ] **Step 2: Button と Textarea を追加**

```bash
pnpm dlx shadcn@latest add button textarea
```

Expected: `components/ui/button.tsx`, `components/ui/textarea.tsx` が生成される。lucide-react, @radix-ui/react-slot などが自動でインストールされる。

- [ ] **Step 3: 型チェックとビルド確認**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 4: コミット**

```bash
git add components.json components/ui app/globals.css package.json pnpm-lock.yaml
git commit -m "feat: add shadcn/ui with button and textarea"
```

---

## Task 6: 共通レイアウトにヘッダーナビ追加

**目的:** 全ページ共通のヘッダーで `/`（今日）と `/history`（履歴）に飛べるようにする。

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 現在の layout.tsx の内容を確認**

```bash
cat app/layout.tsx
```

create-next-app の生成内容（フォント設定、metadata 等）を保ったまま、`<body>` 内に `<header>` を追加する。

- [ ] **Step 2: app/layout.tsx を編集**

以下のパターンで編集する（既存の import やフォント変数名は保持し、`<body>` の中身だけ差し替える）:

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
// （既存のフォント import はそのまま保持）

import './globals.css';

export const metadata: Metadata = {
  title: '日記アプリ',
  description: '1日1つの日記を記録するアプリ',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <header className="border-b">
          <nav className="container mx-auto flex max-w-3xl items-center gap-6 p-4">
            <Link href="/" className="font-semibold">
              日記
            </Link>
            <Link
              href="/history"
              className="text-muted-foreground hover:text-foreground"
            >
              履歴
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
```

> ⚠️ 注意: 既存の `<body className={...}>` のフォント変数（例: `${geistSans.variable}` 等）が含まれていた場合は、それを保持したまま `antialiased` を追加する形にする。例:
>
> ```tsx
> <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
> ```

- [ ] **Step 3: 起動確認**

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開く。

Expected: ヘッダーに「日記」「履歴」のリンクが表示される（中身のページはまだ create-next-app デフォルト）。Ctrl+C で停止。

- [ ] **Step 4: コミット**

```bash
git add app/layout.tsx
git commit -m "feat: add header navigation to root layout"
```

---

## Task 7: DiaryEditor クライアントコンポーネント

**目的:** Server Action を `action` 属性で受け取り、入力を編集・保存できる Client Component を作る。

**Files:**
- Create: `components/diary/DiaryEditor.tsx`

- [ ] **Step 1: DiaryEditor.tsx を作成**

```bash
mkdir -p components/diary
```

```tsx
// components/diary/DiaryEditor.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveDiaryEntry } from '@/lib/actions/diary';

interface DiaryEditorProps {
  entryDate: string;
  initialContent?: string;
}

export function DiaryEditor({ entryDate, initialContent = '' }: DiaryEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  return (
    <form action={handleAction} className="space-y-4">
      <input type="hidden" name="entryDate" value={entryDate} />
      <Textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={15}
        placeholder="今日はどんな1日でしたか？"
        className="w-full"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || content.trim().length === 0}>
          {isPending ? '保存中…' : '保存'}
        </Button>
        {feedback && (
          <span
            className={
              feedback.kind === 'success'
                ? 'text-sm text-green-600 dark:text-green-400'
                : 'text-sm text-destructive'
            }
          >
            {feedback.message}
          </span>
        )}
      </div>
    </form>
  );
}
```

設計意図:
- `'use client'`: 状態（useState/useTransition）を持つので Client Component
- `useTransition`: Server Action の進行中フラグを管理（ボタン disabled とラベル切替）
- `action={handleAction}`: Server Action を直接フォームの action として渡す
- Controlled component（value/onChange）にして、保存後も内容を保持する

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add components/diary
git commit -m "feat: add DiaryEditor client component with server action submit"
```

---

## Task 8: 今日の日記編集ページ（`/`）

**目的:** トップページで「今日の日付」の日記を編集できるようにする。既存があれば読み込み、なければ空で表示。

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: app/page.tsx を作成（既存内容を完全置換）**

```tsx
// app/page.tsx
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry } from '@/lib/db/queries/diary';

function todayInTokyo(): string {
  const fmt = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export default async function HomePage() {
  const date = todayInTokyo();
  const existing = await getDiaryEntry(date);

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date} の日記</h1>
      <DiaryEditor entryDate={date} initialContent={existing?.content ?? ''} />
    </main>
  );
}
```

設計意図:
- `todayInTokyo`: サーバーのタイムゾーンに依存せず、ユーザーが日本にいる前提で日付を計算
- `async function`: Server Component なので await できる
- `existing?.content ?? ''`: 既存なし → 空で開始

- [ ] **Step 2: ブラウザで動作確認**

```bash
pnpm dev
```

http://localhost:3000 にアクセス。以下を確認:

- 「YYYY-MM-DD の日記」が今日の日付で表示される
- Textarea が空で表示される
- 何か入力して「保存」ボタンを押す → 「保存しました」が表示される
- ページをリロードする → 入力内容が復元されている（DB に保存された）
- 内容を変更して再度保存 → 上書きできる

エラーが出た場合の確認:
- ブラウザの開発者ツール（Console / Network）でエラー詳細
- ターミナル側で `Failed to save diary entry:` のログ
- `pnpm db:studio` で `diary_entries` テーブルにレコードが入っているか

Ctrl+C で停止。

- [ ] **Step 3: コミット**

```bash
git add app/page.tsx
git commit -m "feat: today's diary edit page on root path"
```

---

## Task 9: 履歴一覧ページ（`/history`）

**目的:** 過去の日記を新しい順に一覧表示し、各エントリーから詳細へ遷移できるようにする。

**Files:**
- Create: `app/history/page.tsx`

- [ ] **Step 1: app/history/page.tsx を作成**

```bash
mkdir -p app/history
```

```tsx
// app/history/page.tsx
import Link from 'next/link';
import { listDiaryEntries } from '@/lib/db/queries/diary';

export default async function HistoryPage() {
  const entries = await listDiaryEntries();

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">日記の履歴</h1>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">まだ日記がありません。</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/diary/${entry.entryDate}`}
                className="block rounded-md border p-4 transition hover:bg-accent"
              >
                <div className="font-medium">{entry.entryDate}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.content}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

設計意図:
- `whitespace-pre-wrap`: 改行を維持して表示（プレーンテキスト想定）
- `line-clamp-2`: 2行で省略
- 0件のときは empty state を表示

- [ ] **Step 2: ブラウザで動作確認**

```bash
pnpm dev
```

http://localhost:3000/history にアクセス。

Expected:
- Task 8 で書いた今日の日記が1件表示される
- 各エントリーをクリックすると `/diary/YYYY-MM-DD` に遷移する（404 になるが Task 10 で実装する）

Ctrl+C で停止。

- [ ] **Step 3: コミット**

```bash
git add app/history
git commit -m "feat: diary history list page"
```

---

## Task 10: 日付指定の詳細ページ（`/diary/[date]`） + 動作確認

**目的:** URL の日付で日記を表示・再編集できるようにする。最後に M1 全体のスモークテスト。

**Files:**
- Create: `app/diary/[date]/page.tsx`

- [ ] **Step 1: app/diary/[date]/page.tsx を作成**

```bash
mkdir -p app/diary/\[date\]
```

```tsx
// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry } from '@/lib/db/queries/diary';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const { date } = await params;
  if (!DATE_PATTERN.test(date)) {
    notFound();
  }
  const entry = await getDiaryEntry(date);
  if (!entry) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date}</h1>
      <DiaryEditor entryDate={date} initialContent={entry.content} />
    </main>
  );
}
```

設計意図:
- `params: Promise<...>`: Next.js 15+ では params が Promise（await が必要）
- `DATE_PATTERN.test`: 不正な URL（`/diary/abc` 等）は 404
- 存在しない日付も 404
- DiaryEditor を流用して詳細でも再編集可能に

- [ ] **Step 2: 1日1つ制約のスモークテスト**

```bash
pnpm dev
```

以下を順に実施し、すべて期待通りに動くことを確認:

1. **トップで保存**: http://localhost:3000 で今日の日記を書いて保存 → 「保存しました」
2. **トップで再保存**: 同じページで内容を変更して保存 → エラーにならず上書きできる（onConflictDoUpdate が効いている）
3. **履歴に表示**: http://localhost:3000/history で今日のエントリーが見える
4. **詳細から再編集**: 履歴のエントリーをクリック → `/diary/YYYY-MM-DD` で内容が表示される → 編集して保存できる
5. **存在しない日付**: http://localhost:3000/diary/2030-01-01 → 404
6. **不正な URL**: http://localhost:3000/diary/foo → 404
7. **DB 直接確認**: 別ターミナルで `pnpm db:studio` → `diary_entries` テーブルに今日のレコードが1件だけある（重複していない）

すべて OK なら M1 完了。

Ctrl+C で停止。

- [ ] **Step 3: コミット**

```bash
git add app/diary
git commit -m "feat: diary detail page with editing at /diary/[date]"
```

- [ ] **Step 4: GitHub に push**

```bash
git push
```

Expected: コミット5〜10件分が push される。

---

## 完了基準

すべての Task のチェックボックスが埋まり、以下が満たされていれば M1 完了：

1. http://localhost:3000 で今日の日記を書ける・保存できる・上書きできる
2. http://localhost:3000/history で過去の日記が新しい順に並ぶ
3. 履歴の項目をクリックすると `/diary/[date]` で表示・再編集できる
4. 同じ日付で複数レコードが作られない（onConflictDoUpdate で upsert）
5. 不正な URL（不正日付、存在しない日付）は 404 を返す
6. ヘッダーで `/` と `/history` を行き来できる
7. `pnpm exec tsc --noEmit` がエラーゼロ
8. すべてのコミットが GitHub に push されている

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `pnpm db:push` が `DATABASE_URL is not set` で失敗 | Task 1 の drizzle.config.ts 修正が正しく行われているか確認 |
| `pnpm db:push` で「Neon project is sleeping」 | 数秒待って再実行（Neon がコンピュート起動するまで時間がかかる） |
| 保存しても履歴に出ない | `revalidatePath('/history')` が actions に含まれているか確認 |
| 「保存しました」と出るのに DB にレコードが無い | `pnpm db:studio` で確認。`user_id` が `"me"` で入っているか |
| Server Action で `formData.get('entryDate')` が null | DiaryEditor の `<input type="hidden" name="entryDate">` が出力されているか HTML を確認 |
| Tailwind の `text-muted-foreground` などが効かない | shadcn init が `app/globals.css` に CSS 変数を入れているか確認 |
| Next.js が `params should be awaited` を警告 | `params: Promise<...>` 型と `await params` を使う |

---

## このプランで意図的に**やらないこと**

- 検索機能（M1.5 として後で追加検討）
- カレンダー UI（履歴は単純なリスト形式）
- Markdown のレンダリング（プレーンテキスト表示）
- 削除機能（M1 では作成・更新のみ。削除欲求が出たら後で）
- 認証（M4 へ）
- テスト自動化（M2 から書き始める方針）
- AI 機能（M2 へ）

これらを足したくなった場合は、まず「使ってみて本当に必要か」を確認してから判断する。
