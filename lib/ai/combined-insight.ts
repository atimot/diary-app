// lib/ai/combined-insight.ts
// 過去7日分の日記から「週間サマリー + ワンポイントアドバイス + エニアグラム9タイプ親和度」を
// 1回の generateText 呼び出しで取得する関数。
// Gemini 無料枠の RPM (5/分) 制約を意識し、1クリックでの API 消費を半減させる。
import { generateText, Output } from 'ai';
import { defaultModel, defaultModelId } from '@/lib/ai/client';
import {
  type CombinedInsightOutput,
  combinedInsightOutputSchema,
} from '@/lib/ai/schemas/combined-insight';
import type { DiaryEntry } from '@/lib/db/schema';

export interface GenerateCombinedInsightResult {
  output: CombinedInsightOutput;
  model: string;
}

export async function generateCombinedInsight(
  entries: DiaryEntry[],
): Promise<GenerateCombinedInsightResult> {
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

  const prompt = `あなたは思いやりのある親友であり、観察者でもあります。
以下は同じ人物の最近7日分の日記です。古いものから新しいものへ並んでいます。

${entryList}

これらの日記から、以下の3つを一貫した観察に基づいて生成してください：

1. **summary**: 最近のこの人の考えや気持ちの動向のまとめ
2. **advice**: 今この人に伝えたい温かいワンポイントアドバイス
3. **enneagram**: エニアグラム9タイプそれぞれの、今週の傾向としての親和度（各0〜1）と判断根拠

共通の注意:
- これは確定診断ではなく、最近7日間の言動から見える「傾向」の観察
- 評価や説教はせず、共感ベースで
- 「最近のあなた」を主語に、相手に語りかける文体で
- プライバシー配慮として、日付や具体的な出来事は一般化してもよい

エニアグラムの補足:
- 各タイプは「行動の様式」ではなく「核となる動機・恐れ」で見分ける（何をしたかより、なぜそうしたか）
- スコアは各タイプ独立の親和度。合計を1にする必要はない
- はっきり表れたものだけ高く、根拠が薄いものは低めに。全体に控えめでよい
- rationale は上位に出たタイプについて、具体的な日記の内容に触れながら観察的に`;

  const { output } = await generateText({
    model: defaultModel,
    prompt,
    output: Output.object({
      schema: combinedInsightOutputSchema,
    }),
  });

  return {
    output,
    model: defaultModelId,
  };
}
