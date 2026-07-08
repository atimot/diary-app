import { describe, expect, it } from 'vitest';
import { currentHourInTokyo, greetingForHour } from './greeting';

describe('greetingForHour', () => {
  it('朝（5時〜10時台）はおはよう', () => {
    expect(greetingForHour(5)).toBe('おはようございます。');
    expect(greetingForHour(10)).toBe('おはようございます。');
  });

  it('昼（11時〜17時台）はこんにちは', () => {
    expect(greetingForHour(11)).toBe('こんにちは。');
    expect(greetingForHour(17)).toBe('こんにちは。');
  });

  it('夜（18時〜4時台）はこんばんは', () => {
    expect(greetingForHour(18)).toBe('こんばんは。');
    expect(greetingForHour(23)).toBe('こんばんは。');
    expect(greetingForHour(0)).toBe('こんばんは。');
    expect(greetingForHour(4)).toBe('こんばんは。');
  });
});

describe('currentHourInTokyo', () => {
  it('UTC 15:00 は JST 0 時（h23 で 24 にならない）', () => {
    expect(currentHourInTokyo(new Date('2026-07-08T15:00:00Z'))).toBe(0);
  });

  it('UTC 0:00 は JST 9 時', () => {
    expect(currentHourInTokyo(new Date('2026-07-08T00:00:00Z'))).toBe(9);
  });
});
