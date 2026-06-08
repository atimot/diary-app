// lib/ai/mbti-scorer.ts
import { generateText, Output } from 'ai';
import { defaultModel, defaultModelId } from '@/lib/ai/client';
import { mbtiScoresSchema, type MbtiScoresOutput } from '@/lib/ai/schemas/mbti';
import type { DiaryEntry } from '@/lib/db/schema';

export interface ScoreMbtiResult {
  output: MbtiScoresOutput;
  model: string;
}

export async function scoreMbti(entries: DiaryEntry[]): Promise<ScoreMbtiResult> {
  if (entries.length < 7) {
    throw new Error(`Need at least 7 entries, got ${entries.length}`);
  }

  const recent = [...entries]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .slice(0, 7);

  const entryList = recent
    .slice()
    .reverse()
    .map((e) => `■ ${e.entryDate}\n${e.content}`)
    .join('\n\n');

  const prompt = `あなたは思いやりのある観察者です。
以下は同じ人物の最近7日分の日記です。古いものから新しいものへ並んでいます。

${entryList}

これらの日記から、この人の MBTI 4軸（EI/SN/TF/JP）の最近の傾向を
それぞれ -1 から +1 のスコアで推測してください。

注意:
- これは性格の確定診断ではなく、最近7日間の言動から見える「傾向」
- 0 = どちらでもない、偏りなし
- 自信がないときは 0 寄りに（極端な値は強い根拠があるときだけ）
- rationale は具体的な日記の内容に触れながら、批判的にならず観察的に`;

  const { output } = await generateText({
    model: defaultModel,
    prompt,
    output: Output.object({
      schema: mbtiScoresSchema,
    }),
  });

  return {
    output,
    model: defaultModelId,
  };
}
