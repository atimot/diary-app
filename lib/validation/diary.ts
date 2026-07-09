// lib/validation/diary.ts
import { z } from 'zod';
// 相対 import なのは vitest（alias 未設定）からも読まれるため（streak.ts と同じ事情）
import { isRealDate } from '../calendar/month-grid';

export const diaryEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    // 形式は合うが実在しない暦日（2025-02-30 等）は Postgres の date キャストで
    // throw する前にここで弾く（閲覧側は app/diary/[date] の isRealDate で 404）
    .refine(isRealDate, '実在しない日付です'),
  content: z
    .string()
    .min(1, '本文を入力してください')
    .max(50000, '本文が長すぎます (最大50,000文字)'),
});

export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;
