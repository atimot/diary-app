'use client';

import { useState, useTransition } from 'react';
import { regenerateTodayPrompt } from '@/lib/actions/prompt';

interface TodayPromptProps {
  initialText: string;
  date: string;
}

// 書き出しのきっかけチップ。Q チップを押すと別の問いに入れ替わり、
// 「じぶんで書く」で今日はチップ行ごと畳む（再訪で復活する軽い状態）。
export function TodayPrompt({ initialText, date }: TodayPromptProps) {
  const [text, setText] = useState(initialText);
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleRenew = () => {
    startTransition(async () => {
      const res = await regenerateTodayPrompt(date);
      setText(res.text);
    });
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleRenew}
        disabled={pending}
        title="べつの問いにする"
        aria-label={`今日の問い: ${text}（押すとべつの問いにする）`}
        className="rounded-lg border border-primary/25 bg-accent px-3.5 py-2 text-left text-[12.5px] text-primary transition hover:bg-primary/12 disabled:opacity-60"
      >
        {pending ? '考えています…' : `Q. ${text}`}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg border px-3.5 py-2 text-[12.5px] text-muted-foreground transition hover:border-input hover:text-foreground"
      >
        じぶんで書く
      </button>
    </div>
  );
}
