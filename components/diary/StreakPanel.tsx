// components/diary/StreakPanel.tsx
import { Flame } from 'lucide-react';
import { buildMonthGrid } from '@/lib/calendar/month-grid';

const WAFU_MONTH = [
  '睦月',
  '如月',
  '弥生',
  '卯月',
  '皐月',
  '水無月',
  '文月',
  '葉月',
  '長月',
  '神無月',
  '霜月',
  '師走',
];

interface StreakPanelProps {
  streak: number;
  entryDates: readonly string[];
  focusDate: string; // YYYY-MM-DD（書いている日）
  today: string; // YYYY-MM-DD（Asia/Tokyo）
}

export function StreakPanel({
  streak,
  entryDates,
  focusDate,
  today,
}: StreakPanelProps) {
  const [yearStr, monthStr] = focusDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const grid = buildMonthGrid(year, month, today);
  const cells = grid.weeks.flat();
  const written = new Set(entryDates);
  const inMonth = cells.filter((c) => c.inMonth);
  const writtenCount = inMonth.filter((c) => written.has(c.iso)).length;

  return (
    <section aria-label="続ける記録">
      <p className="font-heading text-sm text-muted-foreground">続ける喜び</p>

      {streak > 0 ? (
        <div className="mt-2 flex items-baseline gap-1.5">
          <Flame className="size-5 text-primary" aria-hidden="true" />
          <span className="font-heading text-3xl leading-none tabular-nums text-primary">
            {streak}
          </span>
          <span className="text-sm text-muted-foreground">日連続</span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-foreground">今日から、はじめよう。</p>
      )}

      <p className="mt-4 text-xs tabular-nums text-muted-foreground">
        {WAFU_MONTH[month - 1]} ・ {writtenCount} / {inMonth.length} 日
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1" aria-hidden="true">
        {cells.map((cell, i) => {
          const isSunday = i % 7 === 0;
          const isWritten = cell.inMonth && written.has(cell.iso);
          let cls: string;
          if (!cell.inMonth) {
            cls = 'opacity-0';
          } else if (isWritten) {
            cls = `${isSunday ? 'bg-season' : 'bg-primary'}${
              cell.isToday ? ' ring-2 ring-foreground/40' : ''
            }`;
          } else if (cell.isToday) {
            cls = 'ring-2 ring-primary';
          } else {
            cls = 'border border-muted-foreground/40';
          }
          return (
            <span
              key={cell.iso}
              className={`aspect-square rounded-full ${cls}`}
            />
          );
        })}
      </div>
    </section>
  );
}
