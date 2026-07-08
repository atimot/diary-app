import type { EnneagramSnapshot } from '@/lib/db/schema';
import { dominantType, topTypes, typeCode, wing } from '@/lib/enneagram/derive';
import {
  CENTER_COLOR_VARS,
  CENTER_ORDER,
  CENTER_SHORT_LABELS,
  ENNEAGRAM_TYPES,
} from '@/lib/enneagram/types';
import { EnneagramSymbol } from './EnneagramSymbol';
import { EnneagramTopBars } from './EnneagramTopBars';

interface EnneagramTrendsProps {
  snapshot: EnneagramSnapshot;
  className?: string;
}

// 「今週のこころの傾き」全幅カード。
// SP はカンプ 5c の縦順（見出し → 図 → 本文 → 上位タイプ → 凡例 → 免責）、
// lg 以上は 4c の3カラム（左=読み解き / 中=図 / 右=バー）。DOM 順を SP に合わせ、
// lg では grid-template-areas で3カラムに再配置する。
export function EnneagramTrends({
  snapshot,
  className = '',
}: EnneagramTrendsProps) {
  const { scores } = snapshot;
  const dominant = dominantType(scores);
  const wingType = wing(scores, dominant);
  const type = ENNEAGRAM_TYPES[dominant];
  const wingInfo = ENNEAGRAM_TYPES[wingType];
  const color = CENTER_COLOR_VARS[type.center];

  return (
    <section
      aria-label="今週のこころの傾き"
      className={`rounded-xl border bg-card p-[18px] shadow-card sm:p-6 md:p-7 ${className}`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.1fr)_196px_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto] lg:gap-x-10 lg:gap-y-3.5 lg:[grid-template-areas:'head_figure_bars'_'text_figure_bars'_'note_figure_bars']">
        <div className="lg:[grid-area:head]">
          <h2 className="text-xs font-semibold tracking-normal text-primary md:text-[12.5px]">
            今週のこころの傾き
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
            <span
              className="text-[27px] font-bold leading-none tracking-tight lg:text-3xl"
              style={{ color }}
            >
              {typeCode(dominant, wingType)}
            </span>
            <span className="text-sm font-semibold lg:text-[15px]">
              {type.name}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
                color,
              }}
            >
              {CENTER_SHORT_LABELS[type.center]}タイプ
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground md:text-[11.5px]">
            ウイング: {wingInfo.number} {wingInfo.name}
          </p>
        </div>

        <EnneagramSymbol
          dominant={dominant}
          wing={wingType}
          className="mx-auto w-full max-w-[216px] lg:mx-0 lg:max-w-[196px] lg:self-start lg:[grid-area:figure]"
        />

        <p className="whitespace-pre-wrap text-[12.5px] leading-[1.95] text-foreground/90 lg:text-[13px] lg:[grid-area:text]">
          {snapshot.rationale}
        </p>

        <div className="flex min-w-0 flex-col gap-2.5 lg:gap-3 lg:[grid-area:bars]">
          <h3 className="text-[11px] font-semibold tracking-normal text-foreground/80 md:text-[11.5px]">
            今週の上位タイプ
          </h3>
          <EnneagramTopBars items={topTypes(scores, 5)} />
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {CENTER_ORDER.map((center) => (
              <span key={center} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: CENTER_COLOR_VARS[center] }}
                />
                {CENTER_SHORT_LABELS[center]}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-[1.7] text-muted-foreground lg:self-start lg:[grid-area:note]">
          最近7日分の日記から読み取った傾向で、占いや確定診断ではありません。
        </p>
      </div>
    </section>
  );
}
