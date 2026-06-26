# 日記画面の和モダン化（PR2-A）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日記画面（今日のホーム＋特定日＋共有エディタ/プレビュー）を和モダンへ作り込む — 大型明朝の日付ヘッダ、下線タブ、トークン色の保存成功表示、明朝見出し＋読み物行間のプレビュー。

**Architecture:** 日付整形は純関数 `formatDiaryDate`（TDD）に集約し、共有サーバーコンポーネント `DiaryDateHeader` が両ページで使う。`DiaryEditor` はタブを `variant="line"`＋若葉下線に、保存成功色を off-token の緑→`text-muted-foreground` に、枠を `rounded-xl` に。`.prose` の見出し明朝＋本文行間を `app/globals.css` に1か所だけ追加し編集/プレビュー両方へ効かせる。

**Tech Stack:** Next.js 16.2.9 (App Router, Server Components) / Tailwind v4 / shadcn(base-nova)+@base-ui/react Tabs / @tailwindcss/typography / Tiptap / react-markdown / vitest / Biome。

## Global Constraints

- 色は必ずトークン（`bg-primary` `text-foreground` `text-muted-foreground` `text-season` / `var(--…)`）。**生hex・任意色・インラインstyleの色リテラル禁止**（`npm run lint:design`）。**off-token の named color（`text-green-600` 等）も持ち込まない**。
- 見出しは `font-heading`（明朝）、本文は既定（Zen Kaku）。font-size/余白/角丸は土台 spec §① スケールから。**11px未満禁止**。
- アクセント（若葉 `--primary`）は **1画面1〜2箇所**＝保存ボタン＋選択タブ下線に限定。朱（`--season`）は使わない。深度は影でなく罫＋明度差。**ダーク対応必須**。
- スコープは日記画面のみ。履歴/分析/エニアグラム色（`--center-*`）に触れない。自動保存・季節ラベル・縦組みは作らない（YAGNI）。
- Biome：JS/TS シングルクォート、`components/ui/**` のみダブル。import 並び順は自動修正可。
- 日付の曜日はタイムゾーン非依存に `Date.UTC(y,m-1,d)` + `getUTCDay()` で算出。
- PRベース運用（main 直 push 不可、squash merge）。検証は dummy env でビルド。

**作業ブランチ:** 現在の `claude/pr2-diary-screen`（最新 main 起点。spec/plan を含む）。実装コミットをこのブランチに積み、1つの PR として squash merge する。

**ビルド用 dummy env:** `DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000`

---

### Task 1: 日付整形ユーティリティ `formatDiaryDate`（TDD）

**Files:**
- Create: `lib/diary/format-date.ts`
- Test: `lib/diary/format-date.test.ts`（`vitest.config.ts` の `include: ['lib/**/*.test.ts']` が自動収集）

**Interfaces:**
- Produces: `formatDiaryDate(iso: string): { eyebrow: string; full: string; weekday: string }` — `iso`='YYYY-MM-DD'。`eyebrow`='2026.06.26'（ゼロ埋め）、`full`='2026年6月26日'（非ゼロ埋め）、`weekday`='金曜日'。

- [ ] **Step 1: 失敗するテストを書く**

`lib/diary/format-date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDiaryDate } from './format-date';

describe('formatDiaryDate', () => {
  it('既知アンカーの曜日を正しく返す', () => {
    expect(formatDiaryDate('2000-01-01')).toEqual({
      eyebrow: '2000.01.01',
      full: '2000年1月1日',
      weekday: '土曜日',
    });
    expect(formatDiaryDate('2024-01-01')).toEqual({
      eyebrow: '2024.01.01',
      full: '2024年1月1日',
      weekday: '月曜日',
    });
  });

  it('eyebrow はゼロ埋め・full は非ゼロ埋め・曜日付き', () => {
    expect(formatDiaryDate('2026-06-26')).toEqual({
      eyebrow: '2026.06.26',
      full: '2026年6月26日',
      weekday: '金曜日',
    });
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run lib/diary/format-date.test.ts`
Expected: FAIL（Cannot find module './format-date'）

- [ ] **Step 3: 最小実装を書く**

`lib/diary/format-date.ts`:

```ts
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export interface DiaryDateParts {
  eyebrow: string;
  full: string;
  weekday: string;
}

// iso は 'YYYY-MM-DD'（Asia/Tokyo のカレンダー日付）。
// 曜日はタイムゾーン非依存に算出するため Date.UTC + getUTCDay を使う
// （ローカルTZに依存せずカレンダー日付の曜日が一意に決まる）。
export function formatDiaryDate(iso: string): DiaryDateParts {
  const [y, m, d] = iso.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return {
    eyebrow: `${y}.${pad(m)}.${pad(d)}`,
    full: `${y}年${m}月${d}日`,
    weekday: `${weekday}曜日`,
  };
}
```

- [ ] **Step 4: テストを実行して通過を確認**

Run: `npx vitest run lib/diary/format-date.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: lint / 型 を確認**

Run: `npm run lint && npx tsc --noEmit`
Expected: 両方 exit 0。

- [ ] **Step 6: コミット**

```bash
git add lib/diary/format-date.ts lib/diary/format-date.test.ts
git commit -m "feat(diary): 日付整形 formatDiaryDate（明朝ヘッダ用・TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 日付ヘッダ `DiaryDateHeader` ＋ 両ページ配線 ＋ 見本帳

**Files:**
- Create: `components/diary/DiaryDateHeader.tsx`
- Modify: `app/page.tsx`
- Modify: `app/diary/[date]/page.tsx`
- Modify: `app/dev/design/page.tsx`（見本を1つ追加）

**Interfaces:**
- Consumes: `formatDiaryDate`（Task 1）。
- Produces: `<DiaryDateHeader date="YYYY-MM-DD" />`（サーバーコンポーネント）。

- [ ] **Step 1: `DiaryDateHeader` を作成**

`components/diary/DiaryDateHeader.tsx`:

```tsx
import { formatDiaryDate } from '@/lib/diary/format-date';

interface DiaryDateHeaderProps {
  date: string;
}

export function DiaryDateHeader({ date }: DiaryDateHeaderProps) {
  const { eyebrow, full, weekday } = formatDiaryDate(date);
  return (
    <header className="mb-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
        {eyebrow}
      </p>
      <h1 className="mt-1 font-heading text-2xl tracking-[0.04em] sm:text-3xl">
        {full} <span className="text-muted-foreground">{weekday}</span>
      </h1>
    </header>
  );
}
```

- [ ] **Step 2: ホーム `app/page.tsx` で使う**

`app/page.tsx` の import に追加:

```tsx
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
```

見出し行を置換:

```tsx
      <h1 className="mb-6 text-2xl font-bold">{date} の日記</h1>
```
→
```tsx
      <DiaryDateHeader date={date} />
```

- [ ] **Step 3: 特定日 `app/diary/[date]/page.tsx` で使う**

import に追加:

```tsx
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
```

見出し行を置換:

```tsx
      <h1 className="mb-6 text-2xl font-bold">{date}</h1>
```
→
```tsx
      <DiaryDateHeader date={date} />
```

- [ ] **Step 4: 見本帳 `/dev/design` にサンプル追加**

`app/dev/design/page.tsx` の import に追加:

```tsx
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
```

`Showcase` 内（`カラートークン` セクションの直前など先頭付近）に1セクション追加:

```tsx
      <section className="space-y-3">
        <h2>日付ヘッダ</h2>
        <DiaryDateHeader date="2026-06-26" />
      </section>
```

- [ ] **Step 5: 検証**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。lint:design は色を足していないので緑。

- [ ] **Step 6: コミット**

```bash
git add components/diary/DiaryDateHeader.tsx app/page.tsx "app/diary/[date]/page.tsx" app/dev/design/page.tsx
git commit -m "feat(diary): 大型明朝の日付ヘッダDiaryDateHeaderを両ページ+見本帳に

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: エディタ／タブ／保存の和モダン化（`DiaryEditor` ＋ `RichTextEditor`）

**Files:**
- Modify: `components/diary/DiaryEditor.tsx`
- Modify: `components/diary/RichTextEditor.tsx`

**Interfaces:**
- Consumes: 既存の `Tabs/TabsList/TabsTrigger/TabsContent`（`variant="line"` あり）、`Button`（`bg-primary`=若葉）。

- [ ] **Step 1: タブを下線（line）＋若葉に**

`components/diary/DiaryEditor.tsx` の `TabsList`/`TabsTrigger` を置換:

```tsx
        <TabsList>
          <TabsTrigger value="edit">編集</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
        </TabsList>
```
→
```tsx
        <TabsList variant="line">
          <TabsTrigger value="edit" className="after:bg-primary">
            編集
          </TabsTrigger>
          <TabsTrigger value="preview" className="after:bg-primary">
            プレビュー
          </TabsTrigger>
        </TabsList>
```
（`variant="line"` で枠/背景が消え下線スタイルに。`after:bg-primary` が既定の `after:bg-foreground` を上書きして**若葉の下線**に。active時に `opacity-100` で表示される。）

- [ ] **Step 2: プレビュー枠を `rounded-xl border bg-card` に**

`DiaryEditor.tsx` のプレビュー枠を置換:

```tsx
          <div className="min-h-[15rem] rounded-md border p-4">
            {activeTab === 'preview' && <DiaryMarkdown content={content} />}
          </div>
```
→
```tsx
          <div className="min-h-[15rem] rounded-xl border bg-card p-5">
            {activeTab === 'preview' && <DiaryMarkdown content={content} />}
          </div>
```

- [ ] **Step 3: RichTextEditor の loading スケルトンを `rounded-xl` に**

`DiaryEditor.tsx` の dynamic import の loading を置換:

```tsx
    loading: () => (
      <div className="min-h-[15rem] animate-pulse rounded-lg border border-input" />
    ),
```
→
```tsx
    loading: () => (
      <div className="min-h-[15rem] animate-pulse rounded-xl border" />
    ),
```

- [ ] **Step 4: 保存成功の色を off-token の緑→トークンへ**

`DiaryEditor.tsx` の feedback span のクラスを置換:

```tsx
            className={
              feedback.kind === 'success'
                ? 'text-sm text-green-600 dark:text-green-400'
                : 'text-sm text-destructive'
            }
```
→
```tsx
            className={
              feedback.kind === 'success'
                ? 'text-sm text-muted-foreground'
                : 'text-sm text-destructive'
            }
```

- [ ] **Step 5: エディタ本体の枠を `rounded-xl` に**

`components/diary/RichTextEditor.tsx` のコンテナを置換:

```tsx
    <div className="rounded-lg border border-input bg-transparent">
```
→
```tsx
    <div className="rounded-xl border bg-transparent">
```

- [ ] **Step 6: 検証**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。**lint:design は `text-green-600` 除去で違反が1件も無いまま緑**（むしろ off-token を1つ解消）。

- [ ] **Step 7: コミット**

```bash
git add components/diary/DiaryEditor.tsx components/diary/RichTextEditor.tsx
git commit -m "feat(diary): タブを若葉下線・保存成功をトークン色・枠をrounded-xlへ

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: プレビュー/本文タイポ（`.prose` を和モダンに）

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: `.prose` ルールを追加**

`app/globals.css` の末尾（既存の `.tiptap .is-editor-empty::before { … }` ルールの後ろ、通常ルールとして）に追加:

```css
/* 編集(Tiptap)・表示(react-markdown)双方が .prose を使うため1か所で和モダン化。
   見出し明朝は PR1 の base ルールでも効くが、レイヤ順の取りこぼし回避に明示する
   (typography プラグインは font-family を設定しないので競合しない)。
   .prose 利用は現状日記のみ。将来 prose を使う画面にも同じ読み物体裁が乗るのは望ましい。 */
.prose :is(h1, h2, h3) {
  font-family: var(--font-heading);
}
.prose p {
  line-height: 1.9;
}
```

- [ ] **Step 2: 検証**

Run: `npm run lint && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。`lint:design` は globals.css を走査しないので無影響。Biome の CSS at-rule 順序にも抵触しない（通常ルールのみ追加）。

- [ ] **Step 3: 目視（任意・dev）**

`npm run dev` → `/`（編集タブで H2/H3 を入力／プレビュータブで見出しが明朝・本文行間が広い）と `/dev/design` を確認。

- [ ] **Step 4: コミット**

```bash
git add app/globals.css
git commit -m "feat(diary): .proseの見出し明朝+本文行間で読み物タイポに

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 最終検証＋スクショ＋PR

**Files:** （コードなし。全体検証と PR）

- [ ] **Step 1: フルチェック**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build
```
Expected: すべて PASS（vitest に `format-date` の2テストが加わる）。

- [ ] **Step 2: スクショ（ライト/ダーク）**

`npm run dev` を起動し、Playwright で以下を撮影:
- `/`（今日のホーム：明朝日付ヘッダ＋曜日、下線タブ、編集/プレビュー、若葉保存ボタン）
- `/diary/<過去日>`（記入済み＝プレビュー既定、見出し明朝・本文行間）
- ライト/ダーク両方（ヘッダのトグル）
確認：日付の曜日が正しい、若葉が保存ボタン＋選択タブの2箇所のみ、プレビュー見出しが明朝、枠が rounded-xl。

- [ ] **Step 3: PR を作成し CI green を確認**

```bash
git push -u origin claude/pr2-diary-screen
gh pr create --base main --fill --title "feat(diary): 日記画面の和モダン化（日付ヘッダ/下線タブ/保存色/プレビュータイポ）"
gh pr checks --watch
```
CI（lint / lint:design / tsc / test / build）が green になったら、**本番マージはユーザー確認の上** `gh pr merge --squash --delete-branch`。

---

## Self-Review（spec との突き合わせ）

- spec ① 日付ヘッダ＋format-date → Task 1（TDD・アンカー検証済み）＋Task 2（DiaryDateHeader、eyebrow に uppercase/tracking、両ページ配線、見本帳）✓
- spec ② タブ/保存/コンテナ → Task 3（`variant="line"`+`after:bg-primary`、success→`text-muted-foreground`、preview `rounded-xl bg-card`、editor `rounded-xl`、skeleton `rounded-xl`）✓
- spec ③ `.prose` タイポ → Task 4（見出し明朝の明示＋`.prose p` line-height、グローバル意図を comment 明記）✓
- spec 触るファイル → 全て対象（EditorToolbar は不変＝対象外で正）。`/dev/design` サンプルは Task 2 に内包 ✓
- spec 検証 → Task 5（lint/tsc/test/lint:design/build＋スクショ＋PR）✓
- 憲法：色トークンのみ（off-token 緑を解消）、見出し明朝、若葉2箇所（保存＋選択タブ）、影なし、ダーク対応 ✓
- プレースホルダ無し。型整合：`formatDiaryDate` の戻り（eyebrow/full/weekday）を Task 1 で定義し Task 2 で同名利用。`variant="line"`/`after:bg-primary` は tabs.tsx の実装に一致。
```
