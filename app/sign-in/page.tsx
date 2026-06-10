'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth/client';

function SignInContent() {
  const params = useSearchParams();
  const error = params.get('error');

  const handleGoogle = () => {
    signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
  };

  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-6 p-6 pt-24">
      <h1 className="text-2xl font-bold">サインイン</h1>
      <p className="text-sm text-muted-foreground">
        Google アカウントでサインインしてください
      </p>
      <Button type="button" onClick={handleGoogle} className="w-full">
        Google でサインイン
      </Button>
      {error === 'not_allowed' && (
        <p className="text-sm text-destructive">
          このメールアドレスはサインインを許可されていません。
        </p>
      )}
      {error && error !== 'not_allowed' && (
        <p className="text-sm text-destructive">サインインに失敗しました（{error}）。</p>
      )}
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
