import type { CenterBreakdown } from '@/lib/enneagram/derive';
import { CENTER_COLOR_VARS, CENTER_LABELS } from '@/lib/enneagram/types';
import { BarTrack } from './MeterBar';

interface EnneagramCentersProps {
  breakdown: CenterBreakdown;
}

export function EnneagramCenters({ breakdown }: EnneagramCentersProps) {
  const ranked = [...breakdown.centers].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <BarTrack height="h-4" className="flex">
        {breakdown.centers.map((c) => (
          <div
            key={c.center}
            style={{
              width: `${(c.share * 100).toFixed(1)}%`,
              backgroundColor: CENTER_COLOR_VARS[c.center],
            }}
          />
        ))}
      </BarTrack>
      <ul className="space-y-1.5 text-sm">
        {ranked.map((c) => (
          <li key={c.center} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: CENTER_COLOR_VARS[c.center] }}
            />
            <span
              className={c.center === breakdown.dominant ? 'font-medium' : ''}
            >
              {CENTER_LABELS[c.center]}
            </span>
            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
              {Math.round(c.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
