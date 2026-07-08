import type { TypeScore } from '@/lib/enneagram/derive';
import { CENTER_COLOR_VARS, ENNEAGRAM_TYPES } from '@/lib/enneagram/types';
import { BarTrack, MeterFill } from './MeterBar';

interface EnneagramTopBarsProps {
  items: TypeScore[];
}

// 上位タイプの細バー。バー色はセンター色、1位だけ名前を強調する。
export function EnneagramTopBars({ items }: EnneagramTopBarsProps) {
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const type = ENNEAGRAM_TYPES[item.type];
        const color = CENTER_COLOR_VARS[type.center];
        const pct = Math.round(item.score * 100);
        return (
          <div key={item.type} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span
                className={i === 0 ? 'font-semibold' : 'text-foreground/85'}
              >
                {item.type} {type.name}
              </span>
              <span className="text-muted-foreground tabular-nums">{pct}</span>
            </div>
            <BarTrack height="h-[5px]" className="bg-secondary">
              <MeterFill value={item.score} color={color} />
            </BarTrack>
          </div>
        );
      })}
    </div>
  );
}
