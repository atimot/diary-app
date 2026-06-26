// lib/ai/schemas/combined-insight.ts
// 1リクエストで summary + advice + エニアグラム9タイプ親和度を返させる統合スキーマ。
import { z } from 'zod';

const affinity = (type: string, motivation: string) =>
  z
    .number()
    .min(0)
    .max(1)
    .describe(
      `タイプ${type}（${motivation}）の、今週の日記に表れた親和度。` +
        '0=ほぼ無関係、1=強く表れている。自信がなければ低めに。',
    );

export const combinedInsightOutputSchema = z.object({
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
  enneagram: z.object({
    scores: z
      .object({
        '1': affinity(
          '1 改革する人',
          '正しく誠実でありたい／怒りを抑え理想を追う',
        ),
        '2': affinity(
          '2 助ける人',
          '人に愛され必要とされたい／他者の世話に向かう',
        ),
        '3': affinity(
          '3 達成する人',
          '価値ある存在と認められたい／成果や成功を追う',
        ),
        '4': affinity(
          '4 個性的な人',
          '自分らしさと意味を求める／感情や独自性に浸る',
        ),
        '5': affinity(
          '5 探究する人',
          '有能でありたい・深く理解したい／距離を取り観察する',
        ),
        '6': affinity('6 忠実な人', '安全と安心を求める／不安や疑いに備える'),
        '7': affinity(
          '7 熱中する人',
          '満たされて楽しくありたい／刺激や選択肢を求める',
        ),
        '8': affinity(
          '8 挑戦する人',
          '自分の力で人生を切り開く／主導権や強さを示す',
        ),
        '9': affinity(
          '9 平和をもたらす人',
          '心の平和と調和を保つ／対立を避けて受け流す',
        ),
      })
      .describe('9タイプそれぞれの、今週の傾向としての親和度（各 0〜1、独立）'),
    rationale: z
      .string()
      .describe(
        '上位に出たタイプをどう判断したかの根拠を、3〜5文の自然な日本語で。' +
          '日記から拾った具体的な動機や反応に触れ、診断ではなく観察として。',
      ),
  }),
});

export type CombinedInsightOutput = z.infer<typeof combinedInsightOutputSchema>;
