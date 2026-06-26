// /history のローディング境界。カレンダーの枠に寄せたスケルトン。
const WEEK_KEYS = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
const DAY_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];

export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1">
          {WEEK_KEYS.map((week) => (
            <div key={week} className="grid grid-cols-7 gap-1">
              {DAY_KEYS.map((day) => (
                <div
                  key={day}
                  className="aspect-square animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
