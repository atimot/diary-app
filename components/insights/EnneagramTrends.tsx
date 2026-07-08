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

// 「今週のこころの傾き」全幅カード（カンプ #6a「2段構成」）。
// 上段=データ帯（タイプ見出し / シンボル図 / 上位タイプのバー）を横並びで高さを揃え、
// 下段=読み解き本文を2段組（lg のみ）にして border-t で仕切る。
// 本文（rationale）はどれだけ長くても下段に流れるだけなので、図とバーの配置が崩れない。
// SP では自動で1段組に縦積みフォールバックする。
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
      className={`rounded-xl border bg-card p-6 shadow-card sm:p-7 ${className}`}
    >
      {/* 上段: データ帯（タイプ見出し / 図 / 上位バー）— 高さを揃えて横並び */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
        <div className="min-w-0 lg:w-[230px] lg:flex-none">
          <h2 className="text-[12.5px] font-semibold tracking-normal text-primary">
            今週のこころの傾き
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
            <span
              className="text-3xl font-bold leading-none tracking-tight"
              style={{ color }}
            >
              {typeCode(dominant, wingType)}
            </span>
            <span className="text-[15px] font-semibold">{type.name}</span>
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
            <span className="text-[11.5px] text-muted-foreground">
              ウイング: {wingInfo.number} {wingInfo.name}
            </span>
          </div>
        </div>

        <EnneagramSymbol
          dominant={dominant}
          wing={wingType}
          className="w-full max-w-[186px] shrink-0 self-center"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3 className="text-[11.5px] font-semibold tracking-normal text-foreground/80">
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
      </div>

      {/* 下段: 読み解き本文（lg で2段組）。border-t で上段と仕切る */}
      <div className="mt-6 border-t pt-5">
        <p
          className="whitespace-pre-wrap text-[13px] leading-[2] text-foreground/90 lg:columns-2 lg:gap-x-12"
          style={{ columnRule: '1px solid var(--border)' }}
        >
          {snapshot.rationale}
        </p>
        <p className="mt-3.5 text-[11px] leading-[1.7] text-muted-foreground">
          最近7日分の日記から読み取った傾向で、占いや確定診断ではありません。
        </p>
      </div>
    </section>
  );
}
