import { describe, expect, it } from 'vitest';
import { getSeason } from './season';

describe('getSeason', () => {
  it('夏至の頃（6/28）は水無月・夏至', () => {
    expect(getSeason('2026-06-28')).toEqual({
      wafuMonth: '水無月',
      sekki: '夏至',
      note: '一年で最も昼が長い頃。',
    });
  });

  it('元日（1/1）は小寒より前なので前年の冬至へ倒す', () => {
    const s = getSeason('2026-01-01');
    expect(s.wafuMonth).toBe('睦月');
    expect(s.sekki).toBe('冬至');
  });

  it('立春の前日（2/3）は大寒', () => {
    expect(getSeason('2026-02-03').sekki).toBe('大寒');
  });

  it('師走（12/25）は冬至', () => {
    const s = getSeason('2026-12-25');
    expect(s.wafuMonth).toBe('師走');
    expect(s.sekki).toBe('冬至');
  });

  it('境界日（節気の開始日）はその節気に入る（6/21=夏至）', () => {
    expect(getSeason('2026-06-21').sekki).toBe('夏至');
  });
});
