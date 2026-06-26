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

// 重量級の編集UIは初期バンドルから外す（クライアントJS削減）。どちらも
// `{activeTab === … && …}` でタブ選択時のみ描画＝そのタブを開くまで chunk を読まない。
//
// RichTextEditor=Tiptap/ProseMirror(+marked) は browser API 依存（immediatelyRender:false）
// のため **ssr:false 必須**。編集タブを開くまでロードしない。
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

// DiaryMarkdown=react-markdown は SSR 安全なので **ssr は既定(true)のまま**にする。
// プレビュー本文は閲覧の主動線なので SSR して初期HTMLに乗せる（ssr:false にすると
// 本文がクライアント描画のみになり、スケルトンのちらつき／背景タブで空表示になる）。
// それでも編集タブ既定（新規エントリ）ではプレビューが描画されず chunk は読まれない。
const DiaryMarkdown = dynamic(
  () => import('@/components/diary/DiaryMarkdown').then((m) => m.DiaryMarkdown),
  {
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
