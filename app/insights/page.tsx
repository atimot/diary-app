import { AdviceCard } from '@/components/insights/AdviceCard';
import { EnneagramTrends } from '@/components/insights/EnneagramTrends';
import { RegenerateButton } from '@/components/insights/RegenerateButton';
import { countDiaryEntries } from '@/lib/db/queries/diary';
import { getLatestEnneagramSnapshot } from '@/lib/db/queries/enneagram';
import { getLatestInsight } from '@/lib/db/queries/insight';

const MIN_ENTRIES = 7;

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export default async function InsightsPage() {
  const [entryCount, insight, enneagram] = await Promise.all([
    countDiaryEntries(),
    getLatestInsight(),
    getLatestEnneagramSnapshot(),
  ]);

  // state 1: 件数不足
  if (entryCount < MIN_ENTRIES) {
    const remaining = MIN_ENTRIES - entryCount;
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">あなたの傾向</h1>
        <p className="text-muted-foreground">
          AI 分析を見るには日記が {MIN_ENTRIES} 件必要です。あと {remaining}{' '}
          件書いてみましょう。
        </p>
      </main>
    );
  }

  // state 2: 件数は足りているが、insight も enneagram もまだ生成していない
  if (!insight && !enneagram) {
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">あなたの傾向</h1>
        <p className="mb-4 text-muted-foreground">
          日記が {entryCount} 件溜まりました。AI
          に最近の傾向を分析させてみましょう。
        </p>
        <RegenerateButton label="AI に分析させる" pendingLabel="分析中…" />
      </main>
    );
  }

  // state 3: 少なくとも片方のキャッシュあり
  return (
    <main className="container mx-auto max-w-3xl space-y-10 p-6">
      <header>
        <h1 className="text-2xl font-bold">あなたの傾向</h1>
        {insight && (
          <p className="mt-1 text-sm text-muted-foreground">
            {insight.periodStart} 〜 {insight.periodEnd} の日記{' '}
            {Array.isArray(insight.sourceEntryIds)
              ? insight.sourceEntryIds.length
              : 0}{' '}
            件から · {formatDateTime(insight.createdAt)} に生成
          </p>
        )}
      </header>

      {insight && (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">最近のあなたの動向</h2>
            <p className="whitespace-pre-wrap leading-loose">
              {insight.summary}
            </p>
          </section>

          <AdviceCard advice={insight.advice} />
        </>
      )}

      {enneagram && <EnneagramTrends snapshot={enneagram} />}

      <footer className="border-t pt-4">
        <RegenerateButton label="再生成する" pendingLabel="分析中…" />
      </footer>
    </main>
  );
}
