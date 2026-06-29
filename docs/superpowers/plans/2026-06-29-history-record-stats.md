# 履歴ページ「積み重ね指標」帯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 履歴ページの月カレンダー上部に「現在連続 / 最長連続 / 通算記録」の3指標を添え、続けている実感を可視化する。

**Architecture:** 既存の `listEntryDates()`（全エントリ日付）を使い回し、追加DBクエリなしで3値を算出する。現在連続は既存 `computeStreak`、通算は配列長、最長連続のみ新規純粋関数 `computeLongestStreak` を `lib/diary/streak.ts` に追加。表示は新規サーバーコンポーネント `RecordStats`（カレンダー上の横帯）が担い、`app/history/page.tsx` の従来 `StreakBadge` ブロックを差し替える。

**Tech Stack:** Next.js 16 App Router（RSC）、TypeScript、Tailwind v4（和モダントークン）、Vitest、Biome、lucide-react。

設計spec: [`docs/superpowers/specs/2026-06-29-history-record-stats-design.md`](../specs/2026-06-29-history-record-stats-design.md)

## Global Constraints

各タスクの要件に暗黙で含まれる、プロジェクト全体の制約（spec からの転記）。

- **色はトークンのみ**：`text-foreground` / `text-primary` / `text-muted-foreground` / `border-border` 等。生hex・`rgb()/hsl()/oklch()` の色リテラル・任意色クラス・インラインstyleの色リテラル禁止。`npm run lint:design` で機械チェック。
- **アクセント予算**：若葉（`--primary`）は1〜2箇所＝「カレンダー記入日セル（既存）＋スタット帯の現在連続」のみ。最長・通算は墨（`text-foreground`）。朱（`--season`）は日曜セルのみ（現状維持）。スタット帯で朱は使わない。
- **深度は罫＋明度差**：`border-b` 等。**新規 drop-shadow 禁止**（focus ring 等の機能的影は可）。
- **11px未満禁止**：ラベルは最小でも `text-xs`（12px）相当。
- **見出しは明朝**：数字は `font-heading` + `tabular-nums`。
- **ダーク対応必須**：light/dark 両モードで成立（トークンで自動、目視確認）。
- **Biome**：TS は `quoteStyle: 'single'`、JSX 属性は `double`（`components/ui/**` 以外）。`useImportType` 等が出たら fix。
- **DBスキーマ変更なし・追加DBクエリなし**。
- **作業はブランチで**（main 直push 不可）。最終的に CI（lint / tsc / vitest / build）green → squash merge。

---

### Task 1: `computeLongestStreak` 純粋関数（最長連続）

全履歴の中で連続した日付の最長ランの長さを返す純粋関数。今日に依存しない。

**Files:**
- Modify: `lib/diary/streak.ts`（末尾に関数追加。既存 `pad2` / `subDays` / `computeStreak` は不変）
- Test: `lib/diary/streak.test.ts`（既存 `describe('computeStreak', ...)` の下に `describe('computeLongestStreak', ...)` を追記）

**Interfaces:**
- Consumes: 既存のファイル内ヘルパ `subDays(yyyymmdd: string, days: number): string`（隣接日判定に使う）。
- Produces: `export function computeLongestStreak(entryDates: readonly string[]): number` — Task 2 と `app/history/page.tsx` が利用。空配列は `0`、要素1つは `1`、未ソート・重複入力に頑健。

- [ ] **Step 1: 失敗するテストを書く**

`lib/diary/streak.test.ts` の先頭 import を、名前付きを揃えて以下に変更：

```ts
import { describe, expect, it } from 'vitest';
import { computeLongestStreak, computeStreak } from './streak';
```

ファイル末尾（既存 `describe('computeStreak', ...)` の閉じ括弧の後）に追記：

```ts
describe('computeLongestStreak', () => {
  it('空配列は 0', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('単一日は 1', () => {
    expect(computeLongestStreak(['2026-06-10'])).toBe(1);
  });

  it('全部連続ならその長さを返す', () => {
    expect(
      computeLongestStreak(['2026-06-08', '2026-06-09', '2026-06-10']),
    ).toBe(3);
  });

  it('複数の連続ランがあれば最長を返す', () => {
    expect(
      computeLongestStreak([
        '2026-06-01',
        '2026-06-02',
        '2026-06-05',
        '2026-06-06',
        '2026-06-07',
        '2026-06-10',
      ]),
    ).toBe(3);
  });

  it('月をまたぐ連続も数える', () => {
    expect(
      computeLongestStreak(['2026-05-31', '2026-06-01', '2026-06-02']),
    ).toBe(3);
  });

  it('年をまたぐ連続も数える', () => {
    expect(computeLongestStreak(['2025-12-31', '2026-01-01'])).toBe(2);
  });

  it('重複日があっても水増ししない', () => {
    expect(
      computeLongestStreak(['2026-06-09', '2026-06-09', '2026-06-10']),
    ).toBe(2);
  });

  it('未ソート入力でも正しい', () => {
    expect(
      computeLongestStreak(['2026-06-10', '2026-06-08', '2026-06-09']),
    ).toBe(3);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run lib/diary/streak.test.ts`
Expected: FAIL（`computeLongestStreak is not a function` 系。既存 `computeStreak` のテストは PASS のまま）

- [ ] **Step 3: 最小実装を書く**

`lib/diary/streak.ts` の末尾（`computeStreak` の後）に追記：

```ts
// 全履歴のうち、連続した日付（カレンダー上で隣り合う日）の最長ランの長さを返す。
// 現在連続と違い「今日」に依存しない。未ソート・重複入力でも正しく動く。
export function computeLongestStreak(entryDates: readonly string[]): number {
  if (entryDates.length === 0) return 0;

  // 重複除去 → 昇順ソート（'YYYY-MM-DD' の辞書順 = 日付順）
  const sorted = [...new Set(entryDates)].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    // 当日の前日 (= 当日 -1) が直前要素なら連続
    if (subDays(sorted[i], 1) === sorted[i - 1]) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npx vitest run lib/diary/streak.test.ts`
Expected: PASS（`computeLongestStreak` 8件 + 既存 `computeStreak` 全件）

- [ ] **Step 5: lint / 型を確認**

Run: `npm run lint && npx tsc --noEmit`
Expected: エラーなし（exit 0）

- [ ] **Step 6: コミット**

```bash
git add lib/diary/streak.ts lib/diary/streak.test.ts
git commit -m "feat(diary): 最長連続を求める computeLongestStreak を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `RecordStats` コンポーネント＋履歴ページへ配線

カレンダー上の「積み重ね指標」帯を新設し、履歴ページの従来 `StreakBadge` ブロックを差し替える。

**Files:**
- Create: `components/diary/RecordStats.tsx`
- Modify: `app/history/page.tsx`（import 差し替え＋3値算出＋表示差し替え。全文を下記に置換）

**Interfaces:**
- Consumes: `computeStreak(entryDates, today)` と `computeLongestStreak(entryDates)`（Task 1）、`listEntryDates()`（既存）。
- Produces: `export function RecordStats(props: { current: number; longest: number; total: number }): ReactElement | null` — `total <= 0` で `null`（帯ごと非表示）。

- [ ] **Step 1: `RecordStats` を作成**

`components/diary/RecordStats.tsx` を新規作成：

```tsx
import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

interface RecordStatsProps {
  current: number;
  longest: number;
  total: number;
}

// カレンダー上部の「積み重ね指標」帯。
// 現在連続のみ若葉(--primary)で「育っている今」を強調し、最長・通算は墨。
// 深度は下罫＋明度差のみ（影なし）。total<=0（新規ユーザー）では帯を出さない。
export function RecordStats({
  current,
  longest,
  total,
}: RecordStatsProps): ReactElement | null {
  if (total <= 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-border pb-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">連続記録</span>
        <span className="inline-flex items-baseline gap-1.5">
          {current > 0 && (
            <Flame
              className="size-4 self-center text-primary"
              aria-hidden="true"
            />
          )}
          <span
            className={`font-heading text-3xl leading-none tabular-nums ${
              current > 0 ? "text-primary" : "text-foreground"
            }`}
          >
            {current}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">最長（自己ベスト）</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-heading text-3xl leading-none tabular-nums text-foreground">
            {longest}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">通算記録</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-heading text-3xl leading-none tabular-nums text-foreground">
            {total}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 履歴ページを差し替え**

`app/history/page.tsx` を以下の全文に置換（`StreakBadge` import と条件ブロックを撤去し、`RecordStats` と3値算出に差し替え。カレンダーと空メッセージは不変）：

```tsx
// app/history/page.tsx

import { DiaryCalendar } from '@/components/diary/DiaryCalendar';
import { RecordStats } from '@/components/diary/RecordStats';
import {
  formatYearMonth,
  parseYearMonth,
  todayInTokyo,
} from '@/lib/calendar/month-grid';
import { listEntryDates } from '@/lib/db/queries/diary';
import { computeLongestStreak, computeStreak } from '@/lib/diary/streak';

interface PageProps {
  searchParams: Promise<{ ym?: string }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const { ym } = await searchParams;
  const today = todayInTokyo();
  const [yearStr, monthStr] = today.split('-');
  const currentYear = Number(yearStr);
  const currentMonth = Number(monthStr);

  // Parse ?ym=YYYY-MM, fall back to current month if missing/invalid
  const requested = ym ? parseYearMonth(ym) : null;
  const year = requested?.year ?? currentYear;
  const month = requested?.month ?? currentMonth;

  const dates = await listEntryDates();
  const writtenDates = new Set(dates);
  const current = computeStreak(dates, today);
  const longest = computeLongestStreak(dates);
  const total = dates.length;

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">日記の履歴</h1>
      <RecordStats current={current} longest={longest} total={total} />
      <DiaryCalendar
        year={year}
        month={month}
        today={today}
        writtenDates={writtenDates}
        currentYearMonth={formatYearMonth(currentYear, currentMonth)}
      />
      {dates.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          まだ日記がありません。トップから書いてみましょう。
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: デザイントークン / lint / 型を確認**

Run: `npm run lint:design && npm run lint && npx tsc --noEmit`
Expected: すべて exit 0（生color混入なし、Biome 指摘なし、型エラーなし）。`StreakBadge` の未使用 import が残っていれば Biome が指摘するので除去されていることを確認。

- [ ] **Step 4: ビルドとテスト全体を確認**

Run: `npm run build && npm run test`
Expected: build 成功、vitest 全件 PASS。

- [ ] **Step 5: 目視確認（任意だが推奨）**

`npm run dev` で `/history` を開き、(a) カレンダー上に3指標が出る、(b) 現在連続が若葉・最長/通算が墨、(c) 影が無く下罫＋明度差で区切られる、(d) ダークモードでも成立、(e) モバイル幅で折り返して崩れない、を確認。記録0の状態では帯が出ず空メッセージのみになることも確認（データがあれば連続を一度途切れさせ、現在連続が墨の「0」になることも確認）。

- [ ] **Step 6: コミット**

```bash
git add components/diary/RecordStats.tsx app/history/page.tsx
git commit -m "feat(history): カレンダー上に積み重ね指標（連続/最長/通算）の帯を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- データフロー（追加クエリなし・3値算出）→ Task 2 Step 2。✓
- `computeLongestStreak`（新規純粋関数＋頑健性＋空0）→ Task 1。✓
- テスト（空/単一/全連続/複数ラン/月またぎ/年またぎ/重複/未ソート）→ Task 1 Step 1。✓
- `RecordStats`（props・明朝tabular-nums・現在のみ若葉・影なし下罫・トークン・11px下限・ダーク）→ Task 2 Step 1 + Global Constraints。✓
- 空状態（total0で帯非表示／連続0は墨の0日）→ Task 2 Step 1（`total<=0` で null、`current>0` 判定で若葉/墨切替）。✓
- `StreakBadge` 部品は削除しない（`/dev/design` で残す）→ 本plan は `components/diary/StreakBadge.tsx` を触らない。✓
- アクセント予算 → Global Constraints + Task 2 の若葉切替。✓
- 触らない別件（`h1` の font-heading 無し）→ Task 2 Step 2 の全文置換でも `h1` は原文維持。✓

**2. Placeholder scan:** TBD/TODO/「適切に」等なし。全コード実体あり。✓

**3. Type consistency:** `computeLongestStreak(entryDates: readonly string[]): number` を Task 1 で定義し、Task 2（履歴ページ）・Self-Review で同名同シグネチャ使用。`RecordStats` props `{ current, longest, total }` は Task 2 内で定義・配線とも一致。✓
