import { describe, expect, it } from 'vitest';
import { findColorLiterals } from './color-literals';

describe('findColorLiterals', () => {
  it('生の色リテラルを検出する（must-fail パターン）', () => {
    expect(findColorLiterals('className="bg-[#fff]"')).toHaveLength(1);
    expect(findColorLiterals('className="text-[#1b1916]"')).toHaveLength(1);
    expect(findColorLiterals("style={{ color: '#5f7a4f' }}")).toHaveLength(1);
    expect(findColorLiterals("backgroundColor: 'rgb(0,0,0)'")).toHaveLength(1);
    expect(findColorLiterals('color: hsl(20 50% 40%)')).toHaveLength(1);
    expect(findColorLiterals('fill: oklch(0.6 0.13 70)')).toHaveLength(1);
  });

  it('トークン/許可パターンは検出しない（must-pass）', () => {
    expect(findColorLiterals('className="text-muted-foreground/30"')).toEqual([]);
    expect(
      findColorLiterals('color-mix(in oklab, var(--center-gut) 15%, transparent)'),
    ).toEqual([]);
    expect(findColorLiterals('className="min-h-[15rem] max-w-[260px]"')).toEqual([]);
    expect(findColorLiterals('borderLeftColor: "var(--center-head)"')).toEqual([]);
    expect(findColorLiterals('className="bg-primary text-foreground"')).toEqual([]);
  });
});
