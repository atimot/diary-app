// components/diary/SeasonNote.tsx
import { getSeason } from '@/lib/diary/season';

// 季節のたより。節気名のみ朱（季節の差し色）。それ以外は muted。
export function SeasonNote({ date }: { date: string }) {
  const { wafuMonth, sekki, note } = getSeason(date);
  return (
    <section aria-label="季節のたより">
      <p className="font-heading text-sm text-muted-foreground">季節のたより</p>
      <p className="mt-2 font-heading text-base text-season">{sekki}</p>
      <p className="mt-1 text-xs text-muted-foreground">{wafuMonth}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {note}
      </p>
    </section>
  );
}
