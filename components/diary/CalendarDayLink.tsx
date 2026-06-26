'use client';

import Link from 'next/link';
import { type ComponentProps, useState } from 'react';

// カレンダーの日付セルは数が多く、next/link 既定の viewport プリフェッチだと
// /diary/* の RSC が一斉発火する（実測50件 = sin1 の動的関数 + DB クエリ50回）。
// ホバー/タッチで「踏みそう」な意図を検知したセルだけプリフェッチする。
// prefetch={false} は viewport/hover 双方の先読みを止め、ホバー後に null(=既定)へ
// 昇格させて初めて先読みする（公式 HoverPrefetchLink パターン）。
export function CalendarDayLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const [active, setActive] = useState(false);

  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={() => setActive(true)}
      onTouchStart={() => setActive(true)}
    >
      {children}
    </Link>
  );
}
