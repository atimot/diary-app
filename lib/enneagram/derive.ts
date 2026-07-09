// lib/enneagram/derive.ts
// 9タイプ親和度スコアから、主タイプ・ウイング・上位タイプを
// 決定的に算出する純関数群。AI のブレを避けるため、導出は一意に定める。
import {
  ENNEAGRAM_TYPE_NUMBERS,
  type EnneagramScores,
  type EnneagramTypeNumber,
} from './types';

export interface TypeScore {
  type: EnneagramTypeNumber;
  score: number;
}

// スコア降順、同点はタイプ番号の小さい方を先に。
export function topTypes(scores: EnneagramScores, n: number): TypeScore[] {
  return ENNEAGRAM_TYPE_NUMBERS.map((type) => ({ type, score: scores[type] }))
    .sort((a, b) => b.score - a.score || a.type - b.type)
    .slice(0, n);
}

// 最も親和度の高いタイプ。同点はタイプ番号の小さい方（reduce は厳密に大きい時のみ更新）。
export function dominantType(scores: EnneagramScores): EnneagramTypeNumber {
  return ENNEAGRAM_TYPE_NUMBERS.reduce((best, t) =>
    scores[t] > scores[best] ? t : best,
  );
}

// 円周上の隣接タイプ（±1、1↔9 でループ）のうち高い方。同点はタイプ番号の小さい方。
export function wing(
  scores: EnneagramScores,
  dominant: EnneagramTypeNumber,
): EnneagramTypeNumber {
  const prev = (((dominant - 2 + 9) % 9) + 1) as EnneagramTypeNumber;
  const next = ((dominant % 9) + 1) as EnneagramTypeNumber;
  if (scores[prev] !== scores[next]) {
    return scores[prev] > scores[next] ? prev : next;
  }
  return prev < next ? prev : next;
}

export function typeCode(
  dominant: EnneagramTypeNumber,
  wingType: EnneagramTypeNumber,
): string {
  return `${dominant}w${wingType}`;
}
