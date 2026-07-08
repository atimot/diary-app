import type { ReactElement } from 'react';
import { SunDot } from '@/components/icons/SunDot';

interface StreakPillProps {
  streak: number;
}

// 「n日つづき」のアンバーピル。継続の色（--streak）はここと「今日」印にだけ使う。
export function StreakPill({ streak }: StreakPillProps): ReactElement | null {
  if (streak <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1">
      <SunDot className="size-3 text-streak" />
      <span className="text-[11.5px] font-semibold text-streak">
        {streak}日つづき
      </span>
    </span>
  );
}
