# 分析（エニアグラム）画面の和モダン化（PR2-C）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** 分析画面のエニアグラム可視化を和モダンへ — 3中心色トークン `--center-*` を和の顔料色（黄土/茜/藍）に再調律し、`var(--center-*)` 経由で全コンポーネントを一括追従。本文行間を読み物調整、見本帳に中心色を追加。

**Architecture:** エニアグラムの色は全て `CENTER_COLOR_VARS`→`var(--center-gut/heart/head)` 経由のインライン style なので、`app/globals.css` の3変数（light/dark）を書き換えるだけで Hero/Symbol/Centers/Legend/TopBars が自動で新色になる（コンポーネント編集なし）。加えて `insights/page.tsx` のサマリ/アドバイス本文を `leading-loose` に、`/dev/design` に中心色スウォッチを追加。

**Tech Stack:** Next.js 16 App Router, Tailwind v4（CSS変数）, oklch。

## Global Constraints

- 色は token/`var(--…)` のみ。**生hex・任意色・新規インライン色リテラル禁止**（`npm run lint:design`）。off-token named color も不可。**絵文字なし**。
- 中心色3色＝**データ分類の符号化**（憲法「アクセント1〜2箇所」=装飾の話の例外。メーター/カレンダー記入日と同じ）。若葉/朱は分析画面で使わない。
- エニアグラム各コンポーネントの**構造・ロジック・クラスは変更しない**（色は token 経由で追従）。見出しは base ルールで既に明朝。`.prose` は insights 不使用。
- `--chart-*` は未使用のため**変更しない**。スコープは分析画面＋`--center-*` のみ（`components/insights/*`・`lib/enneagram/types.ts`・他画面・他トークンに触れない）。ダーク両対応。
- Biome：JS/TS シングルクォート。PRベース（main直push不可、squash merge）。

**作業ブランチ:** `claude/pr2-insights`（最新 main 起点。spec/plan を含む）。1 PR として squash merge。

**ビルド用 dummy env:** `DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000`

---

### Task 1: 中心色トークンの和モダン再調律（`app/globals.css`）

**Files:**
- Modify: `app/globals.css`（`:root` と `.dark` の `--center-gut/heart/head` のみ）

- [ ] **Step 1: ライト（`:root`）の3行を置換**

`app/globals.css` の `:root` ブロック内:

```css
  --center-gut: oklch(0.6 0.13 70);
  --center-heart: oklch(0.58 0.15 15);
  --center-head: oklch(0.55 0.13 250);
```
→
```css
  --center-gut: oklch(0.58 0.085 75);
  --center-heart: oklch(0.52 0.12 25);
  --center-head: oklch(0.44 0.09 255);
```

- [ ] **Step 2: ダーク（`.dark`）の3行を置換**

`app/globals.css` の `.dark` ブロック内:

```css
  --center-gut: oklch(0.78 0.13 70);
  --center-heart: oklch(0.72 0.15 15);
  --center-head: oklch(0.72 0.13 250);
```
→
```css
  --center-gut: oklch(0.75 0.085 78);
  --center-heart: oklch(0.7 0.12 25);
  --center-head: oklch(0.72 0.1 258);
```

（`--chart-*` は触らない。他の `:root`/`.dark` 変数も触らない。）

- [ ] **Step 3: 検証**

Run: `npm run lint && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。`lint:design` は globals.css を走査しないので無影響。

- [ ] **Step 4: コミット**

```bash
git add app/globals.css
git commit -m "feat(insights): エニアグラム中心色を和の顔料色(黄土/茜/藍)へ再調律

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 本文タイポ＋見本帳の中心色スウォッチ

**Files:**
- Modify: `app/insights/page.tsx`（has-data 状態の本文 leading）
- Modify: `app/dev/design/page.tsx`（中心色スウォッチ追加）

- [ ] **Step 1: サマリ/アドバイス本文を `leading-loose` に**

`app/insights/page.tsx` の has-data 状態（state 3）の2つの本文 `<p>`（summary と advice）のクラスを置換:

```tsx
            <p className="whitespace-pre-wrap leading-relaxed">
              {insight.summary}
            </p>
```
→
```tsx
            <p className="whitespace-pre-wrap leading-loose">
              {insight.summary}
            </p>
```

および

```tsx
            <p className="whitespace-pre-wrap leading-relaxed">
              {insight.advice}
            </p>
```
→
```tsx
            <p className="whitespace-pre-wrap leading-loose">
              {insight.advice}
            </p>
```
（他の状態の本文・`RegenerateButton`・見出しは変更しない。）

- [ ] **Step 2: `/dev/design` に中心色スウォッチを追加**

`app/dev/design/page.tsx` の `Showcase` 内（カラートークンのセクションの近く）に1セクション追加:

```tsx
      <section className="space-y-3">
        <h2>エニアグラム中心色（データ分類専用）</h2>
        <div className="flex gap-4">
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-gut)' }}
            />
            <span className="block text-xs text-muted-foreground">gut 黄土</span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-heart)' }}
            />
            <span className="block text-xs text-muted-foreground">heart 茜</span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-head)' }}
            />
            <span className="block text-xs text-muted-foreground">head 藍</span>
          </div>
        </div>
      </section>
```
（`app/dev/**` はガードレール除外なので `style={{ backgroundColor: 'var(--center-*)' }}` で問題ない。色リテラルでもない。）

- [ ] **Step 3: 検証**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。

- [ ] **Step 4: コミット**

```bash
git add app/insights/page.tsx app/dev/design/page.tsx
git commit -m "feat(insights): サマリ本文を読み物行間に・見本帳に中心色スウォッチ追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 最終検証＋PR

**Files:** （コードなし）

- [ ] **Step 1: フルチェック**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build
```
Expected: すべて PASS（テスト数は既存のまま=81。本PRは純関数追加なし）。

- [ ] **Step 2: スクショ（任意）**

分析画面は DB＋認証＋7件以上の日記が必要なためローカル実描画は難しい。`/dev/design`（中心色スウォッチを含む）をライト/ダークで撮れれば撮る。撮れない場合はコードレビュー＋build＋本番/preview で確認。

- [ ] **Step 3: PR を作成し CI green を確認**

```bash
git push -u origin claude/pr2-insights
gh pr create --base main --fill --title "feat(insights): 分析画面の和モダン化（エニアグラム中心色を和の顔料色へ）"
gh pr checks --watch
```
CI green 後、**本番マージ** `gh pr merge --squash --delete-branch`（マージ＝本番デプロイ）。これで和モダン刷新（PR1+2A+2B+2C）完了。

---

## Self-Review（spec との突き合わせ）

- spec ① `--center-*` 再調律（light/dark、藍 head は L=0.44） → Task 1 ✓
- spec ② 本文 `leading-loose`（has-data の summary/advice のみ） → Task 2 Step1 ✓
- spec ③ 見本帳の中心色スウォッチ → Task 2 Step2 ✓
- 触らない：`components/insights/*`・`lib/enneagram/types.ts`・`--chart-*`・他画面 → 対象外 ✓
- 憲法：色は token/var のみ（生リテラルなし）、中心色＝データ分類、見出し明朝、ダーク両対応 ✓
- プレースホルダ無し。値は spec と一致（light gut 0.58/0.085/75・heart 0.52/0.12/25・head 0.44/0.09/255、dark gut 0.75/0.085/78・heart 0.7/0.12/25・head 0.72/0.1/258）。
```
