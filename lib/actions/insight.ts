// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { weeklyInsights, mbtiSnapshots } from '@/lib/db/schema';
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { generateCombinedInsight } from '@/lib/ai/combined-insight';

const MIN_ENTRIES = 7;

export type RegenerateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Gemini / AI SDK の 429 (rate limit) エラーを識別する。
 * 無料枠は gemini-2.5-flash で 5 RPM。
 */
function isRateLimitError(err: unknown): boolean {
  const obj = err as { statusCode?: number };
  return obj?.statusCode === 429;
}

export async function regenerateInsight(): Promise<RegenerateResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const allEntries = await listDiaryEntries();
    if (allEntries.length < MIN_ENTRIES) {
      return {
        ok: false,
        error: `日記が${MIN_ENTRIES}件以上必要です（現在${allEntries.length}件）`,
      };
    }

    // listDiaryEntries は entryDate DESC なので、最初の7件が最新7件
    const recent = allEntries.slice(0, MIN_ENTRIES);
    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    // 1 リクエストで summary + advice + MBTI を取得
    const { output, model } = await generateCombinedInsight(recent);
    const { summary, advice, mbti } = output;
    const { rationale: _rationale, ...mbtiScores } = mbti;

    // 並列に DB upsert（同じ AI 結果から派生する 2 レコード）
    await Promise.all([
      db
        .insert(weeklyInsights)
        .values({
          userId,
          periodStart,
          periodEnd,
          summary,
          advice,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [weeklyInsights.userId, weeklyInsights.periodStart],
          set: {
            periodEnd,
            summary,
            advice,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        }),
      db
        .insert(mbtiSnapshots)
        .values({
          userId,
          snapshotDate: periodEnd,
          scores: mbtiScores,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [mbtiSnapshots.userId, mbtiSnapshots.snapshotDate],
          set: {
            scores: mbtiScores,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        }),
    ]);

    revalidatePath('/insights');
    return { ok: true };
  } catch (err) {
    console.error('Failed to regenerate insight:', err);
    if (isRateLimitError(err)) {
      return {
        ok: false,
        error:
          'AI のリクエストが集中しています。1分ほど待ってからもう一度お試しください。',
      };
    }
    return {
      ok: false,
      error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
