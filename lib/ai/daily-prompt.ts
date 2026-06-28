// lib/ai/daily-prompt.ts
import { generateText } from 'ai';
import { unstable_cache } from 'next/cache';
import { defaultModel } from '@/lib/ai/client';
import { getSeason } from '@/lib/diary/season';
import { pickSeasonalPrompt } from '@/lib/diary/seasonal-prompts';

export interface TodayPrompt {
  text: string;
  source: 'ai' | 'seasonal';
}

// AI への指示文。fresh=true は「問いを変える」用に別角度を促す。
export function buildPromptInstruction(date: string, fresh: boolean): string {
  const { sekki, note } = getSeason(date);
  const freshLine = fresh
    ? '- 直前までとは別の角度から、新しい問いにする。\n'
    : '';
  return `あなたは思いやりのある親友です。これから日記を書こうとしている相手に、今日一日を静かにふり返るための「問いかけ」を1つだけ、日本語で投げかけてください。
- 季節は「${sekki}」（${note}）。さりげなく織り込んでも、織り込まなくてもよい。
- 説教や評価はしない。やさしく、答えやすい問い。
${freshLine}- 出力は問いかけの1文だけ。前置き・引用符・箇条書き・絵文字は付けない。`;
}

async function generatePrompt(date: string): Promise<string> {
  const { text } = await generateText({
    model: defaultModel,
    prompt: buildPromptInstruction(date, false),
  });
  return text.trim();
}

// 日付キーで1日1回だけ生成（Gemini 無料枠 5 RPM 対策）。
// 同じ日付の再アクセスはキャッシュ命中で AI を叩かない。
function getDailyPromptCached(date: string): Promise<string> {
  return unstable_cache(() => generatePrompt(date), ['daily-prompt', date], {
    revalidate: 60 * 60 * 24,
    tags: ['daily-prompt'],
  })();
}

export async function getTodayPrompt(date: string): Promise<TodayPrompt> {
  try {
    const text = await getDailyPromptCached(date);
    if (!text) throw new Error('empty prompt');
    return { text, source: 'ai' };
  } catch (err) {
    console.error('getTodayPrompt fallback:', err);
    return { text: pickSeasonalPrompt(date), source: 'seasonal' };
  }
}
