// lib/db/queries/insight.ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { weeklyInsights, type WeeklyInsight } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getLatestInsight(): Promise<WeeklyInsight | undefined> {
  const rows = await db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, USER_ID))
    .orderBy(desc(weeklyInsights.periodEnd), desc(weeklyInsights.createdAt))
    .limit(1);
  return rows[0];
}
