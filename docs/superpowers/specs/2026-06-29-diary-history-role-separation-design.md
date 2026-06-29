# 日記ページと履歴ページの役割分離（書斎モデル）— 設計

- 日付: 2026-06-29
- ステータス: 設計承認済み（次は writing-plans）
- 背景の思想: 書く画面は「現在（今日書く）」に、履歴画面は「記録（振り返る）」に役割を分ける。眺めるだけの“囮カレンダー”を書く画面から外し、振り返りの動機を本物の履歴へ流す。
- 関連:
  - [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（和モダン憲法・トークン）
  - [`2026-06-28-desktop-writing-experience-design.md`](2026-06-28-desktop-writing-experience-design.md)（書く画面の文机レール／`StreakPanel` を導入した spec。**本spec はその一部＝`/` 上の `StreakPanel` を意図的に巻き戻す**）
  - [`2026-06-29-history-record-stats-design.md`](2026-06-29-history-record-stats-design.md)（履歴ページの `RecordStats`。本spec は履歴を“記録の主役”に寄せる方向で土台を共有）
  - [`2026-06-26-history-screen-design.md`](2026-06-26-history-screen-design.md)（履歴画面 PR2-B・`DiaryCalendar`）

## 背景と目的

`/`（書く画面）の右レール `StreakPanel`（[`components/diary/StreakPanel.tsx`](../../../components/diary/StreakPanel.tsx)）が、**連続日数・当月カレンダー・月統計**を表示している。一方 `/history`（[`app/history/page.tsx`](../../../app/history/page.tsx)）は、**辿れるカレンダー＋ RecordStats（連続/最長/通算）** を持つ。

両者を読み比べると、本当に重複しているのは **「連続日数の数字」と「カレンダーの見た目」** の2点だけ。**「過去のエントリを開く／月を遡る」機能は `/history` 側にしか無い**（`/` のカレンダーは当月固定・月送り不可・セル非クリックの“眺めるだけ”）。

つまり `/` のカレンダーは、過去を辿れないのに「履歴を見た気」にさせる**囮**になっており、本物の `/history` を開く動機を奪っている可能性が高い。

### 確定済み方針（ユーザー承認）

ユーザーが解きたい違和感は **「書く画面を軽くしたい」＋「履歴の存在感が薄い」** の2点（複数選択）。この2つは同じ方向を指す：

- **A案「書斎モデル」を採用**。`/` は「書く」に専念させ、履歴系の見せ物（連続日数・カレンダー・月統計）を **`/history` に集約**する。`StreakPanel` を `/` から撤去すれば、「書く画面を軽く」と「履歴の存在感」が**1操作で同時に**解ける。
  - 不採用：B案「軽量ブリッジ」（連続日数チップだけ `/` に残しリンク化）＝小さな囮が残り両目標への効きが弱い。
  - 除外：C案「日記と履歴を1ページに統合」＝書く画面を*重く*するので狙いと逆。
- **履歴ページは消さない**。過去を辿れる唯一の入口であり、機能としての重複はないため。むしろ“記録の唯一の鏡”に格上げする。
- **日々の継続ナッジは失わない**。`/` から常時の連続日数表示は消えるが、保存時演出（「今日でN日目」）が *書いた瞬間* という最も効くタイミングで出続ける（[`components/diary/DiaryEditor.tsx`](../../../components/diary/DiaryEditor.tsx) 202-221、ストリークは `saveDiaryEntry` の戻り値由来で `/` のデータ取得に非依存）。
- **履歴への導線＝レールに1本だけ**（ユーザー選択）。撤去した囮の位置に、控えめな muted テキストリンクを置く。

### やらないこと（YAGNI）

- **DBスキーマ変更なし**・**追加DBクエリなし**。むしろ `/` は `listEntryDates()` を1本減らす（下記）。
- `StreakPanel` の代替を `/` に作らない（チップ／ミニカレンダー等を残さない）。常時ナッジは保存時演出に一本化する。
- 保存時演出への履歴リンク追加は**今回やらない**（導線はレール1本に絞る、というユーザー選択を尊重）。
- `/history` の `RecordStats`・`DiaryCalendar`・空メッセージの既存仕様は変えない（下記の月統計移設を除く）。
- `/insights` 系、`SeasonNote` の中身、和モダン以外のリファクタには触れない。

## アクセント予算（憲法 §3 の死守ライン）

- **`/`（書く画面）**：今回 `/` に**新規アクセントを足さない**。撤去した `StreakPanel` の若葉（連続数字・記入セル）が消える分、むしろ若葉は減る。追加する履歴リンクは **muted テキスト**（`text-muted-foreground` → hover `text-foreground`）で**アクセントを使わない**。`SeasonNote` の朱（節気名）は現状維持。
- **`/history`**：[`2026-06-29-history-record-stats-design.md`](2026-06-29-history-record-stats-design.md) の予算を踏襲（若葉＝記入日セル＋現在連続の2箇所、朱＝日曜セルのみ）。今回追加する「当月 X/Y 日記入」は **墨/muted**（`text-muted-foreground`）で**アクセントを使わない**。

## ① `/`（書く画面を軽く）の変更

### `components/diary/StreakPanel.tsx` を削除
- `StreakPanel` は `WritingRail` からのみ参照されており（grep で確認すること）、撤去後は**ファイルごと削除**する。
- `StreakPanel` が使っていた `buildMonthGrid`（[`lib/calendar/month-grid.ts`](../../../lib/calendar/month-grid.ts)）は `DiaryCalendar` が継続利用するので**残す**。`WAFU_MONTH` 配列は `StreakPanel` 内ローカル定義だったため、削除でそのまま消える（後述④の月名表示で必要になれば `DiaryCalendar` 側へ移す）。

### `components/diary/WritingRail.tsx` を簡素化
- `StreakPanel` の描画を削除し、**`SeasonNote` だけ**残す。
- props を `focusDate` のみに縮小（現行の `streak` / `entryDates` / `today` は不要）。`SeasonNote` は `focusDate` を受け取る。
- レイアウト：`SeasonNote` のみの細いレールとして成立させる（旧 `StreakPanel` との間の `border-t pt-6` 区切りは不要に。下記リンクとの区切りは⑤で扱う）。

### `app/page.tsx` のデータ取得を削減
- `listEntryDates()` と `computeStreak` の呼び出し・import を**削除**（[`app/page.tsx`](../../../app/page.tsx) 9-10, 16, 19）。`Promise.all` は `getDiaryEntry(date)` と `getTodayPrompt(date)` の2本に縮む。
- `WritingRail` には `focusDate={date}` のみ渡す。
- 結果：**`/` のレンダリングで `listEntryDates()` クエリが1本消える**（書く画面の DB アクセス削減。`AGENTS.md` の「使う列だけ／不要クエリを持たない」方針に合致）。

### 保存時演出はそのまま
- [`components/diary/DiaryEditor.tsx`](../../../components/diary/DiaryEditor.tsx) の「今日でN日目」演出（202-221）は無変更。ストリークは [`lib/actions/diary.ts`](../../../lib/actions/diary.ts) の `saveDiaryEntry` が action 内で `listEntryDates()`→`computeStreak` して返すため、`/` のデータ取得削減の影響を**受けない**。

### `/` の最終構成
- メイン：日付ヘッダー → 今日の問い → エディタ（編集/プレビュー）。
- 右レール：季節のたより（`SeasonNote`）＋ 履歴への導線リンク（⑤）。

## ② `/history`（記録の唯一の鏡に）の変更

- `RecordStats`（連続/最長/通算）と `DiaryCalendar`（辿れるカレンダー）は**現状維持**。
- `StreakPanel` から失う「当月 X / Y 日記入」を、**カレンダーの表示月に追従する形**で `DiaryCalendar` に移設（④）。
- 空状態メッセージ（「まだ日記がありません。…」）は現状維持。

## ③（参考）両ページの責務まとめ

| 観点 | `/`（書く・現在） | `/history`（記録・振り返る） |
| --- | --- | --- |
| 連続日数 | 常時表示なし／**保存時のみ**演出 | `RecordStats` で常時表示 |
| 最長・通算 | なし | `RecordStats` で表示 |
| カレンダー | **なし**（撤去） | 全期間・月送り可・セルから過去エントリを開ける |
| 月の記入率 | なし | 表示月に追従して X / Y 日（④で追加） |
| 季節のたより | あり（書く気分の演出） | なし |
| 履歴への導線 | レール下部に muted リンク1本（⑤） | — |

## ④ 当月記入率の移設（`DiaryCalendar`）

- 旧 `StreakPanel` の `{WAFU_MONTH} ・ {writtenCount} / {inMonth.length} 日` を、`DiaryCalendar` の**月ナビ見出し付近**に「表示中の月の記入数 / その月の日数」として表示する（例：`12 / 30 日記入`）。
- `DiaryCalendar` は既に `year` / `month` / `writtenDates`（Set）を受け取り、内部で `buildMonthGrid` でグリッドを組むので、**当月セル（`inMonth`）のうち `writtenDates` に含まれる数**を数えるだけ。追加データ・追加クエリ不要。
- 色は **墨/muted**（アクセント不使用）。`tabular-nums`。11px未満禁止。
- 和風月名（睦月…）の併記は**任意**。付けるなら `DiaryCalendar` 内に月名配列を持つ。付けなくても良い（履歴は任意の月を表示するため装飾過多を避けるなら数字のみで十分）。
- **優先度＝nice-to-have**。純粋な「`/` から撤去」だけでもゴール（書く画面を軽く＋履歴の存在感）は達成される。実装を軽くしたい場合はこの④を省略してよい（その場合、当月記入率は表示されなくなる＝退役、で許容）。

## ⑤ 履歴への導線（`/` レール下部に1本）

- 右レール（`WritingRail`）の **`SeasonNote` の下**に、`/history` への控えめなテキストリンクを置く。
- 文言案：「これまでの記録 →」（または「日記の履歴 →」）。`Link href="/history"`。
- スタイル：`text-sm text-muted-foreground hover:text-foreground`。**アクセント色・新規 drop-shadow を使わない**（憲法③④）。`SeasonNote` との間は `border-t pt-6` 等の罫＋余白で区切る（深度は罫＋明度差／影なし）。
- 位置づけ：撤去した囮カレンダーがあった場所に置き、「振り返りたい」衝動を本物の `/history` へ誘導する。ヘッダーの「履歴」タブ（[`components/layout/HeaderNav.tsx`](../../../components/layout/HeaderNav.tsx)）は全ページ共通で残るため、レール非表示時（モバイル等）でも到達性は確保される。

## テスト・ガード（完了基準）

- `StreakPanel` 削除後、リポジトリ全体で `StreakPanel` への参照が**ゼロ**であること（grep）。関連 import の取り残しなし。
- 既存テストは不変で green：`computeStreak` / `computeLongestStreak`（[`lib/diary/streak.test.ts`](../../../lib/diary/streak.test.ts)）は touch しない。
- ④で当月記入率の集計ロジックを `DiaryCalendar` 内に追加する場合、必要なら小さなユニットテストを足す（set 件数カウントのみなので必須ではない）。
- `npm run lint:design`（生color混入チェック）が pass。追加するリンク・記入率はトークンのみ。
- `tsc` / `biome`（lint）/ `vitest` / `build` が pass。
- CI（lint / tsc / vitest / build）が green になってから squash merge（`AGENTS.md` の PR フロー、main 直 push 不可）。
- 目視：
  - `/` に連続日数・カレンダー・月統計が表示されないこと。レールは `SeasonNote` ＋ 履歴リンクのみ。
  - 日記を保存すると「今日でN日目」が従来通り出ること（ストリーク健在）。
  - 履歴リンクから `/history` に遷移できること。
  - light/dark 両モードで成立し、`/` に新規アクセントが増えていないこと。

## 受け入れ条件（ユーザー視点）

1. 書く画面 `/` から、連続日数・当月カレンダー・月統計が消え、「書く」だけの静かな画面になる。
2. 日記を保存したときは従来通り「今日でN日目」のお祝いが出る（継続の手応えは保たれる）。
3. 右レールに「これまでの記録 →」の控えめなリンクがあり、`/history` を開ける。
4. `/history` は従来通り（連続/最長/通算＋辿れるカレンダー）で、振り返りの唯一の場として機能する。④採用時は表示中の月の記入率（X / Y 日）も見える。
5. light/dark どちらでも崩れず、`/` のアクセントが増えていない。
