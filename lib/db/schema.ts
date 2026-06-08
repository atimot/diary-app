// lib/db/schema.ts
import { pgTable, text, date, timestamp, uuid, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    entryDate: date('entry_date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: uniqueIndex('diary_entries_user_date_unique').on(table.userId, table.entryDate),
  }),
);

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;

export const weeklyInsights = pgTable(
  'weekly_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    summary: text('summary').notNull(),
    advice: text('advice').notNull(),
    sourceEntryIds: jsonb('source_entry_ids').notNull().$type<string[]>(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPeriodUnique: uniqueIndex('weekly_insights_user_period_unique').on(
      table.userId,
      table.periodStart,
    ),
  }),
);

export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type NewWeeklyInsight = typeof weeklyInsights.$inferInsert;

export type MbtiScores = {
  EI: number;
  SN: number;
  TF: number;
  JP: number;
};

export const mbtiSnapshots = pgTable(
  'mbti_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    snapshotDate: date('snapshot_date').notNull(),
    scores: jsonb('scores').notNull().$type<MbtiScores>(),
    sourceEntryIds: jsonb('source_entry_ids').notNull().$type<string[]>(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: uniqueIndex('mbti_snapshots_user_date_unique').on(
      table.userId,
      table.snapshotDate,
    ),
  }),
);

export type MbtiSnapshot = typeof mbtiSnapshots.$inferSelect;
export type NewMbtiSnapshot = typeof mbtiSnapshots.$inferInsert;
