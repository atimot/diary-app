# 和モダン デザインシステム 土台（PR1）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 和モダンのデザイントークン・フォント・ライト/ダーク切替・憲法・見本帳・色リテラルのガードレールを導入し、以後の全画面が「値の差し替え」で和モダンに追従する土台を作る（既存3画面のレイアウトは触らない＝PR2以降）。

**Architecture:** shadcn セマンティック変数の**値だけ**を和モダンに差し替え、不足は新規 `--season` のみ追加。4段サーフェスは既存 `--background/--card/--muted/--popover` にマップ。色の逸脱は「生の色リテラル」を grep で弾く CI ガードレールで防ぎ、意味的整合は `/dev/design`＋憲法＋レビューで担保する。

**Tech Stack:** Next.js 16.2.9 (App Router) / Tailwind v4（`@theme inline`、設定はCSS） / shadcn(base-nova) + @base-ui/react / next-themes / next/font/google / Biome 2.5.1 / vitest / tsx。

## Global Constraints

各タスクの要件にこれらが暗黙に含まれる（spec からの転記）。

- 色は必ずトークン（`bg-primary` `text-foreground` `text-season` / `var(--…)`）。**生hex・`rgb()/hsl()/oklch()/oklab()` の色リテラル・任意色クラス・インラインstyleの色リテラル禁止**。例外: `app/globals.css` と `app/dev/**`。
- 見出しは `font-heading`（明朝）、本文・UIは既定（Zen Kaku Gothic New）。font-size/余白/角丸は spec §① のスケールから。**11px未満禁止**。
- 静的フォント（Shippori Mincho B1 / Zen Kaku Gothic New）は `next/font/google` で **`weight` 配列を明示必須**。CJK は **`preload: false`**。
- `@theme inline` のフォント変数は **next/font の変数を指す**（自己参照禁止）。
- アクセント（若葉）は1画面1〜2箇所。朱＝`--season`（日曜/季節）。危険操作＝`--destructive`。
- 深度は影でなく罫＋明度差。新規 drop-shadow 禁止（focus ring 等は可）。ダーク対応必須。
- PRベース運用（main 直 push 不可、squash merge）。lockfile 再生成時は **`npm ci` がローカルで exit 0**（`@emnapi/*` 脱落なし）を確認。

**作業ブランチ:** 現在の `claude/cranky-bhabha-aa77ab`（spec/plan が既にコミット済み）。PR1 の実装コミットはこのブランチに積み、最後に1つの PR として squash merge する。

**参照値（hex）:** 承認済みモックの値。実装では hex をそのまま CSS 変数に入れる（oklch 変換による色ズレを避け、モックと完全一致させる。`color-mix()` は hex 入力でも動作する）。

---

### Task 1: 色リテラルのガードレール（TDD）

**Files:**
- Create: `lib/design/color-literals.ts`
- Test: `lib/design/color-literals.test.ts`（`vitest.config.ts` の `include: ['lib/**/*.test.ts']` が自動で拾う）
- Create: `scripts/check-design-tokens.ts`
- Modify: `package.json`（`scripts` に `lint:design` を追加）
- Modify: `.github/workflows/ci.yml`（`npm run lint:design` の step 追加）

**Interfaces:**
- Produces: `findColorLiterals(source: string): { line: number; column: number; text: string }[]` — 1ファイル分のソース文字列から生の色リテラルを検出して返す純関数。

- [ ] **Step 1: 失敗するテストを書く**

`lib/design/color-literals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findColorLiterals } from './color-literals';

describe('findColorLiterals', () => {
  it('生の色リテラルを検出する（must-fail パターン）', () => {
    expect(findColorLiterals('className="bg-[#fff]"')).toHaveLength(1);
    expect(findColorLiterals('className="text-[#1b1916]"')).toHaveLength(1);
    expect(findColorLiterals("style={{ color: '#5f7a4f' }}")).toHaveLength(1);
    expect(findColorLiterals("backgroundColor: 'rgb(0,0,0)'")).toHaveLength(1);
    expect(findColorLiterals('color: hsl(20 50% 40%)')).toHaveLength(1);
    expect(findColorLiterals('fill: oklch(0.6 0.13 70)')).toHaveLength(1);
  });

  it('トークン/許可パターンは検出しない（must-pass）', () => {
    expect(findColorLiterals('className="text-muted-foreground/30"')).toEqual([]);
    expect(
      findColorLiterals('color-mix(in oklab, var(--center-gut) 15%, transparent)'),
    ).toEqual([]);
    expect(findColorLiterals('className="min-h-[15rem] max-w-[260px]"')).toEqual([]);
    expect(findColorLiterals('borderLeftColor: "var(--center-head)"')).toEqual([]);
    expect(findColorLiterals('className="bg-primary text-foreground"')).toEqual([]);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run lib/design/color-literals.test.ts`
Expected: FAIL（`findColorLiterals` が存在しない / Cannot find module './color-literals'）

- [ ] **Step 3: 最小実装を書く**

`lib/design/color-literals.ts`:

```ts
export interface ColorLiteralMatch {
  line: number;
  column: number;
  text: string;
}

// 生の色リテラルだけを検出する:
//  - 16進カラー #rgb / #rgba / #rrggbb / #rrggbbaa（5,7桁は色ではないので除外）
//  - 関数記法 rgb()/rgba()/hsl()/hsla()/oklch()/oklab()（直後に "(" が来る場合のみ）
// var(--token) / color-mix(in oklab, var(--..) ..) / Tailwind の named color・不透明度修飾子・
// 任意サイズ値（色でない [15rem] 等）は検出しない。
const COLOR_LITERAL =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|(?:rgba|rgb|hsla|hsl|oklch|oklab)\s*\(/g;

export function findColorLiterals(source: string): ColorLiteralMatch[] {
  const matches: ColorLiteralMatch[] = [];
  source.split('\n').forEach((lineText, i) => {
    COLOR_LITERAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec ループの定石
    while ((m = COLOR_LITERAL.exec(lineText)) !== null) {
      matches.push({ line: i + 1, column: m.index + 1, text: m[0] });
    }
  });
  return matches;
}
```

- [ ] **Step 4: テストを実行して通過を確認**

Run: `npx vitest run lib/design/color-literals.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: CLI ラッパーを書く**

`scripts/check-design-tokens.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findColorLiterals } from '../lib/design/color-literals';

// 走査対象ルートと除外ディレクトリ（spec §⑦）。
const ROOTS = ['app', 'components', 'lib'];
const EXCLUDE_DIRS = ['components/ui', 'app/dev'];

const isScannable = (p: string) =>
  /\.(ts|tsx)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p);
const isExcluded = (p: string) =>
  EXCLUDE_DIRS.some((d) => p === d || p.startsWith(`${d}/`));

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (isExcluded(full)) continue;
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (isScannable(full)) acc.push(full);
  }
  return acc;
}

let violations = 0;
for (const root of ROOTS) {
  let files: string[] = [];
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    for (const m of findColorLiterals(readFileSync(file, 'utf8'))) {
      violations++;
      console.error(
        `${file}:${m.line}:${m.column}  生の色リテラル "${m.text}" はトークン（var(--…) / Tailwind トークンクラス）に置き換えてください`,
      );
    }
  }
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations} 件の色リテラルを検出（許可: app/globals.css, components/ui/**, app/dev/**）`,
  );
  process.exit(1);
}
console.log('✓ 色リテラルなし（デザイントークンのガードレール通過）');
```

- [ ] **Step 6: npm script を追加**

`package.json` の `scripts` に1行追加（`lint` の直後）:

```json
    "lint": "biome check",
    "lint:design": "tsx scripts/check-design-tokens.ts",
```

- [ ] **Step 7: 現在のリポジトリでガードレールが通ることを確認**

Run: `npm run lint:design`
Expected: `✓ 色リテラルなし（デザイントークンのガードレール通過）` で exit 0。
（もし既存ファイルで誤検知が出たら、それが本当に色リテラルか確認。コメント中の `#123` 等の偽陽性なら該当箇所を `var()`/トークンに直すか表現を変える。`var(--center-*)` や `color-mix(... var() ..)` は検出されない想定。）

- [ ] **Step 8: CI に step を追加**

`.github/workflows/ci.yml` の `- run: npm run lint` の直後に追加:

```yaml
      - run: npm run lint

      - run: npm run lint:design

      - run: npx tsc --noEmit
```

- [ ] **Step 9: コミット**

```bash
git add lib/design/color-literals.ts lib/design/color-literals.test.ts scripts/check-design-tokens.ts package.json .github/workflows/ci.yml
git commit -m "feat(design): 色リテラルのガードレール（lint:design + CI）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: フォント（Shippori Mincho B1 / Zen Kaku Gothic New）

**Files:**
- Modify: `app/layout.tsx`（フォント差し替え）
- Modify: `app/globals.css`（`@theme inline` のフォント変数 3行のみ）

**Interfaces:**
- Produces: CSS 変数 `--font-zen-kaku` `--font-shippori` `--font-noto-sans-jp` `--font-geist-mono` を `<html>` に付与。`--font-sans`/`--font-heading`/`--font-mono` がそれらを指す。

- [ ] **Step 1: `app/layout.tsx` をフォント差し替えに書き換える**

`app/layout.tsx` の全文を以下に置換:

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import {
  Geist_Mono,
  Noto_Sans_JP,
  Shippori_Mincho_B1,
  Zen_Kaku_Gothic_New,
} from 'next/font/google';
import { HeaderNav } from '@/components/layout/HeaderNav';
import './globals.css';

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// 本文・UI 基盤のゴシック（シャープで現代的）。Geist Sans を退役させ和文を統一する。
// 静的フォントなので weight 配列の明示が必須。CJK は preload しない。
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-zen-kaku',
  weight: ['400', '500'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

// 見出し用の明朝。静的フォントなので weight 必須。
const shipporiMincho = Shippori_Mincho_B1({
  variable: '--font-shippori',
  weight: ['500', '600'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

// フォールバック用（variable フォントなので weight 不要）。
const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

export const metadata: Metadata = {
  title: '日記アプリ',
  description: '1日1つの日記を記録するアプリ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKaku.variable} ${shipporiMincho.variable} ${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <HeaderNav />
        </header>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

（注: `suppressHydrationWarning` と `ThemeProvider` は Task 4 で追加する。このタスク時点ではまだ next-themes 未導入。）

- [ ] **Step 2: `app/globals.css` の `@theme inline` フォント変数を書き換える**

`@theme inline` 内の `--font-sans` / `--font-mono` / `--font-heading`（現状 11〜17行目）を以下に置換:

```css
  --font-sans:
    var(--font-zen-kaku), var(--font-noto-sans-jp), ui-sans-serif, system-ui,
    sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --font-heading:
    var(--font-shippori), var(--font-zen-kaku), var(--font-noto-sans-jp), serif;
```

- [ ] **Step 3: ビルドと型チェックで壊れていないことを確認**

Run: `npx tsc --noEmit && npm run build`
（build は spec §⑨ のダミー env が必要: `DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`）
Expected: 型エラーなし、build 成功。next/font が Shippori Mincho B1 / Zen Kaku Gothic New を解決（weight 指定済みなので "Missing weight" エラーが出ない）。

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS（未使用 import なし。Geist/`geistSans` の残骸がないこと）

- [ ] **Step 5: コミット**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(design): 見出し明朝(Shippori)+本文ゴシック(Zen Kaku)へ。Geist Sans退役

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: カラートークン（和モダン / `app/globals.css`）

**Files:**
- Modify: `app/globals.css`（`:root` と `.dark` のカラー値、`--season` 追加、`@theme inline` に `--color-season`、`@layer base` の見出し）

**Interfaces:**
- Produces: 和モダンのライト/ダーク両トークン。新規 `--season`（`text-season`/`bg-season`/`border-season`）。`h1,h2,h3` が `--font-heading`（明朝）。

- [ ] **Step 1: `:root` ブロックを和モダンのライト値に置換**

`app/globals.css` の `:root { … }`（現状 56〜92行）を以下に置換（hex のまま入れる。`--destructive` `--chart-*` `--center-*` `--radius` `--sidebar-*` は据え置き）:

```css
:root {
  --background: #f4f1ea;
  --foreground: #1b1916;
  --card: #fbf9f4;
  --card-foreground: #1b1916;
  --popover: #fbf9f4;
  --popover-foreground: #1b1916;
  --primary: #5f7a4f;
  --primary-foreground: #f4f1ea;
  --secondary: #efeae0;
  --secondary-foreground: #1b1916;
  --muted: #f0ece2;
  --muted-foreground: #8c857b;
  --accent: #f0ece2;
  --accent-foreground: #1b1916;
  --destructive: oklch(0.577 0.245 27.325);
  --season: #b9421f;
  --border: #e0d9cc;
  --input: #e0d9cc;
  --ring: #5f7a4f;
  --center-gut: oklch(0.6 0.13 70);
  --center-heart: oklch(0.58 0.15 15);
  --center-head: oklch(0.55 0.13 250);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.982 0.006 72);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: #e0d9cc;
  --sidebar-ring: oklch(0.708 0 0);
}
```

- [ ] **Step 2: `.dark` ブロックを藍鼠の夜の値に置換**

`app/globals.css` の `.dark { … }`（現状 94〜129行）を以下に置換（`--destructive` `--chart-*` `--center-*` `--sidebar-*` は据え置き。`--border`/`--input` は単色に統一）:

```css
.dark {
  --background: #15181d;
  --foreground: #e9e7e1;
  --card: #1b1f25;
  --card-foreground: #e9e7e1;
  --popover: #2a313b;
  --popover-foreground: #e9e7e1;
  --primary: #93b277;
  --primary-foreground: #15181d;
  --secondary: #232830;
  --secondary-foreground: #e9e7e1;
  --muted: #232830;
  --muted-foreground: #8a909c;
  --accent: #232830;
  --accent-foreground: #e9e7e1;
  --destructive: oklch(0.704 0.191 22.216);
  --season: #cf6b4f;
  --border: #2b313a;
  --input: #2b313a;
  --ring: #93b277;
  --center-gut: oklch(0.78 0.13 70);
  --center-heart: oklch(0.72 0.15 15);
  --center-head: oklch(0.72 0.13 250);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.215 0.006 70);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: #2b313a;
  --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 3: `@theme inline` に `--color-season` を接続**

`@theme inline` 内（`--color-background` 等が並ぶ箇所、例: `--color-destructive: var(--destructive);` の直後）に1行追加:

```css
  --color-season: var(--season);
```

- [ ] **Step 4: `@layer base` で見出しを明朝に**

`app/globals.css` の `@layer base { … }` 内（`html { @apply font-sans; }` の直後）に追加:

```css
  h1,
  h2,
  h3 {
    font-family: var(--font-heading);
  }
```

- [ ] **Step 5: ビルド / lint / ガードレールを確認**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design`
Expected: すべて PASS。`lint:design` は globals.css を走査しない（.css かつ除外）ので hex があっても OK。
さらに（任意）dev サーバで目視: `npm run dev` → `/`・`/history`・`/insights` が和モダンの配色＋明朝見出しになっていること（レイアウトは未改修なので中間状態でよい）。

- [ ] **Step 6: コミット**

```bash
git add app/globals.css
git commit -m "feat(design): 和モダンのカラートークン(light/dark)+季節色--season+見出し明朝

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: ライト/ダーク切替（next-themes）

**Files:**
- Modify: `package.json` / `package-lock.json`（`npm install next-themes`）
- Create: `components/theme/ThemeProvider.tsx`
- Create: `components/theme/ThemeToggle.tsx`
- Modify: `app/layout.tsx`（Provider でラップ＋`suppressHydrationWarning`）
- Modify: `components/layout/HeaderNav.tsx`（トグル配置）

**Interfaces:**
- Consumes: `--background`/`--foreground` 等のトークン（Task 3）。
- Produces: `<ThemeProvider>`（client ラッパー）、`<ThemeToggle />`（ヘッダー用ボタン）。

- [ ] **Step 1: next-themes を導入し lockfile を検証**

```bash
npm install next-themes
npm ci
```
Expected: `npm install` 成功。`npm ci` が **exit 0**（`@emnapi/*` 脱落で `Missing: @emnapi/... from lock file` が出ないこと。出たら AGENTS.md「npm lockfile と CI」の手順で overrides 固定を確認）。
（実装前に context7 で `next-themes` の App Router 最新手順を確認してよい: ToolSearch で `resolve-library-id`/`query-docs` をロード。）

- [ ] **Step 2: client ラッパー `ThemeProvider` を作成**

`components/theme/ThemeProvider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: トグルボタン `ThemeToggle` を作成**

`components/theme/ThemeToggle.tsx`:

```tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
```

（`mounted` ガードでサーバ初期描画と一致させ hydration mismatch を避ける。）

- [ ] **Step 4: `app/layout.tsx` を Provider でラップ**

`app/layout.tsx` を修正（import 追加・`suppressHydrationWarning`・Provider ラップ）:

import に追加:

```tsx
import { ThemeProvider } from '@/components/theme/ThemeProvider';
```

`<html ...>` に `suppressHydrationWarning` を追加し、`<body>` 内を Provider で包む:

```tsx
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${zenKaku.variable} ${shipporiMincho.variable} ${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="border-b">
            <HeaderNav />
          </header>
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
```

- [ ] **Step 5: `HeaderNav` にトグルを配置**

`components/layout/HeaderNav.tsx` を修正。import に追加:

```tsx
import { ThemeToggle } from '@/components/theme/ThemeToggle';
```

右側クラスタを「トグル＋アカウント」に。現状の `{session?.user && ( <DropdownMenu> … )}` を次のように右寄せコンテナで包む（`nav` 直下の末尾、`</nav>` の直前を置換）:

```tsx
      <div className="flex items-center gap-1">
        <ThemeToggle />
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
      </div>
```

（既存の `{session?.user && ( … )}` ブロックはこの新コンテナ内へ移動。左側のナビ link 群はそのまま。）

- [ ] **Step 6: ビルド / 型 / lint / ガードレール**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS。

- [ ] **Step 7: 目視確認（dev）**

Run: `npm run dev` → ヘッダーのトグルでライト/ダークが切り替わり、リロードしても保持され、初期表示で色のチラつき（FOUC）が無いこと。

- [ ] **Step 8: コミット**

```bash
git add package.json package-lock.json components/theme/ThemeProvider.tsx components/theme/ThemeToggle.tsx app/layout.tsx components/layout/HeaderNav.tsx
git commit -m "feat(design): next-themesでライト/ダーク切替トグルを追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 生きた見本帳 `/dev/design`

**Files:**
- Create: `app/dev/design/page.tsx`（本番 `notFound()` ガード付き。`app/dev/**` はガードレール除外）

**Interfaces:**
- Consumes: 全トークン（Task 3）、`Button`（`components/ui/button`）、`Tabs*`（`components/ui/tabs`）、`Textarea`（`components/ui/textarea`）、`BarTrack`/`MeterFill`（`components/insights/MeterBar`）。

- [ ] **Step 1: 見本帳ページを作成**

`app/dev/design/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { BarTrack, MeterFill } from '@/components/insights/MeterBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// dev 専用の見本帳。トークン/タイポ/コンポーネントを一覧して目視確認する。
// 本番ビルドでは notFound() で塞ぐ（app/dev/enneagram と同じ流儀）。

const SWATCHES: { label: string; className: string; text: string }[] = [
  { label: 'background', className: 'bg-background', text: 'text-foreground' },
  { label: 'card', className: 'bg-card', text: 'text-card-foreground' },
  { label: 'popover', className: 'bg-popover', text: 'text-popover-foreground' },
  { label: 'muted', className: 'bg-muted', text: 'text-muted-foreground' },
  { label: 'secondary', className: 'bg-secondary', text: 'text-secondary-foreground' },
  { label: 'primary（若葉）', className: 'bg-primary', text: 'text-primary-foreground' },
  { label: 'season（朱）', className: 'bg-season', text: 'text-background' },
  { label: 'border', className: 'bg-border', text: 'text-foreground' },
];

function Swatches() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SWATCHES.map((s) => (
        <div
          key={s.label}
          className={`flex h-20 flex-col justify-between rounded-xl border p-3 ${s.className} ${s.text}`}
        >
          <span className="text-xs">{s.label}</span>
          <span className="text-xs opacity-70">Aあ亜</span>
        </div>
      ))}
    </div>
  );
}

function TypeScale() {
  return (
    <div className="space-y-3">
      <h1>見出し H1 — 今日のハイライト</h1>
      <h2>見出し H2 — あなたの傾向</h2>
      <h3>見出し H3 — 水無月</h3>
      <p className="text-base leading-loose tracking-[0.03em]">
        本文（Zen Kaku Gothic New）。朝は少し肌寒かったけれど、昼から気持ちよく晴れた。集中できた日は、夜の珈琲がいつもより美味しく感じる。
      </p>
      <p className="text-sm text-muted-foreground">補足テキスト text-sm / muted-foreground</p>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Eyebrow ラベル
      </p>
      <p className="font-heading text-3xl tabular-nums">2026 6月26日</p>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>保存</Button>
      <Button variant="outline">アウトライン</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="ghost">ゴースト</Button>
      <Button variant="destructive">削除</Button>
      <Button variant="link">リンク</Button>
      <Button size="sm">小</Button>
      <Button size="lg">大</Button>
    </div>
  );
}

function Meters() {
  const rows = [
    { label: '探究', value: 0.72 },
    { label: '達成', value: 0.54 },
    { label: '平和', value: 0.38 },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(r.value * 100)}%
            </span>
          </div>
          <BarTrack height="h-1.5">
            <MeterFill value={r.value} color="var(--primary)" />
          </BarTrack>
        </div>
      ))}
    </div>
  );
}

function CalendarCells() {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="flex aspect-square w-9 items-center justify-center rounded-md bg-primary font-medium text-primary-foreground">
        記
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground ring-2 ring-primary">
        今
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground">
        未
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground/40">
        来
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-season">
        日
      </span>
    </div>
  );
}

function Showcase() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2>カラートークン</h2>
        <Swatches />
      </section>
      <section className="space-y-3">
        <h2>タイポグラフィ</h2>
        <TypeScale />
      </section>
      <section className="space-y-3">
        <h2>ボタン</h2>
        <Buttons />
      </section>
      <section className="space-y-3">
        <h2>タブ</h2>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">編集</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea placeholder="今日はどんな1日でしたか？" />
          </TabsContent>
          <TabsContent value="preview">
            <div className="rounded-md border p-4 text-sm">プレビュー領域</div>
          </TabsContent>
        </Tabs>
      </section>
      <section className="space-y-3">
        <h2>メーター</h2>
        <Meters />
      </section>
      <section className="space-y-3">
        <h2>カレンダーのセル状態</h2>
        <CalendarCells />
      </section>
    </div>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="container mx-auto max-w-4xl space-y-12 p-6">
      <header>
        <h1>デザインシステム（和モダン）見本帳</h1>
        <p className="text-sm text-muted-foreground">
          トークン・タイポ・コンポーネントの基準。ヘッダーのトグルでライト/ダークを確認。
        </p>
      </header>

      <Showcase />

      <section className="space-y-3">
        <h2>ダークプレビュー（強制 .dark）</h2>
        <div className="dark rounded-xl border bg-background p-6 text-foreground">
          <Showcase />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: ビルド / 型 / lint / ガードレール**

Run: `npm run lint && npx tsc --noEmit && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build`
Expected: すべて PASS（`/dev/design` は `app/dev/**` なので `lint:design` 除外。`color="var(--primary)"` はリテラルでない）。

- [ ] **Step 3: 目視確認（dev）**

Run: `npm run dev` → `http://localhost:3000/dev/design` を開き、スウォッチ・タイポ（明朝見出し）・ボタン・タブ・メーター・カレンダーセルが表示され、下部のダークプレビューが暗背景で正しく出ること。ヘッダートグルでページ全体のライト/ダークも確認。

- [ ] **Step 4: コミット**

```bash
git add app/dev/design/page.tsx
git commit -m "feat(design): /dev/design 見本帳ページ（本番notFoundガード）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: デザイン憲法（`AGENTS.md`）

**Files:**
- Modify: `AGENTS.md`（「This is NOT the Next.js you know」見出しの直後に憲法セクションを追加）

- [ ] **Step 1: 憲法セクションを追記**

`AGENTS.md` の冒頭付近、`# This is NOT the Next.js you know` ブロックの直後（`# Your training data may be stale` の直前）に以下を挿入:

```markdown
# デザインシステム（和モダン）— 憲法

全画面の作成・変更でこれに従う。詳細・実例は `/dev/design`、根拠は `docs/superpowers/specs/2026-06-26-design-system-design.md`。

0. **競合したらトークンが勝つ**（この憲法が既定挙動より優先）。
1. 色は必ずトークン（`bg-primary` `text-foreground` `text-season` / `var(--…)`）。**生hex・`rgb()/hsl()/oklch()` の色リテラル・任意色クラス・インラインstyleの色リテラル禁止**（例外: `app/globals.css` と `app/dev/**`）。`npm run lint:design` で機械的に弾く。
2. 見出しは `font-heading`（明朝 Shippori Mincho B1）、本文・UIは既定（Zen Kaku Gothic New）。font-size・余白・角丸は spec §① のスケールから。**11px未満禁止**。
3. アクセント（若葉 `--primary`）は **1画面に1〜2箇所**。朱（`--season`）は日曜・季節の差し色のみ。削除など危険操作は `--destructive`。
4. 深度は**影でなく罫＋明度差**（4面: background→card→muted→popover）。新規 drop-shadow 禁止（focus ring 等の機能的影は可）。
5. 新パターン追加前に `/dev/design` と既存部品を確認し**再利用優先**。**ダーク対応必須**（両モードで成立させる）。

注: ガードレール(grep)が防ぐのは「生の色リテラルの混入」まで。トークンの*意味的*誤用・スケール逸脱は `/dev/design`＋レビューで担保する（過信しない）。
```

- [ ] **Step 2: コミット**

```bash
git add AGENTS.md
git commit -m "docs(design): AGENTS.mdに和モダンのデザイン憲法を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 最終検証＋スクリーンショット

**Files:**
- （コードなし。全体検証と参照スクショ）

- [ ] **Step 1: フルチェックを実行**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run lint:design && DATABASE_URL=postgres://ci:ci@localhost:5432/ci BETTER_AUTH_SECRET=ci BETTER_AUTH_URL=http://localhost:3000 NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000 npm run build
```
Expected: すべて PASS。

- [ ] **Step 2: ガードレールが実際に fail することを確認（フィクスチャ）**

一時的に任意の `app/*.tsx`（例 `app/page.tsx`）へ `// test: #ff0000` を1行足して `npm run lint:design` を実行 → **exit 1 でその箇所が報告される**ことを確認し、足した行を**元に戻す**。

- [ ] **Step 3: lockfile 健全性**

Run: `npm ci`
Expected: exit 0（`@emnapi/*` 脱落なし）。

- [ ] **Step 4: スクショ（ライト/ダーク）**

`npm run dev` を起動し、Playwright MCP（`browser_navigate` → `http://localhost:3000/dev/design`、`browser_take_screenshot`）でライトとダーク両方を撮影。ダークはヘッダーのトグルをクリック（または `localStorage.theme='dark'` 後リロード）して撮る。確認: コントラスト・明朝見出し・若葉アクセント・朱（日曜セル）・ダーク4段サーフェスが意図どおり。

- [ ] **Step 5: PR を作成し CI green を確認してマージ**

```bash
git push -u origin claude/cranky-bhabha-aa77ab
gh pr create --fill --title "feat(design): 和モダン デザインシステム土台（トークン/フォント/テーマ/憲法/見本帳/ガードレール）"
gh pr checks --watch
```
CI（lint / lint:design / tsc / test / build）が green になったら:
```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Self-Review（spec との突き合わせ）

- spec ①トークン → Task 3（`--secondary`/`--accent`/`--chart-*`/`--sidebar-*`/`--center-*` 据え置き明記、`--season` 追加、4段=既存変数マップ）✓
- spec ②フォント → Task 2（静的フォント weight 明示、Geist Sans 退役、`@theme` 自己参照回避）✓
- spec ③テーマ → Task 4（next-themes 導入＋lockfile確認＋client ラッパー＋`suppressHydrationWarning`＋トグル）✓
- spec ⑤憲法 → Task 6（最小5＋優先順位、過信しない注記）✓
- spec ⑥見本帳 → Task 5（本番 `notFound()`、トークン/タイポ/部品/ダークプレビュー）✓
- spec ⑦ガードレール → Task 1（色リテラル限定、inline style も素のテキスト走査で捕捉、must-pass/fail フィクスチャ、CI step、サイズ任意値は対象外）✓
- spec ⑧PR分割 → Task 7（PR1 を1本で squash merge。既存3画面の作り込みは対象外）✓
- spec ⑨検証 → Task 7（lint/tsc/test/build/lint:design/lockfile/スクショ）✓
- プレースホルダ: なし（各 step に実コード）。型整合: `findColorLiterals` の戻り型を Task 1 で定義し利用箇所と一致。`BarTrack`/`MeterFill`/`Button`/`Tabs*`/`Textarea` は既存 API に一致。
```
