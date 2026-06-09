import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DiaryMarkdownProps {
  content: string;
}

export function DiaryMarkdown({ content }: DiaryMarkdownProps) {
  if (content.trim().length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        プレビューする内容がありません。
      </p>
    );
  }

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
