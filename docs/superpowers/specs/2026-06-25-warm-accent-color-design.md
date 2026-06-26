# アプリ全体の配色：暖色アクセント＋温かいニュートラル 設計ドキュメント

- **作成日**: 2026-06-25
- **対象**: 完全無彩色（base-nova グレースケール）だったアプリ全体に、暖色アクセント1色とわずかに温かいニュートラルを導入する
- **位置づけ**: エニアグラム機能でアプリ初の有彩色（センター色）が入り、他ページとの温度差が出たことが発端。「全ページを塗る」のではなく、トークン設計で *意図的に* 色を入れる
- **ステータス**: 設計合意済み（合意日 2026-06-25）。エニアグラム機能とは**別PR**

## 1. 概要と方針

3エージェントによるトークン監査の結論：アプリは `--primary` も含め全カラートークンが `chroma=0` の純無彩色で、`--primary` が「黒い操作色（ink 兼 accent）」を一手に担っている。例外は `--destructive`（赤）と `--center-gut/heart/head`（エニアグラム）のみ。

したがって**最小レバーは `--primary` の振り替え**。これだけでプライマリボタン・カレンダーの記入済み/今日マーカー・フォーカスリングが一斉に色づく。「濃い文字/ink」は別トークン `--foreground` が担うため、文章は無彩色のまま残せる＝**アクセントだけ暖色**が成立する。

### 1.1 含める

1. `--primary` / `--primary-foreground` / `--ring` を**テラコッタ系暖色**へ（ライト/ダーク個別）
2. ニュートラル面（`--background/--card/--popover/--secondary/--muted/--accent/--border/--input/--foreground` 系）を**ごく薄い暖色**へ
3. コンポーネント微修正2つ：ストリーク pill（`bg-accent`→暖色tint）、ナビ active（`text-foreground`→`text-primary`）

### 1.2 含めない（YAGNI / 据え置き）

- `--destructive`（意味色・赤）、`--center-*`（エニアグラム識別色）は不変
- `--chart-1..5`（無彩色階調・現状未使用）：将来チャート導入時に別途
- `--sidebar-*` の未使用トークン群（`--sidebar` / `--sidebar-border` のみ温かく追従、他は据え置き）
- `DiaryEditor` の `text-green-600`（成功フィードバック・Tailwind 固定色）：意味色として据え置き
- ダーク/ライトの**トグルUI**は対象外（既存の `.dark` 切替前提）

## 2. トークン値（oklch、ライト=`:root` / ダーク=`.dark`）

### 2.1 アクセント（テラコッタ、hue 48）

| トークン | ライト | ダーク |
|---|---|---|
| `--primary` | `oklch(0.56 0.145 48)` | `oklch(0.74 0.13 52)` |
| `--primary-foreground` | `oklch(0.985 0.01 60)` | `oklch(0.255 0.045 50)` |
| `--ring` | `oklch(0.56 0.145 48)` | `oklch(0.74 0.13 52)` |

色相 48° の選定理由：本能=琥珀(70°)から離し、思考=青(250°)と反対側、危険=赤(27°)とも21°離す。データ色・エラー色と役割が混ざらない。ダークは既存方針（センター色同様 L を上げて暗背景で映えさせる）に合わせ L=0.74。

### 2.2 温かいニュートラル（hue 70 前後、chroma 0.004〜0.008）

| トークン | ライト | ダーク |
|---|---|---|
| `--background` | `oklch(0.995 0.004 75)` | `oklch(0.17 0.006 70)` |
| `--foreground` | `oklch(0.16 0.004 70)` | `oklch(0.985 0.003 75)` |
| `--card` | `oklch(1 0.002 75)` | `oklch(0.215 0.006 70)` |
| `--card-foreground` | `oklch(0.16 0.004 70)` | `oklch(0.985 0.003 75)` |
| `--popover` | `oklch(1 0.002 75)` | `oklch(0.215 0.006 70)` |
| `--popover-foreground` | `oklch(0.16 0.004 70)` | `oklch(0.985 0.003 75)` |
| `--secondary` | `oklch(0.972 0.006 70)` | `oklch(0.275 0.007 70)` |
| `--secondary-foreground` | `oklch(0.205 0.006 70)` | `oklch(0.985 0.003 75)` |
| `--muted` | `oklch(0.972 0.006 70)` | `oklch(0.275 0.007 70)` |
| `--muted-foreground` | `oklch(0.556 0.01 70)` | `oklch(0.708 0.01 70)` |
| `--accent` | `oklch(0.965 0.008 65)` | `oklch(0.28 0.009 65)` |
| `--accent-foreground` | `oklch(0.205 0.006 70)` | `oklch(0.985 0.003 75)` |
| `--border` | `oklch(0.918 0.007 70)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.918 0.007 70)` | `oklch(1 0 0 / 15%)` |
| `--sidebar` | `oklch(0.982 0.006 72)` | `oklch(0.215 0.006 70)` |
| `--sidebar-border` | `oklch(0.918 0.007 70)` | `oklch(1 0 0 / 10%)` |

chroma は最大 0.01 程度に抑える（無彩前提の半透明合成 `ring-foreground/40`, `bg-muted/50`, `color-mix(... foreground 5%)` が転ばないように）。

### 2.3 コントラスト（監査の概算、AA 目標）

- ライト：白文字 on アクセント CR≈4.7（AA-normal ぎりぎり合格）、`--foreground` on `--background` CR≈19、`--muted-foreground` on bg CR≈4.67
- ダーク：暗文字 on アクセント CR≈6.65、その他いずれも AA 合格
- ※概算のため**実機（dev プレビュー）でライト側を最終目視**する

## 3. コンポーネント修正

1. **ストリーク pill** `app/history/page.tsx`：`bg-accent` → `bg-primary/10 text-primary`（暖色tint＋テラコッタ文字）。🔥 は残す（暖色pillと馴染む）。
2. **ナビ active** `components/layout/HeaderNav.tsx`：active クラス `text-foreground` → `text-primary`（アクティブをアクセント色に）。非active は据え置き。

カレンダー（記入済みセル `bg-primary` / 今日リング `ring-primary` / 凡例）と各プライマリボタンは `--primary` 連動で自動的に色づくため**コード変更不要**。

## 4. リスクと確認

- **テラコッタ vs 危険赤**：21°差で区別可だが、削除系ボタンと並ぶUIで最終目視。
- **ライト側コントラスト**：白文字 on アクセントが AA ぎりぎり → 実機確認。割れたらアクセント L を 0.55 に下げる。
- **カレンダーのオレンジ過多**：記入済みが多い月で `bg-primary`（鮮やかなオレンジ）が画面を占める可能性 → スクショで判断、過剰なら `bg-primary/30` 等に緩める余地を残す。
- **ニュートラル過剰 chroma**：0.01 上限を厳守。

## 5. 検証・進め方

- `globals.css` 差し替え＋2コンポーネント修正 → `biome` / `tsc` / `vitest` / `build` green。
- dev プレビュー（`/dev/enneagram` と実ページ）で**ライト＋ダーク両方スクショ**、上記リスクを目視。
- エニアグラムとは別PRとして squash merge。
