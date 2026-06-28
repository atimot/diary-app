// lib/actions/diary.ts
'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { db } from '@/lib/db/client';
import { listEntryDates } from '@/lib/db/queries/diary';
import { diaryEntries } from '@/lib/db/schema';
import { computeStreak } from '@/lib/diary/streak';
import { diaryEntrySchema } from '@/lib/validation/diary';

export type SaveResult =
  | { ok: true; streak: number }
  | { ok: false; error: string };

export async function saveDiaryEntry(formData: FormData): Promise<SaveResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = diaryEntrySchema.safeParse({
    entryDate: formData.get('entryDate'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '入力が不正です',
    };
  }

  try {
    await db
      .insert(diaryEntries)
      .values({
        userId,
        entryDate: parsed.data.entryDate,
        content: parsed.data.content,
      })
      .onConflictDoUpdate({
        target: [diaryEntries.userId, diaryEntries.entryDate],
        set: {
          content: parsed.data.content,
          updatedAt: new Date(),
        },
      });

    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/diary/${parsed.data.entryDate}`);

    const today = todayInTokyo();
    const dates = await listEntryDates();
    const streak = computeStreak(dates, today);

    return { ok: true, streak };
  } catch (err) {
    console.error('Failed to save diary entry:', err);
    return { ok: false, error: '保存に失敗しました' };
  }
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteDiaryEntry(
  entryDate: string,
): Promise<DeleteResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return { ok: false, error: '日付の形式が不正です' };
  }

  const session = await requireSession();
  const userId = session.user.id;

  try {
    await db
      .delete(diaryEntries)
      .where(
        and(
          eq(diaryEntries.userId, userId),
          eq(diaryEntries.entryDate, entryDate),
        ),
      );

    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/diary/${entryDate}`);

    return { ok: true };
  } catch (err) {
    console.error('Failed to delete diary entry:', err);
    return { ok: false, error: '削除に失敗しました' };
  }
}
