const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export interface DiaryDateParts {
  eyebrow: string;
  full: string;
  weekday: string;
}

// iso は 'YYYY-MM-DD'（Asia/Tokyo のカレンダー日付）。
// 曜日はタイムゾーン非依存に算出するため Date.UTC + getUTCDay を使う
// （ローカルTZに依存せずカレンダー日付の曜日が一意に決まる）。
export function formatDiaryDate(iso: string): DiaryDateParts {
  const [y, m, d] = iso.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return {
    eyebrow: `${y}.${pad(m)}.${pad(d)}`,
    full: `${y}年${m}月${d}日`,
    weekday: `${weekday}曜日`,
  };
}
