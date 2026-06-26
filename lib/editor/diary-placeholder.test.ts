// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createDiaryEditorExtensions } from './diary-extensions';

const PLACEHOLDER = 'プレースホルダー';

let editor: Editor | null = null;

// Placeholder 拡張のデコレーションは実 DOM へ描画されるため element 付きで mount する。
function mount() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: createDiaryEditorExtensions(PLACEHOLDER),
    content: '',
    contentType: 'markdown',
  });
  return { editor, dom: editor.view.dom as HTMLElement };
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = '';
});

describe('日記エディタのプレースホルダー', () => {
  it('空の段落にプレースホルダーが付く', () => {
    const { dom } = mount();
    const node = dom.querySelector('[data-placeholder]');
    expect(node?.tagName).toBe('P');
    expect(node?.getAttribute('data-placeholder')).toBe(PLACEHOLDER);
    expect(node?.classList.contains('is-editor-empty')).toBe(true);
  });

  // バグ1: 見出しを選ぶとプレースホルダーが見出し要素自体に乗るので、
  // ::before が見出しのフォントサイズを継承しカーソルと一致する。
  it('空の見出し(H2)ではプレースホルダーが見出し要素に乗る', () => {
    const { editor, dom } = mount();
    editor.chain().focus().toggleHeading({ level: 2 }).run();
    const node = dom.querySelector('h2[data-placeholder]');
    expect(node).not.toBeNull();
    expect(node?.getAttribute('data-placeholder')).toBe(PLACEHOLDER);
    expect(node?.classList.contains('is-editor-empty')).toBe(true);
  });

  it('空の見出し(H3)ではプレースホルダーが見出し要素に乗る', () => {
    const { editor, dom } = mount();
    editor.chain().focus().toggleHeading({ level: 3 }).run();
    expect(dom.querySelector('h3[data-placeholder]')).not.toBeNull();
  });

  // バグ2: リストを選んだときはトップレベルが textblock でないため
  // プレースホルダーが一切付与されず、リストと重ならない。
  it('箇条書きではプレースホルダーが付かない', () => {
    const { editor, dom } = mount();
    editor.chain().focus().toggleBulletList().run();
    expect(dom.querySelector('[data-placeholder]')).toBeNull();
    expect(dom.querySelector('.is-editor-empty')).toBeNull();
  });

  it('番号付きリストではプレースホルダーが付かない', () => {
    const { editor, dom } = mount();
    editor.chain().focus().toggleOrderedList().run();
    expect(dom.querySelector('[data-placeholder]')).toBeNull();
    expect(dom.querySelector('.is-editor-empty')).toBeNull();
  });

  // 退行防止: 空の日記で Enter を押すと2段落(どちらも空)になりカーソルが2行目へ移る。
  // この状態でも editor.isEmpty は true のままで、is-editor-empty はカーソルのある
  // 2行目に付く。CSS セレクタに :first-child を付けると先頭でなくなり消えてしまうため、
  // :first-child を使わない前提(装飾ノードは showOnlyCurrent:true で常に高々1個)を固定する。
  it('空の状態でEnter後もプレースホルダーが描画対象になる(:first-child非依存)', () => {
    const { editor, dom } = mount();
    editor.chain().focus().enter().run();
    expect(editor.isEmpty).toBe(true);
    // 装飾ノードは常に高々1個
    expect(dom.querySelectorAll('.is-editor-empty').length).toBe(1);
    // ただし先頭の子ではない(=:first-child では取れない)
    expect(dom.querySelector('.is-editor-empty:first-child')).toBeNull();
    // :first-child を外したセレクタなら確実にマッチする
    expect(
      dom.querySelector('.is-editor-empty[data-placeholder]'),
    ).not.toBeNull();
  });

  it('本文があるときはプレースホルダーが付かない', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    editor = new Editor({
      element,
      extensions: createDiaryEditorExtensions(PLACEHOLDER),
      content: '既存の日記本文',
      contentType: 'markdown',
    });
    expect(
      (editor.view.dom as HTMLElement).querySelector('.is-editor-empty'),
    ).toBeNull();
  });
});
