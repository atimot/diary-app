'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { regenerateInsight } from '@/lib/actions/insight';

interface RegenerateButtonProps {
  label?: string;
  pendingLabel?: string;
}

export function RegenerateButton({
  label = '再生成する',
  pendingLabel = '分析中…',
}: RegenerateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await regenerateInsight();
      if (!result.ok) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
