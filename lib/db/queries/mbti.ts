// lib/db/queries/mbti.ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { mbtiSnapshots, type MbtiSnapshot } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getLatestMbtiSnapshot(): Promise<MbtiSnapshot | undefined> {
  const rows = await db
    .select()
    .from(mbtiSnapshots)
    .where(eq(mbtiSnapshots.userId, USER_ID))
    .orderBy(desc(mbtiSnapshots.snapshotDate), desc(mbtiSnapshots.createdAt))
    .limit(1);
  return rows[0];
}
