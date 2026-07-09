// app/history/page.tsx

import { DiaryCalendar } from '@/components/diary/DiaryCalendar';
import { RecentEntries } from '@/components/diary/RecentEntries';
import { RecordStats } from '@/components/diary/RecordStats';
import {
  addDays,
  formatYearMonth,
  parseYearMonth,
  todayInTokyo,
} from '@/lib/calendar/month-grid';
import { listEntryDates, listRecentEntries } from '@/lib/db/queries/diary';
import { BOARD_CONTAINER } from '@/lib/design/containers';
import { computeLongestStreak, computeStreak } from '@/lib/diary/streak';

const RECENT_LIMIT = 5;

// 一覧に出す直近エントリ同士の間で、最初に欠けた日を1つ返す（さかのぼり導線）。
function findRecentGap(dates: readonly string[]): string | null {
  const span = Math.min(dates.length - 1, RECENT_LIMIT - 1);
  for (let i = 0; i < span; i++) {
    const expected = addDays(dates[i], -1);
    if (dates[i + 1] !== expected) return expected;
  }
  return null;
}

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

  const [dates, recent] = await Promise.all([
    listEntryDates(),
    listRecentEntries(RECENT_LIMIT),
  ]);
  const writtenDates = new Set(dates);
  const current = computeStreak(dates, today);
  const longest = computeLongestStreak(dates);
  const total = dates.length;

  return (
    <main className={BOARD_CONTAINER}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[19px] md:text-[21px]">これまで</h1>
        <RecordStats current={current} longest={longest} total={total} />
      </div>

      {/* 1fr は暗黙の minmax(auto,1fr) で「さいきんの日記」の nowrap 長文に
          引っ張られてはみ出しうるため、minmax(0,1fr) で確実に縮める（カンプ準拠） */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-3.5 md:mt-6 lg:grid-cols-[352px_minmax(0,1fr)] lg:gap-6">
        <DiaryCalendar
          year={year}
          month={month}
          today={today}
          writtenDates={writtenDates}
          currentYearMonth={formatYearMonth(currentYear, currentMonth)}
        />
        {total > 0 ? (
          <RecentEntries entries={recent} gapDate={findRecentGap(dates)} />
        ) : (
          <p className="text-sm text-muted-foreground">
            まだ日記がありません。「今日」から書いてみましょう。
          </p>
        )}
      </div>
    </main>
  );
}
