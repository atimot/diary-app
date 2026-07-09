// lib/enneagram/types.ts
// エニアグラム9タイプの静的定義。AI には説明を生成させず、ここを唯一の出典とする。

export type EnneagramTypeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type EnneagramCenter = 'gut' | 'heart' | 'head';

export interface EnneagramType {
  number: EnneagramTypeNumber;
  key: string;
  name: string;
  coreDesire: string;
  coreFear: string;
  center: EnneagramCenter;
}

// 各タイプの今週の親和度（0〜1）。キーはタイプ番号。
export type EnneagramScores = Record<EnneagramTypeNumber, number>;

export const ENNEAGRAM_TYPE_NUMBERS: EnneagramTypeNumber[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
];

// jsonb から読み出した scores が、9タイプ揃った有効な親和度かを検証する。
// 旧 MBTI 形式（{EI,SN,TF,JP}）の残存行などを、描画前に弾くためのガード。
export function isEnneagramScores(value: unknown): value is EnneagramScores {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return ENNEAGRAM_TYPE_NUMBERS.every(
    (n) => typeof obj[n] === 'number' && Number.isFinite(obj[n]),
  );
}

// チップや凡例で使う短縮ラベル（「感情タイプ」「●感情」など）。
export const CENTER_SHORT_LABELS: Record<EnneagramCenter, string> = {
  gut: '本能',
  heart: '感情',
  head: '思考',
};

// 3センターの色。値は globals.css の CSS 変数（ライト/ダーク両対応）。
// SVG / HTML どちらも style 経由で var() 参照する。
export const CENTER_COLOR_VARS: Record<EnneagramCenter, string> = {
  gut: 'var(--center-gut)',
  heart: 'var(--center-heart)',
  head: 'var(--center-head)',
};

// 凡例（EnneagramTrends）の表示順に使う、安定したセンター順。
export const CENTER_ORDER: EnneagramCenter[] = ['gut', 'heart', 'head'];

export const ENNEAGRAM_TYPES: Record<EnneagramTypeNumber, EnneagramType> = {
  1: {
    number: 1,
    key: 'reformer',
    name: '改革する人',
    coreDesire: '正しく誠実でありたい',
    coreFear: '欠陥がある・堕落しているとみなされること',
    center: 'gut',
  },
  2: {
    number: 2,
    key: 'helper',
    name: '助ける人',
    coreDesire: '人に愛され、必要とされたい',
    coreFear: '愛されない・必要とされないこと',
    center: 'heart',
  },
  3: {
    number: 3,
    key: 'achiever',
    name: '達成する人',
    coreDesire: '価値ある存在として認められたい',
    coreFear: '無価値だとみなされること',
    center: 'heart',
  },
  4: {
    number: 4,
    key: 'individualist',
    name: '個性的な人',
    coreDesire: '自分らしさと固有の意味を持ちたい',
    coreFear: '存在意義やアイデンティティを失うこと',
    center: 'heart',
  },
  5: {
    number: 5,
    key: 'investigator',
    name: '探究する人',
    coreDesire: '有能でありたい・深く理解したい',
    coreFear: '無力・無知で押し潰されること',
    center: 'head',
  },
  6: {
    number: 6,
    key: 'loyalist',
    name: '忠実な人',
    coreDesire: '安全と安心を確保したい',
    coreFear: '支えや拠り所を失うこと',
    center: 'head',
  },
  7: {
    number: 7,
    key: 'enthusiast',
    name: '熱中する人',
    coreDesire: '満たされて楽しくありたい',
    coreFear: '苦痛や欠乏に閉じ込められること',
    center: 'head',
  },
  8: {
    number: 8,
    key: 'challenger',
    name: '挑戦する人',
    coreDesire: '自分の力で人生を切り開きたい',
    coreFear: '他者に支配される・傷つけられること',
    center: 'gut',
  },
  9: {
    number: 9,
    key: 'peacemaker',
    name: '平和をもたらす人',
    coreDesire: '心の平和と調和を保ちたい',
    coreFear: '対立や分離で平穏を失うこと',
    center: 'gut',
  },
};
