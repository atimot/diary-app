// app/history/page.tsx
import Link from 'next/link';
import { listDiaryEntries } from '@/lib/db/queries/diary';

export default async function HistoryPage() {
  const entries = await listDiaryEntries();

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">日記の履歴</h1>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">まだ日記がありません。</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/diary/${entry.entryDate}`}
                className="block rounded-md border p-4 transition hover:bg-accent"
              >
                <div className="font-medium">{entry.entryDate}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.content}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
