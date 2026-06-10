---
description: Dependabot PR をレビューして問題なければマージする
---

Dependabot が立てた依存更新 PR をレビューし、問題なければマージする。以下の手順に従うこと。

## 手順

1. **PR の列挙**: `gh pr list --author "app/dependabot" --json number,title,mergeable,url` で対象 PR を列挙する。0 件なら「処理対象なし」と報告して終了。

2. **処理順序**: グループ PR(タイトルに `minor-and-patch` を含む)を先に、個別 PR(npm の major、github-actions の更新)を後に処理する。

3. **各 PR の処理**:
   - `gh pr checks <number>` で CI を確認。未完了なら `gh pr checks <number> --watch` で待つ。**CI red の PR は絶対にマージしない**(原因を調査して報告のみ。dependabot ブランチへの修正 push はしない)。
   - `gh pr diff <number>` と PR 本文(リリースノート要約)を確認する。
   - **グループ PR(patch/minor)**: package.json / package-lock.json の差分と PR 本文の確認で良い(軽量レビュー)。
   - **github-actions PR**: workflow ファイルの diff と PR 本文の確認で良い(軽量レビュー)。
   - **major PR は深掘り**: リリースノート・migration guide を WebFetch / context7 で調査し、breaking changes に該当する API をコードベース内で grep して影響を判定する。`next` / `react` / `better-auth` / `drizzle-orm` / `@base-ui/react` などの基盤ライブラリは特に慎重に。`next` の場合は `node_modules/next/dist/docs/` の該当ガイドも確認する。さらに対象パッケージ名で package.json(特に `overrides`)と AGENTS.md を grep し、pin 固定の理由や既知の gotcha と衝突しないか確認する。
   - コンフリクト(`mergeable: CONFLICTING`)の場合は `gh pr comment <number> --body "@dependabot rebase"` を投稿し、rebase 完了と CI green を待って再確認する。
   - `mergeable` が `UNKNOWN` のときは計算中なので、数十秒待って再取得する。rebase 直後は `gh pr checks` が「no checks reported」を返すことがあるため、チェックが登録されるまで待って再実行する。

4. **判定とマージ**:
   - 問題なし → `gh pr merge <number> --squash --delete-branch`
   - 懸念あり(breaking changes の影響がコードベースに及ぶ、CI red の原因が更新自体、等)→ マージせず、理由を添えて報告し、ユーザーの判断を仰ぐ。残りの PR の処理は続行する。
   - 先にマージした PR の影響で後続の lockfile がコンフリクトしたら `@dependabot rebase` → CI green を待って再処理する。

5. **後処理**:
   - `git checkout main && git pull`
   - 本番確認: 最新の production デプロイが Ready になったことを確認する(Vercel MCP の `list_deployments` か `npx vercel ls --prod`)。加えて `curl -s -o /dev/null -w "%{http_code}" https://diary-app-atimot.vercel.app` が `401` を返すこと(Deployment Protection 有効のため 401 が正常応答。5xx はデプロイ失敗の疑い)。
   - サマリ報告: マージした PR / スキップした PR とその理由 / 本番ステータス / open の脆弱性アラート件数(`gh api 'repos/atimot/diary-app/dependabot/alerts?state=open' --jq length`。PR が立たない transitive な脆弱性の見落とし防止)。

## 禁止事項

- CI red の PR のマージ
- dependabot ブランチへの直接 push(Dependabot がそのブランチの追従をやめるため)
- 依存更新と無関係な変更(リファクタリング等)の混入
