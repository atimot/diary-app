# M5: CI + PR ベース運用への移行 — 設計

日付: 2026-06-10
ステータス: 承認済み

## 0. 背景と目的

M4 完了時点の運用は「main 直 push → Vercel 自動デプロイ」。検証はローカルの
pre-commit hook（biome + tsc）のみで、独立した検証層がない。壊れたコードが
そのまま本番に出る構造になっている。

M5 の目的は **Claude Code に開発を任せられるハーネスの第一層**として、
GitHub Actions CI を導入し、PR ベース運用 + branch protection で
「CI が通らないコードは main に入らない」を機械的に強制すること。

前提決定（ユーザー承認済み）:

- 運用フローは **PR ベース**に移行する
- リポジトリを **public 化**して branch protection を無料プランで使う
  （private + 無料プランでは required status checks を強制できないため）
- GitHub Pro 課金はしない（無料枠で完結する方針を維持）

## 1. スコープ

### 1.1 含めるもの

1. git 全履歴の秘密情報スキャン（public 化の前提条件）
2. `.github/workflows/ci.yml` — lint / typecheck / test / build
3. リポジトリ public 化 + main への ruleset（PR 必須、CI 必須、force push 禁止）
4. AGENTS.md に開発フロー（ブランチ → PR → CI green → squash merge）を追記
5. ハーネスが効いていることの実証（わざと壊した PR でマージブロックを確認）

### 1.2 含めないもの（YAGNI）

- E2E テスト（Phase B で別途設計）
- CI からの DB 接続・integration テスト（現テストは純関数のみで不要）
- Vercel Preview デプロイの有効化（M4 の判断を維持。OAuth リダイレクト URI 問題）
- CI からのデプロイ制御（Vercel の main auto-deploy はそのまま）
- Dependabot / CodeQL 等の追加自動化（必要になったら）

## 2. コンポーネント

### 2.1 秘密情報スキャン（public 化ゲート）

- `gitleaks` で git 全履歴をスキャンする（`gitleaks git` / 未インストールなら
  `brew install gitleaks` または docker 実行）
- **検出ゼロが public 化の前提条件**。検出された場合は public 化を中止し、
  対処（履歴書き換え or 鍵ローテーション）をユーザーと相談する
- `.env.local` が tracked でないこと、`.gitignore` に入っていることも再確認

### 2.2 CI ワークフロー（`.github/workflows/ci.yml`）

- トリガー: `pull_request`（全ブランチ）+ `push`（main のみ）
- 単一ジョブ `ci`、Node 20（`package.json` の `@types/node: ^20` に合わせる）
- ステップ:
  1. checkout
  2. setup-node（npm キャッシュ有効）
  3. `npm ci`
  4. `npm run lint`（biome check）
  5. `npx tsc --noEmit`
  6. `npm run test`（vitest run — 純関数のみ、env 不要）
  7. `npm run build`

**build のダミー環境変数**: `lib/db/client.ts` が import 時に `DATABASE_URL`
必須で throw するため、build ステップに以下のダミー値を渡す。
`@neondatabase/serverless` の `Pool` 生成は実接続しないため通る。

```yaml
env:
  DATABASE_URL: postgres://ci:ci@localhost:5432/ci
  BETTER_AUTH_SECRET: ci-dummy-secret
  BETTER_AUTH_URL: http://localhost:3000
  NEXT_PUBLIC_BETTER_AUTH_URL: http://localhost:3000
```

実プランでは build を実際に走らせて、不足 env があれば追加する
（GOOGLE_CLIENT_ID 等は `?? ''` フォールバックがあるため不要の見込み）。

本物の secret は CI に一切渡さない。

### 2.3 public 化 + ruleset

- `gh repo edit atimot/diary-app --visibility public`
- main ブランチに ruleset を設定（`gh api` で作成）:
  - PR 必須（直 push 禁止）
  - required status check: CI ジョブ
  - force push 禁止・ブランチ削除禁止
  - **bypass なし**（管理者にも適用 — ソロ開発の「うっかり直 push」防止）
- マージ方式は **squash merge のみ**に統一
  （`gh repo edit --enable-squash-merge --enable-merge-commit=false
  --enable-rebase-merge=false`）

### 2.4 AGENTS.md 追記

「開発フロー」セクションを追加:

- main へ直 push 不可（ruleset で拒否される）
- 作業はブランチで行い、PR を作成する
- `gh pr checks --watch` で CI green を確認してから squash merge
- マージ後は main を pull し、作業ブランチを削除する

## 3. データフロー（変更後の開発サイクル）

```
ブランチ作成 → 実装 → commit（pre-commit hook: lint+tsc）
  → push → PR 作成 → GitHub Actions CI（lint/tsc/test/build）
  → CI green → squash merge → main → Vercel auto-deploy（本番）
```

防衛線は 2 層: ローカル pre-commit hook（高速・第一層）と
GitHub Actions（独立環境・強制層）。

## 4. エラーハンドリング / リスク

- **gitleaks が秘密を検出** → public 化中止、ユーザーと対処相談（中断ポイント）
- **CI の build がダミー env で失敗** → エラーに応じてダミー env を追加。
  実接続を試みるコードが build 時に走っていたら、それ自体が修正対象
- **public 化の不可逆性**: private に戻すことは可能だが、公開中に fork /
  クローンされた内容は取り消せない。スキャン白を確認してから実行する
- **ruleset で自分も直 push 不可になる**: 意図どおり。緊急時は ruleset を
  一時的に無効化できる（GitHub UI / gh api）

## 5. テスト / 完了条件

1. CI が green になる PR を 1 本通し、squash merge → Vercel デプロイまで確認
2. **わざと lint エラーを仕込んだ PR** で CI が fail し、マージボタンが
   ブロックされることを確認（ハーネスが効いている実証）
3. main への直 push が拒否されることを確認
4. AGENTS.md のフロー記載が実態と一致している
