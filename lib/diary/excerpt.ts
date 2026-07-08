// 保存形式（Markdown）から表示用のプレーンテキストを得るユーティリティ。
// 「さいきんの日記」の抜粋1行と、字数表示（空白・改行を除く文字数）に使う。

export function plainTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptFromMarkdown(markdown: string, max = 60): string {
  const text = plainTextFromMarkdown(markdown);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// エディタの字数表示と同じ基準（空白を数えない）。
export function charCountFromMarkdown(markdown: string): number {
  return plainTextFromMarkdown(markdown).replace(/\s/g, '').length;
}
