import { describe, expect, it } from 'vitest';
import { getSeason } from './season';

describe('getSeason', () => {
  it('夏至の頃（6/28）は夏至', () => {
    expect(getSeason('2026-06-28')).toEqual({
      sekki: '夏至',
      note: '一年で最も昼が長い頃。',
    });
  });

  it('元日（1/1）は小寒より前なので前年の冬至へ倒す', () => {
    expect(getSeason('2026-01-01').sekki).toBe('冬至');
  });

  it('立春の前日（2/3）は大寒', () => {
    expect(getSeason('2026-02-03').sekki).toBe('大寒');
  });

  it('年末（12/25）は冬至', () => {
    expect(getSeason('2026-12-25').sekki).toBe('冬至');
  });

  it('境界日（節気の開始日）はその節気に入る（6/21=夏至）', () => {
    expect(getSeason('2026-06-21').sekki).toBe('夏至');
  });
});
