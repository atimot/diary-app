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
