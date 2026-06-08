// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { weeklyInsights, mbtiSnapshots } from '@/lib/db/schema';
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { generateWeeklyInsight } from '@/lib/ai/weekly-insight';
import { scoreMbti } from '@/lib/ai/mbti-scorer';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';
const MIN_ENTRIES = 7;

export type RegenerateResult =
  | { ok: true; partial?: { insight?: string; mbti?: string } }
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

    const recent = allEntries.slice(0, MIN_ENTRIES);
    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    // Insight と MBTI を並列で生成（片方が失敗してももう片方は保存する）
    const [insightResult, mbtiResult] = await Promise.allSettled([
      generateWeeklyInsight(recent),
      scoreMbti(recent),
    ]);

    const partial: { insight?: string; mbti?: string } = {};

    if (insightResult.status === 'fulfilled') {
      const { output, model } = insightResult.value;
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
    } else {
      console.error('insight generation failed:', insightResult.reason);
      partial.insight = 'サマリーの生成に失敗しました';
    }

    if (mbtiResult.status === 'fulfilled') {
      const { output, model } = mbtiResult.value;
      const { rationale: _rationale, ...scores } = output;
      await db
        .insert(mbtiSnapshots)
        .values({
          userId: USER_ID,
          snapshotDate: periodEnd,
          scores,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [mbtiSnapshots.userId, mbtiSnapshots.snapshotDate],
          set: {
            scores,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        });
    } else {
      console.error('mbti scoring failed:', mbtiResult.reason);
      partial.mbti = 'MBTI 分析の生成に失敗しました';
    }

    // 両方失敗ならエラー、片方でも成功なら ok (partial 付き)
    if (insightResult.status === 'rejected' && mbtiResult.status === 'rejected') {
      return {
        ok: false,
        error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
      };
    }

    revalidatePath('/insights');
    return Object.keys(partial).length > 0 ? { ok: true, partial } : { ok: true };
  } catch (err) {
    console.error('Failed to regenerate insight:', err);
    return {
      ok: false,
      error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
