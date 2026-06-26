<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
- 入力 UI は Tiptap v3（`@tiptap/react` + `@tiptap/starter-kit` + 公式 `@tiptap/markdown`）。保存は従来通り Markdown 文字列で、表示は `react-markdown` のまま。
- `@tiptap/core` / `@tiptap/pm` / `@tiptap/react` / `@tiptap/starter-kit` / `@tiptap/markdown` は **peer が exact pin**。5 つは常に同一バージョンに揃える。Dependabot 更新時もまとめて上げる（1 つだけ上がると実行時エラー）。
- `useEditor` には必ず `immediatelyRender: false`（App Router の SSR エラー回避）。
- エディタ設定は `lib/editor/diary-extensions.ts` に集約。見出しは H2/H3 のみ。

## shadcn / Tailwind v4
- このプロジェクトは shadcn の `base-nova` スタイル + **`@base-ui/react`**（Radix UI ではない）を使う。
- `--primary` 等の CSS 変数は `oklch()` で定義されている。SVG / SVG 風コードで `var(--primary)` を直接使う。`hsl(var(--primary))` は無効。
- `app/globals.css` の at-rule 順序: **`@import` 系を全部先に、`@plugin` 系を後ろに**。Biome の `noInvalidPositionAtImportRule` で hatching し、CSS 仕様にも合致する。

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
