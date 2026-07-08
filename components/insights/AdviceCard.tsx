interface AdviceCardProps {
  advice: string;
}

// 「ひとことアドバイス」カード。要約カードと差をつける青の淡い面（--accent）＋青ラベル。
export function AdviceCard({ advice }: AdviceCardProps) {
  return (
    <section
      aria-label="ひとことアドバイス"
      className="rounded-xl border border-primary/20 bg-accent p-[18px] sm:p-6 md:p-[26px]"
    >
      <h2 className="text-xs font-semibold tracking-normal text-primary md:text-[12.5px]">
        ひとことアドバイス
      </h2>
      <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-[2] text-foreground/90 md:mt-3 md:text-[13.5px]">
        {advice}
      </p>
    </section>
  );
}
