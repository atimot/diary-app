import { describe, expect, it } from 'vitest';
import {
  charCountFromMarkdown,
  excerptFromMarkdown,
  plainTextFromMarkdown,
} from './excerpt';

describe('plainTextFromMarkdown', () => {
  it('見出し・強調・リスト・引用の記号を落とす', () => {
    const md = '## 今日\n\n- 朝から**雨**\n> *静かな*一日';
    expect(plainTextFromMarkdown(md)).toBe('今日 朝から雨 静かな一日');
  });

  it('リンクはテキストだけ残す', () => {
    expect(plainTextFromMarkdown('[本屋](https://example.com)へ行った')).toBe(
      '本屋へ行った',
    );
  });

  it('コードブロックは無視し、インラインコードは中身を残す', () => {
    expect(plainTextFromMarkdown('```\nignored\n```\n`code`だけ')).toBe(
      'codeだけ',
    );
  });
});

describe('excerptFromMarkdown', () => {
  it('max を超えたら省略記号を付ける', () => {
    expect(excerptFromMarkdown('あいうえおかきくけこ', 5)).toBe('あいうえお…');
  });

  it('max 以内はそのまま', () => {
    expect(excerptFromMarkdown('短い日記', 10)).toBe('短い日記');
  });
});

describe('charCountFromMarkdown', () => {
  it('空白・改行・Markdown 記号を数えない', () => {
    // 「今日朝から雨。」の7文字
    expect(charCountFromMarkdown('## 今日\n\n朝から **雨**。')).toBe(7);
  });

  it('空文字は 0', () => {
    expect(charCountFromMarkdown('')).toBe(0);
  });
});
