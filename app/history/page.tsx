// app/history/page.tsx
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { DiaryCalendar } from '@/components/diary/DiaryCalendar';
import {
  formatYearMonth,
  parseYearMonth,
  todayInTokyo,
} from '@/lib/calendar/month-grid';

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

  const entries = await listDiaryEntries();
  const writtenDates = new Set(entries.map((e) => e.entryDate));

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">日記の履歴</h1>
      <DiaryCalendar
        year={year}
        month={month}
        today={today}
        writtenDates={writtenDates}
        currentYearMonth={formatYearMonth(currentYear, currentMonth)}
      />
      {entries.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          まだ日記がありません。トップから書いてみましょう。
        </p>
      )}
    </main>
  );
}
