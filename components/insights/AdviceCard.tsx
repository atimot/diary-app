interface AdviceCardProps {
  advice: string;
}

// 「ワンポイントアドバイス」を要約と差別化する一筆箋カード。
// 既存の EnneagramHero と同じ「rounded-xl border border-l-4」左罫カード言語を再利用し、
// 左罫だけを若葉(--primary)に固定して「これは行動への示唆」と記号化する（憲法 §3/§5）。
// 深度は影でなく罫＋面の昇格(bg-popover)で出す（§4）。見出しは太字でなく明朝＋字間でラベル化（§2）。
export function AdviceCard({ advice }: AdviceCardProps) {
  return (
    <section
      aria-label="ワンポイントアドバイス"
      className="rounded-xl border border-l-4 border-l-primary bg-popover p-5 pl-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-primary"
        >
          <path
            d="M12 21c0-6 0-9 5-13-5 .5-7.5 3.2-9 6.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 21c0-3.5-1-6-4-8.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-heading font-semibold text-primary text-xs leading-none tracking-[0.22em]">
          ひとこと
        </span>
      </div>
      <p className="m-0 whitespace-pre-wrap text-[0.9375rem] text-foreground leading-[1.85] tracking-[0.01em]">
        {advice}
      </p>
    </section>
  );
}
