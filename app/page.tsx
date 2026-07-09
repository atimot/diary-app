// app/page.tsx
import { Suspense } from 'react';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { StreakPill } from '@/components/diary/StreakPill';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry, listEntryDates } from '@/lib/db/queries/diary';
import { FOCUS_CONTAINER } from '@/lib/design/containers';
import { formatDiaryDate } from '@/lib/diary/format-date';
import { currentHourInTokyo, greetingForHour } from '@/lib/diary/greeting';
import { computeStreak } from '@/lib/diary/streak';

// Gemini の応答（日付キーの unstable_cache）を Suspense 境界内で await し、
// キャッシュミス時の数秒がページ全体の TTFB をブロックしないようにする。
async function TodayPromptSection({
  promptPromise,
  date,
}: {
  promptPromise: ReturnType<typeof getTodayPrompt>;
  date: string;
}) {
  const prompt = await promptPromise;
  return <TodayPrompt initialText={prompt.text} date={date} />;
}

// チップ行と同じ縦占有（mt＋border＋py＋1行）を確保するだけの控えめなプレースホルダ。
// キャッシュ命中時はほぼ見えないので skeleton アニメーションは付けない。
// 寸法クラスは components/diary/TodayPrompt.tsx のチップと揃えている（変更時は両方更新）。
function TodayPromptFallback() {
  return (
    <div aria-hidden="true" className="mt-3.5 flex flex-wrap md:mt-5">
      <div className="w-56 rounded-lg border border-transparent bg-muted px-3 py-2 text-xs md:px-3.5 md:text-[12.5px]">
        &nbsp;
      </div>
    </div>
  );
}

export default async function HomePage() {
  const date = todayInTokyo();
  // await しないことで Gemini 呼び出しを先にキックオフし、下の DB クエリと並走させる
  const promptPromise = getTodayPrompt(date);
  const [existing, dates] = await Promise.all([
    getDiaryEntry(date),
    listEntryDates(),
  ]);
  const streak = computeStreak(dates, date);
  const { monthDay, weekday } = formatDiaryDate(date);
  const greeting = greetingForHour(currentHourInTokyo());

  return (
    <main className={FOCUS_CONTAINER}>
      <p className="text-xs text-muted-foreground">{greeting}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2.5 md:mt-2">
        <h1 className="text-xl leading-snug md:text-[22px]">
          {monthDay}{' '}
          <span className="font-normal text-muted-foreground">{weekday}</span>
        </h1>
        <StreakPill streak={streak} />
      </div>
      <Suspense fallback={<TodayPromptFallback />}>
        <TodayPromptSection promptPromise={promptPromise} date={date} />
      </Suspense>
      <DiaryEditor entryDate={date} initialContent={existing?.content ?? ''} />
    </main>
  );
}
