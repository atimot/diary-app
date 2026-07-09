'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FOCUS_CONTAINER } from '@/lib/design/containers';

// 予期しない例外（DB 障害等）の受け皿。error boundary の仕様上 Client Component 必須。
// reset() は再フェッチせず再描画するだけなので、データ取得失敗からの復帰には
// unstable_retry()（Next 16.2 で追加・公式推奨）を使う
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 調査用。本番はサーバー側で digest 付きのログが Vercel に残る
    console.error(error);
  }, [error]);

  return (
    <main className={FOCUS_CONTAINER}>
      <h1 className="text-xl leading-snug md:text-[22px]">
        うまく読み込めませんでした
      </h1>
      <p className="mt-2.5 text-[13px] leading-[1.9] text-muted-foreground">
        一時的な不具合かもしれません。少し時間をおいて、もう一度おためしください。
      </p>
      <div className="mt-6 flex items-center gap-4">
        <Button onClick={() => unstable_retry()}>もう一度ためす</Button>
        <Link
          href="/"
          className="text-[13px] text-muted-foreground transition hover:text-foreground"
        >
          ホームへ戻る
        </Link>
      </div>
    </main>
  );
}
