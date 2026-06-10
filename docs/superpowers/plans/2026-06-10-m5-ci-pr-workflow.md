# M5: CI + PR ベース運用への移行 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Actions CI を導入し、リポジトリを public 化して branch protection（ruleset）で「CI が通らないコードは main に入らない」を機械的に強制する。

**Architecture:** CI は単一ジョブ（lint → tsc → vitest → build）。build にはダミー env を渡す（`lib/db/client.ts` が import 時に `DATABASE_URL` 必須で throw するため）。public 化の前に gitleaks で git 全履歴をスキャンし、検出ゼロを確認する。M5 の作業自体を最初の PR として実施する。

**Tech Stack:** GitHub Actions, gh CLI, gitleaks, GitHub Rulesets API

**Spec:** `docs/superpowers/specs/2026-06-10-m5-ci-pr-workflow-design.md`

**注意（実行者向け）:**
- このリポジトリの `.claude/settings.json` は `git reset --hard` / `git push --force` を deny している。やり直しは `git reset --soft` か新ブランチで行うこと。
- Task 1 で秘密情報が検出されたら **そこで作業を止めてユーザーに報告する**。Task 5 以降（public 化）は絶対に進めない。

---

### Task 1: git 全履歴の秘密情報スキャン（public 化ゲート）

**Files:** なし（読み取りのみ）

- [ ] **Step 1: tracked ファイルに env ファイルがないことを確認**

```bash
git ls-files | grep -iE '\.env' ; echo "exit: $?"
```

Expected: 出力なし、`exit: 1`（マッチなし）。`.env.local` 等が出てきたら **中断してユーザーに報告**。

- [ ] **Step 2: .gitignore に .env.local が入っていることを確認**

```bash
grep -n 'env' .gitignore
```

Expected: `.env*` または `.env.local` を含む行が出る。

- [ ] **Step 3: gitleaks をインストール（未インストール時のみ）**

```bash
which gitleaks || brew install gitleaks
```

Expected: パスが表示される（例: `/opt/homebrew/bin/gitleaks`）。

- [ ] **Step 4: 全履歴をスキャン**

```bash
gitleaks git --no-banner .
```

Expected: `no leaks found` を含む出力、exit 0。
**leak が検出されたら（exit 1）: 作業を中断し、検出内容（ファイル・コミット・ルール名）をユーザーに報告する。Task 5 以降は実行禁止。**

注: 古い gitleaks（v8.18 以前）では `gitleaks git` がない。その場合は `gitleaks detect --source . --no-banner`（デフォルトで全履歴スキャン）。

---

### Task 2: CI ワークフロー作成（作業ブランチ上）

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 作業ブランチを作成**

```bash
git checkout -b m5-ci-pr-workflow
```

- [ ] **Step 2: ローカルで CI 相当のコマンドが通ることを事前確認**

```bash
npm run lint && npx tsc --noEmit && npm run test
```

Expected: すべて成功（lint: エラー 0、tsc: 出力なし、vitest: 4 ファイル全部 pass）。
失敗したら先にそれを直す（CI 導入前の既存問題なので、別コミットで修正してよい）。

- [ ] **Step 3: ワークフローファイルを作成**

`.github/workflows/ci.yml` を以下の内容で作成:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npx tsc --noEmit

      - run: npm run test

      - run: npm run build
        env:
          # lib/db/client.ts が import 時に DATABASE_URL 必須で throw するためのダミー値。
          # Pool 生成は実接続しないので通る。本物の secret は CI に渡さない。
          DATABASE_URL: postgres://ci:ci@localhost:5432/ci
          BETTER_AUTH_SECRET: ci-dummy-secret
          BETTER_AUTH_URL: http://localhost:3000
          NEXT_PUBLIC_BETTER_AUTH_URL: http://localhost:3000
```

- [ ] **Step 4: コミット**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, typecheck, test, build)"
```

Expected: pre-commit hook（biome + tsc）が走って成功し、コミットされる。

---

### Task 3: AGENTS.md に開発フローを追記（同ブランチ）

**Files:**
- Modify: `AGENTS.md`（末尾の「個人試作の運用前提」セクションの直前に追加）

- [ ] **Step 1: セクションを追記**

`AGENTS.md` の `## 個人試作の運用前提` の直前に以下を挿入:

```markdown
## 開発フロー（M5 以降: PR ベース）

- **main へ直 push 不可**（ruleset で拒否される）。作業は必ずブランチで行い PR を作る。
- PR 作成後、`gh pr checks --watch` で CI（lint / tsc / vitest / build）が green になるのを確認してから `gh pr merge --squash --delete-branch` でマージする。マージ方式は squash のみ。
- マージ後は `git checkout main && git pull` で追従する。
- CI の build はダミー env（`.github/workflows/ci.yml` 参照）で走る。本物の secret を CI に追加しない。
- main へのマージで Vercel が本番に auto-deploy する（M4 と同じ）。
```

- [ ] **Step 2: コミット**

```bash
git add AGENTS.md
git commit -m "docs(agents): document PR-based development flow for M5"
```

Expected: pre-commit hook が成功し、コミットされる。

---

### Task 4: PR 作成と CI green の確認

**Files:** なし（git/gh 操作のみ）

- [ ] **Step 1: push して PR 作成**

```bash
git push -u origin m5-ci-pr-workflow
gh pr create --title "M5: add CI workflow and PR-based dev flow" --body "$(cat <<'EOF'
## Summary
- GitHub Actions CI (lint / tsc / vitest / build with dummy env)
- AGENTS.md に PR ベース開発フローを追記

Spec: docs/superpowers/specs/2026-06-10-m5-ci-pr-workflow-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR の URL が表示される。

- [ ] **Step 2: CI の完了を待つ**

```bash
gh pr checks --watch
```

Expected: `ci` チェックが pass（✓）。

- [ ] **Step 3: build が落ちた場合の対処（落ちたときのみ）**

`gh run view --log-failed` でエラーを確認する。典型パターン:
- 環境変数不足で throw → 該当のダミー env を ci.yml の build ステップに追加して push（例: `GOOGLE_GENERATIVE_AI_API_KEY: ci-dummy`）
- build 時に実 DB 接続を試みている → それ自体がアプリ側の修正対象。原因モジュールを特定してユーザーに報告

修正したら Step 2 に戻る。

---

### Task 5: マージ方式の統一と public 化

**Files:** なし（gh 操作のみ）

**前提: Task 1 のスキャンが白であること。**

- [ ] **Step 1: squash merge のみに統一**

```bash
gh repo edit atimot/diary-app --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false
```

Expected: エラーなし。

- [ ] **Step 2: public 化**

```bash
gh repo edit atimot/diary-app --visibility public --accept-visibility-change-consequences
```

Expected: エラーなし。確認:

```bash
gh repo view atimot/diary-app --json visibility -q .visibility
```

Expected: `PUBLIC`

---

### Task 6: main に ruleset を設定

**Files:** なし（gh api 操作のみ）

- [ ] **Step 1: ruleset を作成**

```bash
gh api repos/atimot/diary-app/rulesets --method POST --input - <<'EOF'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "ci" }]
      }
    }
  ]
}
EOF
```

Expected: 作成された ruleset の JSON（`"id": <数値>` を含む）が返る。

注: `pull_request` の parameters でエラーが出たら（API バージョンにより `allowed_merge_methods` が必須の場合がある）、parameters に `"allowed_merge_methods": ["squash"]` を追加して再実行。

- [ ] **Step 2: required check のコンテキスト名を検証**

GitHub Actions のチェック名はジョブ名（`ci`）になる想定だが、ズレていると永久にマージ不能になるため実名を確認する:

```bash
gh api repos/atimot/diary-app/commits/$(git rev-parse HEAD)/check-runs -q '.check_runs[].name'
```

Expected: `ci` が含まれる。違う名前（例: `CI / ci`）だった場合は、Step 1 の ruleset を `gh api repos/atimot/diary-app/rulesets/<id> --method PUT` で実名に修正する。

---

### Task 7: M5 PR をマージして main 直 push 拒否を実証

**Files:** なし（git/gh 操作のみ）

- [ ] **Step 1: PR を squash merge**

```bash
gh pr merge m5-ci-pr-workflow --squash --delete-branch
```

Expected: マージ成功（CI green + ruleset の required check を満たしているため）。

- [ ] **Step 2: main を更新**

```bash
git checkout main && git pull
```

Expected: squash コミットが 1 つ入る。

- [ ] **Step 3: 直 push が拒否されることを実証**

```bash
git commit --allow-empty -m "test: direct push should be rejected"
git push
```

Expected: **push が拒否される**。`GH013: Repository rule violations` と `Changes must be made through a pull request` を含むエラー。

- [ ] **Step 4: テスト用コミットを取り消す**

```bash
git reset --soft HEAD~1
git status
```

Expected: `Your branch is up to date with 'origin/main'`、working tree clean（empty commit なので差分なし）。

---

### Task 8: 壊れた PR でマージブロックを実証（ハーネスの効果確認）

**Files:**
- Create（一時的）: `lib/ci-proof.ts`

- [ ] **Step 1: わざと lint エラーを含むブランチを作る**

```bash
git checkout -b m5-harness-proof
```

`lib/ci-proof.ts` を以下の内容で作成（未使用変数 + ダブルクォートで biome に引っかかる）:

```typescript
const unusedVariable = "this should fail biome lint";
```

- [ ] **Step 2: pre-commit hook を素通しできないので --no-verify でコミット**

ローカル hook（第一防衛線）が先に止めてしまい CI（第二防衛線）の実証にならないため、このテストに限り hook をスキップする:

```bash
git add lib/ci-proof.ts
git commit --no-verify -m "test: intentionally broken commit to prove CI gate"
git push -u origin m5-harness-proof
gh pr create --title "test: CI gate proof (do not merge)" --body "CI fail でマージがブロックされることの実証用。マージせず close する。"
```

- [ ] **Step 3: CI が fail することを確認**

```bash
gh pr checks --watch
```

Expected: `ci` チェックが **fail（✗）**。

- [ ] **Step 4: マージがブロックされていることを確認**

```bash
gh pr view --json mergeStateStatus -q .mergeStateStatus
gh pr merge --squash 2>&1 || echo "MERGE BLOCKED (expected)"
```

Expected: `mergeStateStatus` が `BLOCKED`、merge コマンドは失敗し `MERGE BLOCKED (expected)` が出る。

- [ ] **Step 5: 実証用 PR を片付ける**

```bash
gh pr close m5-harness-proof --delete-branch
git checkout main
git branch -D m5-harness-proof 2>/dev/null || true
```

Expected: PR が closed、ローカル/リモートのブランチが消える。

- [ ] **Step 6: 完了確認**

```bash
git log --oneline -3
gh repo view atimot/diary-app --json visibility -q .visibility
```

Expected: main の先頭が M5 の squash コミット、visibility が `PUBLIC`。

spec の完了条件 1（green PR が通る）は Task 7 Step 1 で、条件 2（壊れた PR がブロック）は Task 8 で、条件 3（直 push 拒否）は Task 7 Step 3 で、条件 4（AGENTS.md 一致）は Task 3 で満たされる。Vercel の auto-deploy は Task 7 Step 1 のマージ後に Vercel ダッシュボード or `npx vercel ls` で本番デプロイが走ったことを確認する。
