// app/history/page.tsx

import { DiaryCalendar } from '@/components/diary/DiaryCalendar';
import { RecordStats } from '@/components/diary/RecordStats';
import {
  formatYearMonth,
  parseYearMonth,
  todayInTokyo,
} from '@/lib/calendar/month-grid';
import { listEntryDates } from '@/lib/db/queries/diary';
import { computeLongestStreak, computeStreak } from '@/lib/diary/streak';

interface PageProps {
  searchParams: Promise<{ ym?: string }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const { ym } = await searchParams;
  const today = todayInTokyo();
  const [yearStr, monthStr] = today.split('-');
  const currentYear = Number(yearStr);
  const currentMonth = Number(monthStr);

  // Parse ?ym=YYYY-MM, fall back to current month if missing/invalid
  const requested = ym ? parseYearMonth(ym) : null;
  const year = requested?.year ?? currentYear;
  const month = requested?.month ?? currentMonth;

  const dates = await listEntryDates();
  const writtenDates = new Set(dates);
  const current = computeStreak(dates, today);
  const longest = computeLongestStreak(dates);
  const total = dates.length;

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">日記の履歴</h1>
      {/* カレンダーは本文幅（max-w-3xl）いっぱいに広げ、見出し・ヘッダーと左端を揃える。 */}
      <div>
        <RecordStats current={current} longest={longest} total={total} />
        <DiaryCalendar
          year={year}
          month={month}
          today={today}
          writtenDates={writtenDates}
          currentYearMonth={formatYearMonth(currentYear, currentMonth)}
        />
        {dates.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            まだ日記がありません。トップから書いてみましょう。
          </p>
        )}
      </div>
    </main>
  );
}
