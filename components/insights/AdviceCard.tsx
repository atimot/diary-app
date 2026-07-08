interface AdviceCardProps {
  advice: string;
}

// 「ひとことアドバイス」カード。要約カードと差をつける青の淡い面（--accent）＋青ラベル。
export function AdviceCard({ advice }: AdviceCardProps) {
  return (
    <section
      aria-label="ひとことアドバイス"
      className="rounded-xl border border-primary/20 bg-accent p-6 sm:p-[26px]"
    >
      <h2 className="text-[12.5px] font-semibold tracking-normal text-primary">
        ひとことアドバイス
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-[2] text-foreground/90">
        {advice}
      </p>
    </section>
  );
}
