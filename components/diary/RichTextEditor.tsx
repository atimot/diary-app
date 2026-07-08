'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import type { ReactNode } from 'react';
import { EditorToolbar } from '@/components/diary/EditorToolbar';
import { createDiaryEditorExtensions } from '@/lib/editor/diary-extensions';

interface RichTextEditorProps {
  value: string;
  // textLength は空白を除いた本文文字数（字数表示用）
  onChange: (markdown: string, textLength: number) => void;
  placeholder?: string;
  // カード下部フッターの右側（字数・保存ボタン等）を親から差し込む
  footerEnd?: ReactNode;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  footerEnd,
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
          'prose prose-neutral dark:prose-invert max-w-none min-h-[16rem] text-[15px] outline-none',
      },
      // ⌘⏎ / Ctrl+Enter で保存（囲んでいる form を submit する）
      handleKeyDown: (view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          (view.dom as HTMLElement).closest('form')?.requestSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(
        editor.getMarkdown(),
        editor.getText().replace(/\s/g, '').length,
      );
    },
  });

  return (
    <div className="rounded-xl border bg-card px-4 pt-[18px] pb-2 shadow-card sm:px-8 sm:pt-7 sm:pb-3">
      <EditorContent editor={editor} />
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t pt-1.5 sm:mt-5 sm:pt-2">
        <EditorToolbar editor={editor} />
        {footerEnd}
      </div>
    </div>
  );
}
