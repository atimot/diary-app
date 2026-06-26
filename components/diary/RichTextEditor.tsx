'use client';

import { EditorContent, useEditor } from '@tiptap/react';
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
    // プレースホルダーは公式 Placeholder 拡張（diary-extensions に集約）で描画する。
    // 現在ブロック(段落/見出し)に ::before として入るのでカーソルとサイズが一致し、
    // リストではトップレベルが textblock でないため表示されず重なりも起きない。
    extensions: createDiaryEditorExtensions(placeholder ?? ''),
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

  return (
    <div className="rounded-xl border bg-transparent">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
