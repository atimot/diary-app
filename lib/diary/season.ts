// lib/diary/season.ts
// 日付 → 和風月名・二十四節気・一言メモ（情緒の添え物）。
// 新暦月をそのまま和風月名に対応させる単純版（旧暦換算はしない＝YAGNI、ズレ許容）。
// 二十四節気は年で数日揺れるため近似の開始日テーブルで引く。

const WAFU_MONTH = [
  '睦月', '如月', '弥生', '卯月', '皐月', '水無月',
  '文月', '葉月', '長月', '神無月', '霜月', '師走',
];

interface SekkiDef {
  md: number; // month*100 + day（近似の開始日）
  name: string;
  note: string;
}

// 立春（年初）から大寒までカレンダー順。
const SEKKI: SekkiDef[] = [
  { md: 204, name: '立春', note: '春の気配が立ちはじめる頃。' },
  { md: 219, name: '雨水', note: '雪が雨に変わり、氷が解けていく頃。' },
  { md: 306, name: '啓蟄', note: '土の中の虫が動きだす頃。' },
  { md: 321, name: '春分', note: '昼と夜の長さがほぼ等しくなる頃。' },
  { md: 405, name: '清明', note: '草木が芽吹き、清らかに明るむ頃。' },
  { md: 420, name: '穀雨', note: '春の雨が穀物をうるおす頃。' },
  { md: 506, name: '立夏', note: '夏の気配が立ちはじめる頃。' },
  { md: 521, name: '小満', note: '草木が茂り、満ちていく頃。' },
  { md: 606, name: '芒種', note: '稲などの種をまく頃。' },
  { md: 621, name: '夏至', note: '一年で最も昼が長い頃。' },
  { md: 707, name: '小暑', note: '暑さがしだいに増していく頃。' },
  { md: 723, name: '大暑', note: '一年で最も暑さがきびしい頃。' },
  { md: 808, name: '立秋', note: '秋の気配が立ちはじめる頃。' },
  { md: 823, name: '処暑', note: '暑さがやわらぎはじめる頃。' },
  { md: 908, name: '白露', note: '草に朝露が宿りはじめる頃。' },
  { md: 923, name: '秋分', note: '昼と夜の長さがほぼ等しくなる頃。' },
  { md: 1008, name: '寒露', note: '冷たい露が結ぶ頃。' },
  { md: 1024, name: '霜降', note: '霜が降りはじめる頃。' },
  { md: 1107, name: '立冬', note: '冬の気配が立ちはじめる頃。' },
  { md: 1122, name: '小雪', note: 'わずかに雪が降りはじめる頃。' },
  { md: 1207, name: '大雪', note: '雪が本格的に降りだす頃。' },
  { md: 1222, name: '冬至', note: '一年で最も昼が短い頃。' },
  { md: 105, name: '小寒', note: '寒さが本格化しはじめる頃。' },
  { md: 120, name: '大寒', note: '一年で最も寒さがきびしい頃。' },
];

export interface Season {
  wafuMonth: string;
  sekki: string;
  note: string;
}

export function getSeason(date: string): Season {
  const parts = date.split('-');
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const key = month * 100 + day;
  const wafuMonth = WAFU_MONTH[month - 1];

  // 1/1〜1/4 は小寒（105）より前 → 前年の冬至へ倒す。
  if (key < 105) {
    const touji = SEKKI.find((s) => s.name === '冬至');
    const note = touji ? touji.note : '';
    return { wafuMonth, sekki: '冬至', note };
  }

  // key 以下で md が最大の節気を選ぶ（Jan の小さい md も自然に拾える）。
  let chosen = SEKKI[0];
  let best = -1;
  for (const s of SEKKI) {
    if (s.md <= key && s.md > best) {
      best = s.md;
      chosen = s;
    }
  }
  return { wafuMonth, sekki: chosen.name, note: chosen.note };
}
