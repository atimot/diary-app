'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveDiaryEntry } from '@/lib/actions/diary';

interface DiaryEditorProps {
  entryDate: string;
  initialContent?: string;
}

export function DiaryEditor({ entryDate, initialContent = '' }: DiaryEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  return (
    <form action={handleAction} className="space-y-4">
      <input type="hidden" name="entryDate" value={entryDate} />
      <Textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={15}
        placeholder="今日はどんな1日でしたか？"
        className="w-full"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || content.trim().length === 0}>
          {isPending ? '保存中…' : '保存'}
        </Button>
        {feedback && (
          <span
            className={
              feedback.kind === 'success'
                ? 'text-sm text-green-600 dark:text-green-400'
                : 'text-sm text-destructive'
            }
          >
            {feedback.message}
          </span>
        )}
      </div>
    </form>
  );
}
