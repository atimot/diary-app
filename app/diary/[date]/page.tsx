// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { isRealDate, todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry } from '@/lib/db/queries/diary';
import { FOCUS_CONTAINER } from '@/lib/design/containers';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const { date } = await params;

  // isRealDate は parse→format の往復一致判定なので、形式不正（'foo' 等）も
  // 実在しない暦日（2025-02-30 等）もこれ一発で弾ける（Postgres に渡す前に 404）
  if (!isRealDate(date)) {
    notFound();
  }

  const today = todayInTokyo();
  if (date > today) {
    notFound(); // 未来日付は 404
  }

  const entry = await getDiaryEntry(date);

  return (
    <main className={FOCUS_CONTAINER}>
      <DiaryDateHeader date={date} />
      <DiaryEditor entryDate={date} initialContent={entry?.content ?? ''} />
    </main>
  );
}
