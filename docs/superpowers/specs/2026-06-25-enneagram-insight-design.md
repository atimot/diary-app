# エニアグラム傾向機能 設計ドキュメント（MBTI 置換）

- **作成日**: 2026-06-25
- **対象**: `/insights` の「MBTI 4軸スライダー」を廃止し、エニアグラム（9タイプ）ベースの週間傾向に置き換える
- **位置づけ**: M3 で導入した MBTI 可視化を、日記という入力データとの相性で再検討した結果。日記は「動機・感情の記録」であり、認知スタイル（MBTI=how）より核の動機（エニアグラム=why）の方が噛み合う、という判断
- **ステータス**: 設計合意済み（合意日 2026-06-25）。**未ローンチ**のため後方互換・データ移行は不要

## 1. 概要

MBTI は「E/I・S/N・T/F・J/P の対立4軸」で、対立スライダーに綺麗にハマっていた。しかし S/N 等は日記文からの推定が苦しく、日記の中身（不安・欲求・葛藤）とズレる。エニアグラムは「核となる動機・恐れ」を扱い、日記の内容と層が一致する。

可視化は対立軸ではなくなるため、スライダーを廃止し、**同じ9タイプ親和度スコアから3種類のグラフを描く**構成にする。

### 1.1 含める機能

1. AI が**9タイプの親和度（各 0〜1）＋根拠文**を生成（既存 summary/advice と同じ1リクエストに統合維持）
2. スコアから**主タイプ・ウイング・上位タイプ・3センター内訳を決定的に算出**（純関数）
3. `/insights` に4部品を表示：
   - **ヒーローカード**（例: 今週のあなた = `9w1 平和をもたらす人` ＋ 核の欲求/恐れ ＋ AI根拠文）
   - **シンボル図**（9点図、主タイプ点灯＋ウイング）
   - **上位タイプ・バー**（上位5タイプ）
   - **3センター**（腹/心/頭の重心）

### 1.2 含めない機能（YAGNI）

- 週ごとの推移グラフ（将来。今回は最新スナップショットのみ）
- レーダーチャート（シンボル図と役割が被り、9軸は視覚的に重い）
- MBTI との併記 / 切替（MBTI は完全廃止）
- ウイング・統合/分裂（矢印）の自動描画（シンボル図は主タイプ＋ウイングの点強調まで）
- タイプ説明の AI 生成（静的データで持つ）

## 2. 枠組み: 「固定タイプ」ではなく「今週の傾向」

- エニアグラムのタイプは本来「一生もの」だが、入力は直近7日のみ。「あなたのタイプは X」と断定しない。
- コピーは **「今週の日記に最も表れていた動機パターン」**。MBTI 同様の免責文（「占いではなく、AI が読み取った参考的な傾向」）を添える。
- この枠組みにより、将来「週ごとに重心が動く」推移表示へ自然に拡張できる。

## 3. データモデル

### 3.1 静的データ `lib/enneagram/types.ts`

9タイプの定義を静的に持つ（AI には説明させない＝信頼性・トークン両面で有利）。

各タイプ: `number(1-9)`, `key`, `name`(和名), `coreDesire`, `coreFear`, `center`(`gut|heart|head`)。
センター分類: 腹（本能）= 8,9,1 / 心（感情）= 2,3,4 / 頭（思考）= 5,6,7。

### 3.2 算出ロジック `lib/enneagram/derive.ts`（純関数・TDD）

| 関数 | 内容 |
|---|---|
| `dominantType(scores)` | argmax。同点は番号小を優先（決定的に） |
| `wing(scores, dominant)` | 隣接（±1、9↔1 ループ）で高い方。同点は番号小 |
| `typeCode(dominant, wing)` | 例 `"9w1"` |
| `topTypes(scores, n)` | スコア降順 上位 n |
| `centerBreakdown(scores)` | 腹/心/頭の合計を正規化（%）し、優勢センターを返す |

### 3.3 DB スキーマ `lib/db/schema.ts`

`mbtiSnapshots` / `MbtiScores` を**廃止**し、新設：

```
enneagramSnapshots
  id          uuid pk
  userId      text not null references user.id on delete cascade
  snapshotDate date not null
  scores      jsonb not null  // EnneagramScores = Record<"1".."9", number(0-1)>
  rationale   text not null   // ★ヒーローカード用に永続化（MBTI では捨てていた値）
  sourceEntryIds jsonb not null  // string[]
  model       text not null
  createdAt   timestamptz not null default now()
  unique (userId, snapshotDate)
```

`EnneagramScores` 型と `EnneagramSnapshot` 推論型を export。

### 3.4 マイグレーション

- 運用は `drizzle-kit push`（`npm run db:push`）。マイグレーションファイル管理なし。
- 未ローンチ・単一ユーザーのため、旧 `mbti_snapshots` は **DROP で破棄**（移行なし）。push 適用後に Drizzle Studio で確認。

## 4. AI 生成 `lib/ai/schemas/combined-insight.ts` / `lib/ai/combined-insight.ts`

- 出力スキーマの `mbti` ブロックを `enneagram` に差し替え：
  ```
  enneagram: {
    scores: { "1": 0-1, ... "9": 0-1 },  // 各タイプの今週の親和度
    rationale: string                     // 3〜5文、具体的な日記内容に触れ、観察的に
  }
  ```
- `summary` / `advice` は不変。
- プロンプト: 9タイプの「核となる動機」を簡潔に提示して採点をブレさせない。「今週の日記に表れた動機の強さ」を 0〜1 で。自信がなければ低め・分散。断定や診断にしない。
- **1リクエスト構成は維持**（Gemini 無料枠 5 RPM 対策）。

## 5. フロントエンド

### 5.1 配色の原則

実コンポーネントは**アプリの shadcn / Tailwind v4 トークン**（`var(--primary)` 等の `oklch`）を使う。ブレスト時のモック（Imagine の `--color-*`）の値は持ち込まない。SVG では `var(--primary)` を直書き（`hsl(var(--primary))` は無効。CLAUDE.md 既出方針）。

### 5.2 部品（`components/insights/`）

- `EnneagramHero.tsx` — タイプコード＋和名＋核の欲求/恐れ＋根拠文
- `EnneagramSymbol.tsx` — 9点シンボル図（円＋三角 3-6-9 ＋ヘクサド 1-4-2-8-5-7、主タイプ点灯＋ウイング強調）。client
- `EnneagramTopBars.tsx` — 上位5タイプの横バー
- `EnneagramCenters.tsx` — 腹/心/頭の積み上げバー＋凡例
- 共通の props は `derive.ts` の算出結果 + `types.ts` の静的データを受け取る形にし、各部品は内部に算出ロジックを持たない（テスト容易性・単一責務）。

### 5.3 `app/insights/page.tsx`

MBTI 節を上記4部品に差し替え。`summary` / `advice` 節と3状態ロジック（件数不足 / 未生成 / キャッシュあり）は維持。`getLatestMbtiSnapshot` → `getLatestEnneagramSnapshot` に置換。

### 5.4 永続化フロー

- `lib/db/queries/enneagram.ts`（`mbti.ts` をリネーム）: `getLatestEnneagramSnapshot()`
- `lib/actions/insight.ts`: `enneagramSnapshots` を upsert。`rationale` も保存（MBTI 版は破棄していた）。

## 6. 後始末

- 削除: `components/insights/MBTISliders.tsx`, `lib/db/queries/mbti.ts`、schema の MBTI 型/テーブル
- `scripts/seed-reset.ts`: DELETE 対象を `enneagram_snapshots` に更新
- `scripts/seed.ts`: コメントの「MBTI scoring」表現を更新（任意）
- grep で `mbti` / `MBTI` 残骸がないことを確認

## 7. テスト・検証

- **TDD**: `lib/enneagram/derive.ts` の純関数を vitest で。端ケース＝同点 argmax、ウイングの 9↔1 ループ、センター正規化の合計100%、全0スコア。
- CI（lint / tsc / vitest / build）green を確認 → PR を squash merge（main 直 push 不可）。
- 手動: ローカルで `/insights` 再生成 → ヒーロー/シンボル/バー/センターが描画されることを確認。

## 8. 実装順序

1. `types.ts`（静的データ）→ 2. `derive.ts` ＋テスト（TDD）→ 3. schema 変更 → `db:push` → 4. AI スキーマ/プロンプト → 5. action / query → 6. 4部品 → 7. page 差し替え → 8. 後始末・seed → 9. lint/tsc/vitest/build → 10. PR
