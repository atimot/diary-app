# 日記入力の WYSIWYG 化（Tiptap）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日記の入力 UI を「見たまま編集（WYSIWYG）」に変え、スマホ・PC どちらからでも見出し・太字などの装飾をツールバーで容易にできるようにする。

**Architecture:** 入力 UI だけを Tiptap エディタに差し替える。`content`（Markdown 文字列）を単一の真実とし、エディタは初期値として既存 Markdown を読み込み、編集結果を `editor.getMarkdown()` で `content` state に書き戻す。hidden input → Server Action → DB（`text` 型 Markdown）→ 表示（`react-markdown`）→ AI 分析の経路はすべて無改修。Tiptap の複雑さは新規エディタ・コンポーネントの内部に閉じ込める。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript / Tiptap v3（`@tiptap/react` + `@tiptap/starter-kit` + 公式 `@tiptap/markdown`）/ Tailwind CSS v4 / @base-ui/react / vitest（往復テストのみ jsdom）

## Global Constraints

- 保存形式は変更しない。`content` は Markdown 文字列のまま。DB スキーマ・マイグレーション・Server Action（`saveDiaryEntry`）・Zod（`diaryEntrySchema`、本文 1〜50,000 文字）・AI 分析・`DiaryMarkdown` 表示はすべて無改修。
- 装飾は基本セットのみ: 見出し（H2/H3）・太字・斜体・箇条書き・番号付き・引用。
- Tiptap パッケージ（`@tiptap/core` `@tiptap/pm` `@tiptap/react` `@tiptap/starter-kit` `@tiptap/markdown`）は **5 つとも同一バージョンに固定**する（peer が exact pin のため不一致は実行時エラー）。Dependabot ではまとめて上げる。
- `useEditor` には必ず `immediatelyRender: false` を指定（App Router の SSR エラー回避）。エディタ系コンポーネントは `'use client'`。
- Biome: `lib/**` と `components/diary/**` は `quoteStyle: 'single'`, `jsxQuoteStyle: 'double'`。新規ファイルはこれに従う。`useImportType` / `organizeImports` が出たら fix。
- スタイルは既存トークン（oklch / base-nova）と `prose prose-neutral dark:prose-invert` を使う。Tiptap のテーマ CSS は導入しない。
- 本番 URL に出すデータに影響するため、lockfile を変更したら push 前に `npm ci` がローカルで exit 0 になることを確認する（macOS の @emnapi 脱落バグ対策。AGENTS.md 参照）。
- main へ直 push 不可。ブランチ作業 → PR → CI green → squash merge。

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `package.json` / `package-lock.json` | 改修 | Tiptap 5 パッケージ + jsdom(devDep) 追加 |
| `AGENTS.md` | 改修 | Tiptap バージョン固定の運用学びを追記 |
| `lib/editor/diary-extensions.ts` | 新規 | 日記エディタの拡張構成（StarterKit + Markdown）。React 非依存・テスト可能 |
| `lib/editor/diary-extensions.test.ts` | 新規 | 基本セットの Markdown 往復テスト（jsdom） |
| `components/diary/EditorToolbar.tsx` | 新規 | 基本セット 6 種の装飾ツールバー（`useEditorState` でアクティブ表示） |
| `components/diary/RichTextEditor.tsx` | 新規 | Markdown を入出力する WYSIWYG 本体（ツールバー + EditorContent + プレースホルダー） |
| `components/diary/DiaryEditor.tsx` | 改修 | 編集タブの `<Textarea>` を `<RichTextEditor>` に差し替え |

---

## Task 1: Tiptap 依存の追加と運用メモ

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: `@tiptap/react`（`useEditor` `EditorContent` `useEditorState` `Editor` 型）, `@tiptap/starter-kit`（`StarterKit`）, `@tiptap/markdown`（`Markdown`）, `@tiptap/core`（`Editor` クラス）を後続タスクが import 可能になる。

- [ ] **Step 1: 5 パッケージを同一バージョンで追加**

Run:
```bash
npm install @tiptap/core @tiptap/pm @tiptap/react @tiptap/starter-kit @tiptap/markdown
```

- [ ] **Step 2: バージョン一致と peer 不整合がないことを確認**

Run:
```bash
npm ls @tiptap/core @tiptap/pm @tiptap/react @tiptap/starter-kit @tiptap/markdown
```
Expected: 5 つすべて**同一バージョン**で、`invalid` / `UNMET PEER DEPENDENCY` の表示がないこと。もし `@tiptap/markdown` だけバージョンがずれていたら、`npm ls @tiptap/markdown` が示す `@tiptap/core` の要求版に他 4 つを合わせて `npm install @tiptap/xxx@<version>` で固定し直す。

- [ ] **Step 3: lockfile 健全性を確認（プロジェクト既知バグ対策）**

Run:
```bash
npm ci
```
Expected: exit 0。`Missing: @emnapi/... from lock file` 等が出たら AGENTS.md の「npm lockfile と CI（M5）」に従い対処してから先へ進む。

- [ ] **Step 4: AGENTS.md に運用メモを追記**

`AGENTS.md` の「## shadcn / Tailwind v4」セクションの直前に、次のセクションを挿入する:

```markdown
## Tiptap（日記エディタ）
- 入力 UI は Tiptap v3（`@tiptap/react` + `@tiptap/starter-kit` + 公式 `@tiptap/markdown`）。保存は従来通り Markdown 文字列で、表示は `react-markdown` のまま。
- `@tiptap/core` / `@tiptap/pm` / `@tiptap/react` / `@tiptap/starter-kit` / `@tiptap/markdown` は **peer が exact pin**。5 つは常に同一バージョンに揃える。Dependabot 更新時もまとめて上げる（1 つだけ上がると実行時エラー）。
- `useEditor` には必ず `immediatelyRender: false`（App Router の SSR エラー回避）。
- エディタ設定は `lib/editor/diary-extensions.ts` に集約。見出しは H2/H3 のみ。
```

- [ ] **Step 5: コミット**

```bash
git add package.json package-lock.json AGENTS.md
git commit -m "chore(deps): Tiptap一式を追加し運用メモをAGENTS.mdに追記"
```

---

## Task 2: エディタ拡張構成と Markdown 往復テスト

**Files:**
- Create: `lib/editor/diary-extensions.ts`
- Create: `lib/editor/diary-extensions.test.ts`
- Modify: `package.json`, `package-lock.json`（jsdom を devDep 追加）

**Interfaces:**
- Produces: `createDiaryEditorExtensions(): Extensions` — Tiptap の拡張配列を返す。`RichTextEditor` とテストが共有する。

- [ ] **Step 1: jsdom を devDependency に追加**

Run:
```bash
npm install -D jsdom
npm ci
```
Expected: 両方 exit 0。

- [ ] **Step 2: 失敗するテストを書く**

Create `lib/editor/diary-extensions.test.ts`:
```ts
// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createDiaryEditorExtensions } from './diary-extensions';

function parse(markdown: string) {
  const editor = new Editor({
    extensions: createDiaryEditorExtensions(),
    content: markdown,
    contentType: 'markdown',
  });
  const json = editor.getJSON();
  const remarkdown = editor.getMarkdown().trim();
  editor.destroy();
  return { json, remarkdown };
}

describe('createDiaryEditorExtensions', () => {
  it('## を level 2 見出しとして解釈し Markdown に戻せる', () => {
    const { json, remarkdown } = parse('## 見出し2');
    expect(json.content?.[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 2 },
    });
    expect(remarkdown).toContain('## 見出し2');
  });

  it('### を level 3 見出しとして解釈する', () => {
    const { json } = parse('### 見出し3');
    expect(json.content?.[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
    });
  });

  it('太字と斜体マークを往復できる', () => {
    const { remarkdown } = parse('**太字** と *斜体*');
    expect(remarkdown).toContain('**太字**');
    expect(remarkdown).toMatch(/[*_]斜体[*_]/);
  });

  it('箇条書きと番号付きリストを解釈する', () => {
    expect(parse('- a\n- b').json.content?.[0]).toMatchObject({
      type: 'bulletList',
    });
    expect(parse('1. a\n2. b').json.content?.[0]).toMatchObject({
      type: 'orderedList',
    });
  });

  it('引用を解釈する', () => {
    expect(parse('> 引用').json.content?.[0]).toMatchObject({
      type: 'blockquote',
    });
  });
});
```

- [ ] **Step 3: テストが失敗することを確認**

Run:
```bash
npx vitest run lib/editor/diary-extensions.test.ts
```
Expected: FAIL（`Cannot find module './diary-extensions'` 系）。

- [ ] **Step 4: 拡張構成を実装**

Create `lib/editor/diary-extensions.ts`:
```ts
import { Markdown } from '@tiptap/markdown';
import { type Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// 日記エディタで使う Tiptap 拡張。見出しは H2/H3 のみに制限し、
// Markdown 拡張で Markdown 文字列の読み込み・書き出しを有効化する。
// React に依存しないので、エディタ本体とテストの双方から共有する。
export function createDiaryEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Markdown,
  ];
}
```

- [ ] **Step 5: テストが通ることを確認**

Run:
```bash
npx vitest run lib/editor/diary-extensions.test.ts
```
Expected: PASS（5 件）。もし太字/斜体/リストの正規形（例: 斜体が `_斜体_`）が assert と異なって落ちたら、**実際の `getMarkdown()` 出力に assert を合わせる**（このテストは正規形を文書化する役割）。`type`/`level` の構造 assert は変更しないこと。

- [ ] **Step 6: 既存テストとの共存を確認**

Run:
```bash
npm test
```
Expected: 既存（`lib/validation/diary.test.ts`, `lib/diary/streak.test.ts`）含め全 PASS。

- [ ] **Step 7: コミット**

```bash
git add lib/editor/diary-extensions.ts lib/editor/diary-extensions.test.ts package.json package-lock.json
git commit -m "feat(editor): 日記エディタの拡張構成とMarkdown往復テストを追加"
```

---

## Task 3: 装飾ツールバー

**Files:**
- Create: `components/diary/EditorToolbar.tsx`

**Interfaces:**
- Consumes: `@tiptap/react` の `Editor` 型・`useEditorState`、`@/components/ui/button` の `Button`、`lucide-react` のアイコン。
- Produces: `EditorToolbar({ editor }: { editor: Editor | null })` — 後続の `RichTextEditor` がレンダリングする。

- [ ] **Step 1: ツールバーを実装**

Create `components/diary/EditorToolbar.tsx`:
```tsx
'use client';

import { type Editor, useEditorState } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        isH2: editor.isActive('heading', { level: 2 }),
        isH3: editor.isActive('heading', { level: 3 }),
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isBullet: editor.isActive('bulletList'),
        isOrdered: editor.isActive('orderedList'),
        isQuote: editor.isActive('blockquote'),
      };
    },
  });

  if (!editor || !state) return null;

  // タップ時にエディタの選択が外れないようにする（iOS Safari の定番対策）
  const keepSelection = (event: { preventDefault: () => void }) =>
    event.preventDefault();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 overflow-x-auto border-b bg-background/90 px-2 py-1.5 backdrop-blur">
      <Button
        type="button"
        size="sm"
        variant={state.isH2 ? "secondary" : "ghost"}
        aria-pressed={state.isH2}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button
        type="button"
        size="sm"
        variant={state.isH3 ? "secondary" : "ghost"}
        aria-pressed={state.isH3}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </Button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        size="icon-sm"
        variant={state.isBold ? "secondary" : "ghost"}
        aria-pressed={state.isBold}
        aria-label="太字"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state.isItalic ? "secondary" : "ghost"}
        aria-pressed={state.isItalic}
        aria-label="斜体"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </Button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        size="icon-sm"
        variant={state.isBullet ? "secondary" : "ghost"}
        aria-pressed={state.isBullet}
        aria-label="箇条書き"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state.isOrdered ? "secondary" : "ghost"}
        aria-pressed={state.isOrdered}
        aria-label="番号付きリスト"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state.isQuote ? "secondary" : "ghost"}
        aria-pressed={state.isQuote}
        aria-label="引用"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックと lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: エラーなし（`lucide-react` のアイコン名 `Bold` `Italic` `List` `ListOrdered` `Quote` が解決されること。解決できない場合はそのアイコンを `@/components/ui` 既存の使用例に合わせて代替名へ）。

- [ ] **Step 3: コミット**

```bash
git add components/diary/EditorToolbar.tsx
git commit -m "feat(editor): 基本セット6種の装飾ツールバーを追加"
```

---

## Task 4: WYSIWYG エディタ本体

**Files:**
- Create: `components/diary/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `@tiptap/react`（`useEditor` `EditorContent` `useEditorState`）、`createDiaryEditorExtensions`（Task 2）、`EditorToolbar`（Task 3）。
- Produces: `RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (markdown: string) => void; placeholder?: string })` — 後続の `DiaryEditor` が `<Textarea>` の代わりに使う。`value` は Markdown 文字列（初期値）、`onChange` は編集のたびに `getMarkdown()` の結果を渡す。

- [ ] **Step 1: エディタ本体を実装**

Create `components/diary/RichTextEditor.tsx`:
```tsx
'use client';

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { EditorToolbar } from '@/components/diary/EditorToolbar';
import { createDiaryEditorExtensions } from '@/lib/editor/diary-extensions';

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: createDiaryEditorExtensions(),
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none min-h-[15rem] px-3 py-2 text-base outline-none md:text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getMarkdown());
    },
  });

  const isEmpty =
    useEditorState({
      editor,
      selector: ({ editor }) => editor?.isEmpty ?? true,
    }) ?? true;

  return (
    <div className="rounded-lg border border-input bg-transparent">
      <EditorToolbar editor={editor} />
      <div className="relative">
        {isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-base text-muted-foreground md:text-sm">
            {placeholder}
          </span>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックと lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: エラーなし。`contentType` が `useEditor` のオプション型で受からない場合は、`content` をそのまま渡したうえで `onCreate: ({ editor }) => editor.commands.setContent(value, { contentType: 'markdown' })` に切り替える（同じ結果）。

- [ ] **Step 3: コミット**

```bash
git add components/diary/RichTextEditor.tsx
git commit -m "feat(editor): Markdown入出力のWYSIWYGエディタ本体を追加"
```

---

## Task 5: DiaryEditor への統合と動作確認

**Files:**
- Modify: `components/diary/DiaryEditor.tsx`

**Interfaces:**
- Consumes: `RichTextEditor`（Task 4）。
- 既存の `content` state / `<input type="hidden" name="content">` / `saveDiaryEntry` フローは変更しない。

- [ ] **Step 1: import を差し替え**

`components/diary/DiaryEditor.tsx` 上部の import で、`Textarea` の行を削除し `RichTextEditor` を追加する。

削除:
```tsx
import { Textarea } from '@/components/ui/textarea';
```
追加（`DiaryMarkdown` の import の near、アルファベット順に整合させる）:
```tsx
import { RichTextEditor } from '@/components/diary/RichTextEditor';
```

- [ ] **Step 2: 編集タブの中身を差し替え**

`<TabsContent value="edit">` の中身を次のように置換する（`key={entryDate}` で日付が変わったらエディタを作り直す）:

置換前:
```tsx
        <TabsContent value="edit">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            placeholder="今日はどんな1日でしたか？"
            className="w-full"
          />
        </TabsContent>
```
置換後:
```tsx
        <TabsContent value="edit">
          <RichTextEditor
            key={entryDate}
            value={content}
            onChange={setContent}
            placeholder="今日はどんな1日でしたか？"
          />
        </TabsContent>
```

他（hidden input・タブ構造・プレビュータブの `DiaryMarkdown`・保存/削除ボタン・`content.trim().length === 0` による保存無効化）は**一切変更しない**。

- [ ] **Step 3: 型チェック・lint・全テスト・ビルド**

Run:
```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
Expected: すべて成功。

- [ ] **Step 4: 手動で WYSIWYG 動作を確認**

Run:
```bash
npm run dev
```
ブラウザで日記の編集ページを開き、以下を確認する:
- ツールバーの H2/H3・太字・斜体・箇条書き・番号付き・引用が効き、**記号が見えずに装飾された見た目**になる。
- 装飾中の語にカーソルを置くと、対応するツールバーボタンがアクティブ表示になる。
- 空のときプレースホルダー「今日はどんな1日でしたか？」が表示され、入力すると消える。
- 「保存」→「プレビュー」タブで `react-markdown` のレンダリング結果が一致する。
- 一度保存 → ページ再読込で内容が保持される。
- **既存の日記**（過去に手書き Markdown で保存したエントリ）を開いて、見出し・太字・リストが崩れず編集できる。
- 保存ボタンは空入力時に無効、入力後に有効。

- [ ] **Step 5: スマホ表示を確認**

ブラウザの DevTools をモバイル幅（例: iPhone）にして:
- ツールバーが編集エリア上部に **sticky 固定**され、本文をスクロールしても見える。
- ツールバーが横スクロールでき、全ボタンに届く。
- ボタンをタップしても文字選択が外れず装飾が効く。
- 日本語入力（IME）で変換確定・改行・リスト継続が正常（可能なら実機でも確認）。

- [ ] **Step 6: コミット**

```bash
git add components/diary/DiaryEditor.tsx
git commit -m "feat(diary): 入力UIをWYSIWYGエディタに差し替え"
```

- [ ] **Step 7: ブランチを push して PR を作成**

Run:
```bash
git push -u origin claude/upbeat-swirles-ad4094
gh pr create --fill
gh pr checks --watch
```
Expected: CI（lint / tsc / vitest / build）が green。green 後に `gh pr merge --squash --delete-branch`。

---

## Self-Review（記入済み）

**1. Spec coverage:**
- WYSIWYG 化・Markdown 保存維持 → Task 4 + Task 5（`content` state 経由、経路無改修）✓
- 基本セット 6 種 → Task 3（ツールバー）✓
- ライブラリ = Tiptap → Task 1 ✓
- H2/H3 制限 → Task 2（`heading: { levels: [2,3] }`）+ Task 3（ツールバーは H2/H3 のみ）✓
- `immediatelyRender: false` → Task 4 ✓
- プレースホルダーを拡張なしで実装 → Task 4（`isEmpty` + 絶対配置 span）✓
- スマホ sticky ツールバー + 選択保持 → Task 3（`sticky`/`onMouseDown`）+ Task 5 Step 5 ✓
- prose スタイルで表示一致 → Task 4（`editorProps.attributes.class`）✓
- プレビュータブ維持 → Task 5（編集タブのみ変更、プレビューは無改修）✓
- 記号正規化の受容・空入力 → Task 2（往復テストが正規形を文書化）/ 既存 `content.trim()` ✓
- テストは jsdom 局所追加で往復 1 本 → Task 2 ✓
- 既存バリデーションテスト維持 → Task 2 Step 6 / Task 5 Step 3 ✓
- バージョン固定・Dependabot 運用 → Task 1（AGENTS.md 追記）✓
- lockfile 健全性 → Task 1 Step 3 / Task 2 Step 1 ✓

**2. Placeholder scan:** TBD/TODO/「適切に処理」等なし。各コード step に実コードを記載済み。

**3. Type consistency:** `createDiaryEditorExtensions`（Task 2 で定義 → Task 4 で使用）、`RichTextEditor` の props（`value`/`onChange`/`placeholder`、Task 4 定義 → Task 5 使用）、`EditorToolbar` の props（`editor`、Task 3 定義 → Task 4 使用）一致を確認済み。`onChange: (markdown: string) => void` は `setContent`（`useState<string>`）にそのまま適合。
