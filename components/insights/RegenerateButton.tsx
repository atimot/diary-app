'use client';

import type { VariantProps } from 'class-variance-authority';
import { useState, useTransition } from 'react';
import { Button, type buttonVariants } from '@/components/ui/button';
import { regenerateInsight } from '@/lib/actions/insight';

interface RegenerateButtonProps {
  label?: string;
  pendingLabel?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
}

export function RegenerateButton({
  label = 'もう一度分析する',
  pendingLabel = '分析中…',
  variant = 'outline',
}: RegenerateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await regenerateInsight();
      // セッション失効時は redirect（NEXT_REDIRECT）で遷移し、値は返らない
      if (!result) return;
      if (!result.ok) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={isPending}
        className={
          variant === 'outline'
            ? 'text-xs text-foreground/80 hover:border-primary/40 hover:bg-transparent hover:text-primary'
            : undefined
        }
      >
        {isPending ? pendingLabel : label}
      </Button>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
