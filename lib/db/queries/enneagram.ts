// lib/db/queries/enneagram.ts
import { desc, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { type EnneagramSnapshot, enneagramSnapshots } from '@/lib/db/schema';
import { isEnneagramScores } from '@/lib/enneagram/types';

export async function getLatestEnneagramSnapshot(): Promise<
  EnneagramSnapshot | undefined
> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select()
    .from(enneagramSnapshots)
    .where(eq(enneagramSnapshots.userId, userId))
    .orderBy(
      desc(enneagramSnapshots.snapshotDate),
      desc(enneagramSnapshots.createdAt),
    )
    .limit(1);
  const row = rows[0];
  // 不正な形状（旧 MBTI 残存行など）は未生成扱いにし、NaN 描画を防ぐ。
  if (row && !isEnneagramScores(row.scores)) {
    return undefined;
  }
  return row;
}
