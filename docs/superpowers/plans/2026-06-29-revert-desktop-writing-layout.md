# PC文机レイアウト巻き戻し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 書く画面（`/`・`/diary/[date]`）の右レール（文机型2カラム）を撤去して単カラム `max-w-3xl` に戻し、全ページの横幅を `max-w-3xl` に揃え、`/history` の見出しとカレンダーの左端ズレを左揃えで解消する。

**Architecture:** `DeskLayout`/`WritingRail`/`SeasonNote` を削除し、両書く画面を素の `<main className="container mx-auto max-w-3xl p-6">` に戻す（コンポーネント削除と2ページの import 撤去は tsc 上カップリングするため**1コミットで原子的に**行う）。あわせて `HeaderNav`・`/history`・`/insights` の `max-w-5xl` をトークン単位で `max-w-3xl` に置換し、`/history` のカレンダー塊から `mx-auto` を外して左揃えにする。`lib/diary/season.ts`・`/history` のロジック・データ取得・保存演出は変更しない。

**Tech Stack:** Next.js 16（App Router・RSC）、TypeScript、Tailwind v4 + 和モダンデザイントークン、Biome、Vitest。

**設計の根拠:** [`docs/superpowers/specs/2026-06-29-revert-desktop-writing-layout-design.md`](../specs/2026-06-29-revert-desktop-writing-layout-design.md)（多視点レビュー2巡反映済み）。

## Global Constraints

- **色は必ずトークン**。生hex・`rgb()/hsl()/oklch()` リテラル・任意色クラス・インラインstyle色 禁止（`app/globals.css`・`app/dev/**` 以外）。`npm run lint:design` で機械チェック。本変更は**色を一切足さない**（レイアウトのみ）。
- **新規アクセント・新規 drop-shadow を足さない**。`SeasonNote` 撤去で朱（`--season`）の使用はむしろ減る。
- **`max-w-5xl` はトークン単位で置換**：`max-w-5xl` という文字列のみを `max-w-3xl` に変え、同一 `className` 内の他クラス（`flex items-center justify-between gap-6`・`space-y-10`・`px-6`・`py-4`・`p-6` 等）は**保持**する。
- **ヘッダーの横 padding は `px-6` を維持**（`p-4` には戻さない）。本文 `p-6` と左端を一致させるため。＝完全な pre-#48 復元ではなく #55 の幅揃え改善は温存。
- **削除してはいけない**：`lib/diary/season.ts` と `lib/diary/season.test.ts`（`getSeason` を `lib/ai/daily-prompt.ts`＝今日の問いが使用）。`/history`（`app/history/page.tsx` のロジック・`RecordStats`・`DiaryCalendar`）・`lib/actions/diary.ts`・保存演出は本変更で触らない（`/history` は幅クラスと `mx-auto` のみ変更）。
- **Biome スタイル**：TS/JS は single quote、JSX 属性は double quote、import は organizeImports（外部 → `@/` エイリアス順）。
- **PR ベース運用**：main 直 push 不可。ブランチで作業 → CI（lint / lint:design / tsc / test / build）green → `gh pr merge --squash --delete-branch`。

---

### Task 1: レイアウト巻き戻し（レール撤去・単カラム復帰・幅統一・/history 左揃え）

`DeskLayout`/`WritingRail`/`SeasonNote` の削除と2ページの import 撤去は TypeScript 上カップリングする（中間で tsc が通る状態が無い）。幅統一・/history 左揃えも同じ「巻き戻し」の一体物。**6ファイルをまとめて1コミット**にする。

これは削除・置換中心のリファクタで、対象コンポーネント（`DeskLayout`/`WritingRail`/`SeasonNote`）にユニットテストは**存在しない**（プランで grep 確認）。新規ユニットテストは書かない。検証は **grep ＋ lint ＋ lint:design ＋ tsc ＋ test ＋ build**（Task 1）と**目視**（Task 2）で行う。`lib/diary/season.test.ts` 等の既存テストは触らず green のまま。

**Files:**
- Modify: `app/page.tsx`（全面置換）
- Modify: `app/diary/[date]/page.tsx`（全面置換）
- Modify: `components/layout/HeaderNav.tsx:49`（`max-w-5xl`→`max-w-3xl` のみ）
- Modify: `app/history/page.tsx`（main 幅＋`mx-auto` 除去＋コメント）
- Modify: `app/insights/page.tsx`（`max-w-5xl`×3→`max-w-3xl`）
- Delete: `components/diary/DeskLayout.tsx`, `components/diary/WritingRail.tsx`, `components/diary/SeasonNote.tsx`
- 触らない（確認のみ）: `lib/diary/season.ts`, `lib/diary/season.test.ts`, `lib/ai/daily-prompt.ts`, `components/diary/DiaryCalendar.tsx`, `components/diary/RecordStats.tsx`, `app/layout.tsx`

**Interfaces:**
- Produces: 書く画面は `DeskLayout`/`WritingRail` を経由せず素の `<main className="container mx-auto max-w-3xl p-6">` を返す。`DeskLayout`/`WritingRail`/`SeasonNote` は存在しなくなる。
- Consumes: 既存 `DiaryDateHeader`・`TodayPrompt`・`DiaryEditor`・`getDiaryEntry`・`getTodayPrompt`・`todayInTokyo`（いずれも変更なし）。

- [ ] **Step 1: `app/page.tsx` を全面置換する**

ファイル全体を以下に置き換える（`DeskLayout`/`WritingRail` の import を削除、`<DeskLayout rail=…>` を素の `<main>` に。データ取得は不変）：

```tsx
// app/page.tsx
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry } from '@/lib/db/queries/diary';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, prompt] = await Promise.all([
    getDiaryEntry(date),
    getTodayPrompt(date),
  ]);
  const defaultTab = existing ? 'preview' : 'edit';

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <DiaryDateHeader date={date} />
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </main>
  );
}
```

- [ ] **Step 2: `app/diary/[date]/page.tsx` を全面置換する**

ファイル全体を以下に置き換える（`DeskLayout`/`WritingRail` の import を削除、素の `<main>` に。`todayInTokyo`/`today` は未来日 404 判定で使うので残す。データ取得は不変）：

```tsx
// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { todayInTokyo } from '@/lib/calendar/month-grid';
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

  const today = todayInTokyo();
  if (date > today) {
    notFound(); // 未来日付は 404
  }

  const entry = await getDiaryEntry(date);
  const initialContent = entry?.content ?? '';
  const defaultTab = entry ? 'preview' : 'edit';

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <DiaryDateHeader date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={initialContent}
        defaultTab={defaultTab}
      />
    </main>
  );
}
```

- [ ] **Step 3: `components/layout/HeaderNav.tsx` の `max-w-5xl` をトークン置換する**

49行目の `<nav>` で `max-w-5xl` のみを `max-w-3xl` に変える。**他クラス（`flex items-center justify-between gap-6 px-6 py-4`）は保持**。

置換前（`components/layout/HeaderNav.tsx:49`）:
```tsx
    <nav className="container mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
```
置換後:
```tsx
    <nav className="container mx-auto flex max-w-3xl items-center justify-between gap-6 px-6 py-4">
```

- [ ] **Step 4: `app/history/page.tsx` を幅統一＋左揃えに直す**

3点を変更する。(a) main を `max-w-3xl` に、(b) カレンダー塊の `mx-auto` を外して左揃えに、(c) 中央寄せ前提のコメントを左揃えに更新。

(a) 置換前:
```tsx
    <main className="container mx-auto max-w-5xl p-6">
```
置換後:
```tsx
    <main className="container mx-auto max-w-3xl p-6">
```

(b)+(c) 置換前:
```tsx
      {/* カレンダーは aspect-square セルなので枠いっぱいだと巨大化する。
          快適サイズ（セル ~60px）に収め、積み重ね帯ごと中央寄せ。 */}
      <div className="mx-auto max-w-md">
```
置換後:
```tsx
      {/* カレンダーは aspect-square セルなので枠いっぱいだと巨大化する。
          快適サイズ（セル ~60px）に max-w-md で収め、左揃えで見出し・ヘッダーと左端を揃える。 */}
      <div className="max-w-md">
```

`RecordStats`・`DiaryCalendar`・空状態メッセージの中身は変更しない。

- [ ] **Step 5: `app/insights/page.tsx` の `max-w-5xl`（3箇所）をトークン置換する**

`max-w-5xl` という文字列を3箇所すべて `max-w-3xl` に置換する（32行・45行は `container mx-auto max-w-5xl p-6`、58行は `container mx-auto max-w-5xl space-y-10 p-6`）。**`space-y-10` 等の他クラスは保持**。Edit ツールなら `max-w-5xl`→`max-w-3xl` を `replace_all: true` で実施してよい（このファイルに `max-w-5xl` は3箇所のみ）。

置換後の確認（3 main がいずれも `max-w-3xl`）:
```tsx
// line 32:  <main className="container mx-auto max-w-3xl p-6">
// line 45:  <main className="container mx-auto max-w-3xl p-6">
// line 58:  <main className="container mx-auto max-w-3xl space-y-10 p-6">
```

- [ ] **Step 6: 3コンポーネントを削除する**

Run:
```bash
git rm components/diary/DeskLayout.tsx components/diary/WritingRail.tsx components/diary/SeasonNote.tsx
```
Expected: 3ファイルの `rm '…'` 表示。

- [ ] **Step 7: 参照ゼロと幅統一を grep で確認する**

Run（削除3コンポーネントの参照がゼロ）:
```bash
grep -rn "DeskLayout\|WritingRail\|SeasonNote" --include="*.ts" --include="*.tsx" app components lib | grep -v node_modules
```
Expected: 出力なし。

Run（`max-w-5xl` が app/components（dev 除く）に残っていない）:
```bash
grep -rn "max-w-5xl" --include="*.tsx" app components | grep -v "app/dev/"
```
Expected: 出力なし。

Run（`season.ts` を消していない・`getSeason` は daily-prompt がまだ使う）:
```bash
test -f lib/diary/season.ts && grep -n "getSeason" lib/ai/daily-prompt.ts
```
Expected: `lib/diary/season.ts` が存在し、`daily-prompt.ts` に `getSeason` 参照が出る。

- [ ] **Step 8: 静的検査を全部通す（CI と同じ）**

Run:
```bash
npm run lint && npm run lint:design && npx tsc --noEmit && npm run test && npm run build
```
Expected: すべて PASS（`tsc --noEmit` 0 エラー、`vitest` 既存テスト全 green、`next build` green）。

- [ ] **Step 9: コミット**

Run:
```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(layout): PC文机レイアウトを撤去し全ページ単カラム(max-w-3xl)へ

書く画面(/・/diary/[date])の右レールを撤去し DeskLayout/WritingRail/
SeasonNote を削除、素の単カラム max-w-3xl に復帰。ヘッダー・/history・
/insights も max-w-3xl に統一。/history はカレンダー塊の mx-auto を外し
左揃えにして見出し・ヘッダーと左端を揃える。season.ts(今日の問いが使用)・
保存演出・/history ロジックは不変。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 目視確認（dev サーバーで両画面・両モード・幅）

自動検査では拾えない「右レールが消えたか」「全ページの左端が揃ったか」「/history 左揃えの見え方」を実ブラウザで確認する。

**Files:**（変更なし。確認のみ）

- [ ] **Step 1: dev サーバーを起動する**

Run:
```bash
npm run dev
```
Expected: `http://localhost:3000` で起動。

- [ ] **Step 2: 書く画面（`/`・`/diary/[date]`）を確認**

- `/` が**単カラム**（右レールなし）で、本文は日付→今日の問い→エディタ。
- 過去日を `/history` から開いた `/diary/YYYY-MM-DD` も同様に単カラム・右レールなし。
- 季節のたより・「これまでの記録 →」リンクが消えていること（履歴へはヘッダーの「履歴」タブで行ける）。

- [ ] **Step 3: 全ページの左端が揃っているか確認**

- ヘッダーのナビ左端 ＝ `/`・`/history`・`/insights` の本文左端（`max-w-3xl`、横24px inset）。ページ間を行き来して左端が動かないこと。

- [ ] **Step 4: `/history` の左揃えを確認**

- 見出し「日記の履歴」・`RecordStats`・カレンダーの左端が揃っている（約262pxのズレが消えている）。
- カレンダーが快適サイズ（セル ~60px）。右側に空き（約320px）と、指標の下罫が見出しより短く出るのは仕様（中央寄せコンテナ＋中身左揃え）。不自然に間延びして見えないか。

- [ ] **Step 5: ダーク／モバイルを確認**

- ダークモードで `/`・`/diary/[date]`・`/history`・`/insights` が成立。
- 幅を ~375px に狭め、各ページが単カラムで崩れないこと（旧レールの本文下リンクが消えるのは意図どおり。履歴はヘッダータブで到達可）。

- [ ] **Step 6: dev サーバーを停止する**

`Ctrl-C` で停止。

---

### Task 3: PR を作成し CI green を確認してマージ

**Files:**（変更なし）

- [ ] **Step 1: ブランチを push する**

Run:
```bash
git push -u origin HEAD
```
Expected: 現在のブランチ（`claude/revert-desk-layout`）がリモートに push される。

- [ ] **Step 2: PR を作成する**

Run:
```bash
gh pr create --base main --title "feat(layout): PC文机レイアウトを撤去し全ページ単カラムへ" --body "$(cat <<'EOF'
## 概要
PC向けに入れた文机型2カラム＋右レールを撤去し、改修前の単カラム（max-w-3xl）に全ページ戻す。あわせて /history の見出しとカレンダーの左端ズレを左揃えで解消する。

## 変更
- `DeskLayout`/`WritingRail`/`SeasonNote` を削除し、`/`・`/diary/[date]` を素の単カラム `max-w-3xl` に復帰
- ヘッダー・`/history`・`/insights` を `max-w-3xl` に統一（max-w-5xl のトークン置換、他クラス保持）
- `/history` のカレンダー塊から `mx-auto` を外し左揃え（見出し・ヘッダーと左端一致）

## 不変
- `lib/diary/season.ts`（今日の問いが getSeason を使用）、保存演出、`/history` のロジック・`RecordStats`・`DiaryCalendar`

## 設計
docs/superpowers/specs/2026-06-29-revert-desktop-writing-layout-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: CI を監視する**

Run:
```bash
gh pr checks --watch --interval 15
```
Expected: ci が pass。

- [ ] **Step 4: squash merge する**

Run:
```bash
gh pr merge --squash --delete-branch
```
Expected: マージ成功。（worktree セッションでは `--delete-branch` のローカル checkout が `'main' is already used` で失敗するが**マージ自体はリモートで成立**する。その場合 `gh pr view <N> --json state` が `MERGED` を返すのを確認し、`git push origin --delete claude/revert-desk-layout` で残ったリモートブランチを手動削除する。）

- [ ] **Step 5: main を確認**

Run:
```bash
gh pr view --json state,mergeCommit -q '"state=" + .state + " merge=" + (.mergeCommit.oid // "null")'
```
Expected: `state=MERGED`。（ローカル main の追従はメイン checkout 側で `git checkout main && git pull` を実施。worktree は feature ブランチのまま harness 管理で残す。）

---

## Self-Review（プラン作成者による spec 突き合わせ）

- **spec ① 書く画面を単カラムへ（DeskLayout/WritingRail/SeasonNote 削除）** → Task 1 Step 1, 2, 6。✓
- **spec ② 幅統一（HeaderNav・history・insights を max-w-3xl・トークン置換）** → Task 1 Step 3, 4(a), 5。✓
- **spec ③ /history 左揃え（mx-auto 除去）** → Task 1 Step 4(b)(c)。✓
- **spec やらないこと（season.ts/test 温存・#58 リンク撤去・保存演出不変）** → Task 1 で season.ts に触れず、Step 7 で温存を grep 確認。✓
- **spec 完了基準（grep ゼロ・CI green）** → Task 1 Step 7, 8。✓
- **spec 受け入れ条件（単カラム・左端一致・左揃え・両モード）** → Task 2。✓
- **Placeholder scan:** TBD/TODO・曖昧な「適切に〜」なし。全コードブロックは完全な実ファイル内容／具体的な置換前後。✓
- **Type consistency:** 書く画面2ページとも `<main className="container mx-auto max-w-3xl p-6">` で一致。削除3コンポーネントへの参照は Step 7 grep でゼロ保証。HeaderNav/insights はトークンのみ置換で他クラス保持を明記。✓
- **不変対象の保護:** `lib/diary/season.ts`・`season.test.ts`・`lib/actions/diary.ts`・`/history` ロジックは編集対象に含めていない。✓
