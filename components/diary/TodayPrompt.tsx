'use client';

import { useState, useTransition } from 'react';
import { regenerateTodayPrompt } from '@/lib/actions/prompt';

interface TodayPromptProps {
  initialText: string;
  date: string;
}

// 書き出しのきっかけチップ。Q チップを押すと別の問いに入れ替わり、
// 「じぶんで書く」で今日はチップ行ごと畳む（再訪で復活する軽い状態）。
// このチップ行の寸法クラス（mt/border/py/text）を変えるときは、
// app/page.tsx の TodayPromptFallback も同じ縦占有に揃えること。
export function TodayPrompt({ initialText, date }: TodayPromptProps) {
  const [text, setText] = useState(initialText);
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleRenew = () => {
    startTransition(async () => {
      const res = await regenerateTodayPrompt(date);
      // セッション失効時は redirect（NEXT_REDIRECT）で遷移し、値は返らない
      if (!res) return;
      setText(res.text);
    });
  };

  return (
    <div className="mt-3.5 flex flex-wrap gap-1.5 md:mt-5 md:gap-2">
      <button
        type="button"
        onClick={handleRenew}
        disabled={pending}
        title="べつの問いにする"
        aria-label={`今日の問い: ${text}（押すとべつの問いにする）`}
        className="rounded-lg border border-primary/25 bg-accent px-3 py-2 text-left text-xs text-primary transition hover:bg-primary/12 disabled:opacity-60 md:px-3.5 md:text-[12.5px]"
      >
        {pending ? '考えています…' : `Q. ${text}`}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg border px-3 py-2 text-xs text-muted-foreground transition hover:border-input hover:text-foreground md:px-3.5 md:text-[12.5px]"
      >
        じぶんで書く
      </button>
    </div>
  );
}
