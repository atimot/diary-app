// components/diary/DiaryEditor.tsx
'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SunDot } from '@/components/icons/SunDot';
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
import { deleteDiaryEntry, saveDiaryEntry } from '@/lib/actions/diary';
import { charCountFromMarkdown } from '@/lib/diary/excerpt';

// Tiptap/ProseMirror(+marked) は browser API 依存（immediatelyRender:false）のため
// **ssr:false 必須**。ひとひ刷新でタブを廃し WYSIWYG 一本になったので、
// エディタは常時マウント（chunk は初期表示で読む。書く画面が主役のため許容）。
const RichTextEditor = dynamic(
  () =>
    import('@/components/diary/RichTextEditor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[22rem] animate-pulse rounded-xl border bg-card shadow-card" />
    ),
  },
);

interface DiaryEditorProps {
  entryDate: string;
  initialContent?: string;
}

export function DiaryEditor({
  entryDate,
  initialContent = '',
}: DiaryEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [charCount, setCharCount] = useState(() =>
    charCountFromMarkdown(initialContent),
  );
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);

  const handleAction = (formData: FormData) => {
    startSaveTransition(async () => {
      const result = await saveDiaryEntry(formData);
      if (result.ok) {
        setFeedback({ kind: 'success', message: '保存しました' });
        setCelebration(result.streak);
        // 数秒で自然に収める
        setTimeout(() => setCelebration(null), 3200);
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

  const handleChange = (markdown: string, textLength: number) => {
    setContent(markdown);
    setCharCount(textLength);
  };

  const canDelete = initialContent.trim().length > 0;
  const isPending = isSavePending || isDeletePending;

  return (
    <form action={handleAction} className="mt-5">
      {/* form データは hidden input から確実に渡す（エディタは非制御の WYSIWYG） */}
      <input type="hidden" name="entryDate" value={entryDate} />
      <input type="hidden" name="content" value={content} />

      <RichTextEditor
        key={entryDate}
        value={content}
        onChange={handleChange}
        placeholder="今日はどんな1日でしたか？"
        footerEnd={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {charCount}字
            </span>
            <span className="hidden rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
              ⌘⏎で保存
            </span>
            <Button
              type="submit"
              className="px-5 font-semibold"
              disabled={isPending || content.trim().length === 0}
            >
              {isSavePending ? '保存中…' : '保存する'}
            </Button>
          </div>
        }
      />

      <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={
                feedback.kind === 'success'
                  ? 'text-sm text-muted-foreground'
                  : 'text-sm text-destructive'
              }
            >
              {feedback.message}
            </span>
          )}
          {celebration !== null && celebration > 0 && (
            <span
              className="inline-flex animate-in fade-in items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1 motion-reduce:animate-none"
              role="status"
            >
              <SunDot className="size-3 text-streak" />
              <span className="text-[11.5px] font-semibold text-streak">
                今日で{celebration}日つづき。よく続いています。
              </span>
            </span>
          )}
        </div>
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
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                >
                  この日の日記を削除
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
      </div>
    </form>
  );
}
