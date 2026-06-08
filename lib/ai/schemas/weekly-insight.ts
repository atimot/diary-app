// lib/ai/schemas/weekly-insight.ts
import { z } from 'zod';

export const weeklyInsightOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      '過去7日分の日記から読み取れる、最近のこの人の考えや気持ちの動向。' +
        '3〜5文の自然な日本語で、「最近のあなた」を主語に語りかける文体で。',
    ),
  advice: z
    .string()
    .describe(
      '今この人に伝えたい、温かいワンポイントアドバイス。' +
        '1〜2文で、押し付けがましくない柔らかい口調で。',
    ),
});

export type WeeklyInsightOutput = z.infer<typeof weeklyInsightOutputSchema>;
