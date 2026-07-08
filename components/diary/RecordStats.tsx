import type { ReactElement } from 'react';
import { SunDot } from '@/components/icons/SunDot';

interface RecordStatsProps {
  current: number;
  longest: number;
  total: number;
}

// 「これまで」見出し右に並ぶ積み重ね指標。連続だけアンバー（--streak）のラベルで
// 「続いている今」を示し、最長・通算は無彩ラベル。total<=0（新規ユーザー）では出さない。
export function RecordStats({
  current,
  longest,
  total,
}: RecordStatsProps): ReactElement | null {
  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 sm:gap-x-[26px]">
      <span className="inline-flex items-baseline gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-streak">
          <SunDot className="size-[11px]" />
          連続
        </span>
        <span className="text-xl font-semibold leading-none tabular-nums">
          {current}
        </span>
        <span className="text-[11.5px] text-muted-foreground">日</span>
      </span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-[11.5px] text-muted-foreground">最長</span>
        <span className="text-xl font-semibold leading-none tabular-nums">
          {longest}
        </span>
        <span className="text-[11.5px] text-muted-foreground">日</span>
      </span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-[11.5px] text-muted-foreground">通算</span>
        <span className="text-xl font-semibold leading-none tabular-nums">
          {total}
        </span>
        <span className="text-[11.5px] text-muted-foreground">日</span>
      </span>
    </div>
  );
}
