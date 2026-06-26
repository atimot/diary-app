const WAFU_MONTHS = [
  '睦月',
  '如月',
  '弥生',
  '卯月',
  '皐月',
  '水無月',
  '文月',
  '葉月',
  '長月',
  '神無月',
  '霜月',
  '師走',
] as const;

// month は 1..12（呼び出し側の month-grid が保証）。範囲外は空文字。
export function wafuMonthName(month: number): string {
  return WAFU_MONTHS[month - 1] ?? '';
}
