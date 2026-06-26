# 分析（エニアグラム）画面の和モダン化 — 設計（PR2-C）

- 日付: 2026-06-26
- ステータス: 設計（専門エージェントレビュー → 実装）
- 前提: PR1（土台 #37）＋PR2-A（日記 #38）＋PR2-B（履歴 #39）本番マージ済み。本spec＝**PR2 最終ピース＝分析画面**。
- 関連: [`2026-06-26-design-system-design.md`](2026-06-26-design-system-design.md)（憲法）

## 背景と目的

分析画面 `app/insights/page.tsx` ＋ `components/insights/*`（エニアグラム可視化）を和モダンへ。調査の結論：

- **off-token 色はゼロ**。エニアグラムの色は**すべて `var(--center-gut/heart/head)`**（`lib/enneagram/types.ts` の `CENTER_COLOR_VARS` 経由のインライン style）か token クラス。見出しは base ルールで既に明朝。`.prose` は不使用。
- よって**和モダン化の核は `--center-*` の再調律**（現状: 黄 oklch(…70) / 赤(…15) / 青(…250) のビビッド）。3中心色を**和の顔料色（黄土・茜・藍）**へ寄せ、彩度を落として墨×生成り×若葉に馴染ませる。`var()` チェーン経由で**全エニアグラム表示（Hero/Symbol/Centers/Legend/TopBars）が一括で和モダン化**し、コンポーネントの色編集は不要。

### 確定方針

- `--center-gut/heart/head` を和顔料色へ再調律（light/dark）。**3中心の意味的対応（腹=土系・心=赤系・頭=青系）は維持**しつつ和トーンに。
- `--chart-1..5`（グレースケール）は**未使用**のため**据え置き**（YAGNI）。
- エニアグラム各コンポーネントの**構造・ロジック・クラスは変更しない**（色は token 経由で自動追従）。
- 分析画面の本文（サマリ/アドバイス）に軽いエディトリアル調整（行間）。見本帳に中心色スウォッチを追加。
- スコープは分析画面＋`--center-*` トークンのみ。他画面・他トークンに触れない。

### アクセント運用（憲法整合）

エニアグラムの3中心色は**データの分類符号化**（メーター/カレンダー記入日と同じ。「アクセント1〜2箇所」=装飾の話の例外）。若葉(`--primary`)・朱(`--season`)は分析画面では使わない（中心色＝独立カテゴリ色）。生色リテラルは持ち込まない（既に全て token/var）。ダーク両対応。

## ① 中心色トークンの再調律（`app/globals.css`）

`:root` と `.dark` の `--center-gut/heart/head` を以下に置換（黄土=ochre / 茜=madder red / 藍=indigo。彩度を抑えた和顔料トーン。light は 生成り背景で、dark は 墨背景で読めるよう L を調整）。`--chart-*` は変更しない。

**ライト（`:root`）**
```css
  --center-gut: oklch(0.58 0.085 75);   /* 黄土 ochre */
  --center-heart: oklch(0.52 0.12 25);  /* 茜 madder red */
  --center-head: oklch(0.44 0.09 255);  /* 藍 indigo（11px文字/細バーのコントラスト確保にLを下げる） */
```

**ダーク（`.dark`）**
```css
  --center-gut: oklch(0.75 0.085 78);
  --center-heart: oklch(0.70 0.12 25);
  --center-head: oklch(0.72 0.10 258);
```

- 既存の消費箇所（Hero の border-left/コード文字/`color-mix(... 15%)` バッジ、Symbol の dot/halo/label、Centers の積み上げバー/凡例、Legend のラベル/ドット、TopBars のバー）は **すべて `var(--center-*)` 経由なので自動で新色に追従**。`color-mix(in oklab, var(--center-*) 15%, transparent)` も新値で機能する。

## ② 分析画面の本文タイポ（`app/insights/page.tsx`）

- has-data 状態のサマリ/アドバイス本文 `<p className="whitespace-pre-wrap leading-relaxed">` を **`leading-loose`**（≈2.0）に。和文の読み物としての落ち着きを出す（見出しは base ルールで既に明朝なので変更不要）。
- 他の2状態（件数不足 / 未生成）の本文・`RegenerateButton` は据え置き（既に token）。
- セクション間隔（`space-y-10` 等）は据え置き。

## ③ 見本帳（`/dev/design`）

- カラートークンのスウォッチ群に **エニアグラム中心色（gut/heart/head）の見本3つ**を追加（`var(--center-gut)` 等を背景にした小カード＋ラベル）。`/dev/design` はガードレール除外なので `style={{ backgroundColor: 'var(--center-gut)' }}` で表示してよい（または既存スウォッチの仕組みに合わせる）。これで中心色が見本帳に載り、今後の再利用・確認が容易に。

## 触るファイル

- 変更：`app/globals.css`（`--center-*` のみ）、`app/insights/page.tsx`（本文 leading）、`app/dev/design/page.tsx`（中心色スウォッチ）。
- **変更しない**：`components/insights/*`、`lib/enneagram/types.ts`、`--chart-*`、他画面。

## 検証

- `npm run lint` / `npm run lint:design`（色リテラルを増やさない。`/dev/design` の中心色見本は除外対象なので問題なし）/ `npx tsc --noEmit` / `npm run test` / `npm run build` 全 green。
- 分析画面の確認（本番/preview か `/dev/design`）：3中心色が和トーン（黄土/茜/藍）で互いに識別でき、生成り(light)・墨(dark) 両方で読める。Hero/Symbol/Centers/Legend/TopBars が新色で一貫。サマリ本文の行間。
- 憲法準拠：色は token/var のみ、見出し明朝、中心色＝データ分類、ダーク両対応。
- PRベース：`claude/pr2-insights` → CI green → squash merge（本番デプロイ）。これで和モダン刷新（PR1+2A+2B+2C）が完了。

## スコープ外（YAGNI）

- `--chart-*` の再調律（未使用）。エニアグラムの構造・レイアウト刷新（Symbol の作画変更等）。
- 件数不足/未生成状態の作り込み。AI 出力の文体変更。

## 未解決事項

- 中心色の具体 oklch 値はデザイン判断。レビューで「3色の識別性」「生成り/墨でのコントラスト（小ドット/小文字でも読めるか）」を確認する。
