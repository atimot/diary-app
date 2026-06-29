# 日記ページと履歴ページの役割分離（書斎モデル）— 設計

- 日付: 2026-06-29
- ステータス: 設計承認済み（多視点レビュー反映済み・次は writing-plans）
- 背景の思想: 書く画面は「現在（今日書く）」に、履歴画面は「記録（振り返る）」に役割を分ける。眺めるだけの“囮カレンダー”を書く画面から外し、書く面を静かにする。
- 関連:
  - [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（和モダン憲法・トークン）
  - [`2026-06-28-desktop-writing-experience-design.md`](2026-06-28-desktop-writing-experience-design.md)（書く画面の文机レール／`StreakPanel` を導入した spec。**本spec はその一部＝`/` 上の `StreakPanel` を意図的に巻き戻す**）
  - [`2026-06-29-history-record-stats-design.md`](2026-06-29-history-record-stats-design.md)（履歴ページの `RecordStats`。本spec は履歴を“記録の主役”に寄せる方向で土台を共有）
  - [`2026-06-26-history-screen-design.md`](2026-06-26-history-screen-design.md)（履歴画面 PR2-B・`DiaryCalendar`）

## 背景と目的

`/`（書く画面）の右レール `StreakPanel`（[`components/diary/StreakPanel.tsx`](../../../components/diary/StreakPanel.tsx)）が、**連続日数・当月カレンダー・月統計**を表示している。一方 `/history`（[`app/history/page.tsx`](../../../app/history/page.tsx)）は、**辿れるカレンダー＋ RecordStats（連続/最長/通算）** を持つ。

両者を読み比べると、本当に重複しているのは **「連続日数の数字」と「カレンダーの見た目」** の2点だけ。**「過去のエントリを開く／月を遡る」機能は `/history` 側にしか無い**（`/` のカレンダーは当月固定・月送り不可・セル非クリックの“眺めるだけ”）。

`/` のカレンダーは、過去を辿れないのに「履歴を見た気」にさせる**囮**になっている、というのが撤去の動機づけ。ただし**「撤去すれば `/history` 来訪が増える」は成果指標にしない**：本アプリは単一ユーザー＋Vercel Hobby plan（クリック計測手段なし。`AGENTS.md`「個人試作の運用前提」「Vercel CLI」）で、来訪増減は撤去前後どちらでも検証不能なため。**本spec の達成目標は「書く画面を視覚的に静かにする（主観）」と「重複の解消」に正直に絞る。**

## レビューでの確定事項（多視点レビュー反映）

設計承認後に多視点レビュー（プロダクト/UX・技術妥当性・和モダン憲法・スコープ・逆張り）を実施し、以下を確定した。

- **`/` はフル撤去（A案）**：連続日数も含め `StreakPanel` を丸ごと撤去する（ユーザー再確認済み）。逆張りが推した「ハイブリッド（連続数字だけ残しリンク化＝B案）」は不採用。
  - **受け入れる trade-off**：常時の連続数字は“書く前のナッジ”（今日まだ書いてない時に開いて、途切れる前に書く動機）でもあった。撤去後はこれが消え、**書かずに閲覧する日・今日分を保存済みで再訪した日には継続の手応えが出ない**。単一ユーザーで「毎日書く」前提なら許容する、という判断。
- **`/history` 側の価値追加（「一年前の今日」／直近エントリの本文プレビュー）は今回やらない**：別 spec/PR として切り出す（ユーザー選択）。`listEntryDates()` が既に全日付を持つので将来の伸びしろとして温存（[`2026-06-29-history-record-stats-design.md`](2026-06-29-history-record-stats-design.md) も「一年前の今日」を YAGNI 見送り済み）。
- **④「当月記入率の /history 移設」は見送り＝退役**：当月 X/Y 日記入は移設せず廃止する。理由：(1) 「今は価値追加しない」方針と整合、(2) 進行中の当月は分母を暦日数にすると月初が `1 / 30` のように低く見え、狙い（手応えを保つ）と逆方向になりうる、(3) `/history` は `RecordStats`（連続/最長/通算）で別種の手応えを既に持つ。**＝月進捗フィードバックは恒久的に廃止する**（黙って消すのではなく明示合意）。
- **保存時演出の品質**：現行 `DiaryEditor` は初回保存と同日再保存を区別せず毎回「今日でN日目」を出す（[`components/diary/DiaryEditor.tsx`](../../../components/diary/DiaryEditor.tsx) の `handleAction` が `result.ok` で常に `setCelebration`）。常時表示撤去でこの演出が継続の唯一の手応えになるため比重は増すが、**今回のスコープでは現状維持**（毎回同じナッジでも単一ユーザーでは許容）。「初回保存だけ祝う／再保存は控えめ」への改善は **follow-up 候補**として記録する。

### 確定済み方針（ユーザー承認）

ユーザーが解きたい違和感は **「書く画面を軽くしたい」＋「履歴の存在感が薄い」** の2点（複数選択）。

- **A案「書斎モデル」を採用**。`/` は「書く」に専念させ、履歴系の見せ物（連続日数・カレンダー・月統計）を `/` から撤去する。
  - 不採用：B案「軽量ブリッジ」（連続日数チップだけ `/` に残しリンク化）＝小さな囮が残るうえ、ユーザーが最も静かな書く面を選好したため。なお B案は「書く前ナッジを残せる」利点があり、その喪失は上記 trade-off として受け入れる前提で A 案を採る。
  - 除外：C案「日記と履歴を1ページに統合」＝書く画面を*重く*するので狙いと逆。
- **履歴ページは消さない**。過去を辿れる唯一の入口であり、機能としての重複はないため。
- **日々の継続ナッジは保存時演出に一本化**。`/` から常時の連続日数表示は消えるが、保存時演出（「今日でN日目」）が *書いた瞬間* に出続ける（ストリークは `saveDiaryEntry` の戻り値由来で `/` のデータ取得に非依存）。
- **履歴への導線＝レールに1本だけ**（ユーザー選択）。撤去した囮の位置に、控えめな muted テキストリンクを置く。

### やらないこと（YAGNI）

- **DBスキーマ変更なし**・**追加DBクエリなし**。むしろ `/`（と `/diary/[date]`）は `listEntryDates()` を1本減らす（下記）。
- `StreakPanel` の代替を `/` に作らない（チップ／ミニカレンダー等を残さない）。常時ナッジは保存時演出に一本化する。
- 当月記入率（X/Y）を `/history` へ移設しない（退役）。
- 保存時演出への履歴リンク追加・`DiaryEditor` の firstToday 改修は**今回やらない**（前者は導線をレール1本に絞るユーザー選択を尊重、後者は follow-up 候補）。
- `/history` の `RecordStats`・`DiaryCalendar`・空メッセージの既存仕様は**変えない**。
- `/insights` 系、`SeasonNote` の中身、和モダン以外のリファクタには触れない。

## アクセント予算（憲法 §3 の死守ライン）

- **`/`（書く画面）・`/diary/[date]`**：今回**新規アクセントを足さない**。撤去した `StreakPanel` の若葉（連続数字・記入セル）が消える分、むしろ若葉は減る。追加する履歴リンクは **muted テキスト**（`text-muted-foreground` → hover `text-foreground`）で**アクセントを使わない**。`SeasonNote` の朱（節気名）は現状維持。
- **`/history`**：本spec では**変更しない**（[`2026-06-29-history-record-stats-design.md`](2026-06-29-history-record-stats-design.md) の予算を踏襲：若葉＝記入日セル＋現在連続、朱＝日曜セル）。新規追加要素なし。

## ① `/` と `/diary/[date]`（書く画面を軽く）の変更

`WritingRail` と `StreakPanel`、およびそれらに渡すデータ（`streak` / `entryDates` / `today`、`listEntryDates` / `computeStreak`）は **`app/page.tsx` と `app/diary/[date]/page.tsx` の2ルートで使われている**。両方を同時に直さないと tsc/build が落ちる（レビュー検出の blocker）。

### `components/diary/StreakPanel.tsx` を削除
- `StreakPanel` は `WritingRail` からのみ参照（grep で確認）。撤去後は**ファイルごと削除**する。
- `StreakPanel` が使っていた `buildMonthGrid`（[`lib/calendar/month-grid.ts`](../../../lib/calendar/month-grid.ts)）は `DiaryCalendar` が継続利用するので**残す**。`computeStreak` / `computeLongestStreak`（[`lib/diary/streak.ts`](../../../lib/diary/streak.ts)）も `saveDiaryEntry` / `RecordStats` で使うので残す。`StreakPanel` 内ローカルの `WAFU_MONTH` 配列は削除でそのまま消える（再利用しない＝④退役のため不要）。

### `components/diary/WritingRail.tsx` を簡素化
- `StreakPanel` の描画を削除し、**`SeasonNote` ＋ 履歴リンク（⑤）だけ**残す。
- props を `focusDate` のみに縮小（現行の `streak` / `entryDates` / `today` は不要）。
- **`SeasonNote` の受け口 prop 名は `date` のまま**変えない。`WritingRail` 内では従来通り `date={focusDate}` で渡す（`SeasonNote.tsx` の `{ date }` を `focusDate` に改名しない）。
- レイアウト：`SeasonNote` ＋ リンクの細いレールとして成立させる。

### `app/page.tsx` のデータ取得を削減
- `listEntryDates()` と `computeStreak` の呼び出し・import を**削除**（[`app/page.tsx`](../../../app/page.tsx) 9-10, 16, 19）。`Promise.all` は `getDiaryEntry(date)` と `getTodayPrompt(date)` の2本に縮む。
- `WritingRail` には `focusDate={date}` のみ渡す。
- 結果：**`/` のレンダリングで `listEntryDates()` クエリが1本消える**。

### `app/diary/[date]/page.tsx` の同等改修（blocker 修正）
- 同ページも `WritingRail` に `streak` / `entryDates` / `focusDate` / `today` の4 props を渡し、`listEntryDates` / `computeStreak` を import・実行している（[`app/diary/[date]/page.tsx`](../../../app/diary/[date]/page.tsx) 6, 8-9, 28-32, 39-44）。
- `listEntryDates()` / `computeStreak` の import・呼び出しを**撤去**し、`Promise.all([getDiaryEntry, listEntryDates])` を `getDiaryEntry(date)` 単体取得に縮める（`entry` のみ取得になるので `Promise.all` を解体）。
- `WritingRail` には `focusDate={date}` のみ渡す。
- 結果：このページからも `StreakPanel` が消え、`listEntryDates()` クエリが1本消える。**過去日/バックデート編集ページも `/` と同じ「書くだけ＋季節＋履歴リンク」のレールになる**（挙動の一貫性）。

### 保存時演出はそのまま
- [`components/diary/DiaryEditor.tsx`](../../../components/diary/DiaryEditor.tsx) の「今日でN日目」演出は無変更。ストリークは [`lib/actions/diary.ts`](../../../lib/actions/diary.ts) の `saveDiaryEntry` が action 内で `listEntryDates()`→`computeStreak` して返すため、ページのデータ取得削減の影響を**受けない**。

### 最終構成（`/` と `/diary/[date]` 共通）
- メイン：日付ヘッダー → （`/` のみ）今日の問い → エディタ（編集/プレビュー）。
- 右レール：季節のたより（`SeasonNote`）＋ 履歴への導線リンク（⑤）。

## ② `/history` の変更

- **本spec では `/history` を変更しない。** `RecordStats`（連続/最長/通算）・`DiaryCalendar`（辿れるカレンダー）・空メッセージはすべて現状維持。
- 当月記入率（X/Y）の移設は**しない**（④退役。上記「レビューでの確定事項」参照）。

## ③ 両ページの責務まとめ

| 観点 | `/`・`/diary/[date]`（書く・現在） | `/history`（記録・振り返る） |
| --- | --- | --- |
| 連続日数 | 常時表示なし／**保存時のみ**演出 | `RecordStats` で常時表示 |
| 最長・通算 | なし | `RecordStats` で表示 |
| カレンダー | **なし**（撤去） | 全期間・月送り可・セルから過去エントリを開ける |
| 当月の記入率（X/Y） | **なし**（退役） | **なし**（移設せず退役） |
| 季節のたより | あり（書く気分の演出） | なし |
| 履歴への導線 | レール下部に muted リンク1本（⑤） | — |

## ④（退役）当月記入率は移設しない

上記「レビューでの確定事項」で確定。当月 X/Y 日記入は `/` から撤去すると同時に**廃止**し、`/history` へ移設しない。`DiaryCalendar` には記入率表示を**追加しない**（既存のカレンダー/月ナビのまま）。これにより、当初案にあった「分母の定義（暦日数 vs 経過日数）」「`WAFU_MONTH` の再利用」論点はいずれも発生しない。

## ⑤ 履歴への導線（`/`・`/diary/[date]` レール下部に1本）

- 右レール（`WritingRail`）の **`SeasonNote` の下**に、`/history` への控えめなテキストリンクを置く。
- 文言：「これまでの記録 →」。`Link href="/history"`。
- スタイル：`text-sm text-muted-foreground hover:text-foreground`。**アクセント色・新規 drop-shadow を使わない**（憲法③④）。`SeasonNote` との間は `border-t pt-6` 等の罫＋余白で区切る（深度は罫＋明度差／影なし）。
- 到達性：`DeskLayout` は **lg 未満でレールを非表示にせず本文の下へ縦積みする**（`mt-8 border-t pt-6 lg:mt-0`）。よって**モバイルでもこのリンクは本文末尾にスクロールすれば現れる**。加えて `HeaderNav` の「履歴」タブ（[`components/layout/HeaderNav.tsx`](../../../components/layout/HeaderNav.tsx)）が全ページ共通であり、到達性を二重に担保する。
  - 割り切り：モバイルではこのリンクは fold 下になるため、**新リンクの主目的はデスクトップでの視覚的誘導**。モバイル本命の導線は `HeaderNav` の履歴タブ（既存）であり、本リンクで来訪が増えることは期待しない（来訪増は計測不能のため成果指標にしない）。

## テスト・ガード（完了基準）

- 削除後、リポジトリ全体で **`StreakPanel` への参照がゼロ**（grep）。
- **`WritingRail` へ `streak` / `entryDates` / `today` を渡す箇所がゼロ**（grep）。`WritingRail` を使う全ルート（`/`、`/diary/[date]`）で props 縮小済み・未使用 import（`listEntryDates` / `computeStreak`）の取り残しなし。
- 既存テストは不変で green：`computeStreak` / `computeLongestStreak`（[`lib/diary/streak.test.ts`](../../../lib/diary/streak.test.ts)）は touch しない。`StreakPanel` / `WritingRail` / `SeasonNote` の component テストは存在しない（削除でテストは壊れない）。新規テストは不要（純ロジック追加なし）。
- `npm run lint:design`（生color混入チェック）が pass。追加するリンクはトークンのみ。
- `tsc` / `biome`（lint）/ `vitest` / `build` が pass。
- CI（lint / tsc / vitest / build）が green になってから squash merge（`AGENTS.md` の PR フロー、main 直 push 不可）。
- 目視：
  - `/` と `/diary/[date]` に連続日数・カレンダー・月統計が表示されないこと。レールは `SeasonNote` ＋ 履歴リンクのみ。
  - 日記を保存すると「今日でN日目」が従来通り出ること（ストリーク健在）。
  - 履歴リンクから `/history` に遷移できること（デスクトップ：レール下部／モバイル：本文末尾）。
  - `/history` は見た目・挙動とも変化なし。
  - light/dark 両モードで成立し、`/` に新規アクセントが増えていないこと。

## 受け入れ条件（ユーザー視点）

1. 書く画面 `/`（および過去日編集 `/diary/[date]`）から、連続日数・当月カレンダー・月統計が消え、「書く」だけの静かな画面になる。
2. **意図的な喪失の明示**：書く画面に常時出ていた「連続日数」「当月ミニカレンダー（書いた日の点列）」「当月 X/Y 日」は撤去され、**月進捗フィードバックは廃止**される。連続の手応えは保存時演出（「今日でN日目」）に一本化され、書かずに閲覧する日・既保存日の再訪では手応えは出ない（単一ユーザー前提で許容）。
3. 日記を保存したときは従来通り「今日でN日目」のお祝いが出る。
4. 右レールに「これまでの記録 →」の控えめなリンクがあり、`/history` を開ける（モバイルは本文末尾＋ヘッダー履歴タブ）。
5. `/history` は本spec で**変化なし**（連続/最長/通算＋辿れるカレンダー）。振り返りの唯一の場として機能する。
6. light/dark どちらでも崩れず、`/`・`/diary/[date]` のアクセントが増えていない。
