// lib/ai/weekly-insight.ts
import { generateText, Output } from 'ai';
import { defaultModel, defaultModelId } from '@/lib/ai/client';
import {
  weeklyInsightOutputSchema,
  type WeeklyInsightOutput,
} from '@/lib/ai/schemas/weekly-insight';
import type { DiaryEntry } from '@/lib/db/schema';

export interface GenerateWeeklyInsightResult {
  output: WeeklyInsightOutput;
  model: string;
}

export async function generateWeeklyInsight(
  entries: DiaryEntry[],
): Promise<GenerateWeeklyInsightResult> {
  if (entries.length < 7) {
    throw new Error(`Need at least 7 entries, got ${entries.length}`);
  }

  // 最新7件を使う（呼び出し側でもソート済み前提だが念のため）
  const recent = [...entries]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .slice(0, 7);

  const entryList = recent
    .slice()
    .reverse() // 古い→新しい順でプロンプトに渡す
    .map((e) => `■ ${e.entryDate}\n${e.content}`)
    .join('\n\n');

  const prompt = `あなたは思いやりのある親友です。
以下は同じ人物の最近7日分の日記です。古いものから新しいものへ並んでいます。

${entryList}

これらの日記から、最近のこの人の考えや気持ちの動向をまとめ、
そっと添えるワンポイントアドバイスを生成してください。

注意:
- 日付や具体的な出来事は一般化して書いてもよい（プライバシー配慮）
- 評価や説教はせず、共感ベースで
- 「最近のあなたは〜」のように相手に語りかける文体で`;

  const { output } = await generateText({
    model: defaultModel,
    prompt,
    output: Output.object({
      schema: weeklyInsightOutputSchema,
    }),
  });

  return {
    output,
    model: defaultModelId,
  };
}
