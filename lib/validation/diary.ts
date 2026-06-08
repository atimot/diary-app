// lib/validation/diary.ts
import { z } from 'zod';

export const diaryEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)'),
  content: z
    .string()
    .min(1, '本文を入力してください')
    .max(50000, '本文が長すぎます (最大50,000文字)'),
});

export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;
