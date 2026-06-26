# 履歴（カレンダー）画面の和モダン化 — 設計（PR2-B）

- 日付: 2026-06-26
- ステータス: 設計（専門エージェントレビュー → 実装）
- 前提: PR1（土台 #37）＋ PR2-A（日記画面 #38）本番マージ済み。本spec＝**PR2 第2弾＝履歴画面**。
- 関連: [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（憲法）、[`2026-06-26-diary-screen-design.md`](2026-06-26-diary-screen-design.md)

## 背景と目的

履歴画面 `app/history/page.tsx` ＋ `components/diary/DiaryCalendar.tsx` を和モダンへ作り込む。PR1のトークン再スキンで記入日は既に若葉(`bg-primary`)になっているが、月タイトル・曜日・streak 表示などが未整備。初期モック（和モダン）のカレンダー像＝記入日=若葉ベタ／今日=リング／**日曜=朱**／月名=**明朝＋和風月名（水無月）**／**streak=明朝の大型数字**、を正とする。

### 確定方針（初期モック＋憲法に基づき決定）

- 月タイトル＝**明朝の和風月名（水無月 等）** ＋ 小さく `YYYY年M月`。
- 曜日ヘッダの **日曜を朱（`--season`）**、未記入の過去の日曜セルも朱寄り。土・平日は muted。
- **streak の 🔥 絵文字を廃止** → lucide `Flame` アイコン ＋ **明朝の大型 tabular 数字**（`rounded-xl border bg-card` の小カード）。
- 記入日セルは `bg-primary`（若葉）据え置き＝**データの可視化**（「書いた日」）。セル角丸 `rounded-md`→`rounded-lg`。
- スコープは履歴画面のみ。分析（PR2-C）に触れない。月送り/プリフェッチ最適化（`CalendarDayLink`）は維持。

### アクセント運用（憲法との整合）

憲法「若葉は1画面1〜2箇所」は**装飾**アクセントの話。カレンダーの記入日若葉ベタは**データ符号化**（メーターと同じ扱い）で例外。意味色として、若葉=記入/streak、朱(`--season`)=日曜（暦）、墨/ニュートラル=その他。新規の生色リテラル・drop-shadow は持ち込まない。ライト/ダーク両対応。

## ① 和風月名ユーティリティ `wafuMonthName`（純関数・TDD）

### `lib/calendar/wafu-month.ts`

```
wafuMonthName(month: number): string  // 1..12 → 睦月..師走
```
- 配列 `['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走']` の `month-1`。
- TDD ケース: `wafuMonthName(1)='睦月'`, `wafuMonthName(6)='水無月'`, `wafuMonthName(12)='師走'`。
- 範囲外（呼び出し側は 1..12 のみ渡す前提＝`month-grid` が保証）だが、安全のため 1..12 以外は空文字を返す（バリデーションは作り込まない＝YAGNI、ただし `undefined` を表示しないガードのみ）。

## ② 月タイトル（`DiaryCalendar`）

- 中央の `<h2 className="text-lg font-semibold">{year}年{month}月</h2>` を、**明朝の和風月名＋小さな年月**に置換:
  - 和風月名：`font-heading`（明朝）、`text-lg`、`{wafuMonthName(month)}`。
  - 年月：`block text-xs text-muted-foreground tabular-nums`、`{year}年{month}月`。
- 前月/翌月リンクは現状維持（token 適合済み。`{prev.year}年{prev.month}月` 等）。「今月へ」も維持。
- `wafuMonthName(month)` の `month` は `DiaryCalendar` の `month` prop をそのまま渡す。月送りは URL `?ym=YYYY-MM` 連動で Server Component が再レンダリングし `year`/`month` が表示月に更新されるため、和風月名も自動追従する。

## ③ 曜日ヘッダ・日曜の朱（`DiaryCalendar`）

- 曜日ヘッダ（`WEEKDAY_LABELS` を回す箇所）で **index 0（日）に `text-season`**、他は `text-muted-foreground`。
- 日付セルの色分け（`cellClasses`）に **日曜（週の先頭列）判定**を渡し、「未記入・当月・過去（非today）の日曜」を `text-muted-foreground`→`text-season` にする。判定は週が日曜始まり7列固定なので、`grid.weeks.flat().map((cell, index) => …)` の **index % 7 === 0** を `isSunday` として `DayCell` の新 prop 経由で `cellClasses` に渡す（iso再パース不要）。
- **`!cell.inMonth`（前後月パディング）と `isFuture` のセルは `isSunday` によらず現状のまま**（パディング=`text-muted-foreground/30`、未来=`/50`）。`cellClasses` の既存の早期 return 分岐順を維持し、`isSunday`→`text-season` は「当月・過去・非today・未記入」の**最後の分岐にだけ**効かせる。
- 記入日（`bg-primary`）・今日リング・未来/前後月は据え置き（日曜でも記入日は若葉ベタのまま＝データ優先）。

## ④ セル角丸（`DiaryCalendar`）

- `cellClasses` の base `rounded-md` → `rounded-lg`。凡例（書いた日/書かなかった日/今日）の見本も整合させる（`rounded-sm` のままで可、または `rounded`）。凡例の色は token 据え置き。
- 凡例に **「日曜（朱）」の見本を1つ追加**（`text-season`/`bg-season` の小四角＋「日曜」）して、日曜=朱の意味をユーザーに示す。

## ⑤ streak 表示（`app/history/page.tsx` ＋ 新規 `StreakBadge`）

- 現状の `🔥 {streak}日連続記入中`（`bg-primary/10 ... text-primary` の絵文字バッジ）を廃止。
- 新規 **`components/diary/StreakBadge.tsx`**（サーバーコンポーネント、props `streak: number`、戻り型 `ReactElement | null`、`streak<=0` は `null`）：
  - `rounded-xl border bg-card` の小カード（横長、`inline-flex items-center gap-3` 程度）。
  - lucide `Flame`（`text-primary`＝若葉）＋ **明朝の大型 tabular 数字**（`font-heading text-2xl tabular-nums`）`{streak}` ＋ 小さく「日連続記入中」（`text-sm text-muted-foreground`）。
- `history/page.tsx`：現在の `mb-6 flex flex-wrap items-baseline gap-3`（h1＋絵文字バッジ横並び）を**解体**し、**h1 を単独**にして、その下（カレンダーの上）に `<StreakBadge streak={streak} />` を**縦積み**で置く（横長カードなので baseline 横並びに馴染まない）。例：`<h1 className="mb-4 text-2xl font-bold">日記の履歴</h1>` の後に `{streak > 0 && <div className="mb-6"><StreakBadge streak={streak} /></div>}`。見出しは base ルールで明朝。

## ⑥ 見本帳（`/dev/design`）

- `StreakBadge` のサンプルを1つ追加（`<StreakBadge streak={12} />`）。既存のカレンダーセル見本はそのまま（日曜朱の見本を1つ足してもよい＝任意）。

## 触るファイル

- 新規：`lib/calendar/wafu-month.ts`、`lib/calendar/wafu-month.test.ts`、`components/diary/StreakBadge.tsx`
- 変更：`components/diary/DiaryCalendar.tsx`、`app/history/page.tsx`、`app/dev/design/page.tsx`
- 変更しない：`lib/calendar/month-grid.ts`、`lib/diary/streak.ts`、`components/diary/CalendarDayLink.tsx`（プリフェッチ最適化を壊さない）。

## 検証

- `wafuMonthName` は TDD（vitest、`lib/**/*.test.ts` 自動収集）。
- `npm run lint` / `npm run lint:design`（色リテラルを増やさない。※`lint:design` は絵文字を対象にしないので、`grep -rn '🔥' app components` 等で 🔥 が残っていないことを別途確認）/ `npx tsc --noEmit` / `npm run test` / `npm run build` 全 green。
- 履歴画面の確認（本番/preview か可能なら dev）：和風月名（明朝）、日曜が朱、記入日が若葉、今日リング、streak カードの明朝大型数字、月送り、ライト/ダーク両方。
- 憲法準拠：色トークンのみ、見出し明朝、意味色（若葉=記入/streak・朱=日曜）、影なし、ダーク対応。
- PRベース：`claude/pr2-history` → CI green → squash merge（本番デプロイ）。

## スコープ外（YAGNI / 後続）

- 分析画面（PR2-C：`--chart-*`/`--center-*`/prose見出し）。
- 「今月の記録 X/30日」等の追加指標、カレンダーのアニメーション、月送りのモーション。
- 和風月名の異名・別表記、二十四節気。

## 未解決事項

なし。
