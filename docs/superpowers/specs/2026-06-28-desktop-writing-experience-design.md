# デスクトップ「文机」＋書く喜び — 設計

- 日付: 2026-06-28
- ステータス: 設計承認済み（次は writing-plans）
- 背景の思想: スマホ/AI で片手間に何でもこなせる時代だからこそ、PC の前でゆっくり自分と向き合い、自分の手で考えをまとめる時間をつくる。そのために「PC での見た目」と「書く楽しさ・ラクさ・テンション」を底上げする。
- 関連:
  - [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（和モダン憲法・トークン）
  - [`2026-06-26-diary-screen-design.md`](2026-06-26-diary-screen-design.md)（日記画面 PR2-A。**本spec はこれを土台に拡張**）
  - [`2026-06-26-history-screen-design.md`](2026-06-26-history-screen-design.md) / [`2026-06-26-insights-screen-design.md`](2026-06-26-insights-screen-design.md)

## 背景と目的

現状はモバイル優先で、**全画面が `container mx-auto max-w-3xl p-6`（=768px）の中央1カラム固定**（`app/page.tsx`、`app/diary/[date]/page.tsx`、`app/history/page.tsx`、`app/insights/page.tsx`、`HeaderNav` ほか）。1440px 以上のモニタでは 768px の帯が広い余白の海に浮き、**横幅をまったく使っていない**。`lg:`/`xl:` のレイアウト分岐はゼロ。

また書く体験には、(a) 書き出しプロンプトが「今日はどんな1日でしたか？」の静的1個だけ、(b) 連続記録（ストリーク）が `/history` 専用で**書いている本人に見えない**、(c) 保存のごほうびが「保存しました」の小さな文字だけ、という弱点がある。

本spec は**書く画面（`/` と `/diary/[date]`）を「文机（ふづくえ）型」のデスクトップ・レイアウトへ作り込み**、横の空間に控えめな伴走パネル（右レール）を置く。レールと保存フローに、(1) AI の「今日の問い」、(2) 書く画面のストリーク可視化、(3) 保存のお祝い演出、(4) 季節のたより、を載せる。

### 確定済み方針（ユーザー承認）

- **画面の性格＝文机型**：中央で書きつつ、横幅を活かして控えめな伴走情報を置く。主役はあくまで本文。
- **レール配置＝案A・右レール**（本文は左揃え＝視線が安定／実装がシンプル／狭幅では下へ回り込ませやすい）。
- **書く喜びの注力3点**：① 書き出しの後押し（プロンプト）、② 続ける喜びの可視化・演出（ストリーク＋お祝い）、③（情緒として）季節のたより。
- **「今日の問い」は AI（Gemini）生成**。ただし 5 RPM 制限を守るため **1日1回キャッシュ＋429/失敗時は季節バンクへ退避**。
- **対象範囲＝書く画面を最優先**。`/history`・`/insights` は**中央寄せ幅を広げる軽い対応のみ**（本格的なダッシュボード化はしない）。
- **やらないこと（YAGNI）**：気分/天気/タグの記録（**DBスキーマ変更なし**）、回想「1年前の今日」、HeaderNav のサイドナビ化、自動保存の本実装（※下書きの揮発対策の現状＝hidden input は維持。本spec では新規の永続オートセーブは作らない）。

### PR2-A との整合（重要）

PR2-A 日記画面 spec は「**季節/二十四節気ラベルは添えない（曜日のみ）**」と決めた。本spec はこれを**覆さない**：

- **インラインの日付ヘッダ（`DiaryDateHeader`）は曜日のみのまま据え置き**。本文上の視覚的ノイズを増やさない。
- 季節（二十四節気・和風月名）は**新設の右レール下段が受け持つ**。本文の流れから切り離した「机の隅の暦」として置くので、PR2-A の意図（本文まわりを静かに保つ）と両立する。

## アクセント予算（憲法 §3 の死守ライン）

1画面で使うアクセントを先に固定する。レビューで超過を弾く基準。

- **若葉（`--primary`）= 1〜2箇所**：(a)「書きとめる」保存ボタン、(b) レールの連続日数の数字。これ以外で若葉は使わない。
- **朱（`--season`）= 日曜・季節の差し色のみ**：(a) 日付や点列の**日曜**、(b) レール「季節のたより」の節気名。プロンプトの罫やお祝いの印には**朱を使わない**（後述）。
- **お祝いの「印（落款）」**：伝統的には朱だが憲法では朱＝日曜/季節限定。→ **既定は若葉＋墨**で組む。朱の印が欲しい場合のみ「憲法の意図的拡張」として `/dev/design` とレビューで承認する（本spec の既定では採用しない）。
- **プロンプト枠**：彩色アクセントを使わず、**深度（面昇格 `bg-muted`/`bg-popover` ＋罫）＋明朝**で差をつける。

## 全体構成（新規/変更ファイル一覧）

新規:
- `components/diary/DeskLayout.tsx` — 文机グリッド（本文セル＋右レール）。`'use client'` 不要のサーバーコンポーネント想定（子に応じて調整）。
- `components/diary/WritingRail.tsx` — 右レール本体（続ける喜び＋季節）。サーバーコンポーネント。
- `components/diary/StreakPanel.tsx` — 連続日数＋「今月の歩み」点列。
- `components/diary/SeasonNote.tsx` — 季節のたより（節気・和風月名・一言）。
- `components/diary/TodayPrompt.tsx` — 本文上の「今日の問い」＋`問いを変える`。`'use client'`（再生成ボタンのため）。
- `lib/diary/season.ts` — 純関数。日付→{和風月名, 二十四節気, 一言メモ}。**既存に和風月名ユーティリティは無いため新設**。
- `lib/diary/seasonal-prompts.ts` — 季節の問いバンク（AI 失敗時のフォールバック＋`問いを変える` のオフライン候補）。純データ＋選択関数。
- `lib/ai/daily-prompt.ts` — Gemini で「今日の問い」を生成。日付キャッシュ＋失敗時フォールバック。
- `lib/actions/prompt.ts` — `regenerateTodayPrompt()` サーバーアクション（`問いを変える` 用）。

変更:
- `app/page.tsx` / `app/diary/[date]/page.tsx` — `max-w-3xl` の素朴な `<main>` を `DeskLayout` に置換。ストリーク/季節/問いをサーバー側で取得して渡す。
- `lib/actions/diary.ts` — `SaveResult` の `ok:true` に更新後ストリークを含める。
- `app/history/page.tsx` / `app/insights/page.tsx` — 中央寄せ幅のみ広げる（`max-w-3xl`→`max-w-5xl` 目安）。レイアウト構造は維持。
- `app/globals.css` — 必要なら文机用の最小ユーティリティ（基本は Tailwind クラスで完結させ、追加は最小限）。

## ① 文机レイアウト（`DeskLayout` / 案A・右レール）

### 要件

- `lg:` 以上：**`grid grid-cols-[minmax(0,1fr)_220px]`**（本文セル｜レール）。全体に上限幅 `max-w-5xl`（≈1024px）、`mx-auto`。
- **本文セルは行長を約 38 文字（≈`max-w-prose` 相当）に保ち**、セル内で読みやすい幅に制限。余白はレールが受ける（本文を無理に広げない）。
- レールは `lg:` で**スティッキー**（`sticky top-…`）にしてスクロール時も手元に残す（過度に追従させない・控えめに）。
- `lg` 未満：**1カラムに崩す**。レール内容は本文の**下へ回り込む**（`StreakPanel` は横長スリム表示、`SeasonNote` は1行）。既存モバイル体験を壊さない。
- 罫＋明度差で本文セルとレールを分ける（`border-l`／面昇格）。**新規ドロップシャドウ禁止**。

### コンポーネント境界

- `DeskLayout` props: `{ children: ReactNode; rail: ReactNode }`。`children`＝本文（日付ヘッダ＋プロンプト＋エディタ）、`rail`＝`WritingRail`。レイアウトの責務だけを持ち、中身を知らない（差し替え可能）。
- 単体で確認できること: グリッドの段組み・崩れ・上限幅・スティッキーが props 非依存で成立する。

### ページ側の取得（`app/page.tsx`）

```
const date = todayInTokyo();
const [existing, entryDates] = await Promise.all([
  getDiaryEntry(date),
  listEntryDates(),            // entryDate のみ＝軽い（/history と同じクエリ）
]);
const streak = computeStreak(entryDates, date);
const prompt = await getTodayPrompt(date);  // ①AI（キャッシュ済）
```

- パフォーマンス: `getDiaryEntry` と `listEntryDates` を `Promise.all` で並列化。`listEntryDates` は entryDate 列のみ・インデックス済みで安価（学び：`/history` 実績）。`getTodayPrompt` は日次キャッシュヒット時 DB/AI を叩かない（②参照）。
- `app/diary/[date]/page.tsx` も同様。ただし**過去日では「今日の問い」を出さない**（バックデート編集に未来の問いは不自然）。レールのストリーク/季節は表示してよい（季節はその日付基準）。

## ② 書き出しの後押し（AI「今日の問い」）

### `lib/ai/daily-prompt.ts`

```
getTodayPrompt(date: string): Promise<{ text: string; source: 'ai' | 'seasonal' }>
```

- 既存 Gemini クライアント（`lib/ai/*`）を利用し、内省を促す**1問**を日本語で生成。プロンプト方針＝既存 insight と同じ「思いやりのある親友」のトーン。出力は短い問いかけ1文。
- **レート制限対策（5 RPM）**: 日付キーで**1日1回だけ生成しキャッシュ**する。Next.js のデータキャッシュ（`use cache` + `cacheLife`/`cacheTag`、または `unstable_cache`）で `key=daily-prompt:${date}` を `cacheLife('days')` 相当でキャッシュ。**ページを開くたびには叩かない**。単一ユーザー前提なのでユーザー個別化は不要（その日の1問を共有）。
  - 実装メモ: Next.js 16 の Cache Components（`use cache`）の現行ガイドを `node_modules/next/dist/docs/` で確認してから書く（AGENTS.md 方針）。
- **失敗/429時**: `lib/diary/seasonal-prompts.ts` から季節に合う1問を返し `source:'seasonal'`。**例外を投げない**（書く画面が落ちない）。失敗は `console.error` のみ。

### `lib/diary/seasonal-prompts.ts`（純関数・TDD）

```
pickSeasonalPrompt(date: string, seed?: number): string
```

- 二十四節気/和風月名/汎用にひもづく問いの配列を持ち、`date`（＋任意 `seed`）から決定的に1問選ぶ（同じ日付・seed なら同じ問い＝テスト可能）。
- 汎用フォールバック（節気が引けない/データ薄い場合）も必ず1問返す（空にならない）。

### `lib/actions/prompt.ts`

```
regenerateTodayPrompt(date: string): Promise<{ text: string; source: 'ai' | 'seasonal' }>
```

- `問いを変える` 用。明示操作なので AI 再生成を許可。失敗時は `pickSeasonalPrompt`（seed をずらして別問）。
- **連打対策**: クライアント（`TodayPrompt`）側でボタンを生成中 disabled ＋短いデバウンス。429 を受けたら「少し時間をおいて試してください」を一時表示し、その回は季節バンクから返す（体験は途切れない）。

### `components/diary/TodayPrompt.tsx`（`'use client'`）

- props: `{ initial: { text: string; source: string }; date: string; show: boolean }`。`show=false`（過去日）なら何も描画しない。
- 描画: 本文直上に、**明朝（`font-heading`）の問い1文** ＋ 左に細い罫（彩色なし＝深度で差をつける）＋ `問いを変える`（ghost ボタン、`ti-refresh` 相当のアイコン or テキスト）。
- `問いを変える` 押下で `regenerateTodayPrompt` を呼び、楽観的にスピナー→差し替え。

## ③ 続ける喜びの可視化（書く画面のストリーク）

### データ

- `computeStreak(entryDates, today)`（既存・純関数）と `listEntryDates()`（既存）を再利用。新規クエリ不要。
- 「今月の歩み」点列は既存 `buildMonthGrid`（`lib/calendar/month-grid.ts`）で当月セルを作り、`entryDates` の集合で塗り分け。

### `components/diary/StreakPanel.tsx`

- props: `{ streak: number; entryDates: readonly string[]; today: string }`。
- 描画:
  - 「続ける喜び」ラベル（明朝・小）＋**連続日数の大きな数字**（明朝・`tabular-nums`、若葉＝アクセント1）＋「日連続」。`streak===0` のときは数字を出さず「今日から、はじめよう」等の温かい空状態にする。
  - 「今月の歩み」：当月の点列。**書いた日＝若葉（塗り）／日曜＝朱／今日＝リング／未記入＝罫の輪郭**。`水無月 ・ 18 / 30 日` のような小さな進捗テキスト（`tabular-nums`）。
- 狭幅（`lg` 未満）では点列を横長スリムに。

## ④ 季節のたより

### `lib/diary/season.ts`（純関数・TDD）

```
getSeason(date: string): { wafuMonth: string; sekki: string; note: string }
```

- `wafuMonth`: 和風月名（睦月…師走）。新暦の月→和風月名の単純対応で可（YAGNI：旧暦換算はしない。表示は「情緒の添え物」なのでズレ許容と明記）。
- `sekki`: 二十四節気。**年ごとに数日揺れる**ため、近似の境界テーブル（月日→節気）で引く。引けない期間は直近の節気にフォールバック。
- `note`: 節気にひもづく一言メモ（短文バンク）。
- TDD: 既知アンカーで `wafuMonth`/`sekki` を検証（例: 6月＝水無月、夏至近辺＝夏至）。近似ゆえ「境界日のどちらに倒すか」を1ケース固定。

### `components/diary/SeasonNote.tsx`

- props: `{ date: string }`（内部で `getSeason`）。
- 描画: レール下段に「季節のたより」ラベル（明朝・小）＋ `sekki`（明朝、朱＝季節の差し色1）＋ `wafuMonth` ＋ `note`（muted・小・`line-height` 広め）。

## ⑤ 保存のお祝い演出

### サーバー側（`lib/actions/diary.ts`）

- `SaveResult` を拡張:
  ```
  export type SaveResult =
    | { ok: true; streak: number; firstToday: boolean }
    | { ok: false; error: string };
  ```
  - 保存成功後に `listEntryDates()`→`computeStreak` で**更新後ストリーク**を計算して返す。`firstToday` = 「今日はこの保存で初めて記入になった」か（演出の強弱に使う）。
  - `revalidatePath` は既存通り（`/`,`/history`,`/diary/${date}`）。

### クライアント側（`DiaryEditor` まわり）

- 保存成功時に、既存の「保存しました」＋プレビュー切替に加えて:
  - **「今日でN日目」のナッジ**（若葉・小さなピル）。`firstToday` のときだけ少し強めに祝い、編集の再保存では控えめに。
  - **落款（印）モチーフ**を短くフェード/スタンプ表示（CSS の transform/opacity による**機能的モーション**のみ。新規ドロップシャドウ禁止）。**既定は墨＋若葉**（朱の印はアクセント予算外なので採用しない＝アクセント予算章の通り）。
  - 数百ms で自然に収束（うるさくしない）。`prefers-reduced-motion` を尊重しモーション無効時は即時表示。

## `/history`・`/insights`（軽い幅対応のみ）

- `max-w-3xl`→`max-w-5xl`（目安）に広げ、`mx-auto` 維持。既存の段組み（`insights` の `md:grid-cols-2`、`history` の `grid-cols-7` カレンダー）はそのまま、広い器の中で素直に大きく見えるだけにする。
- **本格的なダッシュボード化・年間ヒートマップ・並置は対象外**（別イテレーション）。`HeaderNav` も幅だけ揃え、構造は据え置き。

## エラーハンドリング方針

- AI 生成は**握り**：失敗/429 でも季節バンクで必ず問いを返し、書く画面は常に成立。
- 保存失敗時の表示は既存（`{ ok:false; error }`）を踏襲。お祝い演出は `ok:true` のときだけ。
- `season`/`seasonal-prompts` は純関数で**常に非空**を返す（境界・データ欠落で undefined を出さない）。

## テスト

- **vitest（純関数・TDD 優先）**:
  - `season.ts`: 既知アンカーで `wafuMonth`/`sekki`/境界日の倒し方。
  - `seasonal-prompts.ts`: 決定性（同 `date`+`seed`→同一）、汎用フォールバックが非空。
  - `daily-prompt.ts`: 成功時 `source:'ai'`、AI 失敗をモックして `source:'seasonal'` に退避（例外を投げない）。キャッシュキーが日付単位。
  - `computeStreak`: 既存テストに「今月の歩み塗り分け」用の境界（月跨ぎ・日曜）ケースを必要なら追加。
- **コンポーネント**: `StreakPanel`（数字/点列/空状態）、`SeasonNote`、`TodayPrompt`（`show=false` で非描画、再生成でテキスト差し替え）、保存成功でお祝い要素が出る。
- **ガードレール/CI**: `lint:design` green（生色リテラル無し）、`tsc`、`build`（CI ダミー env）。
- **手動確認**: (a) `lg` 以上↔未満のレスポンシブ（本文行長・レール回り込み・スティッキー）、(b) **ダーク両対応**、(c) 429 退避パス、(d) `prefers-reduced-motion`、(e) アクセント予算（若葉1〜2/朱は日曜・季節のみ）を `/dev/design` と突き合わせ。

## 段階リリース（PRベース・main 直push不可・squash）

各 PR は `gh pr checks --watch` で green を確認→`gh pr merge --squash --delete-branch`。

- **PR① 文机レイアウト土台**：`DeskLayout`＋書く画面の `max-w-3xl` 置換＋`/history`/`/insights` の幅広げ。**新機能なし・構造と幅のみ**（レールは空のプレースホルダ or ストリークだけ先行でも可）。
- **PR② ストリーク＋季節レール**：`StreakPanel`/`SeasonNote`/`WritingRail`/`season.ts`（＋テスト）。
- **PR③ AI 今日の問い**：`daily-prompt.ts`/`seasonal-prompts.ts`/`prompt.ts`/`TodayPrompt`（＋テスト・キャッシュ）。
- **PR④ お祝い演出**：`SaveResult` 拡張＋クライアント演出。

> 各 PR 単体で本番に出して成立する粒度。①で「広い文机になった」だけでも体験は前進し、②③④で温度を足していく。

## 未解決/レビューで詰める点

- 「今月の歩み」点列を**レールに常設するか／節気メモとの上下順**（`/dev/design` で実機の温度を見て微調整）。
- 朱の落款を使うかの最終判断（既定は不採用。使うなら憲法拡張の明文化が必要）。
- `getTodayPrompt` のキャッシュ実装は **Next.js 16 現行ドキュメントを確認してから**確定（`use cache` vs `unstable_cache`）。
