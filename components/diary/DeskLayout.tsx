// components/diary/DeskLayout.tsx
import type { ReactNode } from 'react';

interface DeskLayoutProps {
  children: ReactNode; // 本文（日付ヘッダ＋プロンプト＋エディタ）
  rail?: ReactNode; // 右レール（任意）
}

// 文机型レイアウト。lg 以上で [本文 1fr | レール 220px]、狭幅では縦積み。
// 深度は罫＋明度差で出す（影は使わない）。
export function DeskLayout({ children, rail }: DeskLayoutProps) {
  if (!rail) {
    return <main className="container mx-auto max-w-3xl p-6">{children}</main>;
  }
  return (
    <main className="container mx-auto max-w-5xl p-6">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10">
        <div className="min-w-0">{children}</div>
        <aside className="mt-8 border-t pt-6 lg:mt-0 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-1">
          <div className="lg:sticky lg:top-6">{rail}</div>
        </aside>
      </div>
    </main>
  );
}
