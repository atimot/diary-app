# モバイルヘッダーのアカウントメニュー化 設計

- 日付: 2026-06-26
- 対象: `components/layout/HeaderNav.tsx`、新規 `components/ui/dropdown-menu.tsx`
- ステータス: 設計（実装前）

## 背景 / 問題

SP（モバイル）幅でヘッダーを見ると、左ナビ（日記 / 履歴 / 分析）の各リンク文字が1文字ずつ縦に折り返されて「縦書き」のように見える。

原因は右側にある。現状 `HeaderNav` は `justify-between` の 1 行 flex で、

- 左: ナビリンク 3 つ
- 右: `session.user.email`（例 `tmd6031@gmail.com` と長い）＋ 「サインアウト」テキストボタン

が並ぶ。狭い幅では右側のメール文字列とボタンが横幅を占有し、残ったわずかな幅に左リンクが押し込められて 1 文字ずつ折り返される。

ユーザーの意図: 左ナビ文字を `nowrap` で無理やり横固定するのではなく、**右側（メール表示＋サインアウト）を作り直して横幅を解放する**ことで根本解決する。

## ゴール / 非ゴール

ゴール:

- SP でヘッダーが 1 行に収まり、左ナビが折り返さない。
- 右側を「ユーザーアイコンの丸ボタン 1 個」に集約。タップでメニューが開き、中にメールアドレスとサインアウトを置く。
- PC・モバイルで同一 UI（レスポンシブ分岐なし）。

非ゴール:

- 左ナビの構造・アクティブ判定の変更（横幅が空けば折り返しは解消するため触らない）。
- 認証ロジック（`signOut` / `useSession`）の変更。
- 新規 npm パッケージの追加（`@base-ui/react` と `lucide-react` は既存依存）。

## 方針（決定事項）

ブレインストーミングでの確定事項:

1. 方向性 = **アカウントメニューに集約**（右側を 1 アイコンに）。
2. PC の扱い = **PC もメニューに統一**（常時表示のメールは廃止し、アイコンタップで確認）。単一ユーザー運用のため常時表示の必要性は低い。
3. トリガー外観 = **ユーザーアイコンの丸ボタン**（lucide `CircleUser`）。

## アーキテクチャ / ファイル構成

既存の「base-ui プリミティブを `components/ui/` で薄くラップする」規約（`components/ui/button.tsx`・`components/ui/alert-dialog.tsx`）に合わせる。

### 新規: `components/ui/dropdown-menu.tsx`

`@base-ui/react/menu` の `Menu` を base-nova スタイルで薄くラップする。`'use client'` 指定（`alert-dialog.tsx` と同様、対話プリミティブのため）。エクスポートは今回使う最小セット:

| ラッパー | base-ui プリミティブ | 役割 |
| --- | --- | --- |
| `DropdownMenu` | `Menu.Root` | ルート |
| `DropdownMenuTrigger` | `Menu.Trigger` | 開閉トリガー（`render` prop で `Button` 合成可） |
| `DropdownMenuContent` | `Menu.Portal` + `Menu.Positioner` + `Menu.Popup` | ポータル＋配置＋ポップアップを 1 つに包む |
| `DropdownMenuItem` | `Menu.Item` | 操作項目（`onClick` 可、クリックで自動クローズ） |
| `DropdownMenuSeparator` | `Menu.Separator` | 区切り線 |
| `DropdownMenuLabel` | `Menu.GroupLabel`（非操作ラベル） | メール表示などの非操作テキスト |

スタイルの土台は `alert-dialog.tsx` の Popup（`bg-popover text-popover-foreground ring-1 ring-foreground/10 rounded-xl`、`data-open`/`data-closed` のアニメーション）と `button.tsx`（`ghost`/`outline` の hover トーン）に準拠。各要素に `data-slot` を付ける。

**Biome quote ポリシー**: `dropdown-menu.tsx` は `components/ui/**` の override 対象なので **double quote**（`button.tsx` / `alert-dialog.tsx` に揃える）。後述の `HeaderNav.tsx` は `components/layout/` 配下なので既定の **single quote / JSX は double** を維持する。両ファイルとも実装後に `npm run lint`（biome）が clean になることを確認。

**`DropdownMenuContent` の props 受け渡し**: 呼び出し側の `className` / `...props` は **`Menu.Popup`** に転送する（`alert-dialog.tsx` が Popup を直接スタイルするのと同じ）。配置は `Menu.Positioner` に既定値 `side="bottom"` / `align="end"` / `sideOffset={6}` を設定する（今回は固定で良い）。Popup には `min-w-56 max-w-[calc(100vw-2rem)]` を与え、375px 幅でも右端をはみ出さない（base-ui の collisionAvoidance も既定で効く）。

**`DropdownMenuLabel` は非操作**: `Menu.Item` には**しない**（キーボードの ↑↓ ナビゲーションが非操作のメール行にフォーカスしてしまうため）。`Menu.GroupLabel`（中身は `div`）を使い、`data-slot="dropdown-menu-label"` を付ける。フォーカス不可（`tabIndex` を付けない）。

**`DropdownMenuItem` の破壊的トーン**: 任意 `variant`（`"default" | "destructive"`）を持たせる。`destructive` は **`text-destructive` ＋ 軽いホバー背景**（`hover:bg-destructive/10` / `focus:bg-destructive/10`）に留め、`button.tsx` の filled な destructive 背景（`bg-destructive/10` を常時敷く）は使わない。メニュー行は「ボタン」ではなく「行」として読ませる。

> 補足: shadcn base-nova レジストリの `dropdown-menu` を `npx shadcn add` で取得する手もあるが、余分な依存・差分を避け、リポジトリの既存ラッパー体裁に厳密に合わせるため手書きの最小ラッパーとする。

### 改修: `components/layout/HeaderNav.tsx`

右側のインライン要素（メール `span` ＋ サインアウト `Button`）を、上記メニューに置換する。

- `session?.user` がある時のみメニューを表示（現行ガードを維持）。
- トリガー: `DropdownMenuTrigger` の `render` prop に `Button`（`variant="ghost"` `size="icon"` = 32px）＋ lucide `CircleUser` を渡す。`aria-label="アカウントメニュー"` は **`DropdownMenuTrigger` 側**に付与する（base-ui が注入する `aria-haspopup` / `aria-expanded` と同一の `<button>` にマージさせるため。実装後に DOM で 3 属性が同じ要素に乗っていることを確認）。
- メニュー中身（上から）:
  1. `DropdownMenuLabel`: `session.user.email`（`text-xs text-muted-foreground`、`whitespace-nowrap`。Popup 側の `min-w-56` で収まり、折り返さない）
  2. `DropdownMenuSeparator`
  3. `DropdownMenuItem`（`variant="destructive"`）: lucide `LogOut` ＋「サインアウト」。`onClick={handleSignOut}`
- `handleSignOut`（`await signOut()` → `router.push('/sign-in')`）は現行ロジックをそのまま移植。
- 左ナビ（`links` 配列、`Link`、アクティブ判定）は無変更。

## データフロー / 振る舞い

- `usePathname()` が `/sign-in` 始まりなら `HeaderNav` 全体が `null`（現行維持）。
- `useSession()` の `data.user` 有無でメニュー表示を分岐（現行維持）。
- メニュー項目クリック → base-ui が自動でメニューを閉じる → `handleSignOut` 実行 → サインアウト後 `/sign-in` へ遷移。
- レスポンシブ分岐は持たない。右側が約 32px のアイコン 1 個になるため、左ナビは全幅で 1 行に収まり折り返しが解消する。

## エラー / エッジケース

- `signOut()` が失敗した場合: 現行同様、特別なエラー UI は設けない（既存挙動を維持。スコープ外）。
- セッション読込中（`session` が `undefined`）: 現行同様メニュー非表示。
- メニュー外クリック / Esc: base-ui `Menu` 標準のクローズ挙動に委ねる。
- アクセシビリティ: トリガーに `aria-label`、base-ui `Menu` が `role="menu"` / フォーカストラップ / キーボード操作（↑↓ / Enter / Esc）を提供。

## テスト / 検証

このリポジトリのテストは `vitest.config.ts` が `environment: 'node'` ＋ `include: ['lib/**/*.test.ts']` のロジック専用で、React コンポーネントテスト基盤（@testing-library/react も jsdom/DOM 環境も）未導入。コンポーネントテストを書くには新規依存と環境切替の両方が必要で「新規パッケージ追加なし」の非ゴールに反するため、**コンポーネントの自動テストは追加しない**。代わりに:

- `npm run lint`（biome）/ `npx tsc --noEmit` / `npm run build` を green に（CI 同等）。
- ローカルで実画面確認: ブラウザを 375px 幅（SP）と PC 幅で開き、(1) 左ナビが折り返さず 1 行、(2) アイコンボタン表示、(3) クリックでメニュー開、メール表示、(4) サインアウトで `/sign-in` 遷移、を目視確認。

## ロールアウト

- main 直 push 不可のため作業ブランチで実施し PR を作成。`gh pr checks --watch` で CI green を確認 → `gh pr merge --squash --delete-branch`。
- マージで Vercel が本番 auto-deploy（既存運用どおり）。

## YAGNI / 留意

- `DropdownMenu*` ラッパーは今回使うパーツのみエクスポート（Group / RadioItem / CheckboxItem / Submenu / Arrow / Backdrop などは追加しない）。
- 将来メニュー項目が増える場合に備えた汎用設計はしない。必要になった時に拡張する。
