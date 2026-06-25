import type { EnneagramSnapshot } from '@/lib/db/schema';
import {
  centerBreakdown,
  dominantType,
  topTypes,
  typeCode,
  wing,
} from '@/lib/enneagram/derive';
import { ENNEAGRAM_TYPES } from '@/lib/enneagram/types';
import { EnneagramCenters } from './EnneagramCenters';
import { EnneagramHero } from './EnneagramHero';
import { EnneagramSymbol } from './EnneagramSymbol';
import { EnneagramTopBars } from './EnneagramTopBars';

interface EnneagramTrendsProps {
  snapshot: EnneagramSnapshot;
}

export function EnneagramTrends({ snapshot }: EnneagramTrendsProps) {
  const { scores } = snapshot;
  const dominant = dominantType(scores);
  const wingType = wing(scores, dominant);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">エニアグラム傾向</h2>
        <p className="text-muted-foreground text-xs">
          占いや確定診断ではなく、最近7日分の日記から AI
          が読み取った「今週の動機の傾向」です
        </p>
      </div>

      <EnneagramHero
        dominant={ENNEAGRAM_TYPES[dominant]}
        wing={ENNEAGRAM_TYPES[wingType]}
        code={typeCode(dominant, wingType)}
        rationale={snapshot.rationale}
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground text-sm">
            タイプ配置
          </h3>
          <EnneagramSymbol dominant={dominant} wing={wingType} />
        </div>
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground text-sm">
            今週の上位タイプ
          </h3>
          <EnneagramTopBars items={topTypes(scores, 5)} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground text-sm">
          3つのセンター（腹・心・頭）
        </h3>
        <EnneagramCenters breakdown={centerBreakdown(scores)} />
      </div>
    </section>
  );
}
