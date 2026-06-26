import { describe, expect, it } from 'vitest';
import { formatDiaryDate } from './format-date';

describe('formatDiaryDate', () => {
  it('既知アンカーの曜日を正しく返す', () => {
    expect(formatDiaryDate('2000-01-01')).toEqual({
      eyebrow: '2000.01.01',
      full: '2000年1月1日',
      weekday: '土曜日',
    });
    expect(formatDiaryDate('2024-01-01')).toEqual({
      eyebrow: '2024.01.01',
      full: '2024年1月1日',
      weekday: '月曜日',
    });
  });

  it('eyebrow はゼロ埋め・full は非ゼロ埋め・曜日付き', () => {
    expect(formatDiaryDate('2026-06-26')).toEqual({
      eyebrow: '2026.06.26',
      full: '2026年6月26日',
      weekday: '金曜日',
    });
  });
});
