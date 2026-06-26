// /insights のローディング境界。インサイト/エニアグラム表示の枠に寄せたスケルトン。
export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 h-8 w-44 animate-pulse rounded bg-muted" />
      <div className="space-y-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-lg border" />
        <div className="h-40 w-full animate-pulse rounded-lg border" />
      </div>
    </main>
  );
}
