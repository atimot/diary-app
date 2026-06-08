'use client';

import type { MbtiScores } from '@/lib/db/schema';

interface AxisDef {
  key: 'EI' | 'SN' | 'TF' | 'JP';
  leftLetter: string;
  leftName: string;
  rightLetter: string;
  rightName: string;
}

interface MBTISlidersProps {
  scores: MbtiScores;
}

const AXES: AxisDef[] = [
  { key: 'EI', leftLetter: 'I', leftName: '内向', rightLetter: 'E', rightName: '外向' },
  { key: 'SN', leftLetter: 'S', leftName: '感覚', rightLetter: 'N', rightName: '直観' },
  { key: 'TF', leftLetter: 'T', leftName: '思考', rightLetter: 'F', rightName: '感情' },
  { key: 'JP', leftLetter: 'J', leftName: '判断', rightLetter: 'P', rightName: '知覚' },
];

function leaningLabel(value: number, leftName: string, rightName: string): string {
  const abs = Math.abs(value);
  const target = value < 0 ? leftName : rightName;
  if (abs < 0.2) return 'ほぼ中間';
  if (abs < 0.5) return `やや ${target} 寄り`;
  if (abs < 0.8) return `${target} 寄り`;
  return `強く ${target} 寄り`;
}

export function MBTISliders({ scores }: MBTISlidersProps) {
  return (
    <div className="space-y-5">
      {AXES.map((axis) => {
        const value = scores[axis.key];
        const leftPercent = value < 0 ? (1 + value) * 50 : 50;
        const fillWidth = Math.abs(value) * 50;
        const label = leaningLabel(value, axis.leftName, axis.rightName);

        return (
          <div key={axis.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {axis.leftLetter}（{axis.leftName}）
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-medium">
                {axis.rightLetter}（{axis.rightName}）
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
              <div
                className="absolute top-0 bottom-0 bg-primary"
                style={{
                  left: `${leftPercent}%`,
                  width: `${fillWidth}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
