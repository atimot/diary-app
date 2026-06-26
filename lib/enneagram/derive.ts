// lib/enneagram/derive.ts
// 9タイプ親和度スコアから、主タイプ・ウイング・上位タイプ・3センター内訳を
// 決定的に算出する純関数群。AI のブレを避けるため、導出は一意に定める。
import {
  CENTER_MEMBERS,
  CENTER_ORDER,
  ENNEAGRAM_TYPE_NUMBERS,
  type EnneagramCenter,
  type EnneagramScores,
  type EnneagramTypeNumber,
} from './types';

export interface TypeScore {
  type: EnneagramTypeNumber;
  score: number;
}

export interface CenterShare {
  center: EnneagramCenter;
  total: number;
  share: number;
}

export interface CenterBreakdown {
  centers: CenterShare[];
  dominant: EnneagramCenter;
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

// 腹/心/頭の合計と正規化シェアを返す。全0なら share は 0、dominant は CENTER_ORDER 先頭。
export function centerBreakdown(scores: EnneagramScores): CenterBreakdown {
  const centers: CenterShare[] = CENTER_ORDER.map((center) => {
    const total = CENTER_MEMBERS[center].reduce((sum, t) => sum + scores[t], 0);
    return { center, total, share: 0 };
  });
  const grandTotal = centers.reduce((sum, c) => sum + c.total, 0);
  for (const c of centers) {
    c.share = grandTotal === 0 ? 0 : c.total / grandTotal;
  }
  const dominant = centers.reduce((best, c) =>
    c.total > best.total ? c : best,
  ).center;
  return { centers, dominant };
}
