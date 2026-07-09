// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { generateCombinedInsight } from '@/lib/ai/combined-insight';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { listRecentEntries } from '@/lib/db/queries/diary';
import { enneagramSnapshots, weeklyInsights } from '@/lib/db/schema';

const MIN_ENTRIES = 7;

export type RegenerateResult = { ok: true } | { ok: false; error: string };

/**
 * Gemini / AI SDK の 429 (rate limit) エラーを識別する。
 * 無料枠は gemini-2.5-flash で 5 RPM。
 */
function isRateLimitError(err: unknown): boolean {
  const obj = err as { statusCode?: number };
  return obj?.statusCode === 429;
}

export async function regenerateInsight(): Promise<RegenerateResult> {
  // 未認証時の redirect() の throw を下の汎用 catch に飲ませないため、try の外で呼ぶ
  const session = await requireSession();
  const userId = session.user.id;

  try {
    // entryDate DESC + limit なので、返るのは最新の MIN_ENTRIES 件
    // （limit 未満しか返らなければ、それが実件数）
    const recent = await listRecentEntries(MIN_ENTRIES);
    if (recent.length < MIN_ENTRIES) {
      return {
        ok: false,
        error: `日記が${MIN_ENTRIES}件以上必要です（現在${recent.length}件）`,
      };
    }

    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    // 1 リクエストで summary + advice + エニアグラム親和度を取得
    const { output, model } = await generateCombinedInsight(recent);
    const { summary, advice, enneagram } = output;
    const { scores, rationale } = enneagram;

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
        .insert(enneagramSnapshots)
        .values({
          userId,
          snapshotDate: periodEnd,
          scores,
          rationale,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [enneagramSnapshots.userId, enneagramSnapshots.snapshotDate],
          set: {
            scores,
            rationale,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        }),
    ]);

    revalidatePath('/insights');
    return { ok: true };
  } catch (err) {
    // try 内のクエリ経由で requireSession の redirect() が throw され得る。
    // NEXT_REDIRECT 等の内部エラーは握りつぶさず再スロー（Next 公式パターン）
    unstable_rethrow(err);
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
      error:
        '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
