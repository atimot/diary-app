# M3: MBTI 多角形グラフ 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 過去 7 件の日記から MBTI 4 軸の傾向スコアを Gemini に推論させ、Recharts の 8 軸 RadarChart で多角形として `/insights` ページに表示する。再生成ボタンで週間サマリーと一緒に更新できる。

**Architecture:** AI には 4 軸の符号付きスコア（-1〜+1）を返させ、表示時に 8 軸の正値（0〜1）に展開して多角形を描く。スコアは `mbti_snapshots` テーブルに jsonb で保存（軸を増減してもスキーマ変更不要）。既存の `regenerateInsight` Server Action を拡張し、サマリーと MBTI スコアを 1 クリックで両方更新する。

**Tech Stack:** Recharts v3.3 (RadarChart + PolarGrid + PolarAngleAxis + Radar + ResponsiveContainer) / Vercel AI SDK + Gemini (既存) / Drizzle ORM (jsonb) / Next.js 16 Server Component + Server Action / Zod

**Source spec:** [`docs/superpowers/specs/2026-06-08-diary-app-design.md`](../specs/2026-06-08-diary-app-design.md) §5「M3」

**前提:** M2 完了済み（AI 週間サマリーが動く）。Gemini API キー設定済み。AI SDK インストール済み。

---

## このプランで作る/触るファイル

```
diary-app/
├── lib/
│   ├── ai/
│   │   ├── client.ts                      # 既存
│   │   ├── schemas/
│   │   │   ├── weekly-insight.ts          # 既存
│   │   │   └── mbti.ts                    # NEW: MBTI スコアの Zod スキーマ
│   │   ├── weekly-insight.ts              # 既存
│   │   └── mbti-scorer.ts                 # NEW: MBTI スコア生成関数
│   ├── db/
│   │   ├── schema.ts                      # MODIFY: mbtiSnapshots 追加
│   │   └── queries/
│   │       ├── diary.ts                   # 既存
│   │       ├── insight.ts                 # 既存
│   │       └── mbti.ts                    # NEW: getLatestMbtiSnapshot
│   └── actions/
│       └── insight.ts                     # MODIFY: MBTI 生成 + 保存も追加
├── components/
│   └── insights/
│       ├── RegenerateButton.tsx           # 既存
│       └── MBTIRadar.tsx                  # NEW: Recharts 8軸RadarChart
└── app/
    └── insights/
        └── page.tsx                       # MODIFY: MBTI セクション追加
```

### 各ファイルの責務

| ファイル | 責務 |
|---|---|
| `lib/ai/schemas/mbti.ts` | AI 出力の Zod スキーマ（4軸の符号付きスコア + 理由文） |
| `lib/ai/mbti-scorer.ts` | 日記 7 件を受け取り Gemini で MBTI 推論 |
| `lib/db/queries/mbti.ts` | キャッシュされた最新スナップショットを読む |
| `lib/actions/insight.ts` (拡張) | weekly insight と MBTI snapshot を**並列**生成して両方保存 |
| `components/insights/MBTIRadar.tsx` | Client Component。4 軸スコアを 8 軸正値に展開して Recharts 描画 |
| `app/insights/page.tsx` (拡張) | MBTI セクションを既存の summary/advice の下に追加 |

依存方向: 既存の M2 構造に MBTI 系の3つの新ファイル + 1つの新コンポーネントが**並列に**追加される（既存ファイルを大きく変えない）。

### 設計判断

- **4軸符号付き → 8軸正値の変換**: AI からは 4 軸の `-1〜+1` を受け取る（推論が直感的）。表示時に `E = (1 + EI) / 2`、`I = (1 - EI) / 2` のように 8 軸 0〜1 に展開（多角形の頂点 8 つ）
- **軸の並び順**: 対極ペアが多角形の対側に来るよう `E - N - F - P - I - S - T - J` の順に配置（45°ずつ）
- **再生成は 1 ボタンで両方更新**: 既存 `regenerateInsight` を拡張、Promise.all で並列に AI 呼び出し
- **`mbti_snapshots` は別テーブル**: 設計ドキュメント通り。週間サマリーと別管理で履歴を後から見やすく
- **解釈の caveat**: 「AI による参考的な分析」「占いではなく単なる傾向」を UI に1行で明記する
- **`rationale` フィールド**: AI に簡潔な理由を返させ、（オプションで）UI に表示できる余地を残す

---

## Task 1: mbti_snapshots スキーマ追加 + Neon に push

**目的:** AI が出した MBTI スコアを保存できるテーブルを作る。

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: lib/db/schema.ts に mbtiSnapshots テーブルを追加**

設計ドキュメントの §4.1 通りの構成。既存の `weeklyInsights` の後に追記:

```typescript
export const mbtiSnapshots = pgTable(
  'mbti_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    snapshotDate: date('snapshot_date').notNull(),
    scores: jsonb('scores').notNull().$type<MbtiScores>(),
    sourceEntryIds: jsonb('source_entry_ids').notNull().$type<string[]>(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: uniqueIndex('mbti_snapshots_user_date_unique').on(
      table.userId,
      table.snapshotDate,
    ),
  }),
);

export type MbtiScores = {
  EI: number;
  SN: number;
  TF: number;
  JP: number;
};

export type MbtiSnapshot = typeof mbtiSnapshots.$inferSelect;
export type NewMbtiSnapshot = typeof mbtiSnapshots.$inferInsert;
```

> 注: `MbtiScores` 型は `mbtiSnapshots` の `$type<MbtiScores>()` で参照されているので、テーブル定義より**前に**宣言するか、TypeScript の hoisting に頼って後に書くか。実装者は TypeScript の動作確認後に最終配置を決めてOK（後に書いて tsc が通るならそのまま）。

設計意図:
- `scores` を `jsonb` + 専用型 `MbtiScores` で型安全に
- `snapshot_date` は「いつの時点のスナップショットか」= 使った最新の日記の日付を入れる
- `uniqueIndex(user_id, snapshot_date)` で「同じ日のスコアを上書き保存」のセマンティクスに

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors。`MbtiScores` の hoisting で問題が出たら、型宣言を先に書く。

- [ ] **Step 3: Neon に push**

```bash
yes | pnpm db:push
```

Expected: `mbti_snapshots` テーブル作成。追加のみで破壊的変更なし。

- [ ] **Step 4: テーブル存在確認**

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await p.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='mbti_snapshots' ORDER BY ordinal_position;\");
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
"
```

Expected: 7 カラム（id/user_id/snapshot_date/scores/source_entry_ids/model/created_at）。

- [ ] **Step 5: コミット**

```bash
git add lib/db/schema.ts
git commit -m "feat: define mbti_snapshots schema for personality radar cache"
```

---

## Task 2: Recharts インストール

**目的:** RadarChart を描くライブラリを入れる。

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: recharts と react-is をインストール**

```bash
pnpm add recharts react-is
```

`react-is` は Recharts が peer dependency として要求するため明示インストール。

Expected: `dependencies` に `recharts` (v3.3+) と `react-is` が追加される。

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors（まだ Recharts を import するファイルはないので、影響は型定義のロードだけ）。

- [ ] **Step 3: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install recharts for radar chart rendering"
```

---

## Task 3: MBTI AI スコア生成（schemas + scorer）

**目的:** 7 件の日記から MBTI 4 軸の傾向を AI に推論させる関数を作る。

**Files:**
- Create: `lib/ai/schemas/mbti.ts`
- Create: `lib/ai/mbti-scorer.ts`

- [ ] **Step 1: lib/ai/schemas/mbti.ts を作成**

```typescript
// lib/ai/schemas/mbti.ts
import { z } from 'zod';

export const mbtiScoresSchema = z.object({
  EI: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '内向(I)〜外向(E)の傾向。-1=完全に内向的、+1=完全に外向的、0=ちょうど中間。' +
        '人との関わり方、エネルギーの源（一人/集団）、社交への態度から推測。',
    ),
  SN: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '感覚(S)〜直観(N)の傾向。-1=現実重視の感覚型、+1=可能性重視の直観型。' +
        '具体的/抽象的、現在/未来、事実/アイデアのどちらに重きを置くかから推測。',
    ),
  TF: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '思考(T)〜感情(F)の傾向。-1=論理優先の思考型、+1=人間関係や調和を優先する感情型。' +
        '意思決定の基準（合理性/共感）から推測。',
    ),
  JP: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      '判断(J)〜知覚(P)の傾向。-1=計画的で構造を好む判断型、+1=柔軟で即興を好む知覚型。' +
        '生活の組み立て方（計画/即興）から推測。',
    ),
  rationale: z
    .string()
    .describe(
      '4軸のスコアをどう判断したかの根拠を、3〜5文の自然な日本語で。' +
        '日記から拾った具体的な傾向に触れること。',
    ),
});

export type MbtiScoresOutput = z.infer<typeof mbtiScoresSchema>;
```

設計意図:
- `.describe()` がプロンプトに自動的に組み込まれる → AI に「-1 と +1 の意味」を伝えられる
- `rationale` を独立フィールドにすることで、後で UI 表示の選択肢を残す
- 数値範囲 `-1〜+1` を Zod の `.min/.max` で型レベル保証

- [ ] **Step 2: lib/ai/mbti-scorer.ts を作成**

```typescript
// lib/ai/mbti-scorer.ts
import { generateText, Output } from 'ai';
import { defaultModel, defaultModelId } from '@/lib/ai/client';
import { mbtiScoresSchema, type MbtiScoresOutput } from '@/lib/ai/schemas/mbti';
import type { DiaryEntry } from '@/lib/db/schema';

export interface ScoreMbtiResult {
  output: MbtiScoresOutput;
  model: string;
}

export async function scoreMbti(entries: DiaryEntry[]): Promise<ScoreMbtiResult> {
  if (entries.length < 7) {
    throw new Error(`Need at least 7 entries, got ${entries.length}`);
  }

  const recent = [...entries]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .slice(0, 7);

  const entryList = recent
    .slice()
    .reverse()
    .map((e) => `■ ${e.entryDate}\n${e.content}`)
    .join('\n\n');

  const prompt = `あなたは思いやりのある観察者です。
以下は同じ人物の最近7日分の日記です。古いものから新しいものへ並んでいます。

${entryList}

これらの日記から、この人の MBTI 4軸（EI/SN/TF/JP）の最近の傾向を
それぞれ -1 から +1 のスコアで推測してください。

注意:
- これは性格の確定診断ではなく、最近7日間の言動から見える「傾向」
- 0 = どちらでもない、偏りなし
- 自信がないときは 0 寄りに（極端な値は強い根拠があるときだけ）
- rationale は具体的な日記の内容に触れながら、批判的にならず観察的に`;

  const { output } = await generateText({
    model: defaultModel,
    prompt,
    output: Output.object({
      schema: mbtiScoresSchema,
    }),
  });

  return {
    output,
    model: defaultModelId,
  };
}
```

設計意図:
- `generateWeeklyInsight` と同じパターン: 件数チェック → ソート → プロンプト → `generateText` + `Output.object`
- プロンプトで「確定診断ではなく傾向」と明示 → AI が断定的にならず適度なスコアを返すよう誘導
- 「自信なければ 0 寄り」と指示 → 7 日分の薄い情報で極端な値が出ないように

- [ ] **Step 3: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: 単体スモークテスト**

シードを使って実際の日記でテスト:

```bash
pnpm db:seed
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { listDiaryEntries } = await import('./lib/db/queries/diary.ts');
  const { scoreMbti } = await import('./lib/ai/mbti-scorer.ts');
  const entries = await listDiaryEntries();
  if (entries.length < 7) { console.log('Need 7'); process.exit(1); }
  const recent = entries.slice(0, 7);
  const result = await scoreMbti(recent);
  console.log('Model:', result.model);
  console.log('Scores:', result.output);
})();
" 2>&1 | tail -20
```

Expected:
- `Model: gemini-2.5-flash`
- `Scores:` オブジェクトに `EI, SN, TF, JP` すべて `-1〜+1` の数値、`rationale` に数行の日本語

- [ ] **Step 5: コミット**

```bash
git add lib/ai/schemas/mbti.ts lib/ai/mbti-scorer.ts
git commit -m "feat: add ai mbti scorer with 4-axis output schema"
```

---

## Task 4: MBTI クエリ + Server Action 拡張

**目的:** キャッシュ読み取り関数を追加し、`regenerateInsight` を MBTI も同時更新するよう拡張する。

**Files:**
- Create: `lib/db/queries/mbti.ts`
- Modify: `lib/actions/insight.ts`

- [ ] **Step 1: lib/db/queries/mbti.ts を作成**

```typescript
// lib/db/queries/mbti.ts
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { mbtiSnapshots, type MbtiSnapshot } from '@/lib/db/schema';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

export async function getLatestMbtiSnapshot(): Promise<MbtiSnapshot | undefined> {
  const rows = await db
    .select()
    .from(mbtiSnapshots)
    .where(eq(mbtiSnapshots.userId, USER_ID))
    .orderBy(desc(mbtiSnapshots.snapshotDate), desc(mbtiSnapshots.createdAt))
    .limit(1);
  return rows[0];
}
```

- [ ] **Step 2: lib/actions/insight.ts を拡張**

現在の内容を以下に置き換える（既存の `regenerateInsight` を `Promise.allSettled` で並列化）:

```typescript
// lib/actions/insight.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { weeklyInsights, mbtiSnapshots } from '@/lib/db/schema';
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { generateWeeklyInsight } from '@/lib/ai/weekly-insight';
import { scoreMbti } from '@/lib/ai/mbti-scorer';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';
const MIN_ENTRIES = 7;

export type RegenerateResult =
  | { ok: true; partial?: { insight?: string; mbti?: string } }
  | { ok: false; error: string };

export async function regenerateInsight(): Promise<RegenerateResult> {
  try {
    const allEntries = await listDiaryEntries();
    if (allEntries.length < MIN_ENTRIES) {
      return {
        ok: false,
        error: `日記が${MIN_ENTRIES}件以上必要です（現在${allEntries.length}件）`,
      };
    }

    const recent = allEntries.slice(0, MIN_ENTRIES);
    const dates = recent.map((e) => e.entryDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const sourceEntryIds = recent.map((e) => e.id);

    // Insight と MBTI を並列で生成
    const [insightResult, mbtiResult] = await Promise.allSettled([
      generateWeeklyInsight(recent),
      scoreMbti(recent),
    ]);

    const partial: { insight?: string; mbti?: string } = {};

    if (insightResult.status === 'fulfilled') {
      const { output, model } = insightResult.value;
      await db
        .insert(weeklyInsights)
        .values({
          userId: USER_ID,
          periodStart,
          periodEnd,
          summary: output.summary,
          advice: output.advice,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [weeklyInsights.userId, weeklyInsights.periodStart],
          set: {
            periodEnd,
            summary: output.summary,
            advice: output.advice,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        });
    } else {
      console.error('insight generation failed:', insightResult.reason);
      partial.insight = 'サマリーの生成に失敗しました';
    }

    if (mbtiResult.status === 'fulfilled') {
      const { output, model } = mbtiResult.value;
      const { rationale, ...scores } = output;
      await db
        .insert(mbtiSnapshots)
        .values({
          userId: USER_ID,
          snapshotDate: periodEnd,
          scores,
          sourceEntryIds,
          model,
        })
        .onConflictDoUpdate({
          target: [mbtiSnapshots.userId, mbtiSnapshots.snapshotDate],
          set: {
            scores,
            sourceEntryIds,
            model,
            createdAt: new Date(),
          },
        });
    } else {
      console.error('mbti scoring failed:', mbtiResult.reason);
      partial.mbti = 'MBTI 分析の生成に失敗しました';
    }

    // 両方失敗ならエラー、片方でも成功なら ok (partial 付き)
    if (insightResult.status === 'rejected' && mbtiResult.status === 'rejected') {
      return {
        ok: false,
        error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
      };
    }

    revalidatePath('/insights');
    return Object.keys(partial).length > 0 ? { ok: true, partial } : { ok: true };
  } catch (err) {
    console.error('Failed to regenerate insight:', err);
    return {
      ok: false,
      error: '分析の生成に失敗しました。しばらく経ってからもう一度お試しください。',
    };
  }
}
```

設計意図:
- `Promise.allSettled` で並列化 → トータル時間は max(insight, mbti) = 約2秒
- 片方が失敗しても、もう片方は保存される（partial）
- 両方失敗のときだけ全体エラーに
- `mbtiSnapshots` への保存時、`rationale` フィールドは scores オブジェクトから除外（DB の `scores` カラムには 4 軸スコアのみ）
- `snapshotDate = periodEnd`（使った最新の日記の日付）

- [ ] **Step 3: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: コミット**

```bash
git add lib/db/queries/mbti.ts lib/actions/insight.ts
git commit -m "feat: extend regenerate action to also generate mbti scores"
```

---

## Task 5: MBTIRadar クライアントコンポーネント

**目的:** AI の 4 軸スコアを 8 軸の正値に展開し、Recharts の RadarChart で描画する。

**Files:**
- Create: `components/insights/MBTIRadar.tsx`

- [ ] **Step 1: components/insights/MBTIRadar.tsx を作成**

```tsx
// components/insights/MBTIRadar.tsx
'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { MbtiScores } from '@/lib/db/schema';

interface MBTIRadarProps {
  scores: MbtiScores;
}

// 多角形の頂点を E-N-F-P-I-S-T-J の順に配置すると、
// 対極ペア（E↔I, N↔S, F↔T, P↔J）が中心を挟んで対称に並ぶ
const AXIS_ORDER = ['E', 'N', 'F', 'P', 'I', 'S', 'T', 'J'] as const;

function toRadarData(scores: MbtiScores) {
  // 4 軸の符号付きスコア (-1〜+1) を 8 軸の 0〜1 値に展開
  // 例: EI = 0.7 → E = (1 + 0.7) / 2 = 0.85, I = (1 - 0.7) / 2 = 0.15
  const E = (1 + scores.EI) / 2;
  const I = 1 - E;
  const N = (1 + scores.SN) / 2;
  const S = 1 - N;
  const F = (1 + scores.TF) / 2;
  const T = 1 - F;
  const P = (1 + scores.JP) / 2;
  const J = 1 - P;

  const byAxis: Record<string, number> = { E, I, S, N, T, F, J, P };
  return AXIS_ORDER.map((axis) => ({
    axis,
    value: byAxis[axis],
  }));
}

export function MBTIRadar({ scores }: MBTIRadarProps) {
  const data = toRadarData(scores);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'currentColor', fontSize: 14 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="あなたの傾向"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

設計意図:
- `'use client'`: Recharts は DOM を直接触るので Client Component 必須
- `AXIS_ORDER`: 配列順に頂点が時計回りに配置される。対極ペアを対称配置に
- `toRadarData`: 4 軸の符号付き値を 8 軸の正値に展開する純粋関数（テストしやすい）
- `domain={[0, 1]}`: ラジアル軸を 0〜1 に固定（中央 = 0、外周 = 1）
- `stroke/fill` を `hsl(var(--primary))` に: shadcn のテーマカラーに統合
- `PolarRadiusAxis` の `tick={false}, axisLine={false}`: 内側の数値目盛りを非表示にしてシンプルに

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: コミット**

```bash
git add components/insights/MBTIRadar.tsx
git commit -m "feat: add MBTIRadar client component using recharts"
```

---

## Task 6: /insights ページに MBTI セクションを統合

**目的:** 既存の summary/advice の下に MBTI セクションを追加する。3 状態（不足/未生成/キャッシュ）に MBTI も対応させる。

**Files:**
- Modify: `app/insights/page.tsx`

- [ ] **Step 1: app/insights/page.tsx を変更**

既存ファイルを以下に置き換え（import と state 3 の構造が拡張される。state 1 と state 2 は変わらない）:

```tsx
// app/insights/page.tsx
import { listDiaryEntries } from '@/lib/db/queries/diary';
import { getLatestInsight } from '@/lib/db/queries/insight';
import { getLatestMbtiSnapshot } from '@/lib/db/queries/mbti';
import { RegenerateButton } from '@/components/insights/RegenerateButton';
import { MBTIRadar } from '@/components/insights/MBTIRadar';
import type { MbtiScores } from '@/lib/db/schema';

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
  const [entries, insight, mbti] = await Promise.all([
    listDiaryEntries(),
    getLatestInsight(),
    getLatestMbtiSnapshot(),
  ]);

  // state 1: 件数不足
  if (entries.length < MIN_ENTRIES) {
    const remaining = MIN_ENTRIES - entries.length;
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

  // state 2: 件数は足りているが、insight も mbti もまだ生成していない
  if (!insight && !mbti) {
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">あなたの傾向</h1>
        <p className="mb-4 text-muted-foreground">
          日記が {entries.length}{' '}
          件溜まりました。AI に最近の傾向を分析させてみましょう。
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
            {insight.periodStart}{' '}〜 {insight.periodEnd} の日記{' '}
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
            <p className="whitespace-pre-wrap leading-relaxed">
              {insight.summary}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">ワンポイントアドバイス</h2>
            <p className="whitespace-pre-wrap leading-relaxed">
              {insight.advice}
            </p>
          </section>
        </>
      )}

      {mbti && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">MBTI 傾向</h2>
            <p className="text-xs text-muted-foreground">
              占いではなく、最近7日分の日記から AI が読み取った参考的な傾向
            </p>
          </div>
          <MBTIRadar scores={mbti.scores as MbtiScores} />
        </section>
      )}

      <footer className="border-t pt-4">
        <RegenerateButton label="再生成する" pendingLabel="分析中…" />
      </footer>
    </main>
  );
}
```

設計意図:
- `Promise.all` で 3 種類のデータを並列取得
- state 3 で「片方のキャッシュがある」場合も表示できるよう、`{insight && ...}` / `{mbti && ...}` の条件レンダリングに
- MBTI セクションには caveat（占いではなく参考的な傾向）を 1 行で明記
- `as MbtiScores` のキャストは `jsonb` の型推論を確定させるため

- [ ] **Step 2: 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: コミット**

```bash
git add app/insights/page.tsx
git commit -m "feat: integrate MBTI radar into insights page"
```

---

## Task 7: E2E スモーク + GitHub push

**目的:** シードを使って実際に M3 全体を動かし、ブラウザでの動作を curl で確認する。

**Files:** なし（実行のみ）

- [ ] **Step 1: シードでデータ準備**

DB を一度クリアしてから 7 日分シード:

```bash
pnpm db:seed:reset
pnpm db:seed
```

Expected: `Deleted N + 0` の後に `Inserted/updated 7 diary entries`。

- [ ] **Step 2: dev サーバー起動**

```bash
( pnpm dev > /tmp/diary-app-dev.log 2>&1 & )
sleep 8
grep -E "Ready in|started server on" /tmp/diary-app-dev.log
```

- [ ] **Step 3: state 2（未生成）の表示確認**

```bash
curl -s http://localhost:3000/insights | grep -oE '(AI に分析させる|最近のあなたの動向|MBTI 傾向)'
```

Expected: `AI に分析させる` だけが出る（まだ insight も mbti も生成されていないため）。

- [ ] **Step 4: MBTI 単体スモークの再確認**

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { listDiaryEntries } = await import('./lib/db/queries/diary.ts');
  const { scoreMbti } = await import('./lib/ai/mbti-scorer.ts');
  const entries = await listDiaryEntries();
  const recent = entries.slice(0, 7);
  console.log('Calling Gemini for MBTI…');
  const result = await scoreMbti(recent);
  console.log('Scores:', JSON.stringify(result.output, null, 2));
})();
" 2>&1 | tail -15
```

Expected: 4軸の数値（-1〜+1）と rationale が表示される。

- [ ] **Step 5: state 3 を作るためにダミー保存**

Task 4 の Server Action 経由ではなく、DB に直接 insert して state 3 を作る（M2 と同様の手法）:

```bash
pnpm exec tsx --env-file=.env.local -e "
(async () => {
  const { Pool } = await import('@neondatabase/serverless');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const rows = await p.query(\"SELECT id, entry_date FROM diary_entries WHERE user_id='me' ORDER BY entry_date DESC LIMIT 7\");
  const ids = rows.rows.map(r => r.id);
  const dates = rows.rows.map(r => r.entry_date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  await p.query(
    \`INSERT INTO weekly_insights (user_id, period_start, period_end, summary, advice, source_entry_ids, model)
     VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)
     ON CONFLICT (user_id, period_start) DO UPDATE
     SET period_end = EXCLUDED.period_end, summary = EXCLUDED.summary, advice = EXCLUDED.advice,
         source_entry_ids = EXCLUDED.source_entry_ids, model = EXCLUDED.model, created_at = now()\`,
    ['me', periodStart, periodEnd, 'テスト用のサマリー。', 'テスト用のアドバイス。', JSON.stringify(ids), 'gemini-2.5-flash']
  );

  await p.query(
    \`INSERT INTO mbti_snapshots (user_id, snapshot_date, scores, source_entry_ids, model)
     VALUES (\$1, \$2, \$3, \$4, \$5)
     ON CONFLICT (user_id, snapshot_date) DO UPDATE
     SET scores = EXCLUDED.scores, source_entry_ids = EXCLUDED.source_entry_ids, model = EXCLUDED.model, created_at = now()\`,
    ['me', periodEnd, JSON.stringify({ EI: 0.3, SN: -0.2, TF: 0.5, JP: -0.1 }), JSON.stringify(ids), 'gemini-2.5-flash']
  );

  console.log('Inserted test insight + mbti');
  await p.end();
})();
"
```

Expected: `Inserted test insight + mbti`.

- [ ] **Step 6: state 3 表示確認**

```bash
curl -s http://localhost:3000/insights | grep -oE '(最近のあなたの動向|ワンポイントアドバイス|MBTI 傾向|recharts|占いではなく)'
```

Expected: `最近のあなたの動向`、`ワンポイントアドバイス`、`MBTI 傾向`、`占いではなく` のすべてが出る。Recharts は SVG なので `recharts` 文字列は出ないかもしれないが、それは正常。

代わりに SVG タグが出るか:

```bash
curl -s http://localhost:3000/insights | grep -oE '<svg [^>]*>' | head -3
```

Expected: 少なくとも 1 つの `<svg>` 要素（RadarChart が描画されている）。

- [ ] **Step 7: dev サーバー停止**

```bash
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2
```

- [ ] **Step 8: テストデータ削除**

```bash
pnpm db:seed:reset
```

- [ ] **Step 9: GitHub に push**

```bash
git push
```

Expected: M3 の 6 コミット（Task 1-6）が origin/main に反映される（Task 7 は実行のみでコミットなし）。

---

## 完了基準

1. `/insights` ページに「MBTI 傾向」セクションが追加され、SVG の多角形が描画される
2. `RegenerateButton` クリックで weekly insight と MBTI snapshot の両方が並列生成・保存される
3. AI からの MBTI スコアが妥当な範囲（-1〜+1）に収まる
4. `mbti_snapshots` テーブルに行がキャッシュされ、ページ再読み込みで再表示される
5. 「占いではなく参考的な傾向」の注記が UI に表示される
6. `pnpm exec tsc --noEmit` がエラーゼロ
7. すべてのコミットが GitHub に push されている

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| Recharts の SVG が表示されない | `'use client'` ディレクティブが MBTIRadar の先頭にあるか確認 |
| RadarChart の頂点が想定と違う順 | `AXIS_ORDER` 配列の並びを確認 |
| MBTI スコアが極端な値ばかり | プロンプトの「自信がないときは 0 寄りに」が伝わっているか確認、temperature の調整は AI SDK 側で |
| `scores as MbtiScores` で型エラー | `lib/db/schema.ts` の `MbtiScores` 型 export を確認 |
| 片方のキャッシュだけ表示されない | `app/insights/page.tsx` の `{insight && ...}` / `{mbti && ...}` の条件分岐を確認 |
| `Promise.allSettled` の結果が両方 rejected | API キーや rate limit を疑う、`/tmp/diary-app-dev.log` で詳細確認 |
| RadarChart の色がテーマと合わない | `hsl(var(--primary))` が globals.css の CSS 変数として定義されているか shadcn の設定を確認 |

---

## このプランで意図的に**やらないこと**

- 過去スナップショットの時系列表示（履歴UI）→ 必要になったら M3.5 として
- MBTI の細分タイプ表示（INTJ など 16 タイプ）→ 単純化のため軸スコアのみ
- Big5 などの代替モデル → M3 では MBTI のみ
- 専用ページ `/profile` への分離 → `/insights` に統合（移動はあとから可能）
- スコアの推移グラフ → 履歴 UI と同時に検討
- `rationale` の UI 表示 → DB には保存されないが、必要なら weekly_insights のように別カラム化を検討
- Recharts 以外のチャートライブラリ評価 → 確定で Recharts

これらが本当に必要になったら別途プランを書き起こす。
