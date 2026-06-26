# 日記画面（ホーム / [date]）の和モダン化 — 設計（PR2-A）

- 日付: 2026-06-26
- ステータス: 設計承認済み（次は writing-plans）
- 前提: PR1（デザインシステム土台）本番マージ済み（[#37](https://github.com/atimot/diary-app/pull/37), `c106d57`）。本specはその上の **PR2 第1弾＝日記画面**。
- 関連: [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（憲法・トークン）

## 背景と目的

PR1 でトークン/フォント/テーマ/憲法/見本帳/ガードレールを入れ、既存3画面は色・字面だけ自動で和モダン化された「中間状態」。PR2 はその仕上げを画面ごとに行う。本spec＝**日記画面**（今日のホーム `app/page.tsx` と特定日 `app/diary/[date]/page.tsx`、共有の `DiaryEditor`/エディタ/プレビュー）を和モダンのレイアウト・タイポへ作り込む。

### 確定済み方針（ユーザー承認）

- 日付ヘッダ＝**横組みの大型明朝＋曜日**（例「2026年6月26日 金曜日」）＋小さな英字日付。
- 季節/二十四節気ラベルは**添えない**（曜日のみ）。
- 保存は**手動のまま**。成功表示を緑(off-token)から和モダンのトークン色へ。
- スコープ：日記画面一式（両ページ＋エディタ/プレビューのタイポ）。自動保存・縦組み・季節ラベルは**対象外**。

## ① 日付ヘッダ（新規・共有）

### `lib/diary/format-date.ts`（純関数・TDD）

```
formatDiaryDate(iso: string): { eyebrow: string; full: string; weekday: string }
```
- 入力 `iso` は `YYYY-MM-DD`（Asia/Tokyo のカレンダー日付）。
- 曜日はタイムゾーン非依存に算出：`Date.UTC(y, m-1, d)` → `getUTCDay()`（0=日…6=土）を `['日','月','火','水','木','金','土']` で引き `+ '曜日'`。
- `eyebrow` = ゼロ埋めドット表記 `2026.06.26`。
- `full` = 非ゼロ埋め `2026年6月26日`。
- TDD ケース（確実な既知アンカーで曜日を検証）:
  - `formatDiaryDate('2000-01-01')` → `{ eyebrow:'2000.01.01', full:'2000年1月1日', weekday:'土曜日' }`（2000-01-01＝土曜の既知アンカー）
  - `formatDiaryDate('2024-01-01')` → `{ eyebrow:'2024.01.01', full:'2024年1月1日', weekday:'月曜日' }`（2024-01-01＝月曜の既知アンカー。`eyebrow` のゼロ埋め `01` と `full` の非ゼロ埋め `1月1日` の差も検証）
  - `formatDiaryDate('2026-06-26')` → `{ eyebrow:'2026.06.26', full:'2026年6月26日' }`（eyebrow/full の整形を検証。曜日の正しさは上2件のアンカーでアルゴリズムを担保）
  - 入力バリデーションは呼び出し側（ページの `DATE_PATTERN` と未来日 404）が担保するため、本関数は `YYYY-MM-DD` を受ける前提でよい（不正入力ハンドリングは作り込まない＝YAGNI）。

### `components/diary/DiaryDateHeader.tsx`（サーバーコンポーネント）

- props: `date: string`（`YYYY-MM-DD`）。
- 描画：
  - eyebrow：`<p>` `text-xs`・`uppercase`・`tracking-[0.18em]`・`text-muted-foreground`・`tabular-nums`（土台 spec §① の eyebrow 型に合わせる）。`{eyebrow}`。
  - 見出し：`<h1>`（`font-heading` は globals.css の base ルールで自動適用）`text-2xl sm:text-3xl`、`{full}` ＋ 続けて曜日を一段muted（例 `<span className="text-muted-foreground">{weekday}</span>`、間に全角スペース or `gap`）。
- 両ページの既存ベタ見出し（ホーム「`{date} の日記`」、[date]「`{date}`」）をこのコンポーネントに置換。「の日記」表記は廃止（ナビが既に「日記」）。

## ② エディタ / タブ / 保存（`DiaryEditor` ほか）

- **タブ（編集/プレビュー）**：`components/ui/tabs` に既存の `variant="line"` があるので `TabsList` に渡す（下線スタイル）。既定の下線色は `foreground`（黒）なので `TabsTrigger` に `after:bg-primary` の className を足して**若葉の下線**にし、非選択は `text-muted-foreground`。共有 ui は変更しない（`/dev/design` のタブは variant 未指定なので無影響）。
- **保存**：手動のまま。保存ボタンは既定 `<Button>`＝`bg-primary`（若葉）で据え置き。**成功フィードバックの色を `text-green-600 dark:text-green-400` → `text-muted-foreground`** に変更（静かな「保存しました」）。エラーは `text-destructive` 据え置き。※この緑→トークンの1行は現コード（`DiaryEditor.tsx`）に残存しているので**忘れず修正**（off-token を1件解消）。
- **コンテナ**：プレビュー枠（現 `min-h-[15rem] rounded-md border p-4`）を `rounded-xl border bg-card` ＋エディトリアルな余白に。エディタ枠（`RichTextEditor` の `rounded-lg border border-input`）も `rounded-xl border` に統一（角丸・罫をトークンで揃える）。

## ③ プレビュー / 本文タイポ（`.prose` を和モダンに）

編集（Tiptap、`prose prose-neutral`）も表示（react-markdown、`prose prose-neutral`）も `.prose` を使うため、`app/globals.css` に **1か所**追加して両方に効かせる（DRY）。

- **波及方針（明示）**：`.prose` への変更はデザインシステム全体の prose 既定として **意図的にグローバル**に効かせる。現状 `.prose` を使うのは日記のエディタ/プレビューのみ（insights 等は plain `<p>`）。将来 prose を使う画面にも同じ読み物体裁が乗るのは望ましいので `DiaryMarkdown` 等には閉じない。
- 見出し明朝：`.prose :is(h1, h2, h3) { font-family: var(--font-heading); }` を**明示**で置く。実は PR1 の base ルール `h1,h2,h3{font-family:var(--font-heading)}` が prose 見出しにも効く（typography は font-family を設定しないため）が、レイヤ順の取りこぼしを避ける belt-and-suspenders として `.prose` 文脈にも明示する。
- 本文の読み物チューニング（軽め）：`.prose p { line-height: 1.9; }`（このアプリの `.prose` 内に `not-prose` ネストは無いので簡略セレクタで十分）。letter-spacing は据え置き。
- 配置は AGENTS.md の at-rule 順序（`@import` 系を先・`@plugin` 系を後）に反しない通常ルールとして置く。色は使わないので lint:design に影響なし。

## 触るファイル

- 新規：`lib/diary/format-date.ts`、`lib/diary/format-date.test.ts`、`components/diary/DiaryDateHeader.tsx`
- 変更：`app/page.tsx`、`app/diary/[date]/page.tsx`、`components/diary/DiaryEditor.tsx`、`components/diary/RichTextEditor.tsx`、`app/globals.css`
- スコープ内（小）：`app/dev/design/page.tsx` に `DiaryDateHeader` の見本を1つ追加（検証を楽に＋憲法5条の再利用導線）。`components/diary/RichTextEditor.tsx` の loading スケルトン（`rounded-lg border border-input`）も `rounded-xl border` に合わせ、ロード中のガタつきを防ぐ。
- 変更しない：`components/diary/EditorToolbar.tsx` は既にトークン適合（`bg-background/90`・`bg-border`・`Button`）のため原則さわらない。

## 検証

- `formatDiaryDate` は TDD（vitest、`lib/**/*.test.ts` が自動収集）。
- `npm run lint` / `npm run lint:design`（緑文字除去で color literal は増えない・むしろ off-token を1つ解消）/ `npx tsc --noEmit` / `npm run test` / `npm run build` 全 green。
- `/dev/design` と実画面（ホーム＝今日、`/diary/<過去日>`、未記入日＝編集タブ既定）をライト/ダーク両方でスクショ確認。曜日・明朝見出し・下線タブ・若葉保存・プレビューの明朝見出しを確認。
- 憲法準拠：色はトークン、見出し明朝、アクセント（若葉）は保存ボタン＋選択タブの下線に限定。
- PRベース：新ブランチ→CI green→squash merge（本番デプロイ）。

## スコープ外（YAGNI / 後続）

- 自動保存、季節/二十四節気ラベル、縦組み日付。
- 履歴（カレンダー）・分析画面の作り込み（PR2-B / PR2-C）。
- エニアグラムのインライン色（`--center-*`）の和モダン再調整（分析画面のPRで）。

## 未解決事項

なし。
