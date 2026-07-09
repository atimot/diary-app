// lib/diary/streak.ts
// 連続記入日数を求める純粋関数。
// 「今日」または「昨日」を起点に遡り、連続している日数を返す。
// 今日も昨日も未記入なら 0。
import { addDays } from '../calendar/month-grid';

export function computeStreak(
  entryDates: readonly string[],
  today: string,
): number {
  const dates = new Set(entryDates);

  // 起点: 今日が記入済みなら今日、未記入なら昨日
  let cursor = dates.has(today) ? today : addDays(today, -1);

  if (!dates.has(cursor)) {
    return 0; // 今日も昨日も書いてない
  }

  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// 全履歴のうち、連続した日付（カレンダー上で隣り合う日）の最長ランの長さを返す。
// 現在連続と違い「今日」に依存しない。未ソート・重複入力でも正しく動く。
export function computeLongestStreak(entryDates: readonly string[]): number {
  if (entryDates.length === 0) return 0;

  // 重複除去 → 昇順ソート（'YYYY-MM-DD' の辞書順 = 日付順）
  const sorted = [...new Set(entryDates)].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    // 当日の前日 (= 当日 -1) が直前要素なら連続
    if (addDays(sorted[i], -1) === sorted[i - 1]) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}
