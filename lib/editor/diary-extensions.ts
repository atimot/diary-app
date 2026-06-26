import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
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
