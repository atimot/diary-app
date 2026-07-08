import { describe, expect, it } from 'vitest';
import { formatDiaryDate } from './format-date';

describe('formatDiaryDate', () => {
  it('既知アンカーの曜日を正しく返す', () => {
    expect(formatDiaryDate('2000-01-01')).toEqual({
      eyebrow: '2000.01.01',
      full: '2000年1月1日',
      monthDay: '1月1日',
      year: '2000年',
      weekday: '土曜日',
      isSunday: false,
    });
    expect(formatDiaryDate('2024-01-01')).toEqual({
      eyebrow: '2024.01.01',
      full: '2024年1月1日',
      monthDay: '1月1日',
      year: '2024年',
      weekday: '月曜日',
      isSunday: false,
    });
  });

  it('eyebrow はゼロ埋め・full は非ゼロ埋め・曜日付き', () => {
    expect(formatDiaryDate('2026-06-26')).toEqual({
      eyebrow: '2026.06.26',
      full: '2026年6月26日',
      monthDay: '6月26日',
      year: '2026年',
      weekday: '金曜日',
      isSunday: false,
    });
  });

  it('日曜は isSunday が立つ', () => {
    expect(formatDiaryDate('2026-07-05')).toMatchObject({
      weekday: '日曜日',
      isSunday: true,
    });
  });
});
