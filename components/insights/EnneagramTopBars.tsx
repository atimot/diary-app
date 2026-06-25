import type { TypeScore } from '@/lib/enneagram/derive';
import { ENNEAGRAM_TYPES } from '@/lib/enneagram/types';

interface EnneagramTopBarsProps {
  items: TypeScore[];
}

export function EnneagramTopBars({ items }: EnneagramTopBarsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const type = ENNEAGRAM_TYPES[item.type];
        const pct = Math.round(item.score * 100);
        return (
          <div key={item.type} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {item.type} {type.name}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {pct}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={
                  i === 0
                    ? 'h-full rounded-full bg-primary'
                    : 'h-full rounded-full bg-primary/35'
                }
                style={{ width: `${(item.score * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
