// lib/db/queries/mbti.ts
import { desc, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { mbtiSnapshots, type MbtiSnapshot } from '@/lib/db/schema';

export async function getLatestMbtiSnapshot(): Promise<MbtiSnapshot | undefined> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select()
    .from(mbtiSnapshots)
    .where(eq(mbtiSnapshots.userId, userId))
    .orderBy(desc(mbtiSnapshots.snapshotDate), desc(mbtiSnapshots.createdAt))
    .limit(1);
  return rows[0];
}
