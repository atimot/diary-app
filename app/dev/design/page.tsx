import { notFound } from 'next/navigation';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { StreakPill } from '@/components/diary/StreakPill';
import { BarTrack, MeterFill } from '@/components/insights/MeterBar';
import { Button } from '@/components/ui/button';

// dev 専用の見本帳。トークン/タイポ/コンポーネントを一覧して目視確認する。
// 本番ビルドでは notFound() で塞ぐ（app/dev/enneagram と同じ流儀）。

const SWATCHES: { label: string; className: string; text: string }[] = [
  { label: 'background', className: 'bg-background', text: 'text-foreground' },
  { label: 'card', className: 'bg-card', text: 'text-card-foreground' },
  {
    label: 'popover',
    className: 'bg-popover',
    text: 'text-popover-foreground',
  },
  { label: 'muted', className: 'bg-muted', text: 'text-muted-foreground' },
  {
    label: 'accent（青7%面）',
    className: 'bg-accent',
    text: 'text-accent-foreground',
  },
  {
    label: 'primary（青）',
    className: 'bg-primary',
    text: 'text-primary-foreground',
  },
  {
    label: 'streak（アンバー）',
    className: 'bg-streak',
    text: 'text-background',
  },
  {
    label: 'season（テラコッタ）',
    className: 'bg-season',
    text: 'text-background',
  },
  { label: 'border', className: 'bg-border', text: 'text-foreground' },
];

function Swatches() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SWATCHES.map((s) => (
        <div
          key={s.label}
          className={`flex h-20 flex-col justify-between rounded-xl border p-3 ${s.className} ${s.text}`}
        >
          <span className="text-xs">{s.label}</span>
          <span className="text-xs opacity-70">Aあ亜</span>
        </div>
      ))}
    </div>
  );
}

function TypeScale() {
  return (
    <div className="space-y-3">
      <h1 className="text-[22px]">見出し（22px / 600 / 字間 .03em）</h1>
      <h2 className="text-[21px]">ページ見出し（21px）</h2>
      <p className="text-[15px] leading-[2.05]">
        日記本文（15px / 行間 2.05 /
        端末標準ゴシック）。朝から細い雨。傘を持たずに出て、駅までの数分で少し濡れた。
      </p>
      <p className="text-sm text-muted-foreground">
        補足テキスト text-sm / muted-foreground
      </p>
      <p className="text-[12.5px] font-semibold text-primary">
        カードラベル（12.5px / 600 / primary）
      </p>
      <p className="text-sm font-semibold tracking-[0.18em]">
        ひとひ（ワードマーク字間 .18em）
      </p>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button className="px-5 font-semibold">保存する</Button>
      <Button variant="outline">アウトライン</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="ghost">ゴースト</Button>
      <Button variant="destructive">削除</Button>
      <Button variant="link">リンク</Button>
    </div>
  );
}

function Chips() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-lg border border-primary/25 bg-accent px-3.5 py-2 text-[12.5px] text-primary transition hover:bg-primary/12"
      >
        Q. 最近、夢中になれたことは？
      </button>
      <button
        type="button"
        className="rounded-lg border px-3.5 py-2 text-[12.5px] text-muted-foreground transition hover:border-input hover:text-foreground"
      >
        じぶんで書く
      </button>
      <StreakPill streak={4} />
    </div>
  );
}

function Meters() {
  const rows = [
    { label: '探究', value: 0.72 },
    { label: '達成', value: 0.54 },
    { label: '平和', value: 0.38 },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(r.value * 100)}
            </span>
          </div>
          <BarTrack height="h-[5px]" className="bg-secondary">
            <MeterFill value={r.value} color="var(--primary)" />
          </BarTrack>
        </div>
      ))}
    </div>
  );
}

function CalendarCells() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="grid size-[30px] place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
        8
      </span>
      <span className="grid size-[30px] place-items-center rounded-full bg-primary font-bold text-primary-foreground ring-2 ring-streak ring-offset-2 ring-offset-background">
        今
      </span>
      <span className="grid size-[30px] place-items-center rounded-full text-muted-foreground">
        未
      </span>
      <span className="grid size-[30px] place-items-center rounded-full text-muted-foreground/50">
        来
      </span>
      <span className="grid size-[30px] place-items-center rounded-full text-streak">
        日
      </span>
      <span className="text-muted-foreground">
        （書いた日 / 今日リング / 未記入 / 未来 / 曜日ヘッダ日曜）
      </span>
    </div>
  );
}

function Cards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="text-[12.5px] font-semibold tracking-normal text-primary">
          白カード＋淡い影
        </h2>
        <p className="mt-3 text-sm leading-[2.05]">
          深度は罫＋明度差＋light のみの
          --shadow-card。ダークでは影が消え、面の明度差だけになる。
        </p>
      </div>
      <div className="rounded-xl border border-primary/20 bg-accent p-6">
        <h2 className="text-[12.5px] font-semibold tracking-normal text-primary">
          アクセント面カード
        </h2>
        <p className="mt-3 text-sm leading-[2.05] text-foreground/90">
          「ひとことアドバイス」などの強調面。青の 7% 面＋青の淡い罫。
        </p>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2>日付ヘッダ</h2>
        <DiaryDateHeader date="2026-07-08" />
      </section>
      <section className="space-y-3">
        <h2>カラートークン</h2>
        <Swatches />
      </section>
      <section className="space-y-3">
        <h2>タイポグラフィ</h2>
        <TypeScale />
      </section>
      <section className="space-y-3">
        <h2>ボタン</h2>
        <Buttons />
      </section>
      <section className="space-y-3">
        <h2>チップ / ピル</h2>
        <Chips />
      </section>
      <section className="space-y-3">
        <h2>カード</h2>
        <Cards />
      </section>
      <section className="space-y-3">
        <h2>メーター</h2>
        <Meters />
      </section>
      <section className="space-y-3">
        <h2>カレンダーのセル状態</h2>
        <CalendarCells />
      </section>
      <section className="space-y-3">
        <h2>エニアグラム中心色（データ分類専用）</h2>
        <div className="flex gap-4">
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-gut)' }}
            />
            <span className="block text-xs text-muted-foreground">gut 緑</span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-heart)' }}
            />
            <span className="block text-xs text-muted-foreground">
              heart 赤
            </span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-head)' }}
            />
            <span className="block text-xs text-muted-foreground">
              head 青（=primary）
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-12 p-6">
      <header>
        <h1>デザインシステム（ひとひ）見本帳</h1>
        <p className="text-sm text-muted-foreground">
          トークン・タイポ・コンポーネントの基準。ヘッダーのトグルでライト/ダークを確認。
        </p>
      </header>

      <Showcase />

      <section className="space-y-3">
        <h2>ダークプレビュー（強制 .dark）</h2>
        <div className="dark rounded-xl border bg-background p-6 text-foreground">
          <Showcase />
        </div>
      </section>
    </main>
  );
}
