// components/diary/DiaryCalendar.tsx
import Link from 'next/link';
import {
  buildMonthGrid,
  formatYearMonth,
  nextMonth,
  prevMonth,
  type CalendarCell,
} from '@/lib/calendar/month-grid';

interface DiaryCalendarProps {
  year: number;
  month: number; // 1..12
  today: string; // YYYY-MM-DD in Asia/Tokyo
  writtenDates: Set<string>; // YYYY-MM-DD set of dates that have diary entries
  currentYearMonth: string; // YYYY-MM of "today" — for the "今月" button
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function cellClasses(args: {
  cell: CalendarCell;
  written: boolean;
}): string {
  const { cell, written } = args;
  const base = 'aspect-square flex items-center justify-center rounded-md text-sm';

  if (!cell.inMonth) {
    return `${base} text-muted-foreground/30`;
  }
  if (cell.isFuture) {
    return `${base} text-muted-foreground/50`;
  }
  if (written) {
    const tone =
      'bg-primary text-primary-foreground font-medium hover:opacity-90 transition';
    return cell.isToday ? `${base} ${tone} ring-2 ring-foreground/40` : `${base} ${tone}`;
  }
  // Past day without an entry (now clickable for backdate)
  if (cell.isToday) {
    return `${base} ring-2 ring-primary text-foreground hover:bg-accent transition`;
  }
  return `${base} text-muted-foreground hover:bg-accent transition`;
}

function DayCell({ cell, written }: { cell: CalendarCell; written: boolean }) {
  const className = cellClasses({ cell, written });

  if (!cell.inMonth || cell.isFuture) {
    return (
      <div className={className} aria-hidden={!cell.inMonth}>
        {cell.day}
      </div>
    );
  }

  if (written) {
    return (
      <Link
        href={`/diary/${cell.iso}`}
        className={className}
        aria-current={cell.isToday ? 'date' : undefined}
        aria-label={`${cell.iso} の日記を見る`}
      >
        {cell.day}
      </Link>
    );
  }

  if (cell.isToday) {
    return (
      <Link
        href="/"
        className={className}
        aria-current="date"
        aria-label="今日の日記を書く"
      >
        {cell.day}
      </Link>
    );
  }

  // Past day without an entry — clickable to backdate
  return (
    <Link
      href={`/diary/${cell.iso}`}
      className={className}
      aria-label={`${cell.iso} に日記を書く`}
    >
      {cell.day}
    </Link>
  );
}

export function DiaryCalendar({
  year,
  month,
  today,
  writtenDates,
  currentYearMonth,
}: DiaryCalendarProps) {
  const grid = buildMonthGrid(year, month, today);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const prevHref = `/history?ym=${formatYearMonth(prev.year, prev.month)}`;
  const nextHref = `/history?ym=${formatYearMonth(next.year, next.month)}`;
  const shownYearMonth = formatYearMonth(year, month);
  const isShowingCurrent = shownYearMonth === currentYearMonth;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={prevHref}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="前月"
        >
          ← {prev.year}年{prev.month}月
        </Link>
        <h2 className="text-lg font-semibold">
          {year}年{month}月
        </h2>
        <Link
          href={nextHref}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="翌月"
        >
          {next.year}年{next.month}月 →
        </Link>
      </div>

      {!isShowingCurrent && (
        <div className="flex justify-center">
          <Link
            href={`/history?ym=${currentYearMonth}`}
            className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            今月へ
          </Link>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.weeks.flat().map((cell) => (
          <DayCell key={cell.iso} cell={cell} written={writtenDates.has(cell.iso)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
          書いた日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-muted-foreground/40" />
          書かなかった日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-primary" />
          今日
        </span>
      </div>
    </div>
  );
}
