import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';

interface RecordStatsProps {
  current: number;
  longest: number;
  total: number;
}

// カレンダー上部の「積み重ね指標」帯。
// 現在連続のみ若葉(--primary)で「育っている今」を強調し、最長・通算は墨。
// 深度は下罫＋明度差のみ（影なし）。total<=0（新規ユーザー）では帯を出さない。
export function RecordStats({
  current,
  longest,
  total,
}: RecordStatsProps): ReactElement | null {
  if (total <= 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-border pb-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">連続記録</span>
        <span className="inline-flex items-baseline gap-1.5">
          {current > 0 && (
            <Flame
              className="size-4 self-center text-primary"
              aria-hidden="true"
            />
          )}
          <span
            className={`font-heading text-3xl leading-none tabular-nums ${
              current > 0 ? 'text-primary' : 'text-foreground'
            }`}
          >
            {current}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          最長（自己ベスト）
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-heading text-3xl leading-none tabular-nums text-foreground">
            {longest}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">通算記録</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-heading text-3xl leading-none tabular-nums text-foreground">
            {total}
          </span>
          <span className="text-sm text-muted-foreground">日</span>
        </span>
      </div>
    </div>
  );
}
