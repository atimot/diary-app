// lib/calendar/month-grid.ts
// Pure date utilities for building the calendar grid.
// All dates are YYYY-MM-DD strings — no Date object math leaks out.

export interface CalendarCell {
  iso: string; // YYYY-MM-DD
  day: number; // 1..31
  inMonth: boolean; // false for padding cells from prev/next month
  isFuture: boolean; // > today
  isToday: boolean;
}

export interface MonthGrid {
  year: number;
  month: number; // 1..12
  weeks: CalendarCell[][]; // each inner array has length 7 (Sunday..Saturday)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatYMD(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parseYMD(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(yyyymmdd: string, days: number): string {
  const d = parseYMD(yyyymmdd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatYMD(d);
}

export function todayInTokyo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Build a 7-column calendar grid for the given year/month.
 * Week starts on Sunday (Japanese convention).
 * Padding from previous/next month fills incomplete weeks.
 */
export function buildMonthGrid(year: number, month: number, today: string): MonthGrid {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday

  const cells: CalendarCell[] = [];

  // Pad with previous month's tail (before the 1st)
  for (let i = firstWeekday; i > 0; i--) {
    const d = new Date(firstOfMonth);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = formatYMD(d);
    cells.push({
      iso,
      day: d.getUTCDate(),
      inMonth: false,
      isFuture: iso > today,
      isToday: iso === today,
    });
  }

  // This month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const iso = formatYMD(d);
    cells.push({
      iso,
      day,
      inMonth: true,
      isFuture: iso > today,
      isToday: iso === today,
    });
  }

  // Pad with next month's head to complete the last week
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const padNeeded = 7 - remainder;
    const startOfNext = new Date(Date.UTC(year, month, 1));
    for (let i = 0; i < padNeeded; i++) {
      const d = new Date(startOfNext);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = formatYMD(d);
      cells.push({
        iso,
        day: d.getUTCDate(),
        inMonth: false,
        isFuture: iso > today,
        isToday: iso === today,
      });
    }
  }

  // Group into weeks
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { year, month, weeks };
}
