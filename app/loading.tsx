// ルート全体のローディング境界。動的(ƒ)レンダリングのサーバー応答を待つ間、
// 即座にスケルトンをストリーミングして「真っ白待ち」を解消する（特にコールド時）。
// エディタ系ページ（/ と /diary/[date]）の枠に寄せた汎用スケルトン。
// /history・/insights は各自の loading.tsx で上書きする。
export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-[15rem] animate-pulse rounded-lg border border-input" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
      </div>
    </main>
  );
}
