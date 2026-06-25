import type { TypeScore } from '@/lib/enneagram/derive';
import { CENTER_COLOR_VARS, ENNEAGRAM_TYPES } from '@/lib/enneagram/types';

interface EnneagramTopBarsProps {
  items: TypeScore[];
}

export function EnneagramTopBars({ items }: EnneagramTopBarsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const type = ENNEAGRAM_TYPES[item.type];
        const color = CENTER_COLOR_VARS[type.center];
        const pct = Math.round(item.score * 100);
        return (
          <div key={item.type} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {item.type} {type.name}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {pct}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(item.score * 100).toFixed(1)}%`,
                  backgroundColor: color,
                  opacity: i === 0 ? 1 : 0.6,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
