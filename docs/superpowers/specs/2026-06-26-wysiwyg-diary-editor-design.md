# 日記入力の WYSIWYG 化（Tiptap）設計

- 日付: 2026-06-26
- ステータス: 設計承認済み（実装プラン未作成）
- 関連: [DiaryEditor.tsx](../../../components/diary/DiaryEditor.tsx), [DiaryMarkdown.tsx](../../../components/diary/DiaryMarkdown.tsx), [lib/actions/diary.ts](../../../lib/actions/diary.ts)

## 背景・目的

日記の入力で、スマホ・PC どちらからでも見出しや太字などの文字装飾を容易にできるようにする。

現状の入力は素の `<textarea>` で、装飾するにはユーザーが `#` や `**` などの Markdown 記法を手で打つ必要がある。特にスマホでは記号入力が面倒。一方、保存（Postgres `text` 型に Markdown 文字列）・表示（`react-markdown` + `remark-gfm`）・AI 分析（プレーンテキスト前提）という土台はすでに整っている。

本設計では **入力 UI だけを「見たまま編集（WYSIWYG）」に変える**。保存形式・表示・AI 分析・DB スキーマは一切変更しない。

### 非機能要件

- 内部実装を複雑にしない。依存を増やしすぎない。
- 複雑さは新規エディタ・コンポーネントの内部に閉じ込め、データ層・保存層・表示層には漏らさない。

## 方針決定の記録（検討の経緯）

- **入力方式**: WYSIWYG（見たまま編集）を採用。textarea + Markdown ツールバー案（記号が見える）とも比較したが、ユーザーは「記号を見せたくない」を優先。ただし「保存形式は複雑にしたくない」という要望があり、**WYSIWYG 編集 × Markdown 文字列保存**で両立させる。
- **装飾範囲**: 基本セット（見出し H2/H3・太字・斜体・箇条書き・番号付き・引用）のみ。範囲を絞るほど Markdown 往復が安全・シンプルになる。
- **ライブラリ**: Tiptap / Milkdown / Lexical を技術調査して比較。
  - Tiptap（複雑さ 3/5）: 公式 `@tiptap/markdown` で往復対応。ツールバーのアクティブ判定が `editor.isActive()` で一発。headless で @base-ui/Tailwind と衝突なし。
  - Milkdown（4/5）: Markdown 一級だが、アクティブ判定を ProseMirror state から自前実装。Crepe は依存が重く不可。学習コスト高。
  - Lexical（4/5）: 公式往復ありだが、ネストリスト往復バグ・改行マージ・GFM 消失リスク。ツールバー全手組み。
  - → **Tiptap を採用**。WYSIWYG 各案の中で最もシンプルで、ツールバー実装が最小。

## 設計の核心

現状 `DiaryEditor` は `content`（Markdown 文字列）を単一の真実とし、`<input type="hidden" name="content">` → Server Action `saveDiaryEntry` → DB という経路を持つ。

今回の変更は **「編集タブの中の `<Textarea>` を Tiptap エディタに差し替える」一点だけ**。

- `content` は今後も **Markdown 文字列**のまま。エディタは初期値として既存 Markdown を読み込み、編集結果を `editor.getMarkdown()` で `content` state に書き戻す。
- hidden input / Server Action / Zod バリデーション（`diaryEntrySchema`）/ DB スキーマ / AI 分析 / プレビュー（`DiaryMarkdown`）は **すべて無改修**。
- 既存の日記データもそのまま開いて編集できる（データ移行ゼロ）。

## コンポーネント構成

### 新規 `components/diary/RichTextEditor.tsx`（client component）

責務: Markdown 文字列を入出力する WYSIWYG エディタ本体。

- Props: `value: string`（Markdown）/ `onChange: (markdown: string) => void` / `placeholder?: string`
- `useEditor` で以下を構成:
  - 拡張: `StarterKit`（`heading: { levels: [2, 3] }` に制限）+ Markdown 拡張
  - `immediatelyRender: false`（App Router SSR 対策・必須）
  - 初期値: `content = value`、`contentType: 'markdown'`（指定し忘れると HTML 扱いになる公式注意点）
  - `onUpdate: ({ editor }) => onChange(editor.getMarkdown())`
- `<EditorToolbar editor={editor} />` と `<EditorContent editor={editor} />` をまとめてレンダリング
- 依存配列・再生成に注意（日付遷移などで `value` が外部から変わるケースは、コンポーネントを `key={entryDate}` でマウントし直す方針。controlled に毎 render で作り直すとカーソル/IME が飛ぶため）

このコンポーネントが Tiptap の存在を内部に閉じ込め、外からは「Markdown を入出力する `<textarea>` 互換の部品」に見える。これが「複雑さを閉じ込める」境界。

### 新規 `components/diary/EditorToolbar.tsx`（client component）

責務: 基本セット6種の装飾コントロール。

- Props: `editor: Editor | null`
- コントロール（6種）:
  | 表示 | 実行 | アクティブ判定 |
  |---|---|---|
  | 見出し H2 | `chain().focus().toggleHeading({ level: 2 }).run()` | `isActive('heading', { level: 2 })` |
  | 見出し H3 | `chain().focus().toggleHeading({ level: 3 }).run()` | `isActive('heading', { level: 3 })` |
  | 太字 | `chain().focus().toggleBold().run()` | `isActive('bold')` |
  | 斜体 | `chain().focus().toggleItalic().run()` | `isActive('italic')` |
  | 箇条書き | `chain().focus().toggleBulletList().run()` | `isActive('bulletList')` |
  | 番号付き | `chain().focus().toggleOrderedList().run()` | `isActive('orderedList')` |
  | 引用 | `chain().focus().toggleBlockquote().run()` | `isActive('blockquote')` |
- ボタンは既存 `components/ui/button` を流用。アクティブ時はアクセント表示（`bg-accent` 等）
- 各ボタンに `onMouseDown={(e) => e.preventDefault()}`（タップ/クリックで選択が外れる iOS Safari 対策）
- アクティブ状態の再描画は `useEditorState` か `editor.on('selectionUpdate'/'transaction')` 購読でトリガ
- アイコンは `lucide-react`（導入済み）を使用

### 改修 `components/diary/DiaryEditor.tsx`

- 編集タブ（`<TabsContent value="edit">`）内の `<Textarea ... />` を `<RichTextEditor value={content} onChange={setContent} placeholder="今日はどんな1日でしたか？" />` に置換。
- それ以外（hidden input・タブ構造・保存/削除ボタン・フィードバック表示・`content.trim()` による保存ボタン活性制御）は**変更なし**。

## 依存とエディタ設定

### 追加パッケージ

`@tiptap/react` / `@tiptap/pm` / `@tiptap/starter-kit` / `@tiptap/markdown`

- 4つとも**同一バージョンに固定**する（peer が exact pin のため不一致は実行時エラー）。
- Dependabot 更新時は4つをまとめて上げる。この運用ルールを `AGENTS.md` の「積みあがった学び」に追記する。
- 表示側の `react-markdown` / `remark-gfm` は引き続き使う（入力 UI を追加するだけで置換しない）。

### StarterKit / エディタ設定

- `heading: { levels: [2, 3] }` に制限（H1・H4〜H6 の混入防止）。
- コードブロック等の余分なノードはツールバーに出さない。記法として打ち込まれても valid Markdown なので無害（`react-markdown` が描画し、AI もそのまま読む）。
- `immediatelyRender: false`（最頻出の SSR 罠を回避）。
- プレースホルダー（"今日はどんな1日でしたか？"）は **`@tiptap/extension-placeholder` を足さず**、`RichTextEditor` 側で `editor.isEmpty` を見て、空のときだけエディタ上に重ねる小さな絶対配置の `<span>`（`pointer-events-none text-muted-foreground`）を出す最小ロジックで実装する。`is-editor-empty` クラスは Placeholder 拡張が付与するものなので、拡張なし方針では使わない。

## スマホ／PC 両対応

- ツールバーは編集エリア上部に配置。**スマホでは `sticky`（上部固定）＋横スクロール**（モバイルキーボードを出しても装飾ボタンに届く）。
- ボタンの `onMouseDown` preventDefault で選択保持。
- タッチターゲットは最低 32〜36px。
- `.ProseMirror` に既存の `prose prose-neutral dark:prose-invert max-w-none` を適用し、編集中の見た目とプレビュー／保存後表示を一致させる。`focus:outline-none` と min-height（現 `rows={15}` 相当 ≒ `min-h-[15rem]`）を付与。
- Tiptap のテーマ CSS は導入せず、base-nova の oklch トークンと整合させる。`app/globals.css` の at-rule 順序ルール（`@import` を先・`@plugin` を後）を守る。

## プレビュータブの扱い

**残す**（ユーザー承認済み）。

- 編集タブが WYSIWYG になりプレビュータブはやや重複するが、`react-markdown` で描画された「保存後の実際の見た目」を確認できる価値がある。
- `DiaryMarkdown` を流用するだけなのでコストはほぼゼロ。

## 既知の挙動・エッジケース

- **記号の正規化**: 一度編集して保存すると、Markdown が Tiptap の正規形に揃う（例: `*` 箇条書き → `-`、`__bold__` → `**bold**`）。見た目・AI 分析は不変。開いただけ（未編集）なら `content === initialContent` のままなので再正規化は起きない。実害が小さいため**受容**する。
- **空入力**: 空エディタの `getMarkdown()` は空文字（または trim で空になる文字列）を返す。既存の「`content.trim().length === 0` なら保存ボタン無効」がそのまま機能する。
- **日本語 IME**: ProseMirror は IME 対応だが、実機で変換確定・改行・リスト継続の挙動を確認する。
- **`value` の外部変更**: 日付遷移でエディタに渡す初期 Markdown が変わる場合は `key={entryDate}` で再マウントする（毎 render の再生成や `replaceAll` の癖を避ける）。

## テスト方針（シンプルさ優先）

- 現状 vitest は **node 環境のみ**（DOM なし、`vitest.config.*` なし）。エディタの往復テストには DOM が要るため、**基本セットの Markdown 往復テスト1本**を、ファイル先頭 `// @vitest-environment jsdom` ＋ `jsdom` を devDependency 追加、という局所的な形で入れる（グローバル設定は変えない）。
  - 検証内容: 基本セット（H2/H3・太字・斜体・箇条書き・番号付き・引用）の Markdown を読み込み → `getMarkdown()` で取り出し、意味的に等価な Markdown が得られること。
  - 実装時に jsdom 上での Tiptap 初期化が不安定なら、手動／Playwright 検証にフォールバックする。
- 既存 `lib/validation/diary.test.ts`（文字数上限 50,000）は無改修で保存境界を守る。
- スマホ実機相当の挙動（日本語 IME・リスト継続・sticky ツールバー・タップ時の選択保持）は Playwright または手動で確認する。

## やらないこと（YAGNI）

- 保存形式の変更（HTML/JSON 化）はしない。Markdown 文字列のまま。
- GFM 拡張（テーブル・タスクリスト・取り消し線・リンク・コード）のツールバー化は今回スコープ外（基本セットのみ）。打ち込まれた記法は表示側で従来どおり描画される。
- 画像・添付・スラッシュコマンド・バブルメニュー等の高度なエディタ機能は入れない。
- DB スキーマ・マイグレーション・Server Action・AI 分析ロジックの変更はしない。
