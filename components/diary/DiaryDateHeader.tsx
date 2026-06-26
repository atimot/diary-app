import { formatDiaryDate } from '@/lib/diary/format-date';

interface DiaryDateHeaderProps {
  date: string;
}

export function DiaryDateHeader({ date }: DiaryDateHeaderProps) {
  const { eyebrow, full, weekday } = formatDiaryDate(date);
  return (
    <header className="mb-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
        {eyebrow}
      </p>
      <h1 className="mt-1 font-heading text-2xl tracking-[0.04em] sm:text-3xl">
        {full} <span className="text-muted-foreground">{weekday}</span>
      </h1>
    </header>
  );
}
