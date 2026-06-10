// lib/diary/streak.ts
// 連続記入日数を求める純粋関数。
// 「今日」または「昨日」を起点に遡り、連続している日数を返す。
// 今日も昨日も未記入なら 0。

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function subDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  const y2 = date.getUTCFullYear();
  const m2 = pad2(date.getUTCMonth() + 1);
  const d2 = pad2(date.getUTCDate());
  return `${y2}-${m2}-${d2}`;
}

export function computeStreak(
  entryDates: readonly string[],
  today: string,
): number {
  const dates = new Set(entryDates);

  // 起点: 今日が記入済みなら今日、未記入なら昨日
  let cursor = dates.has(today) ? today : subDays(today, 1);

  if (!dates.has(cursor)) {
    return 0; // 今日も昨日も書いてない
  }

  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = subDays(cursor, 1);
  }
  return count;
}
