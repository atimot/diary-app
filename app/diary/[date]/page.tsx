// app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { WritingRail } from '@/components/diary/WritingRail';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { computeStreak } from '@/lib/diary/streak';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';

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

  const [entry, entryDates] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
  ]);
  const streak = computeStreak(entryDates, today);
  const initialContent = entry?.content ?? '';
  const defaultTab = entry ? 'preview' : 'edit';

  return (
    <DeskLayout
      rail={
        <WritingRail
          streak={streak}
          entryDates={entryDates}
          focusDate={date}
          today={today}
        />
      }
    >
      <DiaryDateHeader date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={initialContent}
        defaultTab={defaultTab}
      />
    </DeskLayout>
  );
}
