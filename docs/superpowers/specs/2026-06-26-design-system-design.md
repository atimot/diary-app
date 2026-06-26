# 日記アプリ デザインシステム（和モダン）設計

- 日付: 2026-06-26
- ステータス: 設計承認済み（実装計画はこれから / writing-plans）
- 関連: 過去のデザイン方向性検討（4案 → 「和モダン（墨と季節色）」採択）

## 背景と目的

現状のUIは shadcn(base-nova) のほぼデフォルトで、温かみはあるが装飾最小で没個性。「もっとスタイリッシュでモダンに」という要望に対し、ビジュアルモックで4方向を比較し **D「和モダン（墨と季節色）」** を採択した。

本specのゴールは、和モダンを **今後すべての画面作成・変更で再利用でき、かつデザインがブレない仕組み** としてリポジトリに定着させること。Claude Code で開発するため、「正解」はコード（デザイントークン）とリポジトリ内の文書（憲法）に置く。Figma / Storybook は採用しない。

### 確定済みの方針（ユーザー承認）

- **Storybook は採用しない**。アプリ内の `/dev/design` ルート（既存 `/dev/enneagram` と同じ流儀）を「生きた見本帳」とする。本物の Next.js + 本物のトークン + 本物のフォントで動くため、見本帳と実アプリが100%一致しズレない。
- **ライト/ダーク切替トグルを今回入れる**（和モダンは両モードで設計済み）。
- **PR1 は土台のみ**。既存3画面（日記/履歴/分析）のレイアウト作り込みは PR2 以降。

## アプローチ：shadcnセマンティック拡張＋和モダン薄レイヤー（案1）

既存の shadcn セマンティック変数（`--primary` `--background` `--border` `--radius` 等）の**値だけ**を和モダンに差し替え、不足概念（季節色アクセント・ダーク4段サーフェス・見出しフォント）を少数の新トークンで追加する。

理由: shadcn コンポーネントは既に `bg-primary` 等のトークンクラスを参照しているため、**トークンの値を変えるだけで全画面が和モダンに変わる**。これが「ブレない」の核。独自トークン体系の新設（案2）は二層マッピングと部品の再配線が必要でオーバーキルのため不採用。

## ① トークン体系（唯一の源 / `app/globals.css`）

既存の oklch 運用を踏襲する。下記は承認済みモックの hex（参照値）。実装では oklch で記述し、hex はコメントで併記する。

### ライト（生成りの紙）

| 役割 | shadcn変数 | 参照hex |
|---|---|---|
| 背景 | `--background` | `#f4f1ea` |
| カード/ポップ | `--card` `--popover` | `#fbf9f4` |
| 面（薄） | `--muted` / `--accent`(面) | `#f0ece2` |
| 文字（墨） | `--foreground` `--card-foreground` `--popover-foreground` | `#1b1916` |
| 補助文字 | `--muted-foreground` | `#8c857b` |
| 罫 | `--border` `--input` | `#e0d9cc` |
| 主アクセント（若葉） | `--primary` `--ring` | `#5f7a4f` |
| アクセント上文字 | `--primary-foreground` | `#f4f1ea` |
| 季節色（朱・日曜/差し色） | 新規 `--season` | `#b9421f` |
| 危険（削除等） | `--destructive` | 既存の赤を踏襲（和に馴染むよう微調整可） |

### ダーク（藍鼠の夜）= 4段サーフェス

| 役割 | 変数 | 参照hex |
|---|---|---|
| base 背景 | `--background` | `#15181d` |
| elevated（カード） | `--card` | `#1b1f25` |
| nested（入力/トラック） | 新規 `--surface-nested` | `#232830` |
| overlay（ポップ） | `--popover` | `#2a313b` |
| 文字 | `--foreground` | `#e9e7e1` |
| 補助文字 | `--muted-foreground` | `#8a909c` |
| 罫 | `--border` `--input` | `#2b313a` |
| 主アクセント（若葉/明度up） | `--primary` `--ring` | `#93b277`（大型数字は `#aecb92`） |
| アクセント上文字 | `--primary-foreground` | `#15181d` |
| 季節色（朱/明度up） | `--season` | `#cf6b4f` |
| 危険（削除等） | `--destructive` | 既存のダーク赤を踏襲（微調整可） |

### 新規トークン

- `--season`（季節色＝朱。日曜・警告・差し色。`@theme inline` で `--color-season` に接続し `text-season` `bg-season` 等で使えるように）
- `--surface-nested`（ダークの4段目。入力欄・メータートラック等。`--color-surface-nested`）
- `--font-heading`（既存だが値を明朝へ。下記②）

`--radius` は現状 0.625rem(10px) を踏襲。カードの角丸は 12〜13px を別途クラスで（既存の `--radius-xl` 等の倍率を利用）。`font-variant-numeric: tabular-nums` を数字表示の既定とする。

## ② フォント（`app/layout.tsx` ＋ base層）

- 見出し: **Shippori Mincho B1**（明朝, weight 500/600）→ `--font-heading`。`@layer base` で `h1,h2,h3` に適用。日付・大型数字にも使う。
- 本文/UI: **Zen Kaku Gothic New**（400/500）を sans の基盤に。現状の **Geist Sans は退役**。フォールバックに Noto Sans JP を残す。
- `font-mono` は Geist Mono を継続（必要箇所のみ）。
- CJK は見出しの weight を絞り **`preload: false`**（`next/font/google` でself-host、`unicode-range` で遅延ロード）。AGENTS.md のフォント方針と整合。
- `@theme inline` の `--font-sans` / `--font-heading` は next/font の変数を指す（自己参照しない。既知の落とし穴）。

## ③ ライト/ダーク切替

- **`next-themes`** を採用。`<html>` の class を切替、FOUC（初期チラつき）対策込み、システム設定追従、localStorage 記憶。`ThemeProvider` を `app/layout.tsx` に、トグル（Tablerの月/陽アイコン）をヘッダーに1つ追加。
- 実装時に context7 で Next.js 16 App Router での最新の使い方を確認する。
- 代替（不採用だが記録）: ゼロ依存のインライン `<script>` 方式。依存を増やさないが FOUC 対策とシステム追従を自前実装する必要がある。

## ④ コンポーネント方針

- shadcn/ui（Button/Card/Tabs/DropdownMenu/AlertDialog/Textarea…）はトークン参照のため**コード変更ほぼ不要**。値差し替えで追従。
- **PR1 では既存3画面のレイアウトを触らない**。トークン/フォント差し替えにより、既存画面は自動で色・字面だけ和モダン化する（再スキン）。
- 画面ごとの作り込み（カレンダーのセル塗り、メーターバー、streakヒーロー、エディトリアル余白、縦組み日付など）は **PR2 以降**。
- 共通小物（`MeterBar` 等）は既存を踏襲し PR2 で和モダン仕様に更新。

## ⑤ デザイン憲法（`AGENTS.md` に追記）

Claude Code が毎セッション読んで従う明文ルール（システム既定より優先）。

1. 色は必ずトークン経由（`bg-primary` `text-foreground` `text-season` 等）。**生hex・任意色（`text-[#...]` / `bg-[#...]`）禁止**。例外は `app/globals.css` と `/dev/design`。
2. font-size は Tailwind スケールかトークンから。**11px 未満禁止**。
3. 見出しは `font-heading`（明朝）、本文は既定（Zen Kaku Gothic New）。
4. アクセント（若葉）は **1画面に1〜2箇所**（保存/今日/最強指標など意味のある一点）。朱（`--season`）は日曜・季節の差し色に限定。削除など危険操作は `--destructive`。
5. 深度は**影でなく罫＋明度差**で出す。新規の drop-shadow 禁止（focus ring 等の機能的影は可）。
6. 新パターンを足す前に `/dev/design` と既存コンポーネントを確認し、**再利用を優先**。
7. ダーク対応必須。色は両モードで成立させる（4段サーフェス: base/elevated/nested/overlay）。

## ⑥ 生きた見本帳（`/dev/design`）

1ページに以下を陳列し、ライト/ダーク両方で目視確認できるようにする:

- カラースウォッチ（全トークン、役割ラベル付き）
- タイプスケール（見出し明朝 / 本文 Zen Kaku / 数字 tabular-nums、各サイズ）
- 余白・角丸サンプル
- コンポーネント: Button 各 variant/size、Card、Tabs、DropdownMenu、AlertDialog、Textarea、MeterBar、カレンダーセルの状態（記入/今日/未記入/未来/日曜）

このページは Claude にも「ここに合わせて」と渡せる基準。実装の `<head>` には載せず開発用ルートとして扱う。

## ⑦ ガードレール（書けなくする）

- **CIチェック**: `app/` `components/` を走査し（`components/ui/**`・`app/dev/**`・`app/globals.css` は除外）、**生hex（`#rgb`/`#rrggbb`）と任意 color/size の Tailwind 値（`text-[...]` `bg-[...]` 等の色/サイズ系）** を検出したら fail する Node スクリプト。`npm run lint:design` として追加し、vitest からも実行可能にして CI（`.github/workflows/ci.yml`）に組み込む。
- Biome は整形・import 整理・CSS の at-rule 位置ルール等を継続。

## ⑧ PR分割

- **PR1（本スコープ）**: ①トークン ②フォント ③テーマ切替 ⑤憲法 ⑥見本帳 ⑦ガードレール。＝再スキン＋仕組み。既存画面は自動で色・字面が和モダン化する。
- **PR2 以降**: 日記 → 履歴 → 分析 の順に、画面ごとのレイアウト/コンポーネントを和モダンへ作り込み。各PRは spec → plan → 実装のサイクル。

## ⑨ 検証

- `npm run lint`（biome）/ `npx tsc`（型）/ `npm test`（vitest）/ `npm run build` が green。
- `npm run lint:design`（ガードレール）が green、かつ意図的に hex を混ぜると fail することを確認。
- `/dev/design` をライト・ダーク両方で目視（必要なら Playwright でスクショ）。
- ダークトグルがFOUCなく動作。
- PRベース運用: ブランチ → `gh pr checks --watch` で CI green → `gh pr merge --squash --delete-branch`。

## スコープ外（YAGNI）

- Storybook、Figma 連携、公開コンポーネントカタログ。
- インタラクションテスト/ビジュアルリグレッション基盤（必要になったら再検討）。
- 既存3画面の作り込み（PR2 以降）。
- 複数テーマ（和モダン以外）の追加。

## 未解決事項

なし（テーマ機構は next-themes を第一候補とし、実装時に context7 で最終確認）。
