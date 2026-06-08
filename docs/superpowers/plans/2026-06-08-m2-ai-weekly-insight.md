# M2: AI 週間サマリー + ワンポイントアドバイス 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 過去 7 件の日記から「最近のあなた」のサマリーとワンポイントアドバイスを Gemini で生成し、`/insights` ページに表示する。生成結果は DB にキャッシュし、再生成ボタンで明示的に更新できる。

**Architecture:** AI 処理を `lib/ai/` 配下に閉じ込め、Vercel AI SDK + `@ai-sdk/google` でプロバイダーを抽象化（将来 Claude/OpenAI への差し替えが容易）。`generateText` + `Output.object` + Zod スキーマで構造化出力を強制。生成結果は `weekly_insights` テーブルに upsert し、`/insights` ページは Server Component でキャッシュを読む。再生成は Server Action で実行。

**Tech Stack:** Vercel AI SDK v6 / `@ai-sdk/google` (Gemini 2.5 Flash) / Drizzle ORM upsert / Zod (Output.object) / Next.js 16 Server Component + Server Action / shadcn Button

**Source spec:** [`docs/superpowers/specs/2026-06-08-diary-app-design.md`](../specs/2026-06-08-diary-app-design.md) §5「M2」

**前提:** M1 完了済み（日記 CRUD が動作）。Neon と GitHub の接続も準備済み。

---

## このプランで作る/触るファイル

```
diary-app/
├── lib/
│   ├── ai/                                   # NEW: AI処理層
│   │   ├── client.ts                          # Gemini provider 初期化
│   │   ├── schemas/
│   │   │   └── weekly-insight.ts              # AI出力のZodスキーマ
│   │   └── weekly-insight.ts                  # generation関数
│   ├── db/
│   │   ├── schema.ts                          # MODIFY: weeklyInsights追加
│   │   └── queries/
│   │       └── insight.ts                     # NEW: 読みクエリ
│   └── actions/
│       └── insight.ts                         # NEW: 再生成 Server Action
├── components/
│   └── insights/
│       └── RegenerateButton.tsx               # NEW: クライアントボタン
├── app/
│   ├── layout.tsx                             # MODIFY: nav に /insights 追加
│   └── insights/
│       └── page.tsx                           # NEW: 分析表示ページ
├── .env.example                                # MODIFY: GOOGLE_GENERATIVE_AI_API_KEY追記
└── .env.local                                  # MODIFY: 実APIキーを追加（ユーザー作業）
```

### 各ファイルの責務

| ファイル | 責務 |
|---|---|
| `lib/ai/client.ts` | Gemini provider と「現在使うモデル」の定数を定義 |
| `lib/ai/schemas/weekly-insight.ts` | AI 出力の Zod スキーマ（summary + advice） |
| `lib/ai/weekly-insight.ts` | 日記 7 件を受け取り、Gemini で構造化出力を生成 |
| `lib/db/queries/insight.ts` | 直近の cached insight を読む |
| `lib/actions/insight.ts` | 「再生成」Server Action（日記取得 → AI 生成 → DB upsert → revalidate） |
| `components/insights/RegenerateButton.tsx` | フォームで Server Action を呼ぶクライアントボタン（useTransition でローディング） |
| `app/insights/page.tsx` | Server Component。キャッシュを読んで表示、または empty state |

依存方向: `app/insights/page.tsx` → `lib/db/queries/insight.ts` & `components/insights/RegenerateButton.tsx`、`RegenerateButton` → `lib/actions/insight.ts` → `lib/ai/*` & `lib/db/*`

### 設計判断

- **「1週間分」の定義** = 最新 7 件の日記（カレンダーの月〜日ではなく、件数ベース）。理由: 「7 件溜まったら」というユーザー要求に直接対応、日記を毎日書くとは限らない前提
- **period_start / period_end** = 使った 7 件のうち最古/最新の entry_date を入れる
- **UNIQUE(user_id, period_start)** は活かす: 同じ 7 件で再生成すれば upsert で1行を更新、新しい日記が入って 7 件の構成が変われば新しい行が作られる（履歴として残る）
- **自動生成しない**: ページを開くだけでは API を叩かない。ユーザーがボタンを押した時のみ生成。理由: 無料枠の消費を予測可能に保つ、ユーザーが期待を持って結果を見られる
- **モデル** = `gemini-2.5-flash`（無料枠あり、日本語の感情理解が十分）

---

## Task 1: weekly_insights スキーマ追加 + Neon に push

**目的:** DB に分析結果を保存できる場所を作る。

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: lib/db/schema.ts に weeklyInsights テーブルを追加**

既存の `lib/db/schema.ts` の末尾（DiaryEntry 型 export の後）に追記:

```typescript
import { jsonb } from 'drizzle-orm/pg-core';
// ↑ pg-core からの既存 import に jsonb を追加する（既存の import 行に足す形）

export const weeklyInsights = pgTable(
  'weekly_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    summary: text('summary').notNull(),
    advice: text('advice').notNull(),
    sourceEntryIds: jsonb('source_entry_ids').notNull().$type<string[]>(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPeriodUnique: uniqueIndex('weekly_insights_user_period_unique').on(
      table.userId,
      table.periodStart,
    ),
  }),
);

export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type NewWeeklyInsight = typeof weeklyInsights.$inferInsert;
```

設計意図:
- `sourceEntryIds`: 元になった日記 ID の配列。`jsonb` + TypeScript の型ヒント `$type<string[]>()` で型安全
- `model`: 「どのモデルで生成したか」を記録（後で読み返す時の信頼性のため）
- `uniqueIndex` on `(user_id, period_start)`: 同じ期間の再生成は upsert で1行更新になる
- `createdAt` のみで `updatedAt` は持たない: 「いつ生成されたか」が分かれば十分

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Neon に push**

```bash
pnpm db:push
```

Expected: `weekly_insights` テーブル作成の出力。`yes | pnpm db:push` で対話プロンプトを y で自動応答してもOK（追加のみで破壊的変更なし）。

- [ ] **Step 4: テーブル存在確認**

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await p.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='weekly_insights' ORDER BY ordinal_position;\");
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
"
```

Expected: 8カラム（id/user_id/period_start/period_end/summary/advice/source_entry_ids/model/created_at）が表示される。

- [ ] **Step 5: コミット**

```bash
git add lib/db/schema.ts
git commit -m "feat: define weekly_insights schema for AI analysis cache"
```

---

## Task 2: Gemini API キー取得 + AI SDK インストール

**目的:** AI 機能の前提となるキーと SDK を準備する。

**Files:**
- Modify: `.env.example`
- Modify: `.env.local`（ユーザー作業）
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: ユーザーが Gemini API キーを取得（マニュアル作業）**

> ⚠️ このステップは **tomitad さんがブラウザで実行する作業**です。実装者（サブエージェント）は実行できません。コントローラ（controller）はこのタスクをユーザーへハンドオフしてください。

1. https://aistudio.google.com/app/apikey にアクセス（Google アカウントでログイン）
2. 「Create API key」ボタンをクリック
3. 「Create API key in new project」を選択（または既存プロジェクトを選択）
4. 生成された API キーをコピー
5. キーを下記の Step 2 で `.env.local` に貼り付け

> 💡 無料枠: gemini-2.5-flash は 2026 年時点で free tier の rate limit 内で利用可能。クレジットカード登録は不要。

- [ ] **Step 2: .env.example に変数を追記**

`.env.example` の末尾に以下を追記:

```
# Google Gemini API - https://aistudio.google.com/app/apikey から取得
GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
```

- [ ] **Step 3: .env.local に実キーを追加**

ユーザーが Step 1 で取得した実キーで以下を実行（コントローラがユーザーから受け取って書き込む形）:

```bash
echo '' >> .env.local
echo 'GOOGLE_GENERATIVE_AI_API_KEY="<実キー>"' >> .env.local
```

`<実キー>` を実際の値に置換。`.env.local` は `.gitignore` 対象なので安全。

- [ ] **Step 4: AI SDK をインストール**

```bash
pnpm add ai @ai-sdk/google
```

Expected: `package.json` の `dependencies` に `ai`（v6 系）と `@ai-sdk/google` が追加される。

- [ ] **Step 5: API キーが読めるかテスト**

```bash
pnpm exec tsx --env-file=.env.local -e "
console.log('Key set:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
console.log('Key length:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length ?? 0);
"
```

Expected: `Key set: true`, `Key length: 39` 前後（Gemini キーは通常 39 文字）。

- [ ] **Step 6: コミット**

```bash
git add .env.example package.json pnpm-lock.yaml
git commit -m "chore: install ai sdk + @ai-sdk/google and document gemini env var"
```

---

## Task 3: AI サービス層（client + schema + generator）

**目的:** Gemini 呼び出しを `lib/ai/` に閉じ込め、構造化出力で `summary` と `advice` を得る関数を実装する。

**Files:**
- Create: `lib/ai/client.ts`
- Create: `lib/ai/schemas/weekly-insight.ts`
- Create: `lib/ai/weekly-insight.ts`

- [ ] **Step 1: lib/ai/client.ts を作成**

```bash
mkdir -p lib/ai/schemas
```

```typescript
// lib/ai/client.ts
import { google } from '@ai-sdk/google';

export const defaultModel = google('gemini-2.5-flash');
export const defaultModelId = 'gemini-2.5-flash';
```

設計意図:
- `google` プロバイダーは `GOOGLE_GENERATIVE_AI_API_KEY` 環境変数を自動的に読む
- モデル ID を別 export しているのは、DB に `model` カラムを保存する時に使うため
- 将来 Claude に切り替えるなら、ここを `anthropic('claude-...')` に変えるだけ

- [ ] **Step 2: lib/ai/schemas/weekly-insight.ts を作成**

```typescript
// lib/ai/schemas/weekly-insight.ts
import { z } from 'zod';

export const weeklyInsightOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      '過去7日分の日記から読み取れる、最近のこの人の考えや気持ちの動向。' +
        '3〜5文の自然な日本語で、「最近のあなた」を主語に語りかける文体で。',
    ),
  advice: z
    .string()
    .describe(
      '今この人に伝えたい、温かいワンポイントアドバイス。' +
        '1〜2文で、押し付けがましくない柔らかい口調で。',
    ),
});

export type WeeklyInsightOutput = z.infer<typeof weeklyInsightOutputSchema>;
```

設計意図:
- `.describe()` はプロンプトの一部として AI に渡される。スキーマ定義と意図説明が一箇所で完結する
- `z.infer` で TypeScript 型を導出 → 呼び出し側で型安全に扱える

- [ ] **Step 3: lib/ai/weekly-insight.ts を作成**

```typescript
// lib/ai/weekly-insight.ts
import { generateText, Output } from 'ai';
import { defaultModel, defaultModelId } from '@/lib/ai/client';
import {
  weeklyInsightOutputSchema,
  type WeeklyInsightOutput,
} from '@/lib/ai/schemas/weekly-insight';
import type { DiaryEntry } from '@/lib/db/schema';

export interface GenerateWeeklyInsightResult {
  output: WeeklyInsightOutput;
  model: string;
}

export async function generateWeeklyInsight(
  entries: DiaryEntry[],
): Promise<GenerateWeeklyInsightResult> {
  if (entries.length < 7) {
    throw new Error(`Need at least 7 entries, got ${entries.length}`);
  }

  // 最新7件を使う（呼び出し側でもソート済み前提だが念のため）
  const recent = [...entries]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .slice(0, 7);

  const entryList = recent
    .slice()
    .reverse() // 古い→新しい順でプロンプトに渡す
    .map((e) => `■ ${e.entryDate}\n${e.content}`)
    .join('\n\n');

  const prompt = `あなたは思いやりのある親友です。
以下は同じ人物の最近7日分の日記です。古いものから新しいものへ並んでいます。

${entryList}

これらの日記から、最近のこの人の考えや気持ちの動向をまとめ、
そっと添えるワンポイントアドバイスを生成してください。

注意:
- 日付や具体的な出来事は一般化して書いてもよい（プライバシー配慮）
- 評価や説教はせず、共感ベースで
- 「最近のあなたは〜」のように相手に語りかける文体で`;

  const { output } = await generateText({
    model: defaultModel,
    prompt,
    output: Output.object({
      schema: weeklyInsightOutputSchema,
    }),
  });

  return {
    output,
    model: defaultModelId,
  };
}
```

設計意図:
- 入力 `entries` の件数チェックでガード（7件未満は明示的にエラー）
- 日記は古い→新しい順でプロンプトに並べる（時系列の流れを掴みやすくするため）
- プロンプトはやさしいトーン指定（評価/説教を避ける、共感ベース）
- 結果に `model` を含めて返す → DB 保存時に使う

- [ ] **Step 4: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: AI 呼び出しのスモークテスト（手動）**

実際に Gemini を1回叩いて動くか確認:

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { generateWeeklyInsight } = await import('./lib/ai/weekly-insight.ts');
  const fakeEntries = Array.from({ length: 7 }, (_, i) => ({
    id: 'fake-' + i,
    userId: 'me',
    entryDate: '2026-06-0' + (i + 1),
    content: '今日は' + ['楽しかった', 'つかれた', 'のんびり', '少し焦った', '前進した', '気分が良い', '考えごとが多い'][i] + '一日だった。',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const result = await generateWeeklyInsight(fakeEntries);
  console.log('Model:', result.model);
  console.log('Summary:', result.output.summary);
  console.log('Advice:', result.output.advice);
})();
"
```

Expected: 
- `Model: gemini-2.5-flash`
- `Summary:` 数文の日本語
- `Advice:` 1〜2文のアドバイス

エラーが出た場合のチェック:
- `GOOGLE_GENERATIVE_AI_API_KEY` が `.env.local` に正しく入っているか
- ネットワーク接続
- 無料枠の rate limit に当たっていないか

- [ ] **Step 6: コミット**

```bash
git add lib/ai
git commit -m "feat: add ai service layer for weekly insight generation"
```

---

## Task 4: insight 読みクエリ + 再生成 Server Action

**目的:** キャッシュを読む関数と、再生成→保存する Server Action を実装する。

**Files:**
- Create: `lib/db/queries/insight.ts`
- Create: `lib/actions/insight.ts`

- [ ] **Step 1: lib/db/queries/insight.ts を作成**

```typescript
// lib/db/queries/insight.ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { weeklyInsights, type WeeklyInsight } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getLatestInsight(): Promise<WeeklyInsight | undefined> {
  const rows = await db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, USER_ID))
    .orderBy(desc(weeklyInsights.periodEnd), desc(weeklyInsights.createdAt))
    .limit(1);
  return rows[0];
}
```

設計意図:
- `periodEnd DESC, createdAt DESC` で並べる: 同じ期間の中で「最後に生成したもの」が先に来る（理論上 unique index で1行のはずだが念のため）
- `'use server'` なし: Server Components から普通に呼べる関数

- [ ] **Step 2: lib/actions/insight.ts を作成**

```typescript
// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { weeklyInsights } from '@/lib/db/schema';
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { generateWeeklyInsight } from '@/lib/ai/weekly-insight';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';
const MIN_ENTRIES = 7;

export type RegenerateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function regenerateInsight(): Promise<RegenerateResult> {
  try {
    const allEntries = await listDiaryEntries();
    if (allEntries.length < MIN_ENTRIES) {
      return {
        ok: false,
        error: `日記が${MIN_ENTRIES}件以上必要です（現在${allEntries.length}件）`,
      };
    }

    // listDiaryEntries は periodEnd の DESC なので最初の7件が「最新7件」
    const recent = allEntries.slice(0, MIN_ENTRIES);
    const { output, model } = await generateWeeklyInsight(recent);

    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    await db
      .insert(weeklyInsights)
      .values({
        userId: USER_ID,
        periodStart,
        periodEnd,
        summary: output.summary,
        advice: output.advice,
        sourceEntryIds,
        model,
      })
      .onConflictDoUpdate({
        target: [weeklyInsights.userId, weeklyInsights.periodStart],
        set: {
          periodEnd,
          summary: output.summary,
          advice: output.advice,
          sourceEntryIds,
          model,
          createdAt: new Date(),
        },
      });

    revalidatePath('/insights');
    return { ok: true };
  } catch (err) {
    console.error('Failed to regenerate insight:', err);
    return {
      ok: false,
      error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
```

設計意図:
- `MIN_ENTRIES` を定数化: 「7件」のマジックナンバーを1箇所に集約
- 件数不足は早期 return（エラーじゃなくユーザー向けメッセージ）
- `onConflictDoUpdate` で upsert: 同じ `periodStart` の再生成は1行を更新、異なる `periodStart`（=新しい日記が入った後）なら新しい行を作る
- `createdAt: new Date()` を `set` でも更新: 「最後に生成した時刻」として上書き
- AI 失敗時のメッセージは UI 用に丸める

- [ ] **Step 3: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: コミット**

```bash
git add lib/db/queries/insight.ts lib/actions/insight.ts
git commit -m "feat: add insight query and regenerate server action"
```

---

## Task 5: RegenerateButton クライアントコンポーネント

**目的:** 「再生成」ボタンと、生成中の状態表示。

**Files:**
- Create: `components/insights/RegenerateButton.tsx`

- [ ] **Step 1: components/insights/RegenerateButton.tsx を作成**

```bash
mkdir -p components/insights
```

```tsx
// components/insights/RegenerateButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { regenerateInsight } from '@/lib/actions/insight';

interface RegenerateButtonProps {
  label?: string;
  pendingLabel?: string;
}

export function RegenerateButton({
  label = '再生成する',
  pendingLabel = '分析中…',
}: RegenerateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await regenerateInsight();
      if (!result.ok) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
```

設計意図:
- 同じボタンを「初回生成」「再生成」両方に使えるよう `label` を props 化
- `useTransition` で生成中はボタン disabled
- エラーは inline 表示（モーダル等は YAGNI）
- 成功時は `revalidatePath('/insights')` がサーバー側で呼ばれて自動的にページが再描画される（追加処理不要）

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: コミット**

```bash
git add components/insights
git commit -m "feat: add RegenerateButton client component"
```

---

## Task 6: /insights ページ

**目的:** AI 分析を表示するページ。キャッシュがあれば表示、なければ生成ボタン、件数不足なら empty state。

**Files:**
- Create: `app/insights/page.tsx`

- [ ] **Step 1: app/insights/page.tsx を作成**

```bash
mkdir -p app/insights
```

```tsx
// app/insights/page.tsx
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { getLatestInsight } from '@/lib/db/queries/insight';
import { RegenerateButton } from '@/components/insights/RegenerateButton';

const MIN_ENTRIES = 7;

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export default async function InsightsPage() {
  const [entries, insight] = await Promise.all([
    listDiaryEntries(),
    getLatestInsight(),
  ]);

  // 件数不足 → empty state
  if (entries.length < MIN_ENTRIES) {
    const remaining = MIN_ENTRIES - entries.length;
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">あなたの傾向</h1>
        <p className="text-muted-foreground">
          AI 分析を見るには日記が {MIN_ENTRIES} 件必要です。あと {remaining}{' '}
          件書いてみましょう。
        </p>
      </main>
    );
  }

  // 件数は足りているが、まだ生成していない → 初回生成ボタン
  if (!insight) {
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">あなたの傾向</h1>
        <p className="mb-4 text-muted-foreground">
          日記が {entries.length}{' '}
          件溜まりました。AI に最近の傾向を分析させてみましょう。
        </p>
        <RegenerateButton label="AI に分析させる" pendingLabel="分析中…" />
      </main>
    );
  }

  // キャッシュあり → 表示 + 再生成ボタン
  return (
    <main className="container mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">あなたの傾向</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {insight.periodStart}{' '}〜 {insight.periodEnd} の日記{' '}
          {Array.isArray(insight.sourceEntryIds) ? insight.sourceEntryIds.length : 0}{' '}
          件から · {formatDateTime(insight.createdAt)} に生成
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">最近のあなたの動向</h2>
        <p className="whitespace-pre-wrap leading-relaxed">{insight.summary}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">ワンポイントアドバイス</h2>
        <p className="whitespace-pre-wrap leading-relaxed">{insight.advice}</p>
      </section>

      <footer className="border-t pt-4">
        <RegenerateButton label="再生成する" pendingLabel="分析中…" />
      </footer>
    </main>
  );
}
```

設計意図:
- `Promise.all` で entries と insight を並列取得（レイテンシ削減）
- 3 状態（件数不足 / 件数OKだが未生成 / キャッシュあり）を明確に分岐
- メタ情報（期間 / 件数 / 生成日時）を sub-heading で表示
- `whitespace-pre-wrap`: AI が改行を含む文章を返した時にレイアウトが崩れないように

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: コミット**

```bash
git add app/insights
git commit -m "feat: add insights page with empty/initial/cached states"
```

---

## Task 7: ナビゲーションに `/insights` リンク追加 + E2E スモーク + push

**目的:** ヘッダーから /insights に飛べるようにする。最後に全機能の E2E 確認と GitHub push。

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: app/layout.tsx のナビに /insights リンクを追加**

`app/layout.tsx` の `<nav>` 内に「履歴」リンクの後に「分析」リンクを追加。具体的には:

```tsx
<Link href="/history" className="text-muted-foreground hover:text-foreground">
  履歴
</Link>
<Link href="/insights" className="text-muted-foreground hover:text-foreground">
  分析
</Link>
```

の形にする（既存「履歴」の直後に新規追加）。他の部分は変更しない。

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: E2E スモークテスト用にダミー日記を用意**

現状 DB に日記が 0 件なら、まずテスト用に 7 件投入する:

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const sample = [
    '新しいプロジェクトの構想を考えていた。何を作るかワクワクする。',
    '朝から会議が続いた。気分の切り替えに散歩に出た。',
    '本を読み進めた。集中できる夜は気持ちがいい。',
    '人と話して刺激を受けた。学びが多かった。',
    '少し疲れが出てきた。早めに寝ようと思う。',
    '気分転換にカフェで作業した。捗った。',
    '一週間を振り返って、進めたいことを整理した。',
  ];
  for (let i = 0; i < sample.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (sample.length - 1 - i));
    const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    await p.query(
      \`INSERT INTO diary_entries (user_id, entry_date, content) VALUES (\$1, \$2, \$3)
       ON CONFLICT (user_id, entry_date) DO UPDATE SET content = EXCLUDED.content, updated_at = now()\`,
      ['me', date, sample[i]]
    );
  }
  console.log('Inserted 7 sample entries');
  await p.end();
})();
"
```

> もし tomitad さんが既に実使用で7件以上書いている場合はこのステップをスキップしてOK。

- [ ] **Step 4: 開発サーバー起動 + ページ確認**

```bash
( pnpm dev > /tmp/diary-app-dev.log 2>&1 & )
sleep 8
grep -E "Ready in|started server on" /tmp/diary-app-dev.log
```

確認 1: ヘッダーに「分析」リンクが追加されているか

```bash
curl -s http://localhost:3000 | grep -oE '<a [^>]*href="/insights"[^>]*>[^<]+</a>'
```

Expected: `<a class="..." href="/insights">分析</a>` 形式の文字列が出る。

確認 2: /insights ページが「件数OKだが未生成」状態を返すか（事前にダミー7件を入れた場合）

```bash
curl -s http://localhost:3000/insights | grep -oE '(AI に分析させる|AI 分析を見るには|最近のあなたの動向)'
```

Expected: 「AI に分析させる」が出る（7件あって、まだ生成していない状態）。

- [ ] **Step 5: AI 生成のロジック確認（generateWeeklyInsight 単体）**

Server Action は `revalidatePath` を含むので Next.js 外（tsx 直実行）からは呼べない。代わりに、内部で使う `generateWeeklyInsight` 関数を単体で実行し、AI 部分が動くことだけ確認する（Task 3 Step 5 と同じ要領で、実際の DB エントリーを使う）。

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { listDiaryEntries } = await import('./lib/db/queries/diary.ts');
  const { generateWeeklyInsight } = await import('./lib/ai/weekly-insight.ts');
  const entries = await listDiaryEntries();
  if (entries.length < 7) { console.log('Skipping: need 7 entries, got', entries.length); process.exit(0); }
  const recent = entries.slice(0, 7);
  const result = await generateWeeklyInsight(recent);
  console.log('Model:', result.model);
  console.log('Summary len:', result.output.summary.length);
  console.log('Advice len:', result.output.advice.length);
})();
"
```

Expected: `Model: gemini-2.5-flash` と、summary/advice の文字数が0より大きい。

- [ ] **Step 6: ダミーの insight 行を DB に直接 insert して、ページがキャッシュを表示するか確認**

`/insights` ページの「キャッシュあり」状態（再生成ボタン + summary + advice）を表示できるかを、AI を再度呼ばずに確認する。

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const rows = await p.query(\"SELECT id, entry_date FROM diary_entries WHERE user_id = 'me' ORDER BY entry_date DESC LIMIT 7\");
  if (rows.rows.length < 7) { console.log('Skipping: need 7 entries'); process.exit(0); }
  const dates = rows.rows.map(r => r.entry_date).sort();
  const ids = rows.rows.map(r => r.id);
  await p.query(
    \`INSERT INTO weekly_insights (user_id, period_start, period_end, summary, advice, source_entry_ids, model)
     VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)
     ON CONFLICT (user_id, period_start) DO UPDATE
     SET period_end = EXCLUDED.period_end, summary = EXCLUDED.summary, advice = EXCLUDED.advice,
         source_entry_ids = EXCLUDED.source_entry_ids, model = EXCLUDED.model, created_at = now()\`,
    ['me', dates[0], dates[dates.length - 1], 'テスト用のサマリー文です。', 'テスト用のアドバイスです。', JSON.stringify(ids), 'gemini-2.5-flash']
  );
  console.log('Inserted test insight');
  await p.end();
})();
"
```

その後、ページがキャッシュを表示しているか確認:

```bash
curl -s http://localhost:3000/insights | grep -oE '(最近のあなたの動向|ワンポイントアドバイス|再生成する|テスト用のサマリー文)'
```

Expected: 4つすべてが出る（キャッシュ表示モードに移行 + ダミー summary が表示されている）。

> 💡 これで「Server Action 経由で AI を呼んで DB に保存する流れ」の DB→UI 経路が動くことは確認できる。実際の「ボタンクリック → AI 呼び出し → 表示更新」の通しテストはブラウザでの手動確認となる（実機検証）。M3 以降で Playwright を入れたら自動化できる。

- [ ] **Step 7: dev サーバー停止**

```bash
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2
```

- [ ] **Step 8: ナビ変更をコミット**

```bash
git add app/layout.tsx
git commit -m "feat: add /insights link to header navigation"
```

- [ ] **Step 9: GitHub に push**

```bash
git push
```

Expected: M2 の 7 コミットが origin/main に反映される。

- [ ] **Step 10: (任意) テストデータの掃除**

Step 3 で投入したサンプル7件と、生成された insight をクリーンアップする場合:

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  await p.query(\"DELETE FROM weekly_insights WHERE user_id = 'me'\");
  await p.query(\"DELETE FROM diary_entries WHERE user_id = 'me'\");
  console.log('Cleaned up test data');
  await p.end();
})();
"
```

> tomitad さんが実使用するつもりなら、このステップはスキップ。サンプル7件を起点に自分の日記を追記していけば良い。

---

## 完了基準

1. `/insights` で 3 状態（件数不足 / 未生成 / キャッシュあり）が正しく表示される
2. 「AI に分析させる」or「再生成する」ボタンで Gemini が呼ばれ、結果が DB に保存される
3. 保存された insight は `gemini-2.5-flash` モデルで生成されており、summary と advice が空でない
4. ヘッダーから `/insights` にナビゲートできる
5. `pnpm exec tsc --noEmit` がエラーゼロ
6. すべてのコミットが GitHub に push されている

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY is not set` | `.env.local` にキーが書かれているか確認。`pnpm dev` を再起動 |
| Gemini が `429 Too Many Requests` | 無料枠の rate limit。1分〜数分待って再試行 |
| 「分析の生成に失敗しました」が出続ける | ターミナルの dev サーバーログで詳細スタックトレースを確認 |
| insight の summary が英語で返ってくる | プロンプトに「日本語で」を明示的に追加（現状は文脈で日本語と推測させているが、念のため）|
| ボタンを押しても画面が更新されない | `revalidatePath('/insights')` が action 内にあるか確認 |
| キャッシュ表示が古いまま | ブラウザのハードリロード（Cmd+Shift+R）または `revalidatePath` の path が一致しているか確認 |

---

## このプランで意図的に**やらないこと**

- **insight の履歴一覧表示** (M3 か M3.5 で検討)
- **モデル切替 UI** (現状は `lib/ai/client.ts` の定数を書き換える運用)
- **ストリーミング表示** (`generateText` で十分。`streamText` は YAGNI)
- **エラー詳細の表示** (内部スタックトレースは出さない、ユーザー向けメッセージのみ)
- **MBTI スコアリング** (M3 でやる)
- **過去 N 件以上の期間指定** (常に最新7件)

これらが本当に必要になったら別途プランを書き起こす。
