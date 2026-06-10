# M6: Dependabot + `/dependabot` コマンド設計

日付: 2026-06-11
ステータス: 承認済み

## 目的

ライブラリのバージョン更新を怠らない仕組みを作る。GitHub Dependabot が週次で更新 PR を立て、レビュー(diff・リリースノート・breaking changes の調査)からマージまでを Claude Code に任せられるようにする。

## 決定事項

| 論点 | 決定 |
| --- | --- |
| 実行形態 | ローカル半自動。ユーザーが `/dependabot` を打ち、Claude Code が gh CLI で処理 |
| マージ裁量 | major 含めすべて Claude が調査・判断してマージ。CI green は全ケース必須 |
| PR の出し方 | 週次。patch/minor は 1 グループ PR、major はライブラリごとに個別 PR |
| 不採用案 | GitHub Actions での全自動(API キーを public repo の secret に置く必要があり、「本物の secret を CI に追加しない」方針と衝突)/ GitHub ネイティブ auto-merge(無レビューのマージ経路ができる) |

## コンポーネント

### 1. `.github/dependabot.yml`

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
        update-types: [minor, patch]
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

- patch/minor は `minor-and-patch` グループで週 1 本の PR にまとまる。major はグループ外なので個別 PR になる。
- `github-actions` エコシステムも対象(`actions/checkout` 等)。
- セキュリティ更新は週次スケジュールと無関係に即時 PR が立つ(Dependabot 標準挙動)。
- このファイルのコミットで version updates は有効化される。加えてセットアップ時に 1 回だけ `gh api` で Dependabot alerts / security updates を有効化する:
  - `gh api -X PUT repos/atimot/diary-app/vulnerability-alerts`
  - `gh api -X PUT repos/atimot/diary-app/automated-security-fixes`

### 2. `.claude/commands/dependabot.md`

`/dependabot` で起動するカスタムスラッシュコマンド。手順:

1. `gh pr list --author "app/dependabot"` で対象 PR を列挙。0 件なら「なし」と報告して終了。
2. 各 PR を順に処理:
   - `gh pr checks` で CI を確認(未完了なら watch)。**CI red のものは絶対にマージしない**。
   - diff を確認。グループ PR(patch/minor)は package.json / lockfile の差分とリリースノートをざっと確認する軽量レビュー。
   - **major PR は深掘り**: リリースノート・migration guide を WebFetch / context7 で調査し、breaking changes に該当する API をコードベース内で grep して影響を判定。`next` / `react` / `better-auth` / `drizzle-orm` などの基盤ライブラリは特に慎重に。
   - コンフリクトしていたら `gh pr comment <n> --body "@dependabot rebase"` で rebase させ、後で再確認。
3. 判定:
   - 問題なし → `gh pr merge --squash --delete-branch`
   - 懸念あり(breaking の影響が確認できた、CI red の原因が更新自体、等)→ マージせず理由つきで報告し、ユーザーの判断を仰ぐ。
4. 全件処理後: `git checkout main && git pull`、最新 production デプロイの Ready 確認(本番 URL は Vercel Deployment Protection により 401 が正常応答のため、HTTP 200 ではなくデプロイ状態で判定)、マージ件数・スキップ件数・スキップ理由のサマリ報告。

### 3. AGENTS.md への追記

「開発フロー」節に「依存更新は Dependabot + `/dependabot` で処理する」旨を 1〜2 行追記。詳細はコマンドファイルに委譲し、重複させない。

## 運用ルール

- **CI red**: 原因調査と報告まで。dependabot ブランチへの自動修正 push はしない(push すると Dependabot がそのブランチの追従をやめるため)。修正が必要なら別途相談。
- **マージ順序**: グループ PR を先、major を後。先のマージで他 PR がコンフリクトしたら `@dependabot rebase`。
- **本番影響**: main マージごとに Vercel が auto-deploy(既存フローと同じ)。

## 検証

- dependabot.yml マージ後、`gh api repos/atimot/diary-app/dependabot/alerts` や Insights → Dependency graph → Dependabot タブでスケジュール認識を確認。
- 初回は Dependabot タブの「Check for updates」を手動発火して実際に PR を立てさせ、`/dependabot` を一度実走して手順の穴を潰す。

## YAGNI(今回やらないこと)

- GitHub Actions での自動レビュー・自動マージ
- dependabot ブランチへの修正 push による自動リペア
- Renovate への乗り換え検討
- required status checks の ruleset 追加(現状の「CI を watch してからマージ」運用を踏襲)
