// lib/actions/diary.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { diaryEntries } from '@/lib/db/schema';
import { diaryEntrySchema } from '@/lib/validation/diary';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveDiaryEntry(formData: FormData): Promise<SaveResult> {
  const parsed = diaryEntrySchema.safeParse({
    entryDate: formData.get('entryDate'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '入力が不正です' };
  }

  try {
    await db
      .insert(diaryEntries)
      .values({
        userId: USER_ID,
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

    return { ok: true };
  } catch (err) {
    console.error('Failed to save diary entry:', err);
    return { ok: false, error: '保存に失敗しました' };
  }
}
