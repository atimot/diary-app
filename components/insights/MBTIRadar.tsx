'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { MbtiScores } from '@/lib/db/schema';

interface MBTIRadarProps {
  scores: MbtiScores;
}

// 多角形の頂点を E-N-F-P-I-S-T-J の順に配置すると、
// 対極ペア（E↔I, N↔S, F↔T, P↔J）が中心を挟んで対称に並ぶ
const AXIS_ORDER = ['E', 'N', 'F', 'P', 'I', 'S', 'T', 'J'] as const;

function toRadarData(scores: MbtiScores) {
  // 4 軸の符号付きスコア (-1〜+1) を 8 軸の 0〜1 値に展開
  // 例: EI = 0.7 → E = (1 + 0.7) / 2 = 0.85, I = (1 - 0.7) / 2 = 0.15
  const E = (1 + scores.EI) / 2;
  const I = 1 - E;
  const N = (1 + scores.SN) / 2;
  const S = 1 - N;
  const F = (1 + scores.TF) / 2;
  const T = 1 - F;
  const P = (1 + scores.JP) / 2;
  const J = 1 - P;

  const byAxis: Record<string, number> = { E, I, S, N, T, F, J, P };
  return AXIS_ORDER.map((axis) => ({
    axis,
    value: byAxis[axis],
  }));
}

export function MBTIRadar({ scores }: MBTIRadarProps) {
  const data = toRadarData(scores);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'currentColor', fontSize: 14 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="あなたの傾向"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
