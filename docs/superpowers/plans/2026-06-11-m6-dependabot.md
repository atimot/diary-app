# M6: Dependabot + `/dependabot` コマンド Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dependabot を有効化し、依存更新 PR のレビュー〜マージを `/dependabot` カスタムコマンドで Claude Code に任せられるようにする。

**Architecture:** `.github/dependabot.yml` で週次の更新 PR(patch/minor はグループ、major は個別)を発行させる。レビュー〜マージの手順は `.claude/commands/dependabot.md` に成文化し、ローカルの Claude Code が gh CLI で実行する。GitHub Actions への API キー追加はしない。

**Tech Stack:** GitHub Dependabot (version updates + security updates), gh CLI, Claude Code カスタムスラッシュコマンド

**Spec:** `docs/superpowers/specs/2026-06-11-m6-dependabot-design.md`

**前提:** 作業ブランチ `m6-dependabot` 上で行う(スペックが既にコミット済み)。main 直 push は ruleset で拒否される。設定ファイルとドキュメントのみの変更でありテスト対象コードはないため、TDD は適用せず各タスクに検証ステップを置く。

---

### Task 1: `.github/dependabot.yml` の作成

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: ファイルを作成する**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "07:00"
      timezone: Asia/Tokyo
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 10
    commit-message:
      prefix: "chore(deps)"
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "07:00"
      timezone: Asia/Tokyo
    commit-message:
      prefix: "chore(ci)"
```

- [ ] **Step 2: YAML 構文を検証する**

Run: `npx --yes js-yaml .github/dependabot.yml`
Expected: パースされた JSON が出力される(エラーなし)

- [ ] **Step 3: コミット**

```bash
git add .github/dependabot.yml
git commit -m "chore(deps): add Dependabot config (weekly, grouped minor/patch)"
```

---

### Task 2: `.claude/commands/dependabot.md` の作成

**Files:**
- Create: `.claude/commands/dependabot.md`

- [ ] **Step 1: コマンドファイルを作成する**

````markdown
---
description: Dependabot PR をレビューして問題なければマージする
---

Dependabot が立てた依存更新 PR をレビューし、問題なければマージする。以下の手順に従うこと。

## 手順

1. **PR の列挙**: `gh pr list --author "app/dependabot" --json number,title,mergeable,url` で対象 PR を列挙する。0 件なら「処理対象なし」と報告して終了。

2. **処理順序**: グループ PR(タイトルに `minor-and-patch` を含む)を先に、major 更新の個別 PR を後に処理する。

3. **各 PR の処理**:
   - `gh pr checks <number>` で CI を確認。未完了なら `gh pr checks <number> --watch` で待つ。**CI red の PR は絶対にマージしない**(原因を調査して報告のみ。dependabot ブランチへの修正 push はしない)。
   - `gh pr diff <number>` と PR 本文(リリースノート要約)を確認する。
   - **グループ PR(patch/minor)**: package.json / package-lock.json の差分と PR 本文の確認で良い(軽量レビュー)。
   - **major PR は深掘り**: リリースノート・migration guide を WebFetch / context7 で調査し、breaking changes に該当する API をコードベース内で grep して影響を判定する。`next` / `react` / `better-auth` / `drizzle-orm` / `@base-ui/react` などの基盤ライブラリは特に慎重に。`next` の場合は `node_modules/next/dist/docs/` の該当ガイドも確認する。
   - コンフリクト(`mergeable: CONFLICTING`)の場合は `gh pr comment <number> --body "@dependabot rebase"` を投稿し、rebase 完了と CI green を待って再確認する。

4. **判定とマージ**:
   - 問題なし → `gh pr merge <number> --squash --delete-branch`
   - 懸念あり(breaking changes の影響がコードベースに及ぶ、CI red の原因が更新自体、等)→ マージせず、理由を添えて報告し、ユーザーの判断を仰ぐ。
   - 先にマージした PR の影響で後続の lockfile がコンフリクトしたら `@dependabot rebase` → CI green を待って再処理する。

5. **後処理**:
   - `git checkout main && git pull`
   - 本番の生存確認: `curl -s -o /dev/null -w "%{http_code}" https://diary-app-atimot.vercel.app` が `200` を返すこと(Vercel の auto-deploy 完了まで 1〜2 分待ってから)。
   - サマリ報告: マージした PR / スキップした PR とその理由 / 本番ステータス。

## 禁止事項

- CI red の PR のマージ
- dependabot ブランチへの直接 push(Dependabot がそのブランチの追従をやめるため)
- 依存更新と無関係な変更(リファクタリング等)の混入
````

- [ ] **Step 2: コマンドが認識されることを確認する**

Run: `cat .claude/commands/dependabot.md | head -5`
Expected: frontmatter(`description: ...`)が表示される。※ スラッシュコマンドの実認識は次回セッション起動時に `/dependabot` が補完に出ることで確認

- [ ] **Step 3: コミット**

```bash
git add .claude/commands/dependabot.md
git commit -m "feat(claude): add /dependabot command for dependency PR review+merge"
```

---

### Task 3: AGENTS.md への追記

**Files:**
- Modify: `AGENTS.md`(「開発フロー(M5 以降: PR ベース)」セクションの末尾)

- [ ] **Step 1: 開発フローセクションの末尾に以下の 1 行を追加する**

「開発フロー(M5 以降: PR ベース)」セクションの最後の項目(`- main へのマージで Vercel が本番に auto-deploy する(M4 と同じ)。`)の直後に追加:

```markdown
- 依存更新は Dependabot(週次・月曜朝)+ `/dependabot` コマンドで処理する。手順の詳細は `.claude/commands/dependabot.md` を参照。
```

- [ ] **Step 2: コミット**

```bash
git add AGENTS.md
git commit -m "docs(agents): document Dependabot + /dependabot workflow"
```

---

### Task 4: Dependabot alerts / security updates の有効化(リポジトリ設定)

**Files:** なし(GitHub リポジトリ設定の変更のみ。コミット不要)

- [ ] **Step 1: vulnerability alerts を有効化する**

Run: `gh api -X PUT repos/atimot/diary-app/vulnerability-alerts`
Expected: 出力なし(HTTP 204)

- [ ] **Step 2: automated security fixes を有効化する**

Run: `gh api -X PUT repos/atimot/diary-app/automated-security-fixes`
Expected: 出力なし(HTTP 204)

- [ ] **Step 3: 有効化を確認する**

Run: `gh api repos/atimot/diary-app/vulnerability-alerts -i 2>&1 | head -1`
Expected: `HTTP/2.0 204`(有効なら 204、無効なら 404)

---

### Task 5: PR 作成 → CI → マージ

**Files:** なし(git 操作のみ)

- [ ] **Step 1: push して PR を作成する**

```bash
git push -u origin m6-dependabot
gh pr create --title "M6: enable Dependabot with /dependabot review command" --body "$(cat <<'EOF'
## Summary
- `.github/dependabot.yml` を追加(週次・patch/minor グループ・major 個別、npm + github-actions)
- `/dependabot` カスタムコマンドを追加(レビュー〜マージ手順の成文化)
- AGENTS.md の開発フローに依存更新の運用を追記

Spec: docs/superpowers/specs/2026-06-11-m6-dependabot-design.md
Plan: docs/superpowers/plans/2026-06-11-m6-dependabot.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: CI が green になるのを待つ**

Run: `gh pr checks --watch`
Expected: すべてのチェック(lint / tsc / vitest / build)が pass

- [ ] **Step 3: squash マージして main に追従する**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

### Task 6: Dependabot 稼働確認

**Files:** なし(確認のみ)

- [ ] **Step 1: version updates の認識を確認する**

マージ後、GitHub の Insights → Dependency graph → Dependabot タブで npm / github-actions の 2 エコシステムが表示され、「Last checked」が出ることを確認する。CLI からは以下で間接確認できる:

Run: `gh api repos/atimot/diary-app/contents/.github/dependabot.yml --jq .path`
Expected: `.github/dependabot.yml`(main に存在 = Dependabot が読み取る)

- [ ] **Step 2: 初回チェックを発火する(任意)**

Dependabot タブの各エコシステム横の「Check for updates」を押すと即時にチェックが走り、更新があれば PR が立つ(Web UI のみの操作)。押さない場合は次の月曜 07:00 JST に自動実行される。

- [ ] **Step 3: 初回 PR が立ったら `/dependabot` を実走する**

新しいセッションで `/dependabot` を実行し、列挙 → レビュー → マージ → 本番確認のフローが手順どおり機能するか確認する。手順に穴があればコマンドファイルを修正する(通常の PR フローで)。
