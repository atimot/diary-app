# モバイルヘッダーのアカウントメニュー化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SP（モバイル）でヘッダー左ナビが縦に折り返す問題を、右側のメール＋サインアウトを「ユーザーアイコンの丸ボタン → アカウントメニュー」に集約して横幅を解放することで解消する。

**Architecture:** `@base-ui/react` の `Menu` を base-nova スタイルで薄くラップした新規 `components/ui/dropdown-menu.tsx` を作り、`components/layout/HeaderNav.tsx` の右側インライン（メール span＋テキストボタン）をそのメニューに置換する。PC/モバイル共通 UI（レスポンシブ分岐なし）。

**Tech Stack:** Next.js 16 App Router / React / TypeScript / `@base-ui/react`（既存）/ `lucide-react`（既存）/ Tailwind v4 + shadcn base-nova / Biome。

## Global Constraints

- 新規 npm パッケージを追加しない（`@base-ui/react` `lucide-react` `class-variance-authority` は既存依存）。
- Biome quote ポリシー: `components/ui/**` は **double quote**（override 対象）、それ以外（`components/layout/**` 含む）は **single quote / JSX は double**。
- base-ui は Radix ではない。CSS 変数は oklch（base-nova クラス経由で利用、`hsl(var(--x))` は使わない）。
- base-ui プリミティブは `components/ui/` で `'use client'`・`data-slot`・`cn` を付けて薄くラップする（`button.tsx` / `alert-dialog.tsx` 準拠）。
- main 直 push 不可。作業ブランチ → PR → CI green → squash merge。
- 検証は `npm run lint`（biome）/ `npx tsc --noEmit` / `npm run build`。コンポーネントの自動テストは追加しない（リポジトリは `lib/**` の node 環境 vitest のみ、RTL/DOM 環境未導入のため）。
- 単一ユーザー運用（メール `tmd6031@gmail.com`）。サインアウト後は `/sign-in` 遷移。

---

### Task 1: `components/ui/dropdown-menu.tsx` ラッパーを作成

**Files:**
- Create: `components/ui/dropdown-menu.tsx`

**Interfaces:**
- Produces:
  - `DropdownMenu`（`Menu.Root` ラッパー）
  - `DropdownMenuTrigger`（`Menu.Trigger` ラッパー、`render` prop で `Button` 合成可）
  - `DropdownMenuContent`（`Menu.Portal`＋`Menu.Positioner`＋`Menu.Popup`。props/className は Popup に転送。既定 `side="bottom" align="end" sideOffset={6}`）
  - `DropdownMenuItem`（`Menu.Item` ラッパー、`variant?: "default" | "destructive"`、`onClick` 可、クリックで自動クローズ）
  - `DropdownMenuSeparator`（`Menu.Separator` ラッパー）
  - `DropdownMenuLabel`（フォーカス不可の `div`。非操作ラベル）

- [ ] **Step 1: ファイルを作成（double quote）**

`components/ui/dropdown-menu.tsx`:

```tsx
"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type * as React from "react";
import { cn } from "@/lib/utils";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  side = "bottom",
  align = "end",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: MenuPrimitive.Positioner.Props["side"];
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-56 max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] rounded-xl bg-popover p-1 text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS（エラーなし）。`MenuPrimitive.Positioner.Props["side"]` 等の indexed access 型が解決できない場合は、`side?: "bottom" | "top" | "left" | "right"` 等の素のユニオンに置き換えてよい。

- [ ] **Step 3: lint**

Run: `npm run lint`
Expected: `components/ui/dropdown-menu.tsx` が double quote で clean（fixes 0）。`useImportType` 等が出たら fix。

- [ ] **Step 4: コミット**

```bash
git add components/ui/dropdown-menu.tsx
git commit -m "feat(ui): base-ui Menu を base-nova スタイルでラップした dropdown-menu を追加"
```

---

### Task 2: `HeaderNav.tsx` の右側をアカウントメニューに置換

**Files:**
- Modify: `components/layout/HeaderNav.tsx`

**Interfaces:**
- Consumes（Task 1）: `DropdownMenu` / `DropdownMenuTrigger` / `DropdownMenuContent` / `DropdownMenuItem` / `DropdownMenuSeparator` / `DropdownMenuLabel`
- 既存: `Button`（`@/components/ui/button`）、`signOut` `useSession`（`@/lib/auth/client`）、`usePathname` `useRouter`（`next/navigation`）

- [ ] **Step 1: import を追加（single quote）**

`components/layout/HeaderNav.tsx` の import 群に追記:

```tsx
import { CircleUser, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

`Button` の既存 import は残す（トリガーの `render` で使う）。

- [ ] **Step 2: 右側ブロックをメニューに置換**

現状の右側ブロック:

```tsx
      {session?.user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{session.user.email}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
          >
            サインアウト
          </Button>
        </div>
      )}
```

を、次へ置換:

```tsx
      {session?.user && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="アカウントメニュー"
            render={<Button type="button" variant="ghost" size="icon" />}
          >
            <CircleUser />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut />
              サインアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
```

左ナビ（`links` の map・アクティブ判定）と `handleSignOut`・`if (pathname.startsWith('/sign-in')) return null;`・`nav` の外側構造は**変更しない**。

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS。`render` prop は base-ui `Menu.Trigger` の API（`alert-dialog.tsx` の `AlertDialogCancel` と同じ合成パターン）。型エラーが出る場合は `render` に渡す要素の props を `Button` の許容 props に合わせる。

- [ ] **Step 4: lint**

Run: `npm run lint`
Expected: `HeaderNav.tsx` が single quote / JSX double で clean（fixes 0）。

- [ ] **Step 5: build**

Run: `npm run build`
Expected: ビルド成功（SSR エラーなし。`HeaderNav` は既に `'use client'`、`dropdown-menu.tsx` も `"use client"`）。

- [ ] **Step 6: コミット**

```bash
git add components/layout/HeaderNav.tsx
git commit -m "feat(header): SPのナビ折り返し解消のため右側をアカウントメニューに集約"
```

---

### Task 3: 実画面での目視検証（SP/PC）

**Files:** なし（検証のみ）

- [ ] **Step 1: dev サーバ起動**

Run: `npm run dev`（別プロセス）。`http://localhost:3000` を開く。

- [ ] **Step 2: SP 幅（375px）で確認**

ブラウザ幅を 375px にして以下を確認:
- 左ナビ「日記 / 履歴 / 分析」が**折り返さず 1 行**に収まる（縦書き状態の解消）。
- 右上にユーザーアイコンの丸ボタンが 1 個表示される。
- ボタンをクリック → メニューが開き、メールアドレス（折り返さず）＋区切り線＋「サインアウト」（赤系トーン）が表示される。
- メニューが右ビューポート端をはみ出さない。

- [ ] **Step 3: PC 幅でも確認**

PC 幅でも同じトリガー（アイコン）・メニュー挙動になっていること（レスポンシブ分岐がないこと）を確認。

- [ ] **Step 4: 機能確認**

「サインアウト」クリック → メニューが閉じ、サインアウト処理後 `/sign-in` に遷移すること。`/sign-in` ページではヘッダー（`HeaderNav`）が表示されないこと（既存ガード）。

- [ ] **Step 5: アクセシビリティ確認**

レンダリング後のトリガー `<button>` に `aria-label="アカウントメニュー"`・`aria-haspopup`・`aria-expanded` が**同一要素**に乗っていることを DevTools で確認。キーボード（Tab でフォーカス → Enter で開く → ↑↓ で項目移動 → Esc で閉じる）が効くこと。メール行にはフォーカスが乗らず、サインアウト項目にのみ乗ること。

---

## Self-Review

- **Spec coverage:** 右側集約（Task 2）、dropdown ラッパー新規（Task 1）、PC/モバイル共通（Task 2、分岐なし）、左ナビ不変（Task 2 で明記）、アクセシビリティ（Task 1 の data 属性＋ Task 3 Step 5）、Popup 幅/はみ出し（Task 1 の `min-w-56 max-w-[calc(100vw-2rem)]`＋ Task 3 Step 2）、破壊トーンを行スタイルに（Task 1 の `data-[variant=destructive]`）、ラベル非操作（Task 1 の plain div）、quote ポリシー（各 Task の lint step）、テスト方針（自動テスト追加なし、目視検証）— すべて対応済み。
- **Placeholder scan:** TBD/TODO なし。各コード step は完全なコードを提示。
- **Type consistency:** Task 2 が使う 6 つのエクスポート名は Task 1 の export と一致。`variant="destructive"` は Task 1 の `DropdownMenuItem` の prop と一致。
- **既知リスク:** (1) `MenuPrimitive.*.Props["..."]` の indexed access 型が無い場合の代替（素ユニオン）を Task1 Step2 に明記。(2) `data-highlighted` のハイライト styling は build では検出されないため Task3 Step2/5 の目視で確認（効かない場合は base-ui の実 data 属性名に合わせて調整）。
