'use client';

import { type Editor, useEditorState } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react';
import type { MouseEvent } from 'react';
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

  if (!editor) return null;

  // タップ時にエディタの選択が外れないようにする（iOS Safari の定番対策）
  const keepSelection = (event: MouseEvent<HTMLButtonElement>) =>
    event.preventDefault();

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b bg-background/90 px-2 py-1.5 backdrop-blur">
      <Button
        type="button"
        size="default"
        variant={state?.isH2 ? 'secondary' : 'ghost'}
        aria-pressed={state?.isH2 ?? false}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button
        type="button"
        size="default"
        variant={state?.isH3 ? 'secondary' : 'ghost'}
        aria-pressed={state?.isH3 ?? false}
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </Button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        size="icon"
        variant={state?.isBold ? 'secondary' : 'ghost'}
        aria-pressed={state?.isBold ?? false}
        aria-label="太字"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={state?.isItalic ? 'secondary' : 'ghost'}
        aria-pressed={state?.isItalic ?? false}
        aria-label="斜体"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </Button>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        size="icon"
        variant={state?.isBullet ? 'secondary' : 'ghost'}
        aria-pressed={state?.isBullet ?? false}
        aria-label="箇条書き"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={state?.isOrdered ? 'secondary' : 'ghost'}
        aria-pressed={state?.isOrdered ?? false}
        aria-label="番号付きリスト"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={state?.isQuote ? 'secondary' : 'ghost'}
        aria-pressed={state?.isQuote ?? false}
        aria-label="引用"
        onMouseDown={keepSelection}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </Button>
    </div>
  );
}
