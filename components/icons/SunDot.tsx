import type { SVGProps } from 'react';

// 「つづき（連続記録）」と「今日」を表すアンバーの太陽アイコン。
// 中心が塗り丸＋短い光線。色は currentColor（使う側で text-streak 等を当てる）。
export function SunDot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="m5.6 5.6 1.4 1.4" />
      <path d="m17 17 1.4 1.4" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="m7 17-1.4 1.4" />
      <path d="m18.4 5.6-1.4 1.4" />
    </svg>
  );
}
