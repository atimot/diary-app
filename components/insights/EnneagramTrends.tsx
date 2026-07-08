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

// 「今週のこころの傾き」全幅カード（カンプ 4c = 6a 採用の2段構成）。
// lg 以上: 上段=データ帯（タイプ 230px｜図 196px｜上位バー、垂直中央揃え）
//          下段=罫線で区切った本文の2段組（長文でも図とバーの配置が崩れない）。
// SP: カンプ 5c の縦順（見出し → 図 → 本文 → 上位タイプ → 凡例 → 免責）に
//     1段組へフォールバック。DOM 順を SP に合わせ、lg は grid-template-areas で再配置。
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
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[230px_196px_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-0 lg:[grid-template-areas:'head_figure_bars'_'text_text_text'_'note_note_note']">
        <div className="lg:self-center lg:[grid-area:head]">
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
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
                color,
              }}
            >
              {CENTER_SHORT_LABELS[type.center]}タイプ
            </span>
            <span className="text-[11px] text-muted-foreground md:text-[11.5px]">
              ウイング: {wingInfo.number} {wingInfo.name}
            </span>
          </div>
        </div>

        <EnneagramSymbol
          dominant={dominant}
          wing={wingType}
          className="mx-auto w-full max-w-[216px] lg:mx-0 lg:max-w-[196px] lg:self-center lg:[grid-area:figure]"
        />

        {/* 下段の本文。lg では上罫線の下で2段組（column-rule 付き） */}
        <p className="whitespace-pre-wrap text-[12.5px] leading-[1.95] text-foreground/90 lg:mt-6 lg:columns-2 lg:gap-x-12 lg:border-t lg:pt-5 lg:text-[13px] lg:leading-[2] lg:[column-rule:1px_solid_var(--border)] lg:[grid-area:text]">
          {snapshot.rationale}
        </p>

        <div className="flex min-w-0 flex-col gap-2.5 lg:gap-3 lg:self-center lg:[grid-area:bars]">
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

        <p className="text-[11px] leading-[1.7] text-muted-foreground lg:mt-3.5 lg:[grid-area:note]">
          最近7日分の日記から読み取った傾向で、占いや確定診断ではありません。
        </p>
      </div>
    </section>
  );
}
