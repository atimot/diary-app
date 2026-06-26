import type { ReactNode } from 'react';

interface BarTrackProps {
  // トラックの高さ（Tailwind クラス）。既定 h-2。
  height?: string;
  className?: string;
  children: ReactNode;
}

// 共通のバートラック（角丸・muted 背景・はみ出し切り）。
// 単一塗り（MeterFill）にも積み上げセグメントにも使う。
export function BarTrack({
  height = 'h-2',
  className = '',
  children,
}: BarTrackProps) {
  return (
    <div
      className={`overflow-hidden rounded-full bg-muted ${height} ${className}`}
    >
      {children}
    </div>
  );
}

interface MeterFillProps {
  // 0〜1 の割合。
  value: number;
  color: string;
  opacity?: number;
}

// 単一塗りの fill。幅は value から % に変換。
export function MeterFill({ value, color, opacity }: MeterFillProps) {
  return (
    <div
      className="h-full rounded-full"
      style={{
        width: `${(value * 100).toFixed(1)}%`,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}
