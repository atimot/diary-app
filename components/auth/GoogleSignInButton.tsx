'use client';

import { GoogleLogo } from '@/components/ui/google-logo';
import { signIn } from '@/lib/auth/client';

// Google サインインボタン。クリック時の signIn.social だけをクライアントに切り出し、
// ページ本体（app/sign-in/page.tsx）はサーバーコンポーネントに保つ。
export function GoogleSignInButton() {
  const handleGoogle = () => {
    signIn.social({
      provider: 'google',
      callbackURL: '/',
      // 未指定だと Better Auth 既定のエラーページ（/api/auth/error）へ飛び、
      // /sign-in の日本語エラー表示（?error=…）に戻ってこない
      errorCallbackURL: '/sign-in',
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="mt-[26px] inline-flex w-full items-center justify-center gap-2.5 rounded-lg border bg-card px-5 py-[13px] text-[13.5px] font-semibold text-foreground shadow-card transition hover:border-primary/50 md:mt-7 md:py-3"
    >
      <GoogleLogo className="size-4" />
      Google でサインイン
    </button>
  );
}
