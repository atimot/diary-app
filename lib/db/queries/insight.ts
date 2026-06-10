// lib/db/queries/insight.ts
import { desc, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { type WeeklyInsight, weeklyInsights } from '@/lib/db/schema';

export async function getLatestInsight(): Promise<WeeklyInsight | undefined> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, userId))
    .orderBy(desc(weeklyInsights.periodEnd), desc(weeklyInsights.createdAt))
    .limit(1);
  return rows[0];
}
