// scripts/seed.ts
import { Pool } from '@neondatabase/serverless';

const USER_ID = process.env.DEFAULT_USER_ID ?? 'me';

// 30 varied Japanese diary entries — chronological, oldest-to-newest order.
// Topics span: work, hobbies, relationships, weather, food, exercise, reading,
// emotions, and reflection — designed so AI analysis can identify themes.
const sampleEntries: string[] = [
  '朝のジョギングで季節の変化を感じた。緑が濃くなってきて、気持ちが少し軽くなる。',
  '新しいプロジェクトのキックオフ。最初の不安と期待が入り混じる感覚は、何度経験しても同じだ。',
  '友人と久しぶりに長電話。話しているうちに、自分がいかに最近誰かと深く話せていなかったか気づいた。',
  '締め切りに追われて夜遅くまで作業。終わった瞬間の達成感はあるが、もっと計画的にやれたはず。',
  '雨の日。窓越しに雨音を聞きながらコーヒー。たまにはこういう時間も悪くない。',
  '同僚から思いがけない相談を受けた。何ができるか考えながら、相手の話を最後まで聞くことを意識した。',
  '読みかけの本を朝の電車で進めた。著者の視点が刺激的で、今日一日少し違う角度で物事を見られた気がする。',
  '久しぶりに料理を作った。手を動かすことで頭が空になる感覚は貴重。',
  '上司との1on1。フィードバックを受けて、自分が見落としていた視点に気づかされた。',
  '早朝に目が覚めて、思いついたことをノートに書き出した。形にならない考えが少し整理された。',
  '同じ会議が3つ続いて、終わるころには判断疲れ。週の真ん中なのに既にぐったり。',
  '散歩中に偶然見つけた小さなカフェに入った。こういう発見が日常にあると気分が変わる。',
  '子供の頃のアルバムを偶然見つけて、思い出に浸ってしまった。当時の自分は今の自分をどう見るだろう。',
  '新しい技術を試した。最初は手間取ったけど、できるようになると視界が広がる感覚。',
  '休息の大切さを実感した一日。何もしないことに罪悪感を覚える自分に気づく。',
  '友人の結婚式に出席。久々に会う仲間たちと、これからの自分を考えた。',
  '仕事で大きな成果が出た。けれど一人で達成したわけではないと、改めて感じる。',
  '失敗から学ぶことの方が多い、と最近よく思う。今日も小さな失敗を一つ。',
  '親と電話。最近の話、健康の話。当たり前のことが当たり前じゃないと知った日。',
  '朝のジムでスッキリしてから1日を始めた。やっぱり体を動かすと脳の動きも違う。',
  '締め切りギリギリだけど、なんとか出した。完璧じゃなくても進める力は大事。',
  '最近よく考えるのは、何を捨てるかという話。手放すことで見えるものがある。',
  'プロジェクトメンバーとの食事会。仕事以外の話で笑った時間が、いい栄養になった。',
  '自分の中の優先順位が変わってきている気がする。前は気にしていたことが、最近はそうでもない。',
  '雨上がりの空気を吸いに外に出た。リセットが必要な日もある。',
  '新しい本を買って読み始めた。最初の1章で引き込まれた。今週の楽しみができた。',
  '家族と話していて、自分が知らない一面を知った。長年一緒にいても、知らないことはある。',
  '体調を崩した。早めに休む選択をする勇気が、今の自分にはあった。',
  '久しぶりに昔の趣味を再開した。当時の自分との対話のような感覚。',
  '一週間を振り返って、思ったより色々なことがあった。日記を書き続けていてよかったと思う。',
];

function todayInTokyo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}

function subtractDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  const y2 = date.getUTCFullYear();
  const m2 = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(date.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

async function main() {
  const arg = process.argv[2];
  const count = arg ? Number.parseInt(arg, 10) : 7;

  if (!Number.isFinite(count) || count <= 0) {
    console.error('Usage: pnpm db:seed [count]   (count: 1-' + sampleEntries.length + ', default 7)');
    process.exit(1);
  }

  if (count > sampleEntries.length) {
    console.error(`Max ${sampleEntries.length} entries available (requested ${count})`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const today = todayInTokyo();

  console.log(`Seeding ${count} diary entries for user "${USER_ID}"…`);
  console.log(`Date range: ${subtractDays(today, count - 1)} 〜 ${today}\n`);

  // Use the oldest-to-newest slice so entries [0] is the oldest entry
  // (count-1 days ago) and entries[count-1] is today.
  const entries = sampleEntries.slice(0, count);

  for (let i = 0; i < count; i++) {
    const daysAgo = count - 1 - i;
    const entryDate = subtractDays(today, daysAgo);
    await pool.query(
      `INSERT INTO diary_entries (user_id, entry_date, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entry_date) DO UPDATE
       SET content = EXCLUDED.content, updated_at = now()`,
      [USER_ID, entryDate, entries[i]],
    );
    console.log(`  ✓ ${entryDate}  ${entries[i].slice(0, 30)}…`);
  }

  await pool.end();
  console.log(`\n✅ Inserted/updated ${count} diary entries`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
