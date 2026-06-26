import { notFound } from 'next/navigation';
import { EnneagramTrends } from '@/components/insights/EnneagramTrends';
import { Button } from '@/components/ui/button';
import type { EnneagramSnapshot } from '@/lib/db/schema';
import type { EnneagramScores } from '@/lib/enneagram/types';

// dev 専用プレビュー: 認証 / DB / Gemini なしで /insights のエニアグラム UI を確認する。
// 本番ビルドでは notFound() で塞ぐ（保護対象ルート外なので念のため）。

function mockSnapshot(
  scores: EnneagramScores,
  rationale: string,
): EnneagramSnapshot {
  return {
    id: 'preview',
    userId: 'preview',
    snapshotDate: '2026-06-25',
    scores,
    rationale,
    sourceEntryIds: [],
    model: 'preview',
    createdAt: new Date('2026-06-25T00:00:00Z'),
  };
}

const PROFILES: { label: string; snapshot: EnneagramSnapshot }[] = [
  {
    label: '例A: 9w1（腹センター寄り・調和的）',
    snapshot: mockSnapshot(
      {
        1: 0.45,
        2: 0.6,
        3: 0.38,
        4: 0.3,
        5: 0.42,
        6: 0.7,
        7: 0.25,
        8: 0.2,
        9: 0.78,
      },
      'この一週間は、対立を避けて場の調和を保とうとする姿勢が繰り返し表れていました。周りに合わせて自分の主張を後回しにする場面が多く、無理にでも穏やかさを守ろうとしている様子がうかがえます。同時に「こうあるべき」という基準への忠実さも見え隠れしていました。',
    ),
  },
  {
    label: '例B: 4w5（心センター寄り・内省的）',
    snapshot: mockSnapshot(
      {
        1: 0.3,
        2: 0.45,
        3: 0.5,
        4: 0.82,
        5: 0.6,
        6: 0.5,
        7: 0.35,
        8: 0.2,
        9: 0.4,
      },
      '今週は自分の内側の感情や「自分らしさとは何か」への問いが中心にありました。他者と自分を比べて独自性を確かめようとする一方、少し距離を置いて物事を観察し、深く理解しようとする傾向も強く出ています。',
    ),
  },
  {
    label: '例C: 8w7（頭/腹・主導的）',
    snapshot: mockSnapshot(
      {
        1: 0.4,
        2: 0.25,
        3: 0.55,
        4: 0.2,
        5: 0.3,
        6: 0.35,
        7: 0.6,
        8: 0.85,
        9: 0.3,
      },
      '今週は自分で状況を動かし、主導権を握ろうとする力強さが目立ちました。困難に正面から向き合い、率直に意見を通そうとする場面が多い一方で、楽しさや新しい選択肢を求める軽やかさも併せ持っていました。',
    ),
  },
];

export default function EnneagramPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl space-y-12 p-6">
      <header className="space-y-1">
        <h1 className="font-bold text-2xl">
          エニアグラム UI プレビュー（dev）
        </h1>
        <p className="text-muted-foreground text-sm">
          認証・DB・Gemini なしのモックデータ。主タイプの異なる3パターンで
          シンボル図 / 上位バー / 3センター /
          ヒーローカードの描画を確認できます。
        </p>
      </header>

      <section className="space-y-4 border-t pt-8">
        <p className="font-medium text-muted-foreground text-xs">
          テーマ確認（暖色アクセント＋温かいニュートラル）
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">保存</Button>
          <Button type="button" variant="outline">
            サインアウト
          </Button>
          <Button type="button" variant="link">
            リンク
          </Button>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm">
            🔥 7日連続記入中
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-primary">アクティブなナビ</span>
          <span className="text-muted-foreground">非アクティブ</span>
          <span className="text-foreground">本文（ink は無彩のまま）</span>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
          カード面（わずかに温かい白／ダークでは温かいチャコール）。境界線・入力枠も同系。
        </div>
      </section>

      {PROFILES.map((p) => (
        <div
          key={p.label}
          className="space-y-4 border-t pt-8 first:border-t-0 first:pt-0"
        >
          <p className="font-medium text-muted-foreground text-xs">{p.label}</p>
          <EnneagramTrends snapshot={p.snapshot} />
        </div>
      ))}
    </main>
  );
}
