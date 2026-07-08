<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# デザインシステム（ひとひ）— 憲法

全画面の作成・変更でこれに従う。詳細・実例は `/dev/design`。2026-07 の「デザイン一新」で和モダン（墨×生成り×若葉・明朝見出し）から **ひとひ**（ブルーグレー地×白カード×青アクセント・全ゴシック）へ全面刷新した（元カンプは Claude Design プロジェクト『プロジェクトの設計刷新』の `デザイン一新.dc.html`）。

0. **競合したらトークンが勝つ**（この憲法が既定挙動より優先）。
1. 色は必ずトークン（`bg-primary` `text-muted-foreground` `text-season` `text-streak` / `var(--…)`）。**生hex・`rgb()/hsl()/oklch()` の色リテラル・任意色クラス・インラインstyleの色リテラル禁止**（例外: `app/globals.css`、`app/dev/**`、`components/ui/**`）。`npm run lint:design` で機械的に弾く。
2. 書体は**全てゴシック（端末標準のシステムフォントスタック・Webフォント0本）**。見出しも `font-heading`（=ゴシック、base で weight 600・字間 .03em）。明朝 Noto Serif JP は退役済み — **和文 Webフォントを新たに足さない**。**11px未満禁止**（カンプの 10〜10.5px 指定は 11px に丸める）。
3. アクセントの役割分担: 青（`--primary`）はナビ active・主ボタン・カードラベル・書いた日など画面の主役（乱用しない）。アンバー（`--streak` / 面は `--streak-soft`）は**継続と「今日」だけ**（つづきピル・今日リング・カレンダー曜日ヘッダの日曜）。テラコッタ（`--season`）は**リスト中の日曜表示だけ**。危険操作は `--destructive`。
4. 深度は**罫＋明度差＋light のみの淡い影トークン**（`shadow-card` = `--card-shadow`、ダークでは無効）。それ以外の drop-shadow 追加禁止（focus ring 等の機能的影は可）。
5. コンテナは2段階: **集中幅 680px**（今日・個別日記・サインイン）と**ボード幅 max-w-[1120px]+px-10**（これまで・気づき、ヘッダーと同じ罫に揃う）。
6. **SP（md未満）はカンプ §5 準拠**: ヘッダーは2段（ロゴ行＋**3タブ均等ナビ**、アクティブ下線は `inset-x-[32%]`）／ボード画面は1カラム縦積み／**タップ目標44px**（カレンダーセル h-11・ツールバー size-8）／SPでは字数列・カレンダー凡例・⌘⏎ヒントを省略し、エディタの字数はカード外右下へ。余白は px-4・pt-6・pb-11 が基準。
7. 新パターン追加前に `/dev/design` と既存部品を確認し**再利用優先**。**ダーク対応必須**（両モードで成立させる）。

注: ガードレール(grep)が防ぐのは「生の色リテラルの混入」まで。トークンの*意味的*誤用・スケール逸脱は `/dev/design`＋レビューで担保する（過信しない）。

# Your training data may be stale for other libraries too

For libraries, frameworks, SDKs, APIs, or cloud services **other than Next.js**, query context7 for current docs and best practices before making technical decisions — choosing a library, calling an unfamiliar API, configuring a tool, or migrating versions.

Skip for: refactoring, debugging business logic, general programming concepts.

# Project-specific gotchas (積みあがった学び)

過去のマイルストーンで踏んだ落とし穴。同じ罠に再度刺さらないために。

## Better Auth + Drizzle Adapter
- `drizzleAdapter(db, { provider: 'pg' })` だけでは `verification` モデル等を**認識できない**。サインイン時に `model not found` で 500 エラーになる。
- 必ず `schema: { user, account, session, verification }` を明示する。`lib/auth/server.ts` を参照。
- ホワイトリスト判定は `databaseHooks.user.create.before` 内で `throw new Error('NOT_ALLOWED')`。Better Auth はこれを `unable_to_create_user` で包んで返す。

## Better Auth API パス
- セッション取得は `/api/auth/get-session`（古いプランで `/api/auth/session` と書きがちだが、それは 404）
- `toNextJsHandler` は `GET, POST, PATCH, PUT, DELETE` の 5 つを返す。プランで GET/POST だけ書いた場合でも全部 export してよい。

## パフォーマンス: リージョン同居と DB ドライバ（本番TTFB）
- **症状**: 本番の各ページ LCP が悪い（実測 `/history` で 4.37s）。SQL 実行自体は EXPLAIN で 0.02〜0.07ms と速く、遅延はほぼ全部ネットワーク（リージョン間 RTT）だった。
- **原因**: 関数=`iad1`（米東部・デフォルト）、Neon DB=`aws-ap-southeast-1`（シンガポール）、ユーザー/エッジ=`hnd1`（東京）の三角形。関数↔DB が太平洋横断で、1ページに複数往復（getSession + データ取得）乗っていた。
- **対策（最重要は関数と DB の同居）**:
  - `vercel.json` に `"regions": ["sin1"]`（= AWS ap-southeast-1 = Neon と物理同一）。Hobby plan は単一リージョン指定可。**関数↔ユーザーの距離より、関数↔DB の同居が優先**（DB は何往復もするため）。
  - **Neon は作成後リージョン変更不可**で、かつ Asia は Singapore / Sydney のみ（**Tokyo は無い**）。よって「DB を東京へ」ではなく「関数を `sin1` へ」で同居させる。
  - DB ドライバは **HTTP（`neon()` + `drizzle-orm/neon-http`）** を使う。WebSocket `Pool`（`neon-serverless`）は接続確立に複数 RTT かかり、サーバーレスの単発クエリに不利。`lib/db/client.ts` 参照。
  - `neon-http` は **interactive `db.transaction()` 非対応**（呼ぶと throw）。本アプリは tx 未使用なので安全。複数文を原子的に実行したくなったら `db.batch([...])`。Better Auth の drizzle アダプタも transaction を実装せず、コアが no-op で patch するため neon-http で動く（`node_modules/better-auth/dist/db/adapter-base.mjs` の自動 patch）。
- **Better Auth の `session.cookieCache`** を有効化（`lib/auth/server.ts`）。`requireSession()`=`getSession` の毎回 DB 照会を署名付き短命 cookie 読取りに置換。失効の即時性が `maxAge` ぶん遅れるが単一ユーザーなので許容。即時失効が要る所だけ `getSession({ query: { disableCookieCache: true } })`。

## パフォーマンス: クライアントJS / プリフェッチ（体感の重さ）
- 実測（本番・実ブラウザの Resource Timing）でホーム `/` は **JS 解凍後 1.37MB**、最大チャンク 648KB が **Tiptap/ProseMirror(+marked)**。`DiaryEditor` が `RichTextEditor` を静的 import していたため、閲覧（preview）でもエディタを丸ごと読んでいた。
- **対策（当時）**: `DiaryEditor`（`'use client'`）内で `RichTextEditor` / `DiaryMarkdown` を `next/dynamic` でコード分割し、タブ選択時のみマウント。これで `/` の First Load JS が 1393KB→784KB（約44%減、転送 gz 427→250KB）。`content` は hidden input 経由で送るのでエディタ unmount でも保存は壊れない。
  - **2026-07 のひとひ刷新で編集/プレビュータブを廃止し WYSIWYG 一本化**。エディタは常時マウントになり Tiptap chunk は `/` の初期表示で読む（書く画面が主役のための意図的なトレードオフ）。`DiaryMarkdown`(react-markdown) は役目を終えて削除済み。
  - **`RichTextEditor`(Tiptap) は `ssr:false` 必須**（`immediatelyRender:false` + browser API 依存）は変わらず。
- `/history` は実測 **89 リクエスト中 50 が `/diary/*` の RSC プリフェッチ**（`?_rsc=`）。`DiaryCalendar` の全セル `<Link>` を App Router 既定の viewport プリフェッチが一斉発火させ、各々が動的ルート(sin1 関数+DB)を叩いていた。
  - **対策**: 日付セルだけ `components/diary/CalendarDayLink.tsx`（`prefetch={active ? null : false}` の hover/touch プリフェッチ）に置換。月送り等のナビ `<Link>` は据え置き。
- **`loading.tsx` は入れない**（`#33` で全ルートに追加したが `#36` で撤去）。サーバー応答が warm ~270ms と速いと、遷移のたびにスケルトンが「出てすぐ消える＝点滅」になり**チラつき**として体感される（実測: `/`→`/history` 遷移で `animate-pulse` が47個一斉表示）。`loading.tsx` 不在なら App Router は**遷移中は現在のページを表示したまま**、新ページ準備後に差し替えるのでチラつかない。cold（~780ms）時の無反応が気になるなら、全画面スケルトンではなく上部の細いプログレスバー等の控えめな手段を検討する。
- クエリは**使う列だけ**。`/history` は `listEntryDates()`（entryDate のみ）、`/insights` の件数判定は `countDiaryEntries()`（`count(*)`）。`listDiaryEntries()`（本文全件）は AI 分析（`regenerateInsight`）が本文を使うので残す。
- **誤検知に注意**: 「CSS 12 ファイル 251KB・圧縮未効き」は計測アーティファクト（Deployment Protection の SSO ゲート越し or dev ビルド）。実ビルドは 2 ファイル 167KB（gz 後約45KB）で minify＆圧縮済み。Vercel は静的アセットを自動で br/gzip 圧縮し `/_next/static/*` に `immutable` を付与する（手当て不要）。`lucide-react` も Next.js 16 の `optimizePackageImports` 既定対象（追加不要）。

## Vercel + npm 運用
- scaffold の `pnpm-workspace.yaml` が残っていると Vercel が pnpm install を試みて build 失敗する。npm 運用なら削除する。
- 加えて `vercel.json` で `installCommand: "npm install"` を明示しておくと auto-detect の事故が起きない。
- Vercel auto-detect は package-manager の選択を `pnpm-workspace.yaml` / `pnpm-lock.yaml` 等で判断する。

## npm lockfile と CI（M5）
- macOS で `package-lock.json` を再生成すると、wasm32-wasi 系 optional パッケージ（`@rolldown/binding-wasm32-wasi`, `@tailwindcss/oxide-wasm32-wasi`）配下の `@emnapi/*` が lock から**脱落**し、linux の `npm ci` が `Missing: @emnapi/... from lock file` で壊れる（npm の既知バグ）。
- 対策として `@emnapi/core` / `@emnapi/runtime` / `@emnapi/wasi-threads` を devDependencies + `overrides` で明示固定している。**消さないこと**。lockfile を作り直したら `npm ci` がローカルで exit 0 になるのを確認してから push する。

## vercel.json の git.deploymentEnabled（M5）
- minimatch では**先頭の `!` がパターン全体の否定**になる。`"!(main)": false` は main 自体にもマッチして本番デプロイまで止まる（実際に起きた）。
- 「1 つでも true のルールにマッチすればデプロイされる」仕様なので、正解は `"**": false` + `"main": true` の 2 ルール構成。`*` はスラッシュ入りブランチ名にマッチしないため `**` を使う。

## Vercel CLI
- 環境変数の非対話追加: `printf '%s' "$VAR" | npx vercel env add NAME production --force --yes`
- **zsh では `${!VAR}` は使えない** → `${(P)VAR}` で indirect expansion する。bash と挙動が違う。
- `vercel metrics` で Speed Insights データ取得は **Observability Plus（有料）必須**。Hobby plan では dashboard のみ。
- 既存プロジェクトに自動 link されることがある（`vercel link --yes`）。新規ではなく既存プロジェクトとの紐付けを優先する挙動。

## Gemini API（無料枠）
- `gemini-2.5-flash` の free tier は **5 RPM (requests per minute)**。
- 個人で試行錯誤するとすぐ 429 (`RESOURCE_EXHAUSTED`) に当たる。
- 1 回の `regenerateInsight` で insight + MBTI を 2 リクエスト叩いていた時期があるが、1 リクエストに統合して緩和済み（`lib/ai/combined-insight.ts`）。
- 429 catch 時は「1分ほど待ってから再試行」のメッセージを返す（`lib/actions/insight.ts` の `isRateLimitError`）。

## Tiptap（日記エディタ）
- 入力 UI は Tiptap v3（`@tiptap/react` + `@tiptap/starter-kit` + 公式 `@tiptap/markdown`）。保存は従来通り Markdown 文字列。表示も同じ WYSIWYG（ひとひ刷新でプレビュータブと react-markdown は廃止）。
- `@tiptap/core` / `@tiptap/pm` / `@tiptap/react` / `@tiptap/starter-kit` / `@tiptap/markdown` / `@tiptap/extensions` は **peer が exact pin**。6 つは常に同一バージョンに揃える。Dependabot 更新時もまとめて上げる（1 つだけ上がると実行時エラー）。
- `useEditor` には必ず `immediatelyRender: false`（App Router の SSR エラー回避）。
- エディタ設定は `lib/editor/diary-extensions.ts` に集約。見出しは H2/H3 のみ。
- **プレースホルダーは公式 `Placeholder`（`@tiptap/extensions/placeholder`）を使う**。自前の絶対配置 overlay は H2/H3 でカーソルとサイズが不一致になり、リストでは重なるので廃止済み。空ブロックに付く `is-editor-empty` を CSS `::before` で描画（`app/globals.css`）。リストはトップレベルが textblock でないため既定設定で表示されない（重なり回避）。
  - **CSS セレクタに `:first-child` を付けない**。`showOnlyCurrent:true`（既定）で `is-editor-empty` はカーソルのある空ブロックだけ（常に高々1個）に付くため、空の状態で Enter して2行目に居ると先頭ではなくなり `:first-child` だと消える。`.tiptap .is-editor-empty::before` で十分。

## shadcn / Tailwind v4
- このプロジェクトは shadcn の `base-nova` スタイル + **`@base-ui/react`**（Radix UI ではない）を使う。
- `--primary` 等の CSS 変数は `oklch()` で定義されている。SVG / SVG 風コードで `var(--primary)` を直接使う。`hsl(var(--primary))` は無効。
- `app/globals.css` の at-rule 順序: **`@import` 系を全部先に、`@plugin` 系を後ろに**。Biome の `noInvalidPositionAtImportRule` で hatching し、CSS 仕様にも合致する。

## フォント（next/font + 日本語/CJK）
- **現行構成（2026-07 ひとひ刷新）**：本文・UI・見出しすべて**端末標準ゴシックのシステムフォントスタック**（**Webフォント0本**・転送ゼロ）。明朝 Noto Serif JP（PR #45/#46 で唯一残していた self-host）も退役し、`app/layout.tsx` から next/font は消えた。定義は `app/globals.css`（`--font-sans` / `--font-heading` / `--font-mono`。`--font-heading` は sans と同一リテラル＋base で `h1..h3 { font-weight:600; letter-spacing:.03em }`）。
- **なぜシステムフォントか**：有名な日本語Webアプリの本文はほぼ全て端末標準スタック（note・はてな・Qiita・Yahoo! JAPAN・Amazon JP）。巨大な CJK Webフォントを本文に self-host しないのが業界標準。明朝（セリフ）は本文全面でなく**見出し等の局所アクセント**として1本だけ Webフォント化するのが現実解（Zenn も明朝だけ Noto Serif JP を self-host。Android にセリフ既定が無く、明朝を端末任せにすると Android でゴシックに化けるため）。デジタル庁デザインシステムが本文に Noto Sans JP を採る理由も装飾でなく「全端末統一＋OFL」。メルカリ Mercari Sans 等のブランド書体はロゴ/見出し専用で本文UIには使わない（個人入手も不可）。
- **`--font-sans`（本文）は OS ごとに和文書体を名指しする**：`-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic Medium", Meiryo, "Noto Sans JP", sans-serif`。**`system-ui` 一語と裸の `游ゴシック` は避ける**（`system-ui` は Windows で細い `Yu Gothic UI` を呼び長文可読性が落ちる／裸の `Yu Gothic` は Windows でかすれ・太字崩れ。`Yu Gothic Medium` を名指しし Meiryo を後ろに置く）。末尾の `"Noto Sans JP"` は素の名前指定で Android のローカル Noto に当てるだけ（self-host ではない）。
- **明朝を再導入する場合の学び（退役済みだが記録）**：見出しだけ明朝にするならフォールバックも明朝で揃える（`"Hiragino Mincho ProN", "Yu Mincho", serif`）。Android にセリフ既定が無いため端末任せはゴシックに化ける。`font-bold`/`font-semibold` を当てた見出しは base よりユーティリティ層が優先される点も同じ。
- **本文の太字はシステムのネイティブ太字**：システムゴシックは全ウェイトを持つので Markdown の `**強調**`（`font-bold`）が weight をロードせず効く。`--font-mono` もシステム等幅（`ui-monospace, …`）。**新たに和文 Webフォントを self-host で足さない**こと（本文をWebフォント化すると warm ~270ms の転送ゼロが崩れる）。
- **読み物本文の寸法（ひとひ）**：日記本文は 15px / `line-height: 2.05`（`.prose p` ＋ エディタの `text-[15px]`）/ **和文への正トラッキングなし**（見出しの `.03em` は例外）。和文に latin 的な正の `letter-spacing` を盛らない（間延びするため）。
- **`@theme inline` の自己参照に注意**：`--font-sans: var(--font-sans)` のような自己参照は何も当たらずブラウザ既定へフォールバックする（shadcn 雛形由来。`5132e10` で混入し `#29` で修正）。現行は `--font-sans` も `--font-heading` もシステムスタックの**リテラル**（heading に sans を参照させたくなっても `var(--font-sans)` とは書けない）。
- **next/font × CJK の罠（Webフォントを再導入する場合）**：`subsets` に **`'japanese'` は存在しない**（subset 一覧は `cyrillic / latin / latin-ext / vietnamese` のみ）。`subsets` は「どの subset を **preload** するか」のフラグに過ぎず、**日本語グリフは subsets と無関係に全 `@font-face` が self-host され `unicode-range` で遅延ロード**される。可変フォントなら `weight` 指定も不要。CJK は巨大なので **preload しない**。

## Biome のスタイルポリシー
- `biome.json` で `quoteStyle: 'single'`、`jsxQuoteStyle: 'double'`。
- `components/ui/**` だけは override で `quoteStyle: 'double'`（shadcn 自動生成と整合させるため）。
- TS/JSX の新規ファイルはこの方針に従う。lint で `useImportType`, `useTemplate`, `organizeImports` が出たら原則 fix。

## Drizzle / Neon Postgres
- すべてのアプリテーブルに `userId text not null references user.id on delete cascade` が入っている。新テーブルを追加するときも同じ形を踏襲する。
- `db:seed` / `db:seed:reset` は **`SEED_USER_ID` 環境変数必須**。例: `SEED_USER_ID=<id> npm run db:seed 30`
- user.id は Drizzle Studio (`npm run db:studio`) で `user` テーブルから取得する。

## 認証スコープ化（M4 以降の Server Action / クエリ）
- すべての Server Action / DB クエリは冒頭で `requireSession()` を呼んで `userId` を取る。
- 既存パターンの拡張時は `lib/actions/diary.ts`, `lib/db/queries/diary.ts` の構造をコピーする。
- `DEFAULT_USER_ID` という env / 定数は完全に廃止済み。grep で出てきたら削除対象。

## MBTI 可視化の判断（M3）
- 「カテゴリ的な対立軸（MBTI の E/I, S/N, T/F, J/P）」を「独立連続軸前提の Radar チャート」で可視化すると概念ズレが起きる。
- **対立軸 → 対立スライダー**（自前 Tailwind 実装）、**独立連続量（Big Five 等）→ Radar**、という棲み分け。
- Recharts は試したが M3 で削除済み。再導入する場合は本当に Radar が必要なケースに限る。

## 開発フロー（M5 以降: PR ベース）
- **main へ直 push 不可**（ruleset で拒否される）。作業は必ずブランチで行い PR を作る。
- PR 作成後、`gh pr checks --watch` で CI（lint / tsc / vitest / build）が green になるのを確認してから `gh pr merge --squash --delete-branch` でマージする。マージ方式は squash のみ。
- マージ後は `git checkout main && git pull` で追従する。
- CI の build はダミー env（`.github/workflows/ci.yml` 参照）で走る。本物の secret を CI に追加しない。
- main へのマージで Vercel が本番に auto-deploy する（M4 と同じ）。
- 依存更新は Dependabot（週次・月曜朝）+ `/dependabot` コマンドで処理する。手順の詳細は `.claude/commands/dependabot.md` を参照。

## 個人試作の運用前提
- 単一ユーザー（`tmd6031@gmail.com`）。`ALLOWED_EMAILS` に追加する形で運用する。
- Vercel Hobby plan。Preview デプロイは無効、Production 一本。
- 本番 URL: `https://diary-app-atimot.vercel.app`
- 公開時の追加検討事項は `docs/superpowers/specs/2026-06-09-m4-auth-deploy-design.md` § YAGNI を参照。
