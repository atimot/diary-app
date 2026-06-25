import type { CenterBreakdown } from '@/lib/enneagram/derive';
import { CENTER_LABELS } from '@/lib/enneagram/types';

interface EnneagramCentersProps {
  breakdown: CenterBreakdown;
}

// 親和度合計の順位ごとの濃淡（1位が最も濃い）。
const RANK_OPACITY = [1, 0.55, 0.3];

export function EnneagramCenters({ breakdown }: EnneagramCentersProps) {
  const ranked = [...breakdown.centers].sort((a, b) => b.total - a.total);
  const opacityByCenter = new Map(
    ranked.map((c, i) => [c.center, RANK_OPACITY[Math.min(i, 2)]]),
  );

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {breakdown.centers.map((c) => (
          <div
            key={c.center}
            className="bg-primary"
            style={{
              width: `${(c.share * 100).toFixed(1)}%`,
              opacity: opacityByCenter.get(c.center),
            }}
          />
        ))}
      </div>
      <ul className="space-y-1.5 text-sm">
        {ranked.map((c) => (
          <li key={c.center} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm bg-primary"
              style={{ opacity: opacityByCenter.get(c.center) }}
            />
            <span>{CENTER_LABELS[c.center]}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {Math.round(c.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
