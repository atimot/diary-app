// 今日ページの時間帯挨拶。JST の時刻で決める純関数＋現在時刻の取得を分離。

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return 'おはようございます。';
  if (hour >= 11 && hour < 18) return 'こんにちは。';
  return 'こんばんは。';
}

// hourCycle 'h23' で 0..23 を保証する（'h24' だと深夜0時が 24 になる）。
export function currentHourInTokyo(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
}
