import {
  CENTER_COLOR_VARS,
  CENTER_LABELS,
  type EnneagramType,
} from '@/lib/enneagram/types';

interface EnneagramHeroProps {
  dominant: EnneagramType;
  wing: EnneagramType;
  code: string;
  rationale: string;
}

export function EnneagramHero({
  dominant,
  wing,
  code,
  rationale,
}: EnneagramHeroProps) {
  const color = CENTER_COLOR_VARS[dominant.center];

  return (
    <div
      className="space-y-4 rounded-xl border border-l-4 bg-card p-5"
      style={{ borderLeftColor: color }}
    >
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">
          今週のあなたに最も表れた動機
        </p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-bold text-2xl tracking-tight" style={{ color }}>
            {code}
          </span>
          <span className="font-semibold text-lg">{dominant.name}</span>
          <span
            className="self-center rounded-md px-2 py-0.5 font-medium text-xs"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
              color,
            }}
          >
            {CENTER_LABELS[dominant.center]}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          ウイング: {wing.number} {wing.name}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="space-y-0.5">
          <dt className="text-muted-foreground text-xs">核となる欲求</dt>
          <dd>{dominant.coreDesire}</dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground text-xs">核となる恐れ</dt>
          <dd>{dominant.coreFear}</dd>
        </div>
      </dl>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{rationale}</p>
    </div>
  );
}
