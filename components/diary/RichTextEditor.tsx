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
