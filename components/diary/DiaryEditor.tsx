// components/diary/DiaryEditor.tsx
'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteDiaryEntry, saveDiaryEntry } from '@/lib/actions/diary';

// 重量級の編集UIは初期バンドルから外す（クライアントJS削減）。
// RichTextEditor=Tiptap/ProseMirror(+marked) は「編集」タブを開くまで、
// DiaryMarkdown=react-markdown は「プレビュー」タブを開くまでDLしない。
// DiaryEditor 自体が 'use client' なので ssr:false が使える。
const RichTextEditor = dynamic(
  () =>
    import('@/components/diary/RichTextEditor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[15rem] animate-pulse rounded-lg border border-input" />
    ),
  },
);

const DiaryMarkdown = dynamic(
  () => import('@/components/diary/DiaryMarkdown').then((m) => m.DiaryMarkdown),
  {
    ssr: false,
    loading: () => <div className="min-h-[15rem] animate-pulse" />,
  },
);

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
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(defaultTab);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleAction = (formData: FormData) => {
    startSaveTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
        setActiveTab('preview');
      } else {
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteDiaryEntry(entryDate);
      if (result.ok) {
        router.push('/');
      } else {
        setConfirmOpen(false);
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="edit">編集</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          {/* 編集タブを開いたときだけ Tiptap をマウント＝チャンクを初DL */}
          {activeTab === 'edit' && (
            <RichTextEditor
              key={entryDate}
              value={content}
              onChange={setContent}
              placeholder="今日はどんな1日でしたか？"
            />
          )}
        </TabsContent>

        <TabsContent value="preview">
          <div className="min-h-[15rem] rounded-md border p-4">
            {activeTab === 'preview' && <DiaryMarkdown content={content} />}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending || content.trim().length === 0}
        >
          {isSavePending ? '保存中…' : '保存'}
        </Button>
        {canDelete && (
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => {
              if (isDeletePending) return;
              setConfirmOpen(open);
            }}
          >
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                >
                  削除
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>この日記を削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  削除すると元に戻すことはできません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletePending}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeletePending}
                >
                  {isDeletePending ? '削除中…' : '削除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
