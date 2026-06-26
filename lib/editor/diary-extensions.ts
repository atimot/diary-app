import type { Extensions } from '@tiptap/core';

import { Placeholder } from '@tiptap/extensions/placeholder';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

// 日記エディタで使う Tiptap 拡張。見出しは H2/H3 のみに制限し、
// Markdown 拡張で Markdown 文字列の読み込み・書き出しを有効化する。
// React に依存しないので、エディタ本体とテストの双方から共有する。
export function createDiaryEditorExtensions(placeholder = ''): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Markdown,
    // 公式 Placeholder。空ブロックへ is-editor-empty / data-placeholder を付与し、
    // 表示は app/globals.css の ::before に委ねる。現在ブロック(段落/見出し)に付くので
    // カーソルとフォントサイズが揃い、リストはトップレベルが textblock でないため付かない。
    Placeholder.configure({ placeholder }),
  ];
}
