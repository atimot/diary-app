// app/page.tsx
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { TodayPrompt } from '@/components/diary/TodayPrompt';
import { getTodayPrompt } from '@/lib/ai/daily-prompt';
import { todayInTokyo } from '@/lib/calendar/month-grid';
import { getDiaryEntry } from '@/lib/db/queries/diary';

export default async function HomePage() {
  const date = todayInTokyo();
  const [existing, prompt] = await Promise.all([
    getDiaryEntry(date),
    getTodayPrompt(date),
  ]);
  const defaultTab = existing ? 'preview' : 'edit';

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <DiaryDateHeader date={date} />
      <TodayPrompt initialText={prompt.text} date={date} />
      <DiaryEditor
        entryDate={date}
        initialContent={existing?.content ?? ''}
        defaultTab={defaultTab}
      />
    </main>
  );
}
