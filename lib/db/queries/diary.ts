// lib/db/queries/diary.ts
import { and, desc, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { type DiaryEntry, diaryEntries } from '@/lib/db/schema';

export async function getDiaryEntry(
  entryDate: string,
): Promise<DiaryEntry | undefined> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(
      and(
        eq(diaryEntries.userId, userId),
        eq(diaryEntries.entryDate, entryDate),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  const session = await requireSession();
  const userId = session.user.id;
  return db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.entryDate));
}
