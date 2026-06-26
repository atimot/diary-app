// lib/db/queries/diary.ts
import { and, count, desc, eq } from 'drizzle-orm';
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

// /history 用の軽量クエリ。カレンダーは entryDate しか使わないので content を含む
// 全カラムを取らず、日付だけを取得する（行数が増えても転送が日付列に固定される）。
export async function listEntryDates(): Promise<string[]> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select({ entryDate: diaryEntries.entryDate })
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.entryDate));
  return rows.map((r) => r.entryDate);
}

// /insights の件数判定用。本文全件を取得して数えるのではなく count(*) で済ませる。
export async function countDiaryEntries(): Promise<number> {
  const session = await requireSession();
  const userId = session.user.id;
  const rows = await db
    .select({ value: count() })
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId));
  return rows[0]?.value ?? 0;
}
