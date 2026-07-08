'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SunDot } from '@/components/icons/SunDot';
import { BrandMark } from '@/components/layout/BrandMark';
import { GoogleLogo } from '@/components/ui/google-logo';
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
    <>
      {/* サインインは罫なしのロゴのみヘッダ（アプリのヘッダは /sign-in では出ない） */}
      <div className="mx-auto flex w-full max-w-[1120px] items-center px-4 py-3.5 md:px-10 md:py-[15px]">
        <BrandMark />
      </div>
      <main className="flex flex-1 items-center justify-center px-6 pt-6 pb-[72px] md:pb-20">
        <div className="flex w-full max-w-[400px] flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1">
            <SunDot className="size-3 text-streak" />
            <span className="text-[11px] font-semibold text-streak md:text-[11.5px]">
              1日の終わりに、3分だけ
            </span>
          </span>
          <h1 className="mt-4 text-[22px] leading-[1.65] md:mt-[18px] md:text-[26px] md:leading-[1.6]">
            きょうの「ひとひ」を、
            <br />
            ひとことから。
          </h1>
          <p className="mt-2.5 text-[12.5px] leading-[1.9] text-muted-foreground md:mt-3 md:text-[13px]">
            書いた日記から、あなたの1週間の傾向もそっと教えてくれます。
          </p>
          <button
            type="button"
            onClick={handleGoogle}
            className="mt-[26px] inline-flex w-full items-center justify-center gap-2.5 rounded-lg border bg-card px-5 py-[13px] text-[13.5px] font-semibold text-foreground shadow-card transition hover:border-primary/50 md:mt-7 md:py-3"
          >
            <GoogleLogo className="size-4" />
            Google でサインイン
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground md:mt-3.5">
            日記はあなたのアカウントにだけ保存されます。
          </p>
          {error === 'not_allowed' && (
            <p className="mt-4 text-sm text-destructive">
              このメールアドレスはサインインを許可されていません。
            </p>
          )}
          {error && error !== 'not_allowed' && (
            <p className="mt-4 text-sm text-destructive">
              サインインに失敗しました（{error}）。
            </p>
          )}
        </div>
      </main>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
