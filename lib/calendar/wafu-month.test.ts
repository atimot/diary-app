import { describe, expect, it } from 'vitest';
import { wafuMonthName } from './wafu-month';

describe('wafuMonthName', () => {
  it('1..12 を和風月名にする', () => {
    expect(wafuMonthName(1)).toBe('睦月');
    expect(wafuMonthName(6)).toBe('水無月');
    expect(wafuMonthName(12)).toBe('師走');
  });
  it('範囲外は空文字', () => {
    expect(wafuMonthName(0)).toBe('');
    expect(wafuMonthName(13)).toBe('');
  });
});
