// app/page.tsx
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry, listDiaryEntries } from '@/lib/db/queries/diary';
import { computeStreak } from '@/lib/diary/streak';
import { todayInTokyo } from '@/lib/calendar/month-grid';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, allEntries] = await Promise.all([
    getDiaryEntry(date),
    listDiaryEntries(),
  ]);
  const streak = computeStreak(
    allEntries.map((e) => e.entryDate),
    date,
  );

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">{date} の日記</h1>
        {streak > 0 && (
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium">
            🔥 {streak}日連続記入中
          </span>
        )}
      </div>
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab="edit"
      />
    </main>
  );
}
