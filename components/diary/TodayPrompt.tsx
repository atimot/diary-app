'use client';

import { useState, useTransition } from 'react';
import { regenerateTodayPrompt } from '@/lib/actions/prompt';

interface TodayPromptProps {
  initialText: string;
  date: string;
}

// 本文上の「今日の問い」。彩色アクセントは使わず、罫＋面昇格＋明朝で差をつける。
export function TodayPrompt({ initialText, date }: TodayPromptProps) {
  const [text, setText] = useState(initialText);
  const [pending, startTransition] = useTransition();

  const handleRenew = () => {
    startTransition(async () => {
      const res = await regenerateTodayPrompt(date);
      setText(res.text);
    });
  };

  return (
    <div className="mb-6 border-l-2 bg-muted/40 px-4 py-3">
      <p className="font-heading text-base leading-relaxed text-foreground">
        {text}
      </p>
      <button
        type="button"
        onClick={handleRenew}
        disabled={pending}
        className="mt-2 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
      >
        {pending ? '考えています…' : '問いを変える'}
      </button>
    </div>
  );
}
