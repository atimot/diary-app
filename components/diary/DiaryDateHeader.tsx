import { formatDiaryDate } from '@/lib/diary/format-date';

interface DiaryDateHeaderProps {
  date: string;
}

// 過去日（/diary/[date]）の日付見出し。今日ページは挨拶付きの見出しを自前で描く。
export function DiaryDateHeader({ date }: DiaryDateHeaderProps) {
  const { year, monthDay, weekday } = formatDiaryDate(date);
  return (
    <header>
      <p className="text-xs text-muted-foreground tabular-nums">{year}</p>
      <h1 className="mt-2 text-[22px] leading-snug">
        {monthDay}{' '}
        <span className="font-normal text-muted-foreground">{weekday}</span>
      </h1>
    </header>
  );
}
