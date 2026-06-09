// app/page.tsx
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry } from '@/lib/db/queries/diary';
import { todayInTokyo } from '@/lib/calendar/month-grid';

export default async function HomePage() {
  const date = todayInTokyo();
  const existing = await getDiaryEntry(date);
  const defaultTab = existing ? 'preview' : 'edit';

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date} の日記</h1>
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </main>
  );
}
