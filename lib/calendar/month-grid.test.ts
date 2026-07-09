import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildMonthGrid,
  formatYearMonth,
  isRealDate,
  nextMonth,
  parseYearMonth,
  prevMonth,
} from './month-grid';

describe('formatYearMonth', () => {
  it('pads month with leading zero', () => {
    expect(formatYearMonth(2026, 3)).toBe('2026-03');
  });

  it('keeps double-digit month as-is', () => {
    expect(formatYearMonth(2026, 12)).toBe('2026-12');
  });
});

describe('parseYearMonth', () => {
  it('parses a valid YYYY-MM string', () => {
    expect(parseYearMonth('2026-06')).toEqual({ year: 2026, month: 6 });
  });

  it('returns null for missing zero-pad', () => {
    expect(parseYearMonth('2026-6')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseYearMonth('hello')).toBeNull();
  });

  it('returns null for month 0', () => {
    expect(parseYearMonth('2026-00')).toBeNull();
  });

  it('returns null for month 13', () => {
    expect(parseYearMonth('2026-13')).toBeNull();
  });
});

describe('prevMonth', () => {
  it('decrements month within the same year', () => {
    expect(prevMonth(2026, 6)).toEqual({ year: 2026, month: 5 });
  });

  it('wraps January to previous December', () => {
    expect(prevMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('nextMonth', () => {
  it('increments month within the same year', () => {
    expect(nextMonth(2026, 6)).toEqual({ year: 2026, month: 7 });
  });

  it('wraps December to next January', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-06-10', 5)).toBe('2026-06-15');
  });

  it('subtracts when days is negative', () => {
    expect(addDays('2026-06-10', -3)).toBe('2026-06-07');
  });

  it('crosses month boundary forward', () => {
    expect(addDays('2026-05-30', 5)).toBe('2026-06-04');
  });

  it('crosses year boundary backward', () => {
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
  });
});

describe('isRealDate', () => {
  it('accepts an ordinary real date', () => {
    expect(isRealDate('2026-02-28')).toBe(true);
  });

  it('accepts Feb 29 on a leap year', () => {
    expect(isRealDate('2024-02-29')).toBe(true);
  });

  it('rejects Feb 29 on a non-leap year', () => {
    expect(isRealDate('2023-02-29')).toBe(false);
  });

  it('rejects a day that overflows the month', () => {
    expect(isRealDate('2025-02-30')).toBe(false);
  });

  it('rejects month 00', () => {
    expect(isRealDate('2026-00-10')).toBe(false);
  });

  it('rejects month 13', () => {
    expect(isRealDate('2026-13-01')).toBe(false);
  });
});

describe('buildMonthGrid', () => {
  it('produces a grid where every week has 7 days', () => {
    const grid = buildMonthGrid(2026, 6, '2026-06-10');
    for (const week of grid.weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('marks today correctly', () => {
    const grid = buildMonthGrid(2026, 6, '2026-06-10');
    const todayCells = grid.weeks.flat().filter((c) => c.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].iso).toBe('2026-06-10');
    expect(todayCells[0].inMonth).toBe(true);
  });

  it('flags future dates relative to today', () => {
    const grid = buildMonthGrid(2026, 6, '2026-06-10');
    const future = grid.weeks.flat().filter((c) => c.isFuture);
    expect(future.every((c) => c.iso > '2026-06-10')).toBe(true);
  });

  it('marks out-of-month padding cells with inMonth=false', () => {
    const grid = buildMonthGrid(2026, 6, '2026-06-10');
    const padding = grid.weeks.flat().filter((c) => !c.inMonth);
    for (const cell of padding) {
      expect(cell.iso.startsWith('2026-06')).toBe(false);
    }
  });

  it('handles a 31-day month', () => {
    const grid = buildMonthGrid(2026, 7, '2026-06-10');
    const inMonthDays = grid.weeks.flat().filter((c) => c.inMonth);
    expect(inMonthDays).toHaveLength(31);
  });

  it('handles a leap year February', () => {
    const grid = buildMonthGrid(2024, 2, '2024-02-15');
    const inMonthDays = grid.weeks.flat().filter((c) => c.inMonth);
    expect(inMonthDays).toHaveLength(29);
  });

  it('handles a non-leap February', () => {
    const grid = buildMonthGrid(2025, 2, '2025-02-15');
    const inMonthDays = grid.weeks.flat().filter((c) => c.inMonth);
    expect(inMonthDays).toHaveLength(28);
  });
});
