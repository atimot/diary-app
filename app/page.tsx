// app/page.tsx
import { DeskLayout } from '@/components/diary/DeskLayout';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { WritingRail } from '@/components/diary/WritingRail';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';
import { computeStreak } from '@/lib/diary/streak';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, entryDates, prompt] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
    getTodayPrompt(date),
  ]);
  const streak = computeStreak(entryDates, date);
  const defaultTab = existing ? 'preview' : 'edit';

  return (
    <DeskLayout
      rail={
        <WritingRail
          streak={streak}
          entryDates={entryDates}
          focusDate={date}
          today={date}
        />
      }
    >
      <DiaryDateHeader date={date} />
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </DeskLayout>
  );
}
