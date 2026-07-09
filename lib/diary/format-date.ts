const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export interface DiaryDateParts {
  monthDay: string;
  year: string;
  weekday: string;
  isSunday: boolean;
}

// iso は 'YYYY-MM-DD'（Asia/Tokyo のカレンダー日付）。
// 曜日はタイムゾーン非依存に算出するため Date.UTC + getUTCDay を使う
// （ローカルTZに依存せずカレンダー日付の曜日が一意に決まる）。
export function formatDiaryDate(iso: string): DiaryDateParts {
  const [y, m, d] = iso.split('-').map(Number);
  const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const weekday = WEEKDAYS[dayIndex];
  return {
    monthDay: `${m}月${d}日`,
    year: `${y}年`,
    weekday: `${weekday}曜日`,
    isSunday: dayIndex === 0,
  };
}
