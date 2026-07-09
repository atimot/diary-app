// lib/design/containers.ts
// コンテナ2段階（AGENTS.md 憲法 §5）: 集中幅 680px とボード幅 max-w-[1120px]+px-10

// 集中幅 680px（今日・個別日記・エラー画面。サインインは独自の中央寄せレイアウト）
export const FOCUS_CONTAINER =
  'mx-auto w-full max-w-[680px] flex-1 px-4 pt-6 pb-11 md:px-6 md:pt-11 md:pb-20';

// ボード幅 1120px（これまで・気づき、ヘッダーと同じ罫に揃う）
export const BOARD_CONTAINER =
  'mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-11 md:px-6 md:pt-10 md:pb-20 lg:px-10';
