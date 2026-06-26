import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps): ReactElement | null {
  if (streak <= 0) return null;
  return (
    <div className="inline-flex items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 dark:border dark:border-border dark:bg-card">
      <Flame className="size-5 text-primary" aria-hidden="true" />
      <span className="font-heading text-2xl leading-none tabular-nums text-primary">
        {streak}
      </span>
      <span className="text-sm text-background/80 dark:text-muted-foreground">
        日連続記入中
      </span>
    </div>
  );
}
