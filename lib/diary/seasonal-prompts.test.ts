import { describe, expect, it } from 'vitest';
import { pickSeasonalPrompt } from './seasonal-prompts';

describe('pickSeasonalPrompt', () => {
  it('同じ date / seed なら同じ問い（決定的）', () => {
    expect(pickSeasonalPrompt('2026-06-28')).toBe(
      pickSeasonalPrompt('2026-06-28', 0),
    );
  });

  it('seed を変えると別の問いになりうる（4 でずれる）', () => {
    expect(pickSeasonalPrompt('2026-06-28', 4)).not.toBe(
      pickSeasonalPrompt('2026-06-28', 0),
    );
  });

  it('常に非空の文字列を返す', () => {
    for (const d of ['2026-01-01', '2026-06-28', '2026-12-31']) {
      expect(pickSeasonalPrompt(d).length).toBeGreaterThan(0);
    }
  });
});
