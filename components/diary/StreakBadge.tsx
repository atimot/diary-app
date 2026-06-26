import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps): ReactElement | null {
  if (streak <= 0) return null;
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
      <Flame className="size-5 text-primary" aria-hidden="true" />
      <span className="font-heading text-2xl leading-none tabular-nums">
        {streak}
      </span>
      <span className="text-sm text-muted-foreground">日連続記入中</span>
    </div>
  );
}
