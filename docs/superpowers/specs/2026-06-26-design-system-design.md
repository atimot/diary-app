# 日記アプリ デザインシステム（和モダン）設計

- 日付: 2026-06-26
- ステータス: 設計承認済み（専門エージェント3名のレビュー反映済み / 次は writing-plans）
- 関連: デザイン方向性検討（4案 → 「和モダン（墨と季節色）」採択）

## 背景と目的

現状のUIは shadcn(base-nova) のほぼデフォルトで没個性。「もっとスタイリッシュでモダンに」という要望に対し、4方向のモック比較で **D「和モダン（墨と季節色）」** を採択した。

ゴールは、和モダンを **今後すべての画面で再利用でき、Claude Code 開発でもデザインが大きくブレない仕組み** としてリポジトリに定着させること。「正解」はコード（デザイントークン）とリポジトリ内文書（憲法）に置く。Figma / Storybook は不採用。

### 確定済み方針（ユーザー承認）

- **Storybook 不採用**。`/dev/design` ルート（既存 `/dev/enneagram` と同流儀）を「生きた見本帳」とする。本物の Next.js + トークン + フォントで動くため実アプリと100%一致。
- **ライト/ダーク切替トグルを今回入れる**。
- **PR1 は土台のみ**。既存3画面の作り込みは PR2 以降。

### 「ブレない」の正直な到達点（重要）

完全自動で「絶対ブレない」は不可能。本設計が**機械的に防げるのは「生の色リテラルの混入」**（grepガードレール、インラインstyleも含む）まで。**防げないもの**＝トークンの*意味的*誤用（例: 見出しに`muted`、`primary`の乱用）、余白/型スケールの逸脱、11px境界の実寸判定。これらは **`/dev/design`（基準）＋ 憲法（AGENTS.md）＋ 人/Claudeのレビュー** で担保する。spec/憲法ではこの線引きを明示し、過剰約束しない。

## アプローチ：shadcnセマンティック値の差し替え＋最小の新規トークン（案1）

既存 shadcn 変数（`--primary` `--background` `--border` 等）の**値だけ**を和モダンに差し替え、不足概念は最小限の新規トークンで足す。shadcn部品は既に `bg-primary` 等を参照済みなので、**値を変えるだけで大半の画面が追従**する。独自トークン体系の新設（案2）は二層化と再配線が必要で不採用。

## ① トークン体系（唯一の源 / `app/globals.css`）

既存の oklch 運用を踏襲（下記hexは承認済みモックの参照値。実装ではoklchで記述、hexはコメント併記）。**4段サーフェスは新規トークンを増やさず既存shadcn変数へマップする**（base=background / elevated=card・popover / nested=muted / 罫=border・input）。これにより `MeterBar` のトラック（`bg-muted`）等の既存consumerが自動的に正しい面色になる。

### ライト（生成りの紙 / `:root`）

| 役割 | 変数 | 参照hex |
|---|---|---|
| 背景(base) | `--background` | `#f4f1ea` |
| カード(elevated) | `--card` `--card-foreground=#1b1916` | `#fbf9f4` |
| ポップ(overlay) | `--popover` `--popover-foreground=#1b1916` | `#fbf9f4` |
| 面/トラック(nested) | `--muted` | `#f0ece2` |
| 面(shadcn accent) | `--accent` `--accent-foreground=#1b1916` | `#f0ece2` |
| 副(secondaryボタン) | `--secondary` `--secondary-foreground=#1b1916` | `#efeae0` |
| 文字(墨) | `--foreground` | `#1b1916` |
| 補助文字 | `--muted-foreground` | `#8c857b` |
| 罫/入力枠 | `--border` `--input` | `#e0d9cc` |
| 主アクセント(若葉) | `--primary` `--ring` | `#5f7a4f` |
| アクセント上文字 | `--primary-foreground` | `#f4f1ea` |
| 季節色(朱・日曜/差し色) | 新規 `--season` | `#b9421f` |
| 危険(削除等) | `--destructive` | 既存赤を踏襲（WCAG AA 4.5:1を割らない範囲で朱寄りに微調整可） |

### ダーク（藍鼠の夜 / `.dark`）= 4段サーフェス

| 役割 | 変数 | 参照hex |
|---|---|---|
| base背景 | `--background` | `#15181d` |
| elevated(カード) | `--card` | `#1b1f25` |
| overlay(ポップ) | `--popover` | `#2a313b` |
| nested(面/入力/トラック) | `--muted` `--accent` `--secondary` | `#232830` |
| 文字 | `--foreground` | `#e9e7e1` |
| 補助文字 | `--muted-foreground` | `#8a909c` |
| 罫/入力枠 | `--border` `--input` | `#2b313a`（現状のアルファ深度は廃し**単色**に統一。予測可能性優先） |
| 主アクセント(若葉/明度up) | `--primary` `--ring` | `#93b277`（大型数字は `#aecb92`） |
| アクセント上文字 | `--primary-foreground` | `#15181d` |
| 季節色(朱/明度up) | `--season` | `#cf6b4f` |
| 危険 | `--destructive` | 既存ダーク赤を踏襲（微調整可） |

### 既存トークンの扱い（無言にしない）

- `--chart-1〜5`：現状グレースケール。**PR1は据え置き**。分析(insights)画面の作り込み時（PR2）に和モダンへ再調整。
- `--sidebar-*`：サイドバー未導入のため**据え置き**。
- `--center-gut/heart/head`（Enneagram用、`lib/enneagram/types.ts` が `var()` 参照）：**システムの一部として温存（grandfather）**。`var(--center-*)` 経由なので憲法①に適合。PR2の分析画面で和モダンへ再調整。
- 新規トークンは **`--season` のみ**（`@theme inline` で `--color-season` に接続→ `text-season`/`bg-season`/`border-season` を生成）。`--season` の**実値**は `:root` と `.dark` 両方に定義し、`@theme inline` の接続行（`--color-season: var(--season)`）は別途追加する（実値の定義と接続は別物）。
- `@theme inline` の `--font-sans` / `--font-heading` は **next/font の変数を指す**（自己参照しない＝既知の落とし穴）。

### スケール（列挙して「勝手な値」を抑える）

font-size/余白/角丸は下記から選ぶ（憲法②で強制）。レイアウト用の任意サイズ（`min-h-[..]` `max-w-[..]`）は**色ではないので許可**。

- **型スケール（役割→Tailwindクラス→書体）**
  - 日付ヒーロー/display: `text-3xl`〜`text-4xl` / `font-heading`(明朝) / `tabular-nums`
  - h1: `text-2xl` / `font-heading`
  - h2: `text-xl` / `font-heading`
  - h3: `text-lg` / `font-heading`
  - 本文: `text-base`(16px) / `font-sans` / 日記本文は `leading-loose`(≈2.0)・`tracking-[0.03em]`、その他は `leading-relaxed`
  - メタ/補足: `text-sm`(14) / `text-xs`(12) / `text-muted-foreground`
  - 英字eyebrow: `text-xs` + `uppercase` + `tracking-[0.18em]`
  - 最小は `text-xs`(12px)。**11px未満禁止**。
- **余白**: Tailwind 4px スケール。慣用＝セクション `space-y-6/8/10`、カード内 `p-5`/`p-6`、インライン `gap-2/3/4`。
- **角丸**: コントロール=`rounded-lg`(`--radius` 10px)、カード=`rounded-xl`(≈14px)。単辺ボーダーに角丸を付けない。
- **数字**: `tabular-nums` は**数字表示要素のクラスに個別付与**（`@layer base` で全体に当てると和文中の数字まで等幅化するため不可）。

## ② フォント（`app/layout.tsx` ＋ `@layer base`）

- 見出し: **Shippori Mincho B1**（明朝）→ `--font-heading`。`@layer base` で `h1,h2,h3` に適用。日付・大型数字にも。
- 本文/UI: **Zen Kaku Gothic New** を sans 基盤に。**Geist Sans は退役**。Noto Sans JP はフォールバックに残す。`font-mono` は Geist Mono 継続。
- **静的フォント注意（重要）**: Shippori Mincho B1・Zen Kaku Gothic New は **variableではなく静的フォント**。`next/font/google` で `weight` を**配列で明示必須**（省略するとビルドエラー）。使用weightに絞る（明朝 `['500','600']`、ゴシック `['400','500']`）。Noto Sans JP は variable のため weight 不要。
- CJK は `preload: false`＋self-host＋`unicode-range` 遅延（AGENTS.md方針と整合）。
- prose（`@tailwindcss/typography` / react-markdown のプレビュー本文）内の見出しは typography が font を上書きしうる。見出し明朝を prose 内にも効かせるかは **PR2（各画面作り込み）で対応**（`--tw-prose-headings` 等）。PR1スコープ外。

## ③ ライト/ダーク切替（next-themes）

- **`next-themes`** を採用（`attribute="class"` で `<html>` に `class="dark"`）。現状の `.dark { ... }`（直接セレクタ）で変数が切り替わるため整合する。`@custom-variant dark (&:is(.dark *))` は「`.dark` の子孫」にマッチし `.dark` 自身には当たらないが、**変数定義は `.dark{}` 直接指定なので問題なし**（現状維持でよい。標準形 `&:where(.dark, .dark *)` への変更は任意）。
- **依存追加**: next-themes は未インストール。PR1で `npm install next-themes` → lockfile 再生成 → **`@emnapi/*` 脱落チェック（`npm ci` がローカルで exit 0）** までを作業に含める（AGENTS.md記載の既知地雷）。
- **client ラッパー必須**: `ThemeProvider` は client 専用。`'use client'` の薄いラッパー（例 `components/theme/ThemeProvider.tsx`）を作り、Server Component の `layout.tsx` から使う。`<html suppressHydrationWarning>` を付与。
- ヘッダーに月/陽トグル（Tablerアイコン、`lucide-react` 既存）を1つ追加。FOUC は next-themes の `<head>` インラインスクリプトで回避（JSコストは軽微で、AGENTS.mdのJSダイエット方針に反しない）。
- 実装時に context7 で Next.js 16 App Router 向けの最新手順を最終確認。

## ④ コンポーネント方針

- shadcn/ui はトークン参照のため**コード変更ほぼ不要**（値差し替えで追従）。
- **PR1 では既存3画面のレイアウトを触らない**。トークン/フォント差し替えで色・字面が自動的に和モダン化する（再スキン）。
- **PR1直後の中間状態（期待値設定）**: 3画面は「和モダンの配色・フォント」が「shadcnデフォルトのレイアウト」に乗った半完成状態になる。さらに **Enneagram系のバー/ヒーローはインラインstyleで `--center-*` を使うため、PR1では和モダンに最適化されない**（grandfather）。これは想定挙動で、PR2の分析画面作り込みで解消する。`/dev/design` と各画面のライト/ダークのスクショを撮って中間状態を記録・共有する。
- 画面ごとの作り込み（カレンダーのセル塗り、メーターバー、streakヒーロー、エディトリアル余白、縦組み日付）は **PR2 以降**。

## ⑤ デザイン憲法（`AGENTS.md` に追記 / 最小・優先順位つき）

長文化を避け、**先頭に4-5の命令形ルール＋競合時の優先順位**だけ置く。実例・詳細は `/dev/design` に委ねる。

0. **競合したらトークンが勝つ**（このルール群が既定挙動より優先）。
1. 色は必ずトークン（`bg-primary` `text-foreground` `text-season` / `var(--…)`）。**生hex・`rgb()/hsl()/oklch()` の色リテラル・任意色クラス・インラインstyleの色リテラル禁止**（例外: `app/globals.css` と `app/dev/**`）。
2. 見出しは `font-heading`（明朝）、本文・UIは既定（Zen Kaku）。font-size・余白・角丸は §① のスケールから。**11px未満禁止**。
3. アクセント（若葉）は **1画面1〜2箇所**。朱（`--season`）は日曜・季節の差し色。危険操作は `--destructive`。
4. 深度は**影でなく罫＋明度差**（4面: background→card→muted→popover）。新規 drop-shadow 禁止（focus ring等の機能的影は可）。
5. 新パターン追加前に `/dev/design` と既存部品を確認し**再利用優先**。**ダーク対応必須**（両モードで成立）。

## ⑥ 生きた見本帳（`/dev/design`）

1ページにライト/ダーク両方で陳列：カラースウォッチ（全トークン＋役割ラベル）、型スケール（見出し明朝/本文Zen Kaku/数字tabular-nums）、余白・角丸サンプル、コンポーネント（Button各variant/size、Card、Tabs、DropdownMenu、AlertDialog、Textarea、MeterBar、カレンダーセルの全状態）。

- **本番ガード**: `app/dev/enneagram/page.tsx` と同じく `process.env.NODE_ENV === 'production'` で `notFound()`（プレビューでは見られ、本番では404／非クロール）。
- Claude に「ここに合わせて」と渡せる基準ページとして維持。

## ⑦ ガードレール（grep / 「色リテラルの混入」だけを確実に止める）

**目的を限定する**: grep が確実にできるのは「生の色リテラルを弾く」ことだけ。意味的整合・スケール遵守・11px境界は**判定しない**（それは `/dev/design`＋レビューで担保＝§「正直な到達点」）。

- **走査対象**: `app/**` `components/**` `lib/**` の `.ts`/`.tsx`。**除外**: `components/ui/**`・`app/dev/**`・`app/globals.css`。
- **fail条件（色リテラルのみ）**: `#rgb`/`#rrggbb`/`#rrggbbaa` の色hex、`rgb(`/`rgba(`/`hsl(`/`hsla(`/`oklch(`/`oklab(`。これは**素のテキスト走査**なので className の任意値（`bg-[#fff]`）も**インラインstyleの色リテラル**（`style={{ color: '#5f7a4f' }}`）も両方検出できる（批評で判明した最大の穴をふさぐ）。
- **許可（誤検知させない）**: `var(--token)`、`color-mix(in oklab, var(--…) …)`、Tailwind不透明度修飾子（`text-muted-foreground/30`）、**任意サイズ値**（`min-h-[15rem]` `max-w-[260px]` 等＝色でないので対象外）、`tabular-nums` 等。
- **テストフィクスチャ（spec/plan に固定）**:
  - must-pass: `text-muted-foreground/30` ／ `color-mix(in oklab, var(--center-gut) 15%, transparent)` ／ `min-h-[15rem]` ／ `var(--center-head)`
  - must-fail: `bg-[#fff]` ／ `text-[#1b1916]` ／ `style={{ color: '#5f7a4f' }}` ／ `backgroundColor: 'rgb(0,0,0)'`
- **実装**: `scripts/check-design-tokens.mjs` を `npm run lint:design` で実行。CI（`.github/workflows/ci.yml`）に step 追加。vitest からも回すなら `vitest.config.ts` の `include`（現状 `lib/**/*.test.ts` のみ）にスクリプト用パターン追加が必要だが、**CI step 追加だけでも十分**。
- Biome は整形・import整理・CSS at-rule位置等を継続。

## ⑧ PR分割

- **PR1（本スコープ）**: ①トークン ②フォント（weight明示） ③テーマ切替（next-themes導入＋clientラッパー＋lockfile確認） ⑤憲法 ⑥見本帳（本番notFoundガード） ⑦ガードレール（色リテラル＋fixtures）。＝再スキン＋仕組み。既存画面は色・字面が自動で和モダン化（中間状態あり）。
- **PR2 以降**: 日記 → 履歴 → 分析 の順に画面ごとの作り込み。分析では `--chart-*`/`--center-*`/prose見出し明朝も和モダンへ。各PRは spec → plan → 実装。

## ⑨ 検証

- `npm run lint`（biome）/ `npx tsc` / `npm test`（vitest）/ `npm run build` が green。
- `npm run lint:design`（ガードレール）が green、かつ fixtures（must-fail）で確実に fail することを確認。
- **lockfile**: next-themes 追加後 `npm ci` がローカルで exit 0（`@emnapi/*` 脱落なし）。
- **ビジュアル（必須）**: `/dev/design` をライト・ダーク両方で Playwright スクショ（参照PNGとして記録）。ダークトグルが FOUC なく動作。
- PRベース運用: ブランチ → `gh pr checks --watch` で CI green → `gh pr merge --squash --delete-branch`。

## スコープ外（YAGNI）

- Storybook、Figma連携、公開カタログ、ビジュアルリグレッション基盤。
- 既存3画面の作り込み（PR2以降）、`--chart-*`/`--sidebar-*`/`--center-*`/prose見出しの和モダン再調整（PR2以降）。
- 和モダン以外の複数テーマ。
- トークンの意味的誤用の自動検出（grepの守備範囲外＝レビュー＋見本帳で担保）。

## 未解決事項

なし（next-themes を第一候補とし、実装時に context7 で最終確認。静的フォントの weight 明示・client ラッパー・lockfile 確認は plan に落とす）。
