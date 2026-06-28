# デスクトップ「文机」＋書く喜び 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 書く画面（`/` と `/diary/[date]`）をデスクトップ「文机型」レイアウト（右レール）にし、書く喜び（書き出しプロンプト・ストリーク可視化・保存のお祝い・季節のたより）を加える。

**Architecture:** 既存の中央1カラム（`max-w-3xl`）を `DeskLayout`（`lg:` で `[本文 1fr | レール 220px]`、狭幅は縦積み）に置換。レールは `WritingRail`＝`StreakPanel`（連続日数＋当月点列）＋`SeasonNote`（二十四節気/和風月名）。本文上に `TodayPrompt`（AI生成、日次キャッシュ＋季節バンク退避）。保存成功時に `SaveResult` の更新後ストリークでお祝い演出。**DBスキーマ変更なし。**

**Tech Stack:** Next.js 16 (App Router, RSC, Server Actions), React 19, Tailwind v4（和モダン・トークン）, Vercel AI SDK (`ai` の `generateText` + `@ai-sdk/google` `gemini-2.5-flash`), vitest（`lib/**/*.test.ts`・environment node）, Biome。

## Global Constraints

設計憲法（`AGENTS.md` / `docs/superpowers/specs/2026-06-26-design-system-design.md`）。**全タスクに暗黙で適用**。

- 色は必ずトークン（`bg-primary` `text-foreground` `text-season` 等 / `var(--…)`）。**生hex・`rgb()/hsl()/oklch()`・任意色クラス・インラインstyleの色リテラル禁止**。`npm run lint:design` で機械チェック。
- 見出しは `font-heading`（明朝 Shippori Mincho B1）、本文・UIは既定。**font-size 11px 未満禁止**。数字は `tabular-nums`。
- アクセント予算：**若葉（`--primary`）は1画面1〜2箇所**＝(a) 連続日数の数字、(b) 保存ボタン。**朱（`--season`）は日曜・季節の差し色のみ**＝日曜セル/点・季節節気名。プロンプト枠・お祝いの印に朱は使わない。
- 深度は**影でなく罫＋明度差**（background→card→muted→popover）。**新規 drop-shadow 禁止**（focus ring 等の機能的影は可）。
- **ダーク両対応必須**（両モードで成立させる）。`prefers-color-scheme`/`data-mode` で自動。
- **DBスキーマ変更なし**。`requireSession()` を全 Server Action / クエリ冒頭で呼ぶ（既存）。単一ユーザー前提。
- Next.js 16 の新しい API（キャッシュ等）を使う前に `node_modules/next/dist/docs/` の該当ガイドを読む。
- **テスト方針**：vitest は `lib/**/*.test.ts`・environment node・**`@/` エイリアス未解決**。よって**相対 import の leaf 純関数のみ** vitest 対象（`season.ts`/`seasonal-prompts.ts`）。`@/` を import する AI/Action/コンポーネントは **tsc・lint:design・build・手動**で担保（テスト基盤の新規導入はしない＝YAGNI）。
- **PRベース運用**：main 直push不可。PR ごとにブランチ→`gh pr checks --watch` で CI green→`gh pr merge --squash --delete-branch`。コミット文末に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

## File Structure（このプランで触る範囲）

新規:
- `components/diary/DeskLayout.tsx` — 文机グリッド（本文セル＋任意の右レール）。レイアウト責務のみ。
- `components/diary/WritingRail.tsx` — 右レールの中身を束ねる。
- `components/diary/StreakPanel.tsx` — 連続日数＋「今月の歩み」点列。
- `components/diary/SeasonNote.tsx` — 季節のたより（PR②）。
- `components/diary/TodayPrompt.tsx` — 本文上の「今日の問い」＋`問いを変える`（PR③, client）。
- `lib/diary/season.ts` ＋ `lib/diary/season.test.ts` — 日付→和風月名/二十四節気/一言（PR②, 純関数）。
- `lib/diary/seasonal-prompts.ts` ＋ `lib/diary/seasonal-prompts.test.ts` — 問いバンク＋決定的選択（PR③, 純関数）。
- `lib/ai/daily-prompt.ts` — AI「今日の問い」生成＋日次キャッシュ＋退避（PR③）。
- `lib/actions/prompt.ts` — `regenerateTodayPrompt`（PR③, Server Action）。

変更:
- `app/page.tsx` / `app/diary/[date]/page.tsx` — `DeskLayout` へ置換、レール用データ取得（PR①）、本文上に `TodayPrompt`（PR③・home のみ）。
- `app/history/page.tsx` / `app/insights/page.tsx` — `max-w-3xl`→`max-w-5xl`（PR①）。
- `lib/actions/diary.ts` — `SaveResult` 拡張（PR④）。
- `components/diary/DiaryEditor.tsx` — 保存成功時のお祝い演出（PR④）。

---

# PR① 文机レイアウト土台＋ストリーク先行

> 出荷で「ワイドな文机になり、書きながら連続記録が手元に見える」状態。新しい AI/季節/演出はまだ無い。ブランチ例 `feat/desk-layout`。

### Task 1: `DeskLayout`（文机グリッド）

**Files:**
- Create: `components/diary/DeskLayout.tsx`

**Interfaces:**
- Produces: `DeskLayout({ children, rail }: { children: ReactNode; rail?: ReactNode })` — `rail` 省略時は従来同等の中央1カラム、指定時は `lg:` で2カラム。

- [ ] **Step 1: コンポーネントを作成**

```tsx
// components/diary/DeskLayout.tsx
import type { ReactNode } from 'react';

interface DeskLayoutProps {
  children: ReactNode; // 本文（日付ヘッダ＋プロンプト＋エディタ）
  rail?: ReactNode; // 右レール（任意）
}

// 文机型レイアウト。lg 以上で [本文 1fr | レール 220px]、狭幅では縦積み。
// 深度は罫＋明度差で出す（影は使わない）。
export function DeskLayout({ children, rail }: DeskLayoutProps) {
  if (!rail) {
    return <main className="container mx-auto max-w-3xl p-6">{children}</main>;
  }
  return (
    <main className="container mx-auto max-w-5xl p-6">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10">
        <div className="min-w-0">{children}</div>
        <aside className="mt-8 border-t pt-6 lg:mt-0 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-1">
          <div className="lg:sticky lg:top-6">{rail}</div>
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし（exit 0）

- [ ] **Step 3: 色トークン lint**

Run: `npm run lint:design`
Expected: PASS（生色リテラルなし）

- [ ] **Step 4: コミット**

```bash
git add components/diary/DeskLayout.tsx
git commit -m "feat(diary): 文机グリッド DeskLayout を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 2: `StreakPanel`（連続日数＋当月点列）

**Files:**
- Create: `components/diary/StreakPanel.tsx`

**Interfaces:**
- Consumes: `buildMonthGrid(year, month, today)`、`CalendarCell`（`lib/calendar/month-grid.ts`）、`computeStreak`（呼び出し側で算出した `streak` を受ける）。
- Produces: `StreakPanel({ streak, entryDates, focusDate, today }: { streak: number; entryDates: readonly string[]; focusDate: string; today: string })` — `focusDate` の月の点列を描く。

注: 色トークンは `components/diary/DiaryCalendar.tsx` のセル配色（書いた日=`bg-primary`／日曜=`bg-season`／今日=`ring`）を踏襲。点列の若葉は既存カレンダーの確立イディオム。`/dev/design` でうるさく感じたら点列を墨基調へ落とす余地を残す。

- [ ] **Step 1: コンポーネントを作成**

```tsx
// components/diary/StreakPanel.tsx
import { Flame } from 'lucide-react';
import { buildMonthGrid } from '@/lib/calendar/month-grid';

const WAFU_MONTH = [
  '睦月', '如月', '弥生', '卯月', '皐月', '水無月',
  '文月', '葉月', '長月', '神無月', '霜月', '師走',
];

interface StreakPanelProps {
  streak: number;
  entryDates: readonly string[];
  focusDate: string; // YYYY-MM-DD（書いている日）
  today: string; // YYYY-MM-DD（Asia/Tokyo）
}

export function StreakPanel({
  streak,
  entryDates,
  focusDate,
  today,
}: StreakPanelProps) {
  const [yearStr, monthStr] = focusDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const grid = buildMonthGrid(year, month, today);
  const cells = grid.weeks.flat();
  const written = new Set(entryDates);
  const inMonth = cells.filter((c) => c.inMonth);
  const writtenCount = inMonth.filter((c) => written.has(c.iso)).length;

  return (
    <section aria-label="続ける記録">
      <p className="font-heading text-sm text-muted-foreground">続ける喜び</p>

      {streak > 0 ? (
        <div className="mt-2 flex items-baseline gap-1.5">
          <Flame className="size-5 text-primary" aria-hidden="true" />
          <span className="font-heading text-3xl leading-none tabular-nums text-primary">
            {streak}
          </span>
          <span className="text-sm text-muted-foreground">日連続</span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-foreground">今日から、はじめよう。</p>
      )}

      <p className="mt-4 text-xs tabular-nums text-muted-foreground">
        {WAFU_MONTH[month - 1]} ・ {writtenCount} / {inMonth.length} 日
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1" aria-hidden="true">
        {cells.map((cell, i) => {
          const isSunday = i % 7 === 0;
          const isWritten = cell.inMonth && written.has(cell.iso);
          let cls: string;
          if (!cell.inMonth) {
            cls = 'opacity-0';
          } else if (isWritten) {
            cls = `${isSunday ? 'bg-season' : 'bg-primary'}${
              cell.isToday ? ' ring-2 ring-foreground/40' : ''
            }`;
          } else if (cell.isToday) {
            cls = 'ring-2 ring-primary';
          } else {
            cls = 'border border-muted-foreground/40';
          }
          return (
            <span key={cell.iso} className={`aspect-square rounded-full ${cls}`} />
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 色トークン lint**

Run: `npm run lint:design`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add components/diary/StreakPanel.tsx
git commit -m "feat(diary): 連続日数＋当月点列の StreakPanel を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 3: `WritingRail`（レール束ね）

**Files:**
- Create: `components/diary/WritingRail.tsx`

**Interfaces:**
- Consumes: `StreakPanel`。
- Produces: `WritingRail({ streak, entryDates, focusDate, today })` — 同じ props を `StreakPanel` に流す。PR② で `SeasonNote` を下段に追加する。

- [ ] **Step 1: コンポーネントを作成**

```tsx
// components/diary/WritingRail.tsx
import { StreakPanel } from '@/components/diary/StreakPanel';

interface WritingRailProps {
  streak: number;
  entryDates: readonly string[];
  focusDate: string;
  today: string;
}

// 右レール（文机の道具一式）。控えめな伴走情報を縦に積む。
export function WritingRail(props: WritingRailProps) {
  return (
    <div className="space-y-6">
      <StreakPanel {...props} />
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add components/diary/WritingRail.tsx
git commit -m "feat(diary): 右レール WritingRail を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 4: 書く画面を `DeskLayout`＋レールへ配線

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/diary/[date]/page.tsx`

**Interfaces:**
- Consumes: `DeskLayout`、`WritingRail`、`listEntryDates`（`lib/db/queries/diary.ts`）、`computeStreak`（`lib/diary/streak.ts`）。

- [ ] **Step 1: `app/page.tsx` を置換**

```tsx
// app/page.tsx
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { WritingRail } from '@/components/diary/WritingRail';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { computeStreak } from '@/lib/diary/streak';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, entryDates] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
  ]);
  const streak = computeStreak(entryDates, date);
  const defaultTab = existing ? 'preview' : 'edit';

  return (
    <DeskLayout
      rail={
        <WritingRail
          streak={streak}
          entryDates={entryDates}
          focusDate={date}
          today={date}
        />
      }
    >
      <DiaryDateHeader date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </DeskLayout>
  );
}
```

- [ ] **Step 2: `app/diary/[date]/page.tsx` を置換**

```tsx
// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { WritingRail } from '@/components/diary/WritingRail';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { computeStreak } from '@/lib/diary/streak';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const { date } = await params;
  if (!DATE_PATTERN.test(date)) {
    notFound();
  }

  const today = todayInTokyo();
  if (date > today) {
    notFound(); // 未来日付は 404
  }

  const [entry, entryDates] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
  ]);
  const streak = computeStreak(entryDates, today);
  const initialContent = entry?.content ?? '';
  const defaultTab = entry ? 'preview' : 'edit';

  return (
    <DeskLayout
      rail={
        <WritingRail
          streak={streak}
          entryDates={entryDates}
          focusDate={date}
          today={today}
        />
      }
    >
      <DiaryDateHeader date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={initialContent}
        defaultTab={defaultTab}
      />
    </DeskLayout>
  );
}
```

- [ ] **Step 3: 型チェック＋ビルド**

Run: `npx tsc --noEmit && npm run build`
Expected: いずれも成功（build はダミー env でも RSC のコンパイルが通る）

- [ ] **Step 4: 手動確認（ローカル `npm run dev`）**
  - `lg` 以上（≥1024px）で本文左／右レールに連続日数＋当月点列が出る。
  - `lg` 未満でレールが本文の下に回り込み、上に罫が出る。
  - ライト／ダーク両方で罫・明度差・点列の色が成立。
  - 連続0日のとき「今日から、はじめよう。」が出る。

- [ ] **Step 5: コミット**

```bash
git add app/page.tsx 'app/diary/[date]/page.tsx'
git commit -m "feat(diary): 書く画面を文机レイアウト＋ストリークレールへ

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 5: `/history`・`/insights` の幅を広げる（軽い対応）

**Files:**
- Modify: `app/history/page.tsx`（`max-w-3xl`→`max-w-5xl`）
- Modify: `app/insights/page.tsx`（3 箇所の `max-w-3xl`→`max-w-5xl`）

- [ ] **Step 1: `app/history/page.tsx` の wrapper を変更**

`app/history/page.tsx` の
```tsx
    <main className="container mx-auto max-w-3xl p-6">
```
を
```tsx
    <main className="container mx-auto max-w-5xl p-6">
```
に変更（1 箇所）。

- [ ] **Step 2: `app/insights/page.tsx` の wrapper を変更**

`app/insights/page.tsx` には `max-w-3xl` が **3 箇所**（state1: `className="container mx-auto max-w-3xl p-6"`、state2: 同、state3: `className="container mx-auto max-w-3xl space-y-10 p-6"`）。すべて `max-w-3xl`→`max-w-5xl` に置換する。

```bash
sed -i '' 's/max-w-3xl/max-w-5xl/g' app/insights/page.tsx app/history/page.tsx
```
（macOS の `sed -i ''`。置換後に下の grep で 0 件を確認すること。）

- [ ] **Step 3: 置換漏れ確認**

Run: `grep -rn "max-w-3xl" app/history/page.tsx app/insights/page.tsx`
Expected: 出力なし（全て置換済み）

- [ ] **Step 4: 型チェック＋ lint**

Run: `npx tsc --noEmit && npm run lint:design`
Expected: いずれも成功

- [ ] **Step 5: コミット**

```bash
git add app/history/page.tsx app/insights/page.tsx
git commit -m "feat(history,insights): デスクトップで横幅を広げる（max-w-5xl）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: PR① を出してマージ**

```bash
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```
Expected: CI（lint / tsc / vitest / build）green → squash merge。

---

# PR② 季節のたより

> レールに二十四節気/和風月名の一言を足す。純関数 `season.ts` は TDD。ブランチ例 `feat/season-note`。

### Task 6: `lib/diary/season.ts`（純関数・TDD）

**Files:**
- Create: `lib/diary/season.ts`
- Test: `lib/diary/season.test.ts`

**Interfaces:**
- Produces: `getSeason(date: string): { wafuMonth: string; sekki: string; note: string }`（`date` は `YYYY-MM-DD`）。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/diary/season.test.ts
import { describe, expect, it } from 'vitest';
import { getSeason } from './season';

describe('getSeason', () => {
  it('夏至の頃（6/28）は水無月・夏至', () => {
    expect(getSeason('2026-06-28')).toEqual({
      wafuMonth: '水無月',
      sekki: '夏至',
      note: '一年で最も昼が長い頃。',
    });
  });

  it('元日（1/1）は小寒より前なので前年の冬至へ倒す', () => {
    const s = getSeason('2026-01-01');
    expect(s.wafuMonth).toBe('睦月');
    expect(s.sekki).toBe('冬至');
  });

  it('立春の前日（2/3）は大寒', () => {
    expect(getSeason('2026-02-03').sekki).toBe('大寒');
  });

  it('師走（12/25）は冬至', () => {
    const s = getSeason('2026-12-25');
    expect(s.wafuMonth).toBe('師走');
    expect(s.sekki).toBe('冬至');
  });

  it('境界日（節気の開始日）はその節気に入る（6/21=夏至）', () => {
    expect(getSeason('2026-06-21').sekki).toBe('夏至');
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- season`
Expected: FAIL（`getSeason` 未定義 / モジュールなし）

- [ ] **Step 3: 実装を書く**

```ts
// lib/diary/season.ts
// 日付 → 和風月名・二十四節気・一言メモ（情緒の添え物）。
// 新暦月をそのまま和風月名に対応させる単純版（旧暦換算はしない＝YAGNI、ズレ許容）。
// 二十四節気は年で数日揺れるため近似の開始日テーブルで引く。

const WAFU_MONTH = [
  '睦月', '如月', '弥生', '卯月', '皐月', '水無月',
  '文月', '葉月', '長月', '神無月', '霜月', '師走',
];

interface SekkiDef {
  md: number; // month*100 + day（近似の開始日）
  name: string;
  note: string;
}

// 立春（年初）から大寒までカレンダー順。
const SEKKI: SekkiDef[] = [
  { md: 204, name: '立春', note: '春の気配が立ちはじめる頃。' },
  { md: 219, name: '雨水', note: '雪が雨に変わり、氷が解けていく頃。' },
  { md: 306, name: '啓蟄', note: '土の中の虫が動きだす頃。' },
  { md: 321, name: '春分', note: '昼と夜の長さがほぼ等しくなる頃。' },
  { md: 405, name: '清明', note: '草木が芽吹き、清らかに明るむ頃。' },
  { md: 420, name: '穀雨', note: '春の雨が穀物をうるおす頃。' },
  { md: 506, name: '立夏', note: '夏の気配が立ちはじめる頃。' },
  { md: 521, name: '小満', note: '草木が茂り、満ちていく頃。' },
  { md: 606, name: '芒種', note: '稲などの種をまく頃。' },
  { md: 621, name: '夏至', note: '一年で最も昼が長い頃。' },
  { md: 707, name: '小暑', note: '暑さがしだいに増していく頃。' },
  { md: 723, name: '大暑', note: '一年で最も暑さがきびしい頃。' },
  { md: 808, name: '立秋', note: '秋の気配が立ちはじめる頃。' },
  { md: 823, name: '処暑', note: '暑さがやわらぎはじめる頃。' },
  { md: 908, name: '白露', note: '草に朝露が宿りはじめる頃。' },
  { md: 923, name: '秋分', note: '昼と夜の長さがほぼ等しくなる頃。' },
  { md: 1008, name: '寒露', note: '冷たい露が結ぶ頃。' },
  { md: 1024, name: '霜降', note: '霜が降りはじめる頃。' },
  { md: 1107, name: '立冬', note: '冬の気配が立ちはじめる頃。' },
  { md: 1122, name: '小雪', note: 'わずかに雪が降りはじめる頃。' },
  { md: 1207, name: '大雪', note: '雪が本格的に降りだす頃。' },
  { md: 1222, name: '冬至', note: '一年で最も昼が短い頃。' },
  { md: 105, name: '小寒', note: '寒さが本格化しはじめる頃。' },
  { md: 120, name: '大寒', note: '一年で最も寒さがきびしい頃。' },
];

export interface Season {
  wafuMonth: string;
  sekki: string;
  note: string;
}

export function getSeason(date: string): Season {
  const parts = date.split('-');
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const key = month * 100 + day;
  const wafuMonth = WAFU_MONTH[month - 1];

  // 1/1〜1/4 は小寒（105）より前 → 前年の冬至へ倒す。
  if (key < 105) {
    const touji = SEKKI.find((s) => s.name === '冬至');
    const note = touji ? touji.note : '';
    return { wafuMonth, sekki: '冬至', note };
  }

  // key 以下で md が最大の節気を選ぶ（Jan の小さい md も自然に拾える）。
  let chosen = SEKKI[0];
  let best = -1;
  for (const s of SEKKI) {
    if (s.md <= key && s.md > best) {
      best = s.md;
      chosen = s;
    }
  }
  return { wafuMonth, sekki: chosen.name, note: chosen.note };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- season`
Expected: PASS（5 ケース）

- [ ] **Step 5: コミット**

```bash
git add lib/diary/season.ts lib/diary/season.test.ts
git commit -m "feat(diary): 日付→和風月名/二十四節気の season ユーティリティ（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 7: `SeasonNote` をレールに追加

**Files:**
- Create: `components/diary/SeasonNote.tsx`
- Modify: `components/diary/WritingRail.tsx`

**Interfaces:**
- Consumes: `getSeason`（`lib/diary/season.ts`）。
- Produces: `SeasonNote({ date }: { date: string })`。

- [ ] **Step 1: `SeasonNote` を作成**

```tsx
// components/diary/SeasonNote.tsx
import { getSeason } from '@/lib/diary/season';

// 季節のたより。節気名のみ朱（季節の差し色）。それ以外は muted。
export function SeasonNote({ date }: { date: string }) {
  const { wafuMonth, sekki, note } = getSeason(date);
  return (
    <section aria-label="季節のたより">
      <p className="font-heading text-sm text-muted-foreground">季節のたより</p>
      <p className="mt-2 font-heading text-base text-season">{sekki}</p>
      <p className="mt-1 text-xs text-muted-foreground">{wafuMonth}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
    </section>
  );
}
```

- [ ] **Step 2: `WritingRail` に下段として追加**

`components/diary/WritingRail.tsx` を次に変更：

```tsx
// components/diary/WritingRail.tsx
import { SeasonNote } from '@/components/diary/SeasonNote';
import { StreakPanel } from '@/components/diary/StreakPanel';

interface WritingRailProps {
  streak: number;
  entryDates: readonly string[];
  focusDate: string;
  today: string;
}

// 右レール（文机の道具一式）。控えめな伴走情報を縦に積む。
export function WritingRail(props: WritingRailProps) {
  return (
    <div className="space-y-6">
      <StreakPanel {...props} />
      <div className="border-t pt-6">
        <SeasonNote date={props.focusDate} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 型チェック＋ lint＋ビルド**

Run: `npx tsc --noEmit && npm run lint:design && npm run build`
Expected: いずれも成功

- [ ] **Step 4: 手動確認**
  - レール下段に「季節のたより」＋節気（朱）＋和風月名＋一言。
  - ダークでも朱／muted が成立。アクセント予算（朱＝季節のみ、若葉＝連続日数）超過なし。

- [ ] **Step 5: コミット → PR②**

```bash
git add components/diary/SeasonNote.tsx components/diary/WritingRail.tsx
git commit -m "feat(diary): レールに季節のたより（節気/和風月名）を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```

---

# PR③ AI「今日の問い」

> 本文上に AI生成の問いを1つ。日次キャッシュ＋429退避。`問いを変える` で再生成。`seasonal-prompts.ts` のみ TDD。ブランチ例 `feat/today-prompt`。

### Task 8: `lib/diary/seasonal-prompts.ts`（純関数・TDD）

**Files:**
- Create: `lib/diary/seasonal-prompts.ts`
- Test: `lib/diary/seasonal-prompts.test.ts`

**Interfaces:**
- Produces: `pickSeasonalPrompt(date: string, seed?: number): string` — `date`(+`seed`)から決定的に1問。常に非空。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/diary/seasonal-prompts.test.ts
import { describe, expect, it } from 'vitest';
import { pickSeasonalPrompt } from './seasonal-prompts';

describe('pickSeasonalPrompt', () => {
  it('同じ date / seed なら同じ問い（決定的）', () => {
    expect(pickSeasonalPrompt('2026-06-28')).toBe(
      pickSeasonalPrompt('2026-06-28', 0),
    );
  });

  it('seed を変えると別の問いになりうる（4 でずれる）', () => {
    expect(pickSeasonalPrompt('2026-06-28', 4)).not.toBe(
      pickSeasonalPrompt('2026-06-28', 0),
    );
  });

  it('常に非空の文字列を返す', () => {
    for (const d of ['2026-01-01', '2026-06-28', '2026-12-31']) {
      expect(pickSeasonalPrompt(d).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test -- seasonal-prompts`
Expected: FAIL（モジュールなし）

- [ ] **Step 3: 実装を書く**

```ts
// lib/diary/seasonal-prompts.ts
// AI 生成が使えないときの「今日の問い」フォールバック。
// 日付（＋seed）から決定的に1問選ぶ純関数。やさしく答えやすい問いだけを置く。

const PROMPTS = [
  '今日、ふと心が動いた瞬間はありましたか。',
  '今日のあなたを、ひとことで言うと何でしたか。',
  '今日、だれかに伝えたいことはありますか。',
  '今日、立ち止まって気づいたことはありますか。',
  '今日いちばん長く考えていたのは、何についてでしたか。',
  '今日、自分をいたわれた場面はありましたか。',
  '今日の小さな「よかったこと」を、ひとつ挙げるなら。',
  '今日、手放したい気持ちはありますか。',
  '今日のうちに、書きとめておきたい景色はありますか。',
  '今日のあなたは、何に時間を使いたかったですか。',
  '明日の自分に残しておきたい言葉はありますか。',
  '今日、心がほどけた瞬間はありましたか。',
];

export function pickSeasonalPrompt(date: string, seed = 0): string {
  const n = Number(date.replaceAll('-', '')); // YYYYMMDD
  const len = PROMPTS.length;
  const idx = (((n + seed) % len) + len) % len;
  return PROMPTS[idx];
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test -- seasonal-prompts`
Expected: PASS（3 ケース）

- [ ] **Step 5: コミット**

```bash
git add lib/diary/seasonal-prompts.ts lib/diary/seasonal-prompts.test.ts
git commit -m "feat(diary): 今日の問いフォールバック seasonal-prompts（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 9: `lib/ai/daily-prompt.ts`（AI生成＋日次キャッシュ＋退避）

**Files:**
- Create: `lib/ai/daily-prompt.ts`

**Interfaces:**
- Consumes: `generateText`（`ai`）、`defaultModel`（`lib/ai/client.ts`）、`getSeason`（`lib/diary/season.ts`）、`pickSeasonalPrompt`（`lib/diary/seasonal-prompts.ts`）。
- Produces:
  - `buildPromptInstruction(date: string, fresh: boolean): string`（PR③ Task11 の Action と共用）
  - `getTodayPrompt(date: string): Promise<{ text: string; source: 'ai' | 'seasonal' }>`

注: vitest は `@/` 未解決のため本ファイルは **tsc・build・手動**で担保（テストは書かない）。フォールバックの問い内容の正しさは Task8（`seasonal-prompts.test.ts`）が担保する。

- [ ] **Step 1: Next.js のキャッシュ API を確認**

`node_modules/next/dist/docs/` でキャッシュ関連ガイド（`use cache` / `cacheLife` / `cacheTag`、または `unstable_cache`）を確認する。本実装は移植しやすい `unstable_cache`（`next/cache`）を既定とする。プロジェクトが `use cache`（Cache Components）を採用済みなら、`getDailyPromptCached` を `'use cache'` + `cacheLife('days')` + `cacheTag('daily-prompt')` の関数へ置き換えてよい（戻り値の形は変えない）。

- [ ] **Step 2: 実装を書く**

```ts
// lib/ai/daily-prompt.ts
import { generateText } from 'ai';
import { unstable_cache } from 'next/cache';
import { defaultModel } from '@/lib/ai/client';
import { getSeason } from '@/lib/diary/season';
import { pickSeasonalPrompt } from '@/lib/diary/seasonal-prompts';

export interface TodayPrompt {
  text: string;
  source: 'ai' | 'seasonal';
}

// AI への指示文。fresh=true は「問いを変える」用に別角度を促す。
export function buildPromptInstruction(date: string, fresh: boolean): string {
  const { sekki, note } = getSeason(date);
  const freshLine = fresh
    ? '- 直前までとは別の角度から、新しい問いにする。\n'
    : '';
  return `あなたは思いやりのある親友です。これから日記を書こうとしている相手に、今日一日を静かにふり返るための「問いかけ」を1つだけ、日本語で投げかけてください。
- 季節は「${sekki}」（${note}）。さりげなく織り込んでも、織り込まなくてもよい。
- 説教や評価はしない。やさしく、答えやすい問い。
${freshLine}- 出力は問いかけの1文だけ。前置き・引用符・箇条書き・絵文字は付けない。`;
}

async function generatePrompt(date: string): Promise<string> {
  const { text } = await generateText({
    model: defaultModel,
    prompt: buildPromptInstruction(date, false),
  });
  return text.trim();
}

// 日付キーで1日1回だけ生成（Gemini 無料枠 5 RPM 対策）。
// 同じ日付の再アクセスはキャッシュ命中で AI を叩かない。
function getDailyPromptCached(date: string): Promise<string> {
  return unstable_cache(() => generatePrompt(date), ['daily-prompt', date], {
    revalidate: 60 * 60 * 24,
    tags: ['daily-prompt'],
  })();
}

export async function getTodayPrompt(date: string): Promise<TodayPrompt> {
  try {
    const text = await getDailyPromptCached(date);
    if (!text) throw new Error('empty prompt');
    return { text, source: 'ai' };
  } catch (err) {
    console.error('getTodayPrompt fallback:', err);
    return { text: pickSeasonalPrompt(date), source: 'seasonal' };
  }
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add lib/ai/daily-prompt.ts
git commit -m "feat(ai): 今日の問いを日次キャッシュ＋季節退避で生成

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 10: `regenerateTodayPrompt` Server Action

**Files:**
- Create: `lib/actions/prompt.ts`

**Interfaces:**
- Consumes: `requireSession`（`lib/auth/session`）、`generateText`、`defaultModel`、`buildPromptInstruction`（`lib/ai/daily-prompt.ts`）、`pickSeasonalPrompt`。
- Produces: `regenerateTodayPrompt(date: string): Promise<TodayPrompt>`（`問いを変える` 用。キャッシュを介さず毎回生成、失敗時は seed をずらした季節バンク）。

- [ ] **Step 1: 実装を書く**

```ts
// lib/actions/prompt.ts
'use server';

import { generateText } from 'ai';
import { defaultModel } from '@/lib/ai/client';
import { buildPromptInstruction, type TodayPrompt } from '@/lib/ai/daily-prompt';
import { requireSession } from '@/lib/auth/session';
import { pickSeasonalPrompt } from '@/lib/diary/seasonal-prompts';

export async function regenerateTodayPrompt(
  date: string,
): Promise<TodayPrompt> {
  await requireSession();
  try {
    const { text } = await generateText({
      model: defaultModel,
      prompt: buildPromptInstruction(date, true),
    });
    const trimmed = text.trim();
    if (!trimmed) throw new Error('empty prompt');
    return { text: trimmed, source: 'ai' };
  } catch (err) {
    console.error('regenerateTodayPrompt fallback:', err);
    // seed をずらして別の問いを返す（429 連発時も体験を止めない）
    const seed = (Number(date.replaceAll('-', '')) % 11) + 1;
    return { text: pickSeasonalPrompt(date, seed), source: 'seasonal' };
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add lib/actions/prompt.ts
git commit -m "feat(diary): 問いを変える用 regenerateTodayPrompt アクション

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 11: `TodayPrompt` コンポーネントを本文上に配線

**Files:**
- Create: `components/diary/TodayPrompt.tsx`
- Modify: `app/page.tsx`（home のみ。過去日 `[date]` には出さない）

**Interfaces:**
- Consumes: `regenerateTodayPrompt`（`lib/actions/prompt.ts`）。
- Produces: `TodayPrompt({ initialText, date }: { initialText: string; date: string })`。

- [ ] **Step 1: `TodayPrompt` を作成**

```tsx
// components/diary/TodayPrompt.tsx
'use client';

import { useState, useTransition } from 'react';
import { regenerateTodayPrompt } from '@/lib/actions/prompt';

interface TodayPromptProps {
  initialText: string;
  date: string;
}

// 本文上の「今日の問い」。彩色アクセントは使わず、罫＋面昇格＋明朝で差をつける。
export function TodayPrompt({ initialText, date }: TodayPromptProps) {
  const [text, setText] = useState(initialText);
  const [pending, startTransition] = useTransition();

  const handleRenew = () => {
    startTransition(async () => {
      const res = await regenerateTodayPrompt(date);
      setText(res.text);
    });
  };

  return (
    <div className="mb-6 border-l-2 bg-muted/40 px-4 py-3">
      <p className="font-heading text-base leading-relaxed text-foreground">
        {text}
      </p>
      <button
        type="button"
        onClick={handleRenew}
        disabled={pending}
        className="mt-2 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
      >
        {pending ? '考えています…' : '問いを変える'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `app/page.tsx` に配線（home のみ）**

`app/page.tsx` の import に追加：
```tsx
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
```

データ取得を拡張（`Promise.all` に `getTodayPrompt(date)` を追加）：
```tsx
  const [existing, entryDates, prompt] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
    getTodayPrompt(date),
  ]);
```

`DiaryDateHeader` と `DiaryEditor` の間に `TodayPrompt` を挿入：
```tsx
      <DiaryDateHeader date={date} />
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
```

（`app/diary/[date]/page.tsx` は変更しない＝過去日に「今日の問い」は出さない。）

- [ ] **Step 3: 型チェック＋ lint＋ビルド**

Run: `npx tsc --noEmit && npm run lint:design && npm run build`
Expected: いずれも成功

- [ ] **Step 4: 手動確認**
  - home の本文上に問いが1文（明朝・罫＋面昇格、彩色アクセントなし）。
  - `問いを変える` で文面が差し替わる（押下中は「考えています…」で無効化）。
  - 過去日 `/diary/2026-06-20` には問いが出ない。
  - （任意）`GOOGLE_GENERATIVE_AI_API_KEY` を一時的に無効化して 429/失敗時に季節バンクの問いが出ること、画面が落ちないことを確認。

- [ ] **Step 5: コミット → PR③**

```bash
git add components/diary/TodayPrompt.tsx app/page.tsx
git commit -m "feat(diary): 本文上に AI 今日の問い（問いを変える対応）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```

---

# PR④ 保存のお祝い演出

> 保存成功時に「今日でN日目」＋印モチーフ（墨＋若葉、朱は使わない）。`prefers-reduced-motion` 尊重。ブランチ例 `feat/save-celebration`。

### Task 12: `SaveResult` に更新後ストリークを足す

**Files:**
- Modify: `lib/actions/diary.ts`

**Interfaces:**
- Consumes: `listEntryDates`（`lib/db/queries/diary.ts`）、`computeStreak`（`lib/diary/streak.ts`）。
- Produces: `SaveResult = { ok: true; streak: number } | { ok: false; error: string }`。

注: Server Action は DB / session 依存のため vitest 対象外。tsc・build・手動で担保。

- [ ] **Step 1: import を追加**

`lib/actions/diary.ts` の冒頭 import 群に追加：
```ts
import { listEntryDates } from '@/lib/db/queries/diary';
import { computeStreak } from '@/lib/diary/streak';
import { todayInTokyo } from '@/lib/calendar/month-grid';
```

- [ ] **Step 2: `SaveResult` 型を変更**

```ts
export type SaveResult =
  | { ok: true; streak: number }
  | { ok: false; error: string };
```

- [ ] **Step 3: `saveDiaryEntry` の成功時に streak を計算して返す**

`saveDiaryEntry` 内、upsert と `revalidatePath(...)` の後の `return { ok: true };` を次に置換：

```ts
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/diary/${parsed.data.entryDate}`);

    const today = todayInTokyo();
    const dates = await listEntryDates();
    const streak = computeStreak(dates, today);

    return { ok: true, streak };
```

- [ ] **Step 4: 型チェック＋ビルド**

Run: `npx tsc --noEmit && npm run build`
Expected: 成功（`DiaryEditor` 側は次タスクで `result.streak` を使うが、現状の `if (result.ok)` 分岐は型的に問題なく通る）

- [ ] **Step 5: コミット**

```bash
git add lib/actions/diary.ts
git commit -m "feat(diary): 保存結果に更新後ストリークを含める

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 13: `DiaryEditor` に保存のお祝い演出

**Files:**
- Modify: `components/diary/DiaryEditor.tsx`

**Interfaces:**
- Consumes: `SaveResult.streak`（Task 12）。

- [ ] **Step 1: お祝い state を追加**

`DiaryEditor` の state 群（`feedback` の近く）に追加：
```tsx
  const [celebration, setCelebration] = useState<number | null>(null);
```

- [ ] **Step 2: `handleAction` でお祝いを発火**

`handleAction` の成功分岐を次に変更：
```tsx
  const handleAction = (formData: FormData) => {
    startSaveTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
        setCelebration(result.streak);
        setActiveTab('preview');
        // 数秒で自然に収める
        window.setTimeout(() => setCelebration(null), 3200);
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };
```

- [ ] **Step 3: お祝い表示を描画**

保存ボタン行（`<div className="flex items-center gap-3">…`）の**直後**に、お祝いピルを追加（`feedback` span はそのまま残す）。`celebration !== null && celebration > 0` のときだけ表示：

```tsx
      {celebration !== null && celebration > 0 && (
        <div
          className="inline-flex animate-in fade-in items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-foreground motion-reduce:animate-none"
          role="status"
        >
          <span
            className="grid size-6 place-items-center rounded-full bg-foreground font-heading text-xs text-background"
            aria-hidden="true"
          >
            記
          </span>
          <span>
            今日で
            <span className="mx-1 font-heading tabular-nums text-primary">
              {celebration}
            </span>
            日目。よく続いています。
          </span>
        </div>
      )}
```

注: 印は**墨地（`bg-foreground`）＋生成り字（`text-background`）**、連続日数のみ若葉。朱は使わない（アクセント予算遵守）。`animate-in fade-in` は tailwindcss-animate（shadcn 既定）。未導入なら `transition-opacity` ＋ opacity 制御に置き換える。`motion-reduce:animate-none` で `prefers-reduced-motion` を尊重。

- [ ] **Step 4: 型チェック＋ lint＋ビルド**

Run: `npx tsc --noEmit && npm run lint:design && npm run build`
Expected: いずれも成功

- [ ] **Step 5: 手動確認**
  - 本文を書いて保存 → 「保存しました」＋「今日で N 日目。よく続いています。」＋墨地の「記」印が短く出て数秒で消える。
  - ライト／ダーク両方で印（墨地↔生成り字）が成立。
  - OS の「視差効果を減らす」を ON にするとアニメが無効。

- [ ] **Step 6: コミット → PR④**

```bash
git add components/diary/DiaryEditor.tsx
git commit -m "feat(diary): 保存時のお祝い演出（連続日数ナッジ＋落款）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```

---

## Self-Review（プラン作成者による spec 突合）

**1. Spec coverage:**
- 文机レイアウト（案A右レール）→ Task 1,4 ✓
- 本文の行長配慮 → DeskLayout の `minmax(0,1fr)` ＋ `min-w-0`（編集カードが極端に広がらない。`/dev/design` でさらに `max-w` を被せる余地あり）✓
- 狭幅で縦積み → Task 1（`lg:` 分岐）✓
- AI 今日の問い＋日次キャッシュ＋429退避 → Task 8,9,10,11 ✓
- 書く画面のストリーク（連続日数＋当月点列）→ Task 2 ✓
- 季節のたより（和風月名＋二十四節気）→ Task 6,7 ✓
- 保存のお祝い（更新後ストリーク＋印・墨+若葉）→ Task 12,13 ✓
- `/history`・`/insights` の幅広げ（軽い対応）→ Task 5 ✓
- アクセント予算 → 各コンポーネントのトークン選択＋手動確認ステップ ✓
- スキーマ変更なし／PR2-A の「曜日のみ」据え置き（季節はレール）→ `DiaryDateHeader` 不変更で担保 ✓

**2. Placeholder scan:** すべてのコード/コマンド/テストは実体入り。`node_modules/next/dist/docs/` 確認ステップ（Task9 Step1）は実コマンドの前提確認であり placeholder ではない。

**3. Type consistency:** `TodayPrompt`（型・`{ text; source }`）は `lib/ai/daily-prompt.ts` で定義し Action（Task10）が import、`buildPromptInstruction(date, fresh)` のシグネチャは Task9 定義＝Task10 呼び出しで一致。`SaveResult.streak`（Task12）を Task13 が消費＝一致。`StreakPanel`/`WritingRail`/`SeasonNote` の props は Task 間で一致。

**4. テスト方針整合:** vitest 対象は相対 import の leaf 純関数（`season.ts`/`seasonal-prompts.ts`）のみ。`@/` を import するモジュールは tsc/build/手動で担保＝プロジェクト現状と一致。
