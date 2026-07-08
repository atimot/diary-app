'use client';

import { type Editor, useEditorState } from '@tiptap/react';
import { Bold, Italic, List, Quote } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';

interface EditorToolbarProps {
  editor: Editor | null;
}

// エディタカード下部の最小ツールバー（太字・斜体・箇条書き・引用）。
// 見出しや番号付きリストは Markdown ショートカット（## / 1. + Space）で入る。
export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isBullet: editor.isActive('bulletList'),
        isQuote: editor.isActive('blockquote'),
      };
    },
  });

  if (!editor) return null;

  // タップ時にエディタの選択が外れないようにする（iOS Safari の定番対策）
  const keepSelection = (event: MouseEvent<HTMLButtonElement>) =>
    event.preventDefault();

  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        size="icon-sm"
        variant={state?.isBold ? 'secondary' : 'ghost'}
        aria-pressed={state?.isBold ?? false}
        aria-label="太字"
        className="text-muted-foreground hover:text-foreground"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state?.isItalic ? 'secondary' : 'ghost'}
        aria-pressed={state?.isItalic ?? false}
        aria-label="斜体"
        className="text-muted-foreground hover:text-foreground"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state?.isBullet ? 'secondary' : 'ghost'}
        aria-pressed={state?.isBullet ?? false}
        aria-label="箇条書き"
        className="text-muted-foreground hover:text-foreground"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={state?.isQuote ? 'secondary' : 'ghost'}
        aria-pressed={state?.isQuote ?? false}
        aria-label="引用"
        className="text-muted-foreground hover:text-foreground"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-3.5" />
      </Button>
    </div>
  );
}
