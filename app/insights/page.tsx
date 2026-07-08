import { AdviceCard } from '@/components/insights/AdviceCard';
import { EnneagramTrends } from '@/components/insights/EnneagramTrends';
import { RegenerateButton } from '@/components/insights/RegenerateButton';
import { countDiaryEntries } from '@/lib/db/queries/diary';
import { getLatestEnneagramSnapshot } from '@/lib/db/queries/enneagram';
import { getLatestInsight } from '@/lib/db/queries/insight';

const MIN_ENTRIES = 7;

const MAIN_CLASS =
  'mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-11 md:px-6 md:pt-10 md:pb-20 lg:px-10';

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

// 期間表示は「7/1〜7/7」の短い形式にする（YYYY-MM-DD → M/D）
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
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
      <main className={MAIN_CLASS}>
        <h1 className="text-[19px] md:text-[21px]">気づき</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          AI 分析を見るには日記が {MIN_ENTRIES} 件必要です。あと {remaining}{' '}
          件書いてみましょう。
        </p>
      </main>
    );
  }

  // state 2: 件数は足りているが、insight も enneagram もまだ生成していない
  if (!insight && !enneagram) {
    return (
      <main className={MAIN_CLASS}>
        <h1 className="text-[19px] md:text-[21px]">気づき</h1>
        <p className="mt-4 mb-4 text-sm text-muted-foreground">
          日記が {entryCount} 件溜まりました。AI
          に最近の傾向を分析させてみましょう。
        </p>
        <RegenerateButton
          label="AI に分析させる"
          pendingLabel="分析中…"
          variant="default"
        />
      </main>
    );
  }

  // state 3: 少なくとも片方のキャッシュあり
  return (
    <main className={MAIN_CLASS}>
      {/* SP は h1 とボタンが同じ行（items-start）、md 以上は左ブロック下端に揃える */}
      <div className="flex flex-wrap items-start justify-between gap-3 md:items-end">
        <div>
          <h1 className="text-[19px] md:text-[21px]">気づき</h1>
          {insight && (
            <p className="mt-1.5 text-[11px] text-muted-foreground md:mt-2 md:text-[11.5px]">
              {shortDate(insight.periodStart)}〜{shortDate(insight.periodEnd)}・
              {Array.isArray(insight.sourceEntryIds)
                ? insight.sourceEntryIds.length
                : 0}
              件の日記から ・ {formatDateTime(insight.createdAt)} に生成
            </p>
          )}
        </div>
        <RegenerateButton />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 md:mt-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        {insight && (
          <>
            <section
              aria-label="今週の要約"
              className="rounded-xl border bg-card p-[18px] shadow-card sm:p-6 md:p-7"
            >
              <h2 className="text-xs font-semibold tracking-normal text-primary md:text-[12.5px]">
                こんな1週間でした
              </h2>
              <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-[2] md:mt-3 md:text-sm md:leading-[2.05]">
                {insight.summary}
              </p>
            </section>
            <AdviceCard advice={insight.advice} />
          </>
        )}
        {enneagram && (
          <EnneagramTrends snapshot={enneagram} className="lg:col-span-2" />
        )}
      </div>
    </main>
  );
}
