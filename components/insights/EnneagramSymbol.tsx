import {
  ENNEAGRAM_TYPE_NUMBERS,
  type EnneagramTypeNumber,
} from '@/lib/enneagram/types';

interface EnneagramSymbolProps {
  dominant: EnneagramTypeNumber;
  wing: EnneagramTypeNumber;
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

export function EnneagramSymbol({ dominant, wing }: EnneagramSymbolProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`エニアグラム・シンボル図。主タイプ ${dominant}、ウイング ${wing} を強調。`}
      className="mx-auto w-full max-w-[260px]"
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
        const isDominant = t === dominant;
        const isWing = t === wing;
        return (
          <circle
            key={`dot-${t}`}
            cx={p.x}
            cy={p.y}
            r={isDominant ? 9 : isWing ? 6 : 3.2}
            className={
              isDominant || isWing ? 'fill-primary' : 'fill-muted-foreground'
            }
            fillOpacity={isWing ? 0.5 : 1}
          />
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
            fontSize={11}
            className={emphasized ? 'fill-foreground' : 'fill-muted-foreground'}
            fontWeight={emphasized ? 500 : 400}
          >
            {t}
          </text>
        );
      })}
    </svg>
  );
}
