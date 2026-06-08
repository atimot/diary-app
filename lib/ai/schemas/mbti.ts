// lib/ai/schemas/mbti.ts
import { z } from 'zod';

export const mbtiScoresSchema = z.object({
  EI: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '内向(I)〜外向(E)の傾向。-1=完全に内向的、+1=完全に外向的、0=ちょうど中間。' +
        '人との関わり方、エネルギーの源（一人/集団）、社交への態度から推測。',
    ),
  SN: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '感覚(S)〜直観(N)の傾向。-1=現実重視の感覚型、+1=可能性重視の直観型。' +
        '具体的/抽象的、現在/未来、事実/アイデアのどちらに重きを置くかから推測。',
    ),
  TF: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '思考(T)〜感情(F)の傾向。-1=論理優先の思考型、+1=人間関係や調和を優先する感情型。' +
        '意思決定の基準（合理性/共感）から推測。',
    ),
  JP: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '判断(J)〜知覚(P)の傾向。-1=計画的で構造を好む判断型、+1=柔軟で即興を好む知覚型。' +
        '生活の組み立て方（計画/即興）から推測。',
    ),
  rationale: z
    .string()
    .describe(
      '4軸のスコアをどう判断したかの根拠を、3〜5文の自然な日本語で。' +
        '日記から拾った具体的な傾向に触れること。',
    ),
});

export type MbtiScoresOutput = z.infer<typeof mbtiScoresSchema>;
