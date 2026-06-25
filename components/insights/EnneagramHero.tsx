import type { EnneagramType } from '@/lib/enneagram/types';

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
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          今週のあなたに最も表れた動機
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-2xl tracking-tight">{code}</span>
          <span className="font-semibold text-lg">{dominant.name}</span>
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
