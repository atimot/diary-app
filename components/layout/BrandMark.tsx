// 「ひとひ」ロゴ: 青いドット＋広めの字間のワードマーク。
// ヘッダーとサインインで共用する（リンク化は使う側で行う）。
export function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
      <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
        ひとひ
      </span>
    </span>
  );
}
