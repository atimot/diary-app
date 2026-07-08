// app/page.tsx
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { StreakPill } from '@/components/diary/StreakPill';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';
import { formatDiaryDate } from '@/lib/diary/format-date';
import { currentHourInTokyo, greetingForHour } from '@/lib/diary/greeting';
import { computeStreak } from '@/lib/diary/streak';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, prompt, dates] = await Promise.all([
    getDiaryEntry(date),
    getTodayPrompt(date),
    listEntryDates(),
  ]);
  const streak = computeStreak(dates, date);
  const { monthDay, weekday } = formatDiaryDate(date);
  const greeting = greetingForHour(currentHourInTokyo());

  return (
    <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pt-6 pb-11 md:px-6 md:pt-11 md:pb-20">
      <p className="text-xs text-muted-foreground">{greeting}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2.5 md:mt-2">
        <h1 className="text-xl leading-snug md:text-[22px]">
          {monthDay}{' '}
          <span className="font-normal text-muted-foreground">{weekday}</span>
        </h1>
        <StreakPill streak={streak} />
      </div>
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor entryDate={date} initialContent={existing?.content ?? ''} />
    </main>
  );
}
