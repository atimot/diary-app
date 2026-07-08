// components/diary/DiaryCalendar.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CalendarDayLink } from '@/components/diary/CalendarDayLink';
import {
  buildMonthGrid,
  type CalendarCell,
  formatYearMonth,
  nextMonth,
  prevMonth,
} from '@/lib/calendar/month-grid';

interface DiaryCalendarProps {
  year: number;
  month: number; // 1..12
  today: string; // YYYY-MM-DD in Asia/Tokyo
  writtenDates: Set<string>; // YYYY-MM-DD set of dates that have diary entries
  currentYearMonth: string; // YYYY-MM of "today" — for the "今月へ" button
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// 「今日」印はアンバーのリング。カード面からリングを浮かせる offset 付き。
const TODAY_RING = 'ring-2 ring-streak ring-offset-2 ring-offset-card';

// SP はセル高 44px（タップ目標）＋丸 34px、sm 以上は 36px＋30px。
const CELL = 'grid h-11 place-items-center sm:h-9';
const CIRCLE =
  'place-self-center grid size-[34px] place-items-center rounded-full text-[12.5px] tabular-nums transition sm:size-[30px] sm:text-xs';

function DayCell({ cell, written }: { cell: CalendarCell; written: boolean }) {
  // 当月外・未来は非インタラクティブの淡い数字
  if (!cell.inMonth) {
    return (
      <div
        className={`${CELL} text-[12.5px] text-muted-foreground/30 sm:text-xs`}
        aria-hidden="true"
      >
        {cell.day}
      </div>
    );
  }
  if (cell.isFuture) {
    return (
      <div
        className={`${CELL} text-[12.5px] text-muted-foreground/50 sm:text-xs`}
      >
        {cell.day}
      </div>
    );
  }

  if (written) {
    return (
      <CalendarDayLink
        href={`/diary/${cell.iso}`}
        className={`${CIRCLE} bg-primary font-semibold text-primary-foreground hover:bg-primary/85 ${
          cell.isToday ? `font-bold ${TODAY_RING}` : ''
        }`}
        aria-current={cell.isToday ? 'date' : undefined}
        aria-label={`${cell.iso} の日記を見る`}
      >
        {cell.day}
      </CalendarDayLink>
    );
  }

  if (cell.isToday) {
    return (
      <Link
        href="/"
        className={`${CIRCLE} text-foreground hover:bg-accent ${TODAY_RING}`}
        aria-current="date"
        aria-label="今日の日記を書く"
      >
        {cell.day}
      </Link>
    );
  }

  // 未記入の過去日 — さかのぼって書ける
  return (
    <CalendarDayLink
      href={`/diary/${cell.iso}`}
      className={`${CIRCLE} text-muted-foreground hover:bg-accent`}
      aria-label={`${cell.iso} に日記を書く`}
    >
      {cell.day}
    </CalendarDayLink>
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
    <div className="rounded-xl border bg-card p-3 pt-3.5 pb-2.5 shadow-card sm:p-[18px] sm:pb-3.5">
      <div className="flex items-center justify-between px-1">
        <Link
          href={prevHref}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground sm:size-[26px]"
          aria-label={`前月（${prev.year}年${prev.month}月）へ`}
        >
          <ChevronLeft className="size-3.5" />
        </Link>
        <span className="text-[13px] font-semibold tabular-nums">
          {year}年{month}月
        </span>
        <Link
          href={nextHref}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground sm:size-[26px]"
          aria-label={`翌月（${next.year}年${next.month}月）へ`}
        >
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {!isShowingCurrent && (
        <div className="mt-2 flex justify-center">
          <Link
            href={`/history?ym=${currentYearMonth}`}
            className="rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            今月へ
          </Link>
        </div>
      )}

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted-foreground sm:mt-3">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={label} className={i === 0 ? 'py-1 text-streak' : 'py-1'}>
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1">
        {grid.weeks.flat().map((cell) => (
          <DayCell
            key={cell.iso}
            cell={cell}
            written={writtenDates.has(cell.iso)}
          />
        ))}
      </div>

      {/* 凡例は SP では省略（カンプ 5b 準拠） */}
      <div className="mt-2.5 hidden flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t px-1 pt-2.5 text-[11px] text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-[9px] rounded-full bg-primary" />
          書いた日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-[9px] rounded-full bg-primary ring-1 ring-streak ring-offset-1 ring-offset-card" />
          今日
        </span>
      </div>
    </div>
  );
}
