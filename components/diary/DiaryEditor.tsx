// components/diary/DiaryEditor.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { deleteDiaryEntry, saveDiaryEntry } from '@/lib/actions/diary';
import { DiaryMarkdown } from '@/components/diary/DiaryMarkdown';

interface DiaryEditorProps {
  entryDate: string;
  initialContent?: string;
  defaultTab?: 'edit' | 'preview';
}

export function DiaryEditor({
  entryDate,
  initialContent = '',
  defaultTab = 'edit',
}: DiaryEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  const handleAction = (formData: FormData) => {
    startSaveTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm('この日記を削除しますか？')) return;
    startDeleteTransition(async () => {
      const result = await deleteDiaryEntry(entryDate);
      if (result.ok) {
        router.push('/');
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  const canDelete = initialContent.trim().length > 0;
  const isPending = isSavePending || isDeletePending;

  return (
    <form action={handleAction} className="space-y-4">
      {/* form データは hidden input から確実に渡す。タブ切替で textarea が unmount される可能性に備える */}
      <input type="hidden" name="entryDate" value={entryDate} />
      <input type="hidden" name="content" value={content} />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="edit">編集</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            placeholder="今日はどんな1日でしたか？"
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="preview">
          <div className="min-h-[15rem] rounded-md border p-4">
            <DiaryMarkdown content={content} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || content.trim().length === 0}>
          {isSavePending ? '保存中…' : '保存'}
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isDeletePending ? '削除中…' : '削除'}
          </Button>
        )}
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
