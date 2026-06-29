import { describe, expect, it } from 'vitest';
import { computeLongestStreak, computeStreak } from './streak';

describe('computeStreak', () => {
  it('returns 0 when both today and yesterday are missing', () => {
    expect(computeStreak(['2026-06-01'], '2026-06-10')).toBe(0);
  });

  it('returns 1 when only today is written', () => {
    expect(computeStreak(['2026-06-10'], '2026-06-10')).toBe(1);
  });

  it('returns 1 when only yesterday is written (today missing)', () => {
    expect(computeStreak(['2026-06-09'], '2026-06-10')).toBe(1);
  });

  it('counts consecutive days back from today', () => {
    expect(
      computeStreak(['2026-06-08', '2026-06-09', '2026-06-10'], '2026-06-10'),
    ).toBe(3);
  });

  it('stops at the first gap', () => {
    expect(
      computeStreak(
        ['2026-06-05', '2026-06-08', '2026-06-09', '2026-06-10'],
        '2026-06-10',
      ),
    ).toBe(3);
  });

  it('handles month boundary', () => {
    expect(
      computeStreak(['2026-05-31', '2026-06-01', '2026-06-02'], '2026-06-02'),
    ).toBe(3);
  });

  it('handles year boundary', () => {
    expect(computeStreak(['2025-12-31', '2026-01-01'], '2026-01-01')).toBe(2);
  });

  it('ignores duplicate entry dates', () => {
    expect(
      computeStreak(['2026-06-10', '2026-06-10', '2026-06-09'], '2026-06-10'),
    ).toBe(2);
  });

  it('returns 0 for empty entryDates', () => {
    expect(computeStreak([], '2026-06-10')).toBe(0);
  });
});

describe('computeLongestStreak', () => {
  it('空配列は 0', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('単一日は 1', () => {
    expect(computeLongestStreak(['2026-06-10'])).toBe(1);
  });

  it('全部連続ならその長さを返す', () => {
    expect(
      computeLongestStreak(['2026-06-08', '2026-06-09', '2026-06-10']),
    ).toBe(3);
  });

  it('複数の連続ランがあれば最長を返す', () => {
    expect(
      computeLongestStreak([
        '2026-06-01',
        '2026-06-02',
        '2026-06-05',
        '2026-06-06',
        '2026-06-07',
        '2026-06-10',
      ]),
    ).toBe(3);
  });

  it('月をまたぐ連続も数える', () => {
    expect(
      computeLongestStreak(['2026-05-31', '2026-06-01', '2026-06-02']),
    ).toBe(3);
  });

  it('年をまたぐ連続も数える', () => {
    expect(computeLongestStreak(['2025-12-31', '2026-01-01'])).toBe(2);
  });

  it('重複日があっても水増ししない', () => {
    expect(
      computeLongestStreak(['2026-06-09', '2026-06-09', '2026-06-10']),
    ).toBe(2);
  });

  it('未ソート入力でも正しい', () => {
    expect(
      computeLongestStreak(['2026-06-10', '2026-06-08', '2026-06-09']),
    ).toBe(3);
  });
});
