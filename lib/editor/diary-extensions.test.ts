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
    const { json, remarkdown } = parse('### 見出し3');
    expect(json.content?.[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 3 },
    });
    expect(remarkdown).toContain('### 見出し3');
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
