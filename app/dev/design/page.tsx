import { notFound } from 'next/navigation';
import { DiaryDateHeader } from '@/components/diary/DiaryDateHeader';
import { StreakBadge } from '@/components/diary/StreakBadge';
import { BarTrack, MeterFill } from '@/components/insights/MeterBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

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
    label: 'secondary',
    className: 'bg-secondary',
    text: 'text-secondary-foreground',
  },
  {
    label: 'primary（若葉）',
    className: 'bg-primary',
    text: 'text-primary-foreground',
  },
  { label: 'season（朱）', className: 'bg-season', text: 'text-background' },
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
      <h1>見出し H1 — 今日のハイライト</h1>
      <h2>見出し H2 — あなたの傾向</h2>
      <h3>見出し H3 — 水無月</h3>
      <p className="text-base leading-loose">
        本文（端末標準ゴシック）。朝は少し肌寒かったけれど、昼から気持ちよく晴れた。集中できた日は、夜の珈琲がいつもより美味しく感じる。
      </p>
      <p className="text-sm text-muted-foreground">
        補足テキスト text-sm / muted-foreground
      </p>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Eyebrow ラベル
      </p>
      <p className="font-heading text-3xl tabular-nums">2026 6月26日</p>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>保存</Button>
      <Button variant="outline">アウトライン</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="ghost">ゴースト</Button>
      <Button variant="destructive">削除</Button>
      <Button variant="link">リンク</Button>
      <Button size="sm">小</Button>
      <Button size="lg">大</Button>
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
          <div className="mb-1 flex justify-between text-sm">
            <span>{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(r.value * 100)}%
            </span>
          </div>
          <BarTrack height="h-1.5">
            <MeterFill value={r.value} color="var(--primary)" />
          </BarTrack>
        </div>
      ))}
    </div>
  );
}

function CalendarCells() {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="flex aspect-square w-9 items-center justify-center rounded-md bg-primary font-medium text-primary-foreground">
        記
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground ring-2 ring-primary">
        今
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground">
        未
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-muted-foreground/40">
        来
      </span>
      <span className="flex aspect-square w-9 items-center justify-center rounded-md text-season">
        日
      </span>
    </div>
  );
}

function Showcase() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2>日付ヘッダ</h2>
        <DiaryDateHeader date="2026-06-26" />
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
        <h2>タブ</h2>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">編集</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea placeholder="今日はどんな1日でしたか？" />
          </TabsContent>
          <TabsContent value="preview">
            <div className="rounded-md border p-4 text-sm">プレビュー領域</div>
          </TabsContent>
        </Tabs>
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
        <h2>連続記入バッジ</h2>
        <StreakBadge streak={12} />
      </section>
      <section className="space-y-3">
        <h2>エニアグラム中心色（データ分類専用）</h2>
        <div className="flex gap-4">
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-gut)' }}
            />
            <span className="block text-xs text-muted-foreground">
              gut 黄土
            </span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-heart)' }}
            />
            <span className="block text-xs text-muted-foreground">
              heart 茜
            </span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className="h-12 w-16 rounded-lg border"
              style={{ backgroundColor: 'var(--center-head)' }}
            />
            <span className="block text-xs text-muted-foreground">head 藍</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="container mx-auto max-w-4xl space-y-12 p-6">
      <header>
        <h1>デザインシステム（和モダン）見本帳</h1>
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
