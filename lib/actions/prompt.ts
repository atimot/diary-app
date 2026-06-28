'use server';

import { generateText } from 'ai';
import { defaultModel } from '@/lib/ai/client';
import { buildPromptInstruction, type TodayPrompt } from '@/lib/ai/daily-prompt';
import { requireSession } from '@/lib/auth/session';
import { pickSeasonalPrompt } from '@/lib/diary/seasonal-prompts';

export async function regenerateTodayPrompt(
  date: string,
): Promise<TodayPrompt> {
  await requireSession();
  try {
    const { text } = await generateText({
      model: defaultModel,
      prompt: buildPromptInstruction(date, true),
    });
    const trimmed = text.trim();
    if (!trimmed) throw new Error('empty prompt');
    return { text: trimmed, source: 'ai' };
  } catch (err) {
    console.error('regenerateTodayPrompt fallback:', err);
    // seed をずらして別の問いを返す（429 連発時も体験を止めない）
    const seed = (Number(date.replaceAll('-', '')) % 11) + 1;
    return { text: pickSeasonalPrompt(date, seed), source: 'seasonal' };
  }
}
