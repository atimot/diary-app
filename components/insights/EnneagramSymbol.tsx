import {
  CENTER_COLOR_VARS,
  ENNEAGRAM_TYPE_NUMBERS,
  ENNEAGRAM_TYPES,
  type EnneagramTypeNumber,
} from '@/lib/enneagram/types';

interface EnneagramSymbolProps {
  dominant: EnneagramTypeNumber;
  wing: EnneagramTypeNumber;
  className?: string;
}

const CX = 100;
const CY = 100;
const R = 70;
const LABEL_R = 86;

// タイプ9が頂点（θ=0）、そこから時計回りに 1,2,…,8。index = type % 9。
function point(type: EnneagramTypeNumber, radius: number) {
  const theta = ((type % 9) * 40 * Math.PI) / 180;
  return {
    x: CX + radius * Math.sin(theta),
    y: CY - radius * Math.cos(theta),
  };
}

function colorOf(type: EnneagramTypeNumber): string {
  return CENTER_COLOR_VARS[ENNEAGRAM_TYPES[type].center];
}

// 内側の三角形(3-6-9)とヘクサド(1-4-2-8-5-7)。エニアグラム図形の構成線。
const TRIANGLE: EnneagramTypeNumber[] = [3, 6, 9];
const HEXAD: EnneagramTypeNumber[] = [1, 4, 2, 8, 5, 7];

function polyPoints(types: EnneagramTypeNumber[]): string {
  return types
    .map((t) => {
      const p = point(t, R);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

export function EnneagramSymbol({
  dominant,
  wing,
  className = 'mx-auto w-full max-w-[260px]',
}: EnneagramSymbolProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`エニアグラム・シンボル図。主タイプ ${dominant}、ウイング ${wing} を強調。`}
      className={className}
    >
      <title>{`エニアグラム・シンボル図（${dominant}w${wing}）`}</title>
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        className="stroke-border"
        strokeWidth={0.8}
      />
      <polygon
        points={polyPoints(TRIANGLE)}
        fill="none"
        className="stroke-border"
        strokeWidth={0.8}
      />
      <polygon
        points={polyPoints(HEXAD)}
        fill="none"
        className="stroke-border"
        strokeWidth={0.8}
      />
      {ENNEAGRAM_TYPE_NUMBERS.map((t) => {
        const p = point(t, R);
        const color = colorOf(t);
        const isDominant = t === dominant;
        const isWing = t === wing;
        return (
          <g key={`dot-${t}`}>
            {isDominant && (
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill="none"
                stroke={color}
                strokeOpacity={0.3}
                strokeWidth={2}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isDominant ? 8.5 : isWing ? 6 : 3.4}
              fill={color}
              fillOpacity={isDominant ? 1 : isWing ? 0.85 : 0.5}
            />
          </g>
        );
      })}
      {ENNEAGRAM_TYPE_NUMBERS.map((t) => {
        const lp = point(t, LABEL_R);
        const emphasized = t === dominant || t === wing;
        return (
          <text
            key={`label-${t}`}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={emphasized ? 12 : 11}
            fill={colorOf(t)}
            fillOpacity={emphasized ? 1 : 0.85}
            fontWeight={emphasized ? 600 : 500}
          >
            {t}
          </text>
        );
      })}
    </svg>
  );
}
