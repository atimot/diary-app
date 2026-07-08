import { CalendarDayLink } from '@/components/diary/CalendarDayLink';
import {
  charCountFromMarkdown,
  excerptFromMarkdown,
} from '@/lib/diary/excerpt';
import { formatDiaryDate } from '@/lib/diary/format-date';

interface RecentEntriesProps {
  entries: { entryDate: string; content: string }[]; // entryDate 降順
  gapDate: string | null; // 一覧範囲内で直近の「書かなかった日」（なければ null）
}

// 「さいきんの日記」カード。日付＋抜粋1行＋字数。日曜はテラコッタ（--season）。
// 空白日はさかのぼり導線として日付順の位置に1行だけ挟む。
export function RecentEntries({ entries, gapDate }: RecentEntriesProps) {
  const rows: (
    | { kind: 'entry'; entryDate: string; content: string }
    | { kind: 'gap'; date: string }
  )[] = entries.map((e) => ({ kind: 'entry', ...e }));

  if (gapDate) {
    const at = rows.findIndex(
      (r) => r.kind === 'entry' && r.entryDate < gapDate,
    );
    const gapRow = { kind: 'gap', date: gapDate } as const;
    if (at === -1) rows.push(gapRow);
    else rows.splice(at, 0, gapRow);
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-1.5 shadow-card sm:px-6">
      <div className="flex items-baseline justify-between border-b py-3.5">
        <span className="text-[12.5px] font-semibold text-foreground/80">
          さいきんの日記
        </span>
      </div>
      {rows.map((row) => {
        if (row.kind === 'gap') {
          const gap = formatDiaryDate(row.date);
          return (
            <CalendarDayLink
              key={`gap-${row.date}`}
              href={`/diary/${row.date}`}
              className="flex items-center justify-center gap-2 border-b py-3.5 text-xs text-muted-foreground transition last:border-b-0 hover:text-primary"
            >
              {gap.monthDay}は空白です — さかのぼって書く
            </CalendarDayLink>
          );
        }

        const { monthDay, weekday, isSunday } = formatDiaryDate(row.entryDate);
        const [, m, d] = row.entryDate.split('-').map(Number);
        return (
          <CalendarDayLink
            key={row.entryDate}
            href={`/diary/${row.entryDate}`}
            aria-label={`${monthDay}の日記を見る`}
            className="flex items-center gap-4 border-b px-0.5 py-3.5 transition last:border-b-0 hover:bg-accent sm:gap-[18px]"
          >
            <span className="flex w-14 shrink-0 flex-col">
              <span
                className={`text-[13.5px] font-semibold tabular-nums ${
                  isSunday ? 'text-season' : 'text-foreground'
                }`}
              >
                {m}/{d}
              </span>
              <span
                className={`text-[11px] ${
                  isSunday ? 'text-season' : 'text-muted-foreground'
                }`}
              >
                {weekday}
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground/85">
              {excerptFromMarkdown(row.content)}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {charCountFromMarkdown(row.content)}字
            </span>
          </CalendarDayLink>
        );
      })}
    </div>
  );
}
