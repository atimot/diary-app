// app/page.tsx
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { getDiaryEntry } from '@/lib/db/queries/diary';

function todayInTokyo(): string {
  const fmt = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export default async function HomePage() {
  const date = todayInTokyo();
  const existing = await getDiaryEntry(date);

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{date} の日記</h1>
      <DiaryEditor entryDate={date} initialContent={existing?.content ?? ''} />
    </main>
  );
}
