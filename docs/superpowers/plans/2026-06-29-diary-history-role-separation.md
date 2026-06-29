# 日記/履歴の役割分離（書斎モデル） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 書く画面（`/` と `/diary/[date]`）から `StreakPanel`（連続日数・当月カレンダー・月統計）を撤去し、右レールを「季節のたより＋ `/history` への控えめな導線リンク」だけにする。

**Architecture:** `StreakPanel.tsx` を削除し、`WritingRail` の props を `focusDate` のみに縮小、`SeasonNote` ＋履歴リンクを描画する。`WritingRail` の2つの呼び出し元（`app/page.tsx` と `app/diary/[date]/page.tsx`）から `listEntryDates()`/`computeStreak` の取得を撤去し `focusDate` のみ渡す。この型結合のため**1コミットで原子的に**変更する（中間状態は tsc が通らない）。`/history` と `saveDiaryEntry`（保存時演出のストリーク供給源）は触らない。

**Tech Stack:** Next.js 16（App Router・RSC）、TypeScript、Tailwind v4 + 和モダンデザイントークン、Biome、Vitest。

**設計の根拠:** [`docs/superpowers/specs/2026-06-29-diary-history-role-separation-design.md`](../specs/2026-06-29-diary-history-role-separation-design.md)（多視点レビュー反映済み）。

## Global Constraints

- **色は必ずトークン**。生hex・`rgb()/hsl()/oklch()` リテラル・任意色クラス・インラインstyle色 禁止（`app/globals.css` と `app/dev/**` 以外）。`npm run lint:design` で機械チェック。
- **書く画面に新規アクセントを足さない**。追加する履歴リンクは `text-muted-foreground` → hover `text-foreground` の **muted のみ**（若葉・朱を使わない）。
- **新規 drop-shadow 禁止**。深度は罫＋明度差（`border-t pt-6` 等）で出す。
- **11px未満禁止**（リンクは `text-sm` = 14px）。**light/dark 両対応必須**（トークンで自動・両モードで目視）。
- **Biome スタイル**：`components/**`・`app/**` の新規/編集 TS/JSX は `quoteStyle: 'single'`、`jsxQuoteStyle: 'double'`。import 順は `organizeImports`（外部 → `@/` エイリアス）。
- **PR ベース運用**：main へ直 push 不可。ブランチで作業 → CI（lint / lint:design / tsc / test / build）green → `gh pr merge --squash --delete-branch`。
- **`/history`・`lib/diary/streak.ts`・`lib/actions/diary.ts`・`SeasonNote.tsx` の中身は変更しない。** `buildMonthGrid` / `computeStreak` / `computeLongestStreak` は他で使うので残す。

---

### Task 1: 書く画面から StreakPanel を撤去し、レールを季節＋履歴リンクに簡素化

型結合（`WritingRail` の props 変更・2呼び出し元・`StreakPanel` 削除）のため、中間で tsc が通る状態が作れない。**4ファイルをまとめて変更し1コミット**にする。

**Files:**
- Modify: `components/diary/WritingRail.tsx`（全面書き換え）
- Modify: `app/page.tsx`（データ取得削減・props 縮小）
- Modify: `app/diary/[date]/page.tsx`（データ取得削減・props 縮小）
- Delete: `components/diary/StreakPanel.tsx`
- 触らない（確認のみ）: `components/diary/SeasonNote.tsx`, `components/diary/DeskLayout.tsx`, `lib/actions/diary.ts`, `lib/diary/streak.ts`, `app/history/page.tsx`

**Interfaces:**
- Produces: `WritingRail({ focusDate }: { focusDate: string })` — 旧 `{ streak, entryDates, focusDate, today }` から `focusDate` のみへ縮小。`SeasonNote` には従来通り `date={focusDate}` で渡す（`SeasonNote` の prop 名 `date` は変えない）。
- Consumes: 既存 `SeasonNote({ date }: { date: string })`、`DeskLayout`（`rail` prop。lg 未満ではレールを本文下へ縦積み）、`getDiaryEntry` / `getTodayPrompt` / `todayInTokyo`（変更なし）。

**注:** これは削除中心のリファクタで、対象コンポーネントにユニットテストは存在しない（grep で確認済み・component テスト 0 件）。新規ユニットテストは書かない。検証は **grep ＋ tsc ＋ lint ＋ build ＋ 目視**（Task 2）で行う。既存 `lib/diary/streak.test.ts` は触らず green のまま。

- [ ] **Step 1: `components/diary/WritingRail.tsx` を書き換える**

ファイル全体を以下に置き換える：

```tsx
// components/diary/WritingRail.tsx
import Link from 'next/link';
import { SeasonNote } from '@/components/diary/SeasonNote';

interface WritingRailProps {
  focusDate: string; // YYYY-MM-DD（書いている日）
}

// 右レール（文机の道具一式）。季節のたよりと、履歴への控えめな導線を縦に積む。
export function WritingRail({ focusDate }: WritingRailProps) {
  return (
    <div className="space-y-6">
      <SeasonNote date={focusDate} />
      <div className="border-t pt-6">
        <Link
          href="/history"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          これまでの記録 →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `app/page.tsx` のデータ取得を削減し props を縮小する**

ファイル全体を以下に置き換える（`listEntryDates` / `computeStreak` の import と使用を撤去、`Promise.all` を2本に、`WritingRail` へ `focusDate` のみ）：

```tsx
// app/page.tsx
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { WritingRail } from '@/components/diary/WritingRail';
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
    <DeskLayout rail={<WritingRail focusDate={date} />}>
      <DiaryDateHeader date={date} />
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </DeskLayout>
  );
}
```

- [ ] **Step 3: `app/diary/[date]/page.tsx` のデータ取得を削減し props を縮小する**

ファイル全体を以下に置き換える（`listEntryDates` / `computeStreak` を撤去、`Promise.all` を単体 `await` に、`WritingRail` へ `focusDate` のみ。`todayInTokyo`/`today` は未来日 404 判定で使うので残す）：

```tsx
// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { WritingRail } from '@/components/diary/WritingRail';
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
    <DeskLayout rail={<WritingRail focusDate={date} />}>
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

- [ ] **Step 4: `components/diary/StreakPanel.tsx` を削除する**

Run:
```bash
git rm components/diary/StreakPanel.tsx
```
Expected: `rm 'components/diary/StreakPanel.tsx'`

- [ ] **Step 5: 参照ゼロを grep で確認する**

Run:
```bash
grep -rn "StreakPanel" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```
Expected: 出力なし（exit 1）。何か出たら撤去漏れ。

Run:
```bash
grep -rnE "WritingRail[^>]*\b(streak|entryDates|today)=" --include="*.tsx" . | grep -v node_modules
```
Expected: 出力なし。`WritingRail` に `streak`/`entryDates`/`today` を渡す箇所が残っていないこと。

Run（未使用 import が残っていないか）:
```bash
grep -rn "listEntryDates\|computeStreak" app/page.tsx "app/diary/[date]/page.tsx"
```
Expected: 出力なし（両ページから撤去済み）。

- [ ] **Step 6: 静的検査を全部通す（CI と同じ）**

Run:
```bash
npm run lint && npm run lint:design && npx tsc --noEmit && npm run test && npm run build
```
Expected: すべて PASS。特に `npx tsc --noEmit` が `WritingRail` の props 変更後の2ページで型エラーを出さないこと、`npm run build` が green、`npm run test`（`lib/diary/streak.test.ts` 等）が不変で green。

- [ ] **Step 7: コミット**

Run:
```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(diary): 書く画面から StreakPanel を撤去しレールを季節＋履歴リンクに

/ と /diary/[date] の右レールから連続日数・当月カレンダー・月統計を撤去。
WritingRail を focusDate のみに簡素化し SeasonNote ＋「これまでの記録 →」リンク
だけにする。両ページから listEntryDates/computeStreak を撤去（/ の DB クエリ−1本）。
保存時演出（今日でN日目）と /history は不変。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 目視確認（dev サーバーで両画面・両モード）

自動検査では拾えない「書く画面が静かになったか」「レールの見た目・モバイル縦積み・履歴遷移」を実ブラウザで確認する。

**Files:** （変更なし。確認のみ）

- [ ] **Step 1: dev サーバーを起動する**

Run:
```bash
npm run dev
```
Expected: `http://localhost:3000` で起動。

- [ ] **Step 2: `/`（書く画面）を確認する**

ブラウザで `http://localhost:3000/` を開き、以下を目視：
- 右レールに **連続日数・当月カレンダー（点列）・月統計が出ていない**こと。
- レールは **「季節のたより」＋「これまでの記録 →」リンク**のみ。
- リンクは muted（若葉・朱でない）。hover で前景色に変わる。新規の影が出ていない。

- [ ] **Step 3: 履歴遷移と過去日編集ページを確認する**

- 「これまでの記録 →」をクリック → `/history` に遷移すること。
- `/history` のカレンダーで過去日（記入済み or 未記入）を開く → `/diary/YYYY-MM-DD` でも**同じ「書くだけ＋季節＋履歴リンク」レール**になっていること（StreakPanel が出ない）。

- [ ] **Step 4: 保存時演出が健在か確認する**

- `/` でエディタに何か書いて保存 → 「今日で N 日目。よく続いています。」が従来通り出ること。

- [ ] **Step 5: ダークモード・モバイル幅を確認する**

- ダークモードに切り替え、`/` と `/diary/[date]` で文字・罫・リンクが両モードで成立すること。
- ブラウザ幅を lg 未満（~375px）に狭め、レール（季節＋履歴リンク）が**本文の下に縦積み**で現れること（消えない）。加えてヘッダーの「履歴」タブからも `/history` に行けること。

- [ ] **Step 6: dev サーバーを停止する**

`Ctrl-C` で停止。

---

### Task 3: PR を作成し CI green を確認してマージ

**Files:** （変更なし）

- [ ] **Step 1: ブランチを push する**

Run:
```bash
git push -u origin HEAD
```
Expected: 現在のブランチがリモートに push される。

- [ ] **Step 2: PR を作成する**

Run:
```bash
gh pr create --base main --title "feat(diary): 書く画面から StreakPanel を撤去し履歴と役割分離" --body "$(cat <<'EOF'
## 概要
書く画面（`/`・`/diary/[date]`）の右レールから連続日数・当月カレンダー・月統計（`StreakPanel`）を撤去し、「季節のたより＋『これまでの記録 →』リンク」だけにする。日記を書く面を静かにし、履歴の閲覧は `/history` に集約する。

## 変更
- `components/diary/StreakPanel.tsx` を削除
- `components/diary/WritingRail.tsx` を `focusDate` のみに簡素化（SeasonNote ＋履歴リンク）
- `app/page.tsx` / `app/diary/[date]/page.tsx` から `listEntryDates`/`computeStreak` を撤去（`/` の DB クエリ−1本）

## 不変
- 保存時演出（「今日でN日目」）、`/history`、`lib/diary/streak.ts`、`lib/actions/diary.ts`

## 設計
docs/superpowers/specs/2026-06-29-diary-history-role-separation-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: CI を監視する**

Run:
```bash
gh pr checks --watch
```
Expected: lint / lint:design / tsc / test / build がすべて green。

- [ ] **Step 4: squash merge する**

Run:
```bash
gh pr merge --squash --delete-branch
```
Expected: マージ成功。（worktree セッションではリモートブランチが残る既知事象あり。残ったら `git push origin --delete <branch>` で手動削除。）

- [ ] **Step 5: main に追従する**

Run:
```bash
git checkout main && git pull
```
Expected: マージ済みコミットが main に取り込まれる。

---

## Self-Review（プラン作成者による spec 突き合わせ）

- **Spec §① `/` 改修** → Task 1 Step 2。✓
- **Spec §① `/diary/[date]` 改修（blocker）** → Task 1 Step 3。✓
- **Spec §① `StreakPanel` 削除・`WritingRail` 簡素化・`SeasonNote` prop 名 `date` 保持** → Task 1 Step 1, 4。✓
- **Spec §④ 当月記入率は退役（移設しない）** → 本プランに移設タスクなし＝退役を反映。✓
- **Spec §⑤ レール下部 muted 履歴リンク・モバイルは本文下** → Task 1 Step 1（リンク）＋ Task 2 Step 5（モバイル縦積み確認）。✓
- **Spec テスト・ガード（grep ゼロ・CI green）** → Task 1 Step 5, 6。✓
- **Spec 受け入れ条件（書く面が静か・保存演出健在・両モード）** → Task 2。✓
- **Placeholder scan:** TBD/TODO・曖昧な「適切に〜」なし。全コードブロックは完全な実ファイル内容。✓
- **Type consistency:** `WritingRail({ focusDate }: { focusDate: string })` を Task 1 Step 1 で定義し、Step 2/3 の両ページが `focusDate={date}` で一致。`SeasonNote` は `date` prop のまま。✓
- **不変対象の保護:** `/history`・`streak.ts`・`actions/diary.ts`・`SeasonNote.tsx` は編集対象に含めていない。✓
