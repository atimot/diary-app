// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry } from '@/lib/db/queries/diary';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const { date } = await params;
  if (!DATE_PATTERN.test(date)) {
    notFound();
  }

  const today = todayInTokyo();
  if (date > today) {
    notFound(); // 未来日付は 404
  }

  const entry = await getDiaryEntry(date);

  return (
    <main className="mx-auto w-full max-w-[680px] flex-1 px-6 pt-11 pb-20">
      <DiaryDateHeader date={date} />
      <DiaryEditor entryDate={date} initialContent={entry?.content ?? ''} />
    </main>
  );
}
