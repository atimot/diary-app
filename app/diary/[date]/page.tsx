import { notFound } from 'next/navigation';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
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
  const entry = await getDiaryEntry(date);
  if (!entry) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date}</h1>
      <DiaryEditor entryDate={date} initialContent={entry.content} />
    </main>
  );
}
