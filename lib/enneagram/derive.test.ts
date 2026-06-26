import { describe, expect, it } from 'vitest';
import {
  centerBreakdown,
  dominantType,
  topTypes,
  typeCode,
  wing,
} from './derive';
import {
  type EnneagramScores,
  type EnneagramTypeNumber,
  isEnneagramScores,
} from './types';

function scores(
  partial: Partial<Record<EnneagramTypeNumber, number>>,
): EnneagramScores {
  const base: EnneagramScores = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };
  return { ...base, ...partial };
}

describe('dominantType', () => {
  it('returns the type with the highest score', () => {
    expect(dominantType(scores({ 9: 0.8, 6: 0.7 }))).toBe(9);
  });

  it('breaks ties by the smaller type number', () => {
    expect(dominantType(scores({ 2: 0.9, 5: 0.9 }))).toBe(2);
  });
});

describe('wing', () => {
  it('picks the adjacent type with the higher score', () => {
    expect(wing(scores({ 9: 0.8, 1: 0.6, 8: 0.2 }), 9)).toBe(1);
  });

  it('wraps so type 1 neighbours 9 and 2', () => {
    expect(wing(scores({ 1: 0.9, 9: 0.5, 2: 0.2 }), 1)).toBe(9);
  });

  it('wraps so type 9 neighbours 8 and 1', () => {
    expect(wing(scores({ 9: 0.9, 8: 0.1, 1: 0.4 }), 9)).toBe(1);
  });

  it('breaks wing ties by the smaller type number', () => {
    expect(wing(scores({ 5: 0.9, 4: 0.3, 6: 0.3 }), 5)).toBe(4);
  });
});

describe('typeCode', () => {
  it('formats dominant and wing as NwM', () => {
    expect(typeCode(9, 1)).toBe('9w1');
  });
});

describe('topTypes', () => {
  it('returns the top n types sorted by score descending', () => {
    expect(topTypes(scores({ 9: 0.8, 6: 0.7, 2: 0.6, 1: 0.4 }), 3)).toEqual([
      { type: 9, score: 0.8 },
      { type: 6, score: 0.7 },
      { type: 2, score: 0.6 },
    ]);
  });

  it('breaks ties by the smaller type number', () => {
    expect(topTypes(scores({ 3: 0.5, 7: 0.5 }), 2)).toEqual([
      { type: 3, score: 0.5 },
      { type: 7, score: 0.5 },
    ]);
  });
});

describe('isEnneagramScores', () => {
  it('accepts a full 9-key numeric scores object', () => {
    expect(isEnneagramScores(scores({ 9: 0.8, 1: 0.4 }))).toBe(true);
  });

  it('rejects an MBTI-shaped object', () => {
    expect(isEnneagramScores({ EI: 0.5, SN: -0.2, TF: 0.1, JP: 0 })).toBe(
      false,
    );
  });

  it('rejects when a type key is missing', () => {
    expect(
      isEnneagramScores({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }),
    ).toBe(false);
  });

  it('rejects non-number or non-finite values', () => {
    expect(isEnneagramScores({ ...scores({}), 5: 'x' })).toBe(false);
    expect(isEnneagramScores({ ...scores({}), 3: Number.NaN })).toBe(false);
  });

  it('rejects null and non-objects', () => {
    expect(isEnneagramScores(null)).toBe(false);
    expect(isEnneagramScores(42)).toBe(false);
  });
});

describe('centerBreakdown', () => {
  it('groups scores into gut/heart/head and computes shares', () => {
    const b = centerBreakdown(
      scores({ 8: 0.2, 9: 0.8, 1: 0.5, 2: 0.6, 3: 0.4, 6: 0.5 }),
    );
    expect(b.centers.map((c) => c.center)).toEqual(['gut', 'heart', 'head']);
    const gut = b.centers.find((c) => c.center === 'gut');
    expect(gut?.total).toBeCloseTo(1.5);
    expect(gut?.share).toBeCloseTo(0.5);
    expect(b.dominant).toBe('gut');
  });

  it('returns zero shares and a deterministic dominant when all scores are zero', () => {
    const b = centerBreakdown(scores({}));
    expect(b.centers.every((c) => c.share === 0)).toBe(true);
    expect(b.dominant).toBe('gut');
  });
});
