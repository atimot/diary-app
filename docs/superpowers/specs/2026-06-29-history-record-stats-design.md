# 履歴ページに「積み重ね指標」帯 — 設計

- 日付: 2026-06-29
- ステータス: 設計承認済み（次は writing-plans）
- 背景の思想: 日記が続くほど「積み重なっている手応え」が見えること。履歴ページを “カレンダーを置くだけ” から、続ける動機が宿る場へ。
- 関連:
  - [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（和モダン憲法・トークン）
  - [`2026-06-26-history-screen-design.md`](2026-06-26-history-screen-design.md)（履歴画面 PR2-B。**本spec はこれを土台に拡張**）
  - [`2026-06-28-desktop-writing-experience-design.md`](2026-06-28-desktop-writing-experience-design.md)（書く画面のストリーク／文机レール。指標の見せ方を踏襲）

## 背景と目的

現状の `/history`（`app/history/page.tsx`）は、**月カレンダー（`DiaryCalendar`）＋連続記入バッジ（`StreakBadge`、`streak > 0` のときだけ）** のみ。日記画面・書く画面が拡充された結果、履歴ページだけが「デカデカとカレンダーがあるだけ」で相対的にシンプルすぎる。

一方、履歴ページに転用できる素材はすでに揃っている：

- `listEntryDates()`（`lib/db/queries/diary.ts`）は**ユーザーの全エントリ日付**を `entryDate DESC` で返す（月スコープではない）。履歴ページは既にこれを取得済み。
- `computeStreak(entryDates, today)`（`lib/diary/streak.ts`）で現在連続が出る（既存・使用中）。

本spec は、この既存データだけを使って**カレンダー上部に「積み重ね指標」の横帯**を足し、「続けている実感」を履歴ページの主役にする。

### 確定済み方針（ユーザー承認）

- **主役の価値＝「続けている実感」（積み重ねの可視化）**。
- **構造＝月カレンダーは主役のまま、周りに指標を添える**（年間ヒートマップ等への作り替えはしない）。本番データがまだ数週間ぶんで、年俯瞰だとスカスカになり逆効果なため。
- **添える指標は3つに限定**：① 連続記録（現在）、② 最長連続（自己ベスト）、③ 通算記録日数。
  - 見送り（YAGNI）：今月の記録率リング、季節の歩み（節気の節目バッジ）。
- **レイアウト＝案A「上部スタット帯」**：カレンダー上に3指標を横一列。指標3つにちょうど収まり密度が出る／モバイルでもそのまま積めて崩れない。
  - 不採用：案B 文机の脇レール（数字3つだと余白がち）、案C 下部フッター（積み重ねの主張が弱い）。

### やらないこと（YAGNI）

- **DBスキーマ変更なし**・**追加DBクエリなし**（通算＝`dates.length`、最長＝同じ `dates` から計算）。
- 年間ヒートマップ／時系列スクリーム／本文プレビュー／検索／「1年前の今日」／エニアグラム軌跡の転用は範囲外。
- `/insights` 系の派生データ（`weeklyInsights` / `enneagramSnapshots`）には触れない。
- リファクタの巻き込みをしない。例：`/history` の `<h1>` が `font-heading` 無しなのは**既存の別件**として本spec では触らない。

## アクセント予算（憲法 §3 の死守ライン）

履歴ページ1画面で使うアクセントを先に固定する。レビューで超過を弾く基準。

- **若葉（`--primary`）= 1〜2箇所**：(a) カレンダーの記入日セル（既存）、(b) スタット帯の**現在連続の数字**。これ以外で若葉を使わない（最長・通算は墨）。
- **朱（`--season`）= 日曜のみ**：カレンダーの日曜セル（既存・現状維持）。スタット帯では朱を使わない。
- 危険操作の `--destructive` は本機能では使わない。

## データフロー（追加クエリなし）

`app/history/page.tsx` は既に `const dates = await listEntryDates()` を取得している。これを使い回す：

| 指標 | 計算 | 出所 |
| --- | --- | --- |
| 現在連続 | `computeStreak(dates, today)` | 既存（`lib/diary/streak.ts`） |
| 最長連続（自己ベスト） | `computeLongestStreak(dates)` | **新規**（同ファイルに追加） |
| 通算記録日数 | `dates.length` | 既存配列の長さ |

`countDiaryEntries()` は使わない（`dates.length` で足りるため）。

## 新規純粋関数 `computeLongestStreak(entryDates): number`

`lib/diary/streak.ts` に追加する。既存の `subDays` / `pad2` を再利用する。

- **仕様**：全履歴の中で、連続した日付（カレンダー上で隣り合う日）の**最長ランの長さ**を返す。
- **頑健性**：入力は未ソート・重複ありでも正しく動く（`computeStreak` と同様に `Set` で正規化してから走査、または日付昇順ソート後に隣接判定）。
- **空配列**：`0` を返す。要素が1つなら `1`。
- **「今日」に依存しない**（現在連続と違い、起点は履歴全体）。引数は `entryDates` のみ。
- シグネチャは既存に倣う：`export function computeLongestStreak(entryDates: readonly string[]): number`。

### テスト（`lib/diary/streak.test.ts` に追記、TDD）

`computeStreak` の既存テストに倣い、別 `describe('computeLongestStreak', ...)` を足す。最低限のケース：

- 空配列 → `0`
- 単一日 → `1`
- 全連続（例 `06-08, 06-09, 06-10`）→ `3`
- 複数ラン（例 `06-01,06-02 / 06-05,06-06,06-07 / 06-10`）→ `3`（最長を取る）
- 月またぎ（例 `05-31, 06-01, 06-02`）→ `3`
- 年またぎ（例 `2025-12-31, 2026-01-01`）→ `2`
- 重複（同じ日が2つ）→ 連続数を水増ししない
- 未ソート入力 → ソート前提に依存せず正しい

既存 `computeStreak` テストは不変。

## 新規コンポーネント `components/diary/RecordStats.tsx`

カレンダー上部に置く「積み重ね指標」帯。サーバーコンポーネントで可（状態なし）。

### Props

```ts
interface RecordStatsProps {
  current: number;  // 現在連続
  longest: number;  // 最長連続（自己ベスト）
  total: number;    // 通算記録日数
}
```

`app/history/page.tsx` 側で3値を計算して渡す（コンポーネントは計算を持たない）。

### 見た目（和モダン憲法に準拠）

- 3指標を左から「**連続記録 / 最長（自己ベスト）/ 通算記録**」の横並び。
- 数字は **明朝（`font-heading`）+ `tabular-nums`**＝墨の風格。各指標はラベル（小・`text-muted-foreground`）＋数字＋単位「日」。
- **現在連続の数字のみ若葉（`text-primary`）**で「育っている今」を強調。最長・通算は墨（`text-foreground`）で静かに。→ アクセント予算（若葉1〜2箇所）に収まる。
- 既存 `StreakBadge` の「若葉ソフトチップ」の質感（淡い若葉地＋罫＋炎アイコン）を**現在連続に流用してよい**（炎アイコン `lucide-react` の `Flame`）。最長・通算はチップにせず素の数字で階層差をつける。
- 深度は**下罫（`border-b`）＋明度差**のみ。**新規 drop-shadow 禁止**（憲法④）。
- 色はすべてトークン（`text-foreground` / `text-primary` / `text-muted-foreground` / `border-border` 等）。生hex・任意色クラス・インラインstyleの色リテラル禁止（`npm run lint:design` で機械チェック）。
- **11px未満禁止**。ラベルは最小でも `text-xs`（12px）相当に保つ。
- **light/dark 両対応**（トークンで自動。両モードで成立を目視確認）。

### レスポンシブ

- デスクトップ：3指標を横一列（`flex`、指標間に十分な `gap`）。
- モバイル：狭ければ折り返す（`flex-wrap`）。3つとも短いので破綻しない。
- カレンダーの最大幅（`max-w-5xl` コンテナ）に揃え、帯はその上に置く。

## `app/history/page.tsx` の変更

- `computeLongestStreak` を import。
- `const current = computeStreak(dates, today)`、`const longest = computeLongestStreak(dates)`、`const total = dates.length` を算出。
- 従来の `{streak > 0 && (<div className="mb-6"><StreakBadge streak={streak} /></div>)}` ブロックを **`RecordStats` に差し替え**（下記の空状態ルールに従って表示制御）。
- カレンダー（`DiaryCalendar`）と末尾の「まだ日記がありません」メッセージは現状維持。

### 空・端の状態

- **通算0日（新規ユーザー）**：`RecordStats` 帯を**まるごと非表示**。既存の「まだ日記がありません。トップから書いてみましょう。」が受け持つ。
  - 実装は `total > 0 && <RecordStats .../>`（または `RecordStats` 内で `total <= 0` のとき `null` を返す）。
- **通算>0 だが現在連続0（途切れ中）**：3指標すべて表示。現在連続は「0日」を**墨で静かに**（若葉の強調はオフ）。最長・通算は減らないので積み重ねの手応えは保たれる。
  - 承認時の確認事項：この見せ方（現在連続0は墨の「0日」）で確定。柔らかい代替表現（「今日から」等）は今回入れない。

## StreakBadge の扱い

- `StreakBadge`（`components/diary/StreakBadge.tsx`）は `/history` から外れるが、`app/dev/design/page.tsx`（部品ギャラリー、`StreakBadge streak={12}`）で参照され続けるため**部品は削除しない**。
- `/dev/design` ギャラリーへの `RecordStats` 追加は任意（あれば望ましいが必須ではない）。本spec の必須スコープには含めない。

## テスト・ガード（完了基準）

- `computeLongestStreak` のユニットテストが green（vitest）。既存 `computeStreak` テストも不変で green。
- `npm run lint:design`（生color混入チェック）が pass。
- `tsc`・`build`・`biome`（lint）が pass。
- CI（lint / tsc / vitest / build）が green になってから squash merge（`AGENTS.md` の PR フロー）。
- 目視：light/dark 両モードで帯が中立カードから罫＋明度差で成立し、影が乗っていないこと。アクセント（若葉）が「記入日セル＋現在連続」の2箇所に収まっていること。

## 受け入れ条件（ユーザー視点）

1. 履歴ページのカレンダー上に「連続記録 / 最長 / 通算記録」の3数字が出る。
2. 現在連続の数字が若葉で、最長・通算は墨で静かに表示される。
3. 新規ユーザー（記録0）では帯が出ず、従来の空メッセージのみ。
4. 連続が途切れている時も最長・通算は表示され、積み重ねが見える。
5. モバイルでも崩れず、ダークモードでも成立する。
