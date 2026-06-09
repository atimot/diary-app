// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry } from '@/lib/db/queries/diary';
import { todayInTokyo } from '@/lib/calendar/month-grid';

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
  const initialContent = entry?.content ?? '';
  const defaultTab = entry ? 'preview' : 'edit';

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date}</h1>
      <DiaryEditor
        entryDate={date}
        initialContent={initialContent}
        defaultTab={defaultTab}
      />
    </main>
  );
}
