import { notFound } from 'next/navigation';
import { DiaryCalendar } from '@/components/diary/DiaryCalendar';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { RecentEntries } from '@/components/diary/RecentEntries';
import { RecordStats } from '@/components/diary/RecordStats';
import { StreakPill } from '@/components/diary/StreakPill';
import { TodayPrompt } from '@/components/diary/TodayPrompt';

// dev 専用: 認証・DB なしで「今日」「これまで」の画面構成を確認するモックプレビュー。
// 本番ビルドでは notFound() で塞ぐ（app/dev/enneagram と同じ流儀）。

const TODAY = '2026-07-08';
const WRITTEN = new Set([
  '2026-07-01',
  '2026-07-02',
  '2026-07-03',
  '2026-07-05',
  '2026-07-06',
  '2026-07-07',
  '2026-07-08',
]);

const RECENT = [
  {
    entryDate: '2026-07-08',
    content:
      '朝から細い雨。傘を持たずに出て、駅までの数分で少し濡れた。\n\n昼休みに、頼んでいた万年筆のインクが届いた。深い青緑。',
  },
  {
    entryDate: '2026-07-07',
    content:
      '打ち合わせが早く終わって、夕方の空いた時間で本屋へ。棚を眺めるだけのつもりが一冊。',
  },
  {
    entryDate: '2026-07-06',
    content: '雨上がり。ベランダの鉢に新しい芽を見つけた。',
  },
  {
    entryDate: '2026-07-05',
    content: '休日。午前中に部屋の模様替えをして、午後はひさしぶりの昼寝。',
  },
  {
    entryDate: '2026-07-03',
    content:
      '週の終わり。冷蔵庫の残りもので適当に作った夕飯が、意外とうまくいった。',
  },
];

export default function ScreensPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <>
      <main className="mx-auto w-full max-w-[680px] px-6 pt-11 pb-20">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              おはようございます。
            </p>
            <h1 className="mt-2 text-[22px] leading-snug">
              7月8日{' '}
              <span className="font-normal text-muted-foreground">水曜日</span>
            </h1>
          </div>
          <StreakPill streak={4} />
        </div>
        <TodayPrompt initialText="最近、夢中になれたことは？" date={TODAY} />
        <DiaryEditor entryDate={TODAY} initialContent={RECENT[0].content} />
      </main>

      <div className="border-t">
        <main className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-20 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[21px]">これまで</h1>
            <RecordStats current={4} longest={9} total={23} />
          </div>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[352px_minmax(0,1fr)]">
            <DiaryCalendar
              year={2026}
              month={7}
              today={TODAY}
              writtenDates={WRITTEN}
              currentYearMonth="2026-07"
            />
            <RecentEntries entries={RECENT} gapDate="2026-07-04" />
          </div>
        </main>
      </div>
    </>
  );
}
