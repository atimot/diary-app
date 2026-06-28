// lib/diary/seasonal-prompts.ts
// AI 生成が使えないときの「今日の問い」フォールバック。
// 日付（＋seed）から決定的に1問選ぶ純関数。やさしく答えやすい問いだけを置く。

const PROMPTS = [
  '今日、ふと心が動いた瞬間はありましたか。',
  '今日のあなたを、ひとことで言うと何でしたか。',
  '今日、だれかに伝えたいことはありますか。',
  '今日、立ち止まって気づいたことはありますか。',
  '今日いちばん長く考えていたのは、何についてでしたか。',
  '今日、自分をいたわれた場面はありましたか。',
  '今日の小さな「よかったこと」を、ひとつ挙げるなら。',
  '今日、手放したい気持ちはありますか。',
  '今日のうちに、書きとめておきたい景色はありますか。',
  '今日のあなたは、何に時間を使いたかったですか。',
  '明日の自分に残しておきたい言葉はありますか。',
  '今日、心がほどけた瞬間はありましたか。',
];

export function pickSeasonalPrompt(date: string, seed = 0): string {
  const n = Number(date.replaceAll('-', '')); // YYYYMMDD
  const len = PROMPTS.length;
  const idx = (((n + seed) % len) + len) % len;
  return PROMPTS[idx];
}
