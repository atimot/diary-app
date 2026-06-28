import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps): ReactElement | null {
  if (streak <= 0) return null;
  // 案A「若葉ソフトチップ」: 黒ベタ反転をやめ、若葉(--primary)の淡い地＋罫で
  // 継続=育つを表す。light/dark とも中立カードから浮き、墨ベタの重さも回避。
  // ラベルは淡緑地で muted だと AA 落ち(2.81:1)のため foreground/80 で担保。
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/12 px-4 py-2.5 dark:bg-primary/15">
      <Flame className="size-5 text-primary" aria-hidden="true" />
      <span className="font-heading text-2xl leading-none tabular-nums text-primary">
        {streak}
      </span>
      <span className="text-sm text-foreground/80">日連続記入中</span>
    </div>
  );
}
