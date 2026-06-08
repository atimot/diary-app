// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { weeklyInsights } from '@/lib/db/schema';
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { generateWeeklyInsight } from '@/lib/ai/weekly-insight';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';
const MIN_ENTRIES = 7;

export type RegenerateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function regenerateInsight(): Promise<RegenerateResult> {
  try {
    const allEntries = await listDiaryEntries();
    if (allEntries.length < MIN_ENTRIES) {
      return {
        ok: false,
        error: `日記が${MIN_ENTRIES}件以上必要です（現在${allEntries.length}件）`,
      };
    }

    // listDiaryEntries は entryDate DESC なので、最初の7件が最新7件
    const recent = allEntries.slice(0, MIN_ENTRIES);
    const { output, model } = await generateWeeklyInsight(recent);

    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    await db
      .insert(weeklyInsights)
      .values({
        userId: USER_ID,
        periodStart,
        periodEnd,
        summary: output.summary,
        advice: output.advice,
        sourceEntryIds,
        model,
      })
      .onConflictDoUpdate({
        target: [weeklyInsights.userId, weeklyInsights.periodStart],
        set: {
          periodEnd,
          summary: output.summary,
          advice: output.advice,
          sourceEntryIds,
          model,
          createdAt: new Date(),
        },
      });

    revalidatePath('/insights');
    return { ok: true };
  } catch (err) {
    console.error('Failed to regenerate insight:', err);
    return {
      ok: false,
      error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
