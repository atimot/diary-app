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
  - eyebrow：`<p>` 小さめ（`text-xs`/`text-sm`）・`text-muted-foreground`・`tabular-nums`・`tracking` 広め。`{eyebrow}`。
  - 見出し：`<h1>`（`font-heading` は globals.css の base ルールで自動適用）`text-2xl sm:text-3xl`、`{full}` ＋ 続けて曜日を一段muted（例 `<span className="text-muted-foreground">{weekday}</span>`、間に全角スペース or `gap`）。
- 両ページの既存ベタ見出し（ホーム「`{date} の日記`」、[date]「`{date}`」）をこのコンポーネントに置換。「の日記」表記は廃止（ナビが既に「日記」）。

## ② エディタ / タブ / 保存（`DiaryEditor` ほか）

- **タブ（編集/プレビュー）**：下線スタイル。共有 `components/ui/tabs` は変更せず、`DiaryEditor` 内で `TabsList`/`TabsTrigger` に className を当てて実現（リストの枠・背景を消し、選択中トリガーに `--primary`(若葉)の下線、非選択は `text-muted-foreground`）。`/dev/design` のタブには影響させない。
- **保存**：手動のまま。保存ボタンは既定 `<Button>`＝`bg-primary`（若葉）で据え置き。**成功フィードバックの色を `text-green-600 dark:text-green-400` → `text-muted-foreground`** に変更（静かな「保存しました」）。エラーは `text-destructive` 据え置き。
- **コンテナ**：プレビュー枠（現 `min-h-[15rem] rounded-md border p-4`）を `rounded-xl border bg-card` ＋エディトリアルな余白に。エディタ枠（`RichTextEditor` の `rounded-lg border border-input`）も `rounded-xl border` に統一（角丸・罫をトークンで揃える）。

## ③ プレビュー / 本文タイポ（`.prose` を和モダンに）

編集（Tiptap、`prose prose-neutral`）も表示（react-markdown、`prose prose-neutral`）も `.prose` を使うため、`app/globals.css` に **1か所**追加して両方に効かせる（DRY）。

- 見出し明朝：`.prose :is(h1, h2, h3) { font-family: var(--font-heading); }`（typography プラグインの `--tw-prose-headings` は色用なので font は別指定）。
- 本文の読み物チューニング（軽め）：和文の行間を少し広げる。`.prose :where(p):not(:where([class~="not-prose"] *)) { line-height: 1.9; }`（過度に prose 内部と競合しない範囲で。letter-spacing は据え置き or `0.02em` まで）。
- これらは `@layer base` の外（通常ルール）か `@layer` 内かは Biome の at-rule 順序（AGENTS.md）に反しない場所に置く。色は使わないので lint:design に影響なし。

## 触るファイル

- 新規：`lib/diary/format-date.ts`、`lib/diary/format-date.test.ts`、`components/diary/DiaryDateHeader.tsx`
- 変更：`app/page.tsx`、`app/diary/[date]/page.tsx`、`components/diary/DiaryEditor.tsx`、`components/diary/RichTextEditor.tsx`、`app/globals.css`
- 任意（スコープ内・小）：`app/dev/design/page.tsx` に DiaryDateHeader の見本を1つ追加（見本帳の網羅性向上）。`components/diary/EditorToolbar.tsx` はトークン整合の微調整のみ（機能不変）。

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
