// lib/db/queries/diary.ts
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { diaryEntries, type DiaryEntry } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getDiaryEntry(entryDate: string): Promise<DiaryEntry | undefined> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, USER_ID), eq(diaryEntries.entryDate, entryDate)))
    .limit(1);
  return rows[0];
}

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  return db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, USER_ID))
    .orderBy(desc(diaryEntries.entryDate));
}
