# PC文机レイアウトの巻き戻し（右レール撤去・単カラム復帰・/history 幅修正）— 設計

- 日付: 2026-06-29
- ステータス: 設計承認済み（次は writing-plans）
- 背景の思想: PC向けに入れた「文机型2カラム＋右レール」をやめ、改修前のシンプルな単カラム（`max-w-3xl`）に全ページ戻す。書く面は「書く」だけ、各ページの横幅を揃える。
- 関連:
  - [`2026-06-28-desktop-writing-experience-design.md`](2026-06-28-desktop-writing-experience-design.md)（**本spec が巻き戻す対象**。DeskLayout 2カラム・WritingRail・max-w-5xl 化を導入した spec）
  - [`2026-06-29-diary-history-role-separation-design.md`](2026-06-29-diary-history-role-separation-design.md)（直近で StreakPanel を撤去しレールを SeasonNote＋履歴リンクだけにした spec。本spec はそのレール自体を撤去）
  - [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（和モダン憲法・トークン）

## 背景と目的

`#48`（[`2026-06-28-desktop-writing-experience-design.md`](2026-06-28-desktop-writing-experience-design.md)）で「文机型2カラム」レイアウトを導入し、書く画面に右レール（連続日数・季節・等）を置いた。その後 `#58` でレールは `SeasonNote`＋「これまでの記録 →」リンクだけに痩せた。

ユーザー判断：**右レールそのものが不要**。PC向けの大規模レイアウト改修を**改修前（全ページ単カラム `max-w-3xl`）に巻き戻す**。あわせて `/history` の「幅があってない」問題（下記）も解消する。

### 改修前の状態（＝戻す先）

`#48` 以前は全ページが `container mx-auto max-w-3xl p-6` の中央1カラム固定（`app/page.tsx`・`app/diary/[date]/page.tsx`・`app/history/page.tsx`・`app/insights/page.tsx`・`HeaderNav`）。`lg:`/`xl:` のレイアウト分岐はゼロ。

### `/history` の幅不一致（実態）

`app/history/page.tsx` は `max-w-5xl p-6` の `<main>` の中で、見出し `<h1>日記の履歴</h1>` を全幅・左揃えで出し、その直下の `RecordStats`＋`DiaryCalendar` を `<div className="mx-auto max-w-md">`（448px・中央寄せ）に入れている。結果、**兄弟要素である見出しとカレンダー塊の左端がデスクトップで約262pxズレる**。原因は `42eff42`（カレンダー巨大化の修正）で塊を中央寄せした際に、見出しを `max-w-md` ラッパーの外に残したこと。

### 確定済み方針（ユーザー承認）

- **巻き戻し範囲＝全ページ**：ヘッダー・`/`・`/diary/[date]`・`/history`・`/insights` をすべて `max-w-3xl` 単カラムへ戻す。
- **右レール一式を削除**：`DeskLayout`・`WritingRail`・`SeasonNote` を撤去（季節のたよりは本文に移さず**完全削除**）。
- **`/history` は左揃え**：見出し・指標・カレンダーの左端を、ヘッダー／他ページの本文左端と揃える（アプリ既存の「中央寄せコンテナ＋中身は左揃え」作法に一致）。カレンダーは快適サイズ（セル約60px＝`max-w-md`）を維持。

### やらないこと（YAGNI）

- `git revert` はしない。`#48` は今も使う機能（今日の問い `TodayPrompt`／保存演出）と絡むため、**前向きな手編集で実質巻き戻す**。
- 本文の構成（日付ヘッダー → 今日の問い → エディタ）・データ取得・保存演出・`/history` の `RecordStats`/`DiaryCalendar` の中身・`/insights` の中身は**変えない**（横幅クラスだけ戻す）。
- **`lib/diary/season.ts` と `lib/diary/season.test.ts` は削除しない**。`getSeason` を `lib/ai/daily-prompt.ts`（今日の問い）が使い続けるため、`SeasonNote` 撤去後も dead code にならない（grep 確認済み）。**削除するのは `SeasonNote.tsx` コンポーネントのみ**。
- **#58 でレールに置いた「これまでの記録 →」リンクも `WritingRail` ごと撤去される。** `/history` への導線は `HeaderNav` の「履歴」タブ（全ページ共通・PC/モバイル両対応）に一本化され到達性は維持される（#58 spec の受け入れ条件4は本変更で無効化される）。
- **季節情緒（節気の朱）** は書く画面のレールからは消えるが、今日の問い（`getSeason` 由来）と `/history` カレンダーの日曜セルには残るため、画面から完全には消えない（意図的に許容）。

## アクセント予算（憲法 §3）

レイアウト巻き戻しのみで**新規アクセントを足さない**。むしろ `SeasonNote` の朱（節気名）が消えて朱の使用が減る。トークン以外の色リテラルは追加しない（`lint:design`）。

## ① 書く画面（`/`・`/diary/[date]`）を単カラムへ

両ページは現在 `DeskLayout` を `rail={<WritingRail focusDate={date} />}` 付きで使っている。これを改修前の素の `<main>` に戻す。

- `app/page.tsx`：
  - `DeskLayout` と `WritingRail` の import を削除。
  - `<DeskLayout rail={<WritingRail focusDate={date} />}> … </DeskLayout>` を `<main className="container mx-auto max-w-3xl p-6"> … </main>` に置換。
  - 中身（`DiaryDateHeader` → `TodayPrompt` → `DiaryEditor`）はそのまま。データ取得（`getDiaryEntry`＋`getTodayPrompt`）も不変。
- `app/diary/[date]/page.tsx`：
  - 同様に `DeskLayout`/`WritingRail` の import を削除し、`<main className="container mx-auto max-w-3xl p-6"> … </main>` に置換。
  - 中身（`DiaryDateHeader` → `DiaryEditor`）・データ取得（`getDiaryEntry`）は不変。`todayInTokyo`/`today`（未来日 404 判定）は残す。

### 削除するファイル

- `components/diary/DeskLayout.tsx`（2カラム土台。`/`・`/diary/[date]` 以外から参照されていないことを grep 確認）
- `components/diary/WritingRail.tsx`（右レール本体）
- `components/diary/SeasonNote.tsx`（季節のたより。**コンポーネントのみ削除**。ロジック `lib/diary/season.ts` は今日の問いが使うため残す）

## ② 全ページの横幅を `max-w-3xl` に統一

`#48` 以降に `max-w-5xl` へ広げた箇所を `max-w-3xl` に戻し、ヘッダーと全本文の左端を揃える。

- `components/layout/HeaderNav.tsx`：`<nav>` の `container mx-auto max-w-5xl px-6 py-4` → `container mx-auto max-w-3xl px-6 py-4`（横 padding `px-6` は本文 `p-6` と揃え左端一致。`py-4` 維持）。※ pre-#48 のヘッダーは `p-4`（横16px）だが**そこには戻さない**。#55 で入れた `px-6` を温存し本文 `p-6`（横24px）と左端を一致させる（`p-4` に戻すと 8px ズレが復活する）＝完全巻き戻しではなく #55 の改善は保つ。
- `app/history/page.tsx`：`<main>` の `max-w-5xl` → `max-w-3xl`（③で内部も直す）。
- `app/insights/page.tsx`：`max-w-5xl` の**全3箇所（32 / 45 / 58 行）**を `max-w-3xl` に。**`max-w-5xl` というトークンのみを置換**し、同一 className 内の他クラス（58行の `space-y-10` 等）は保持する。中身は不変。
- 念のため、リポジトリ全体で `max-w-5xl` をプラン段階で grep し、上記以外に残っていないことを確認（`app/dev/**` は対象外でよい）。`components/diary/DeskLayout.tsx:16` にも `max-w-5xl` があるが、これは**ファイルごと削除**されるため別途対応不要。

## ③ `/history` の左端ズレを解消（左揃え）

- `app/history/page.tsx` の `<div className="mx-auto max-w-md">` を `<div className="max-w-md">` に変更（`mx-auto` を外して**左揃え**）。これで `RecordStats`＋`DiaryCalendar` の左端が、見出し `<h1>` および `<main>`（＝ヘッダー）の左端と揃う。
- カレンダーは `max-w-md`（448px）を維持＝セル約60pxの快適サイズ。`DiaryCalendar` 自体は変更しない。
- 見出し `<h1>日記の履歴</h1>` はそのまま（既に `<main>` 左端に左揃え）。
- 空状態メッセージ（「まだ日記がありません。…」）は現状維持。

### 結果（揃う左端）

`<main>`（`max-w-3xl` 中央寄せ）の左端 ＝ ヘッダー nav の左端 ＝ `<h1>` の左端 ＝ `RecordStats`/カレンダー塊の左端。デスクトップ幅で見えていた約262pxのズレが消える。

## テスト・ガード（完了基準）

- grep：リポジトリ全体（`app/dev/**` 除く）で `DeskLayout`・`WritingRail`・`SeasonNote` への参照が**ゼロ**。関連 import の取り残しなし。
- grep：`max-w-5xl` が `app/**`・`components/**`（`app/dev/**` 除く）に**残っていない**（全ページ `max-w-3xl` 化）。
- **`lib/diary/season.ts` / `lib/diary/season.test.ts` は残す**（`getSeason` を `lib/ai/daily-prompt.ts` が使用）。grep で「`SeasonNote` 撤去後も `getSeason` 参照が `daily-prompt.ts` に残る＝`season.ts` は削除しない」を確認。
- 既存テストは green（`vitest run`）。削除対象コンポーネント（`DeskLayout`/`WritingRail`/`SeasonNote`）の component テストは存在しない見込み（プランで grep 確認）。
- `npm run lint`（biome）/ `npm run lint:design` / `npx tsc --noEmit` / `npm run test` / `npm run build` がすべて pass。
- CI（lint / lint:design / tsc / test / build）green → squash merge（`AGENTS.md` の PR フロー、main 直 push 不可）。
- 目視：
  - `/` と `/diary/[date]` が**単カラム**（右レールなし）で、本文は日付→今日の問い→エディタ。
  - ヘッダー・`/`・`/history`・`/insights` の本文左端が**揃っている**（`max-w-3xl`）。
  - `/history` の見出し・指標・カレンダーの左端が揃い、カレンダーが快適サイズ。
  - `/history` 左揃えの結果、カレンダー(448px)の右に約320pxの空きが出て指標の下罫も見出しより短く出る（中央寄せコンテナ＋中身左揃えの作法どおり・意図的）。不自然に間延びして見えないかを light/dark で確認。
  - light/dark 両モードで成立。

## 受け入れ条件（ユーザー視点）

1. 書く画面（`/`・`/diary/[date]`）から右レール（季節のたより・履歴リンク）が消え、改修前のシンプルな単カラムに戻る。
2. 全ページ（ヘッダー・書く画面・履歴・分析）の横幅が `max-w-3xl` に揃い、左端が一致する。
3. `/history` の見出し・指標・カレンダーの左端が揃い、「幅があってない」状態が解消される（カレンダーは見やすいサイズのまま）。
4. 今日の問い・保存演出・`/history` のカレンダー機能は従来どおり動く。
5. light/dark どちらでも崩れない。
