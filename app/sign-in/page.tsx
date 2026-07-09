import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { SunDot } from '@/components/icons/SunDot';
import { BrandMark } from '@/components/layout/BrandMark';

interface PageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const rawError = (await searchParams).error;
  // 同名パラメータが重複した場合は配列になるので先頭値に正規化
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

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
          <GoogleSignInButton />
          <p className="mt-3 text-[11px] text-muted-foreground md:mt-3.5">
            日記はあなたのアカウントにだけ保存されます。
          </p>
          {/* databaseHooks の throw Error('NOT_ALLOWED') は Better Auth が
              unable_to_create_user に包んで返す（AGENTS.md 参照） */}
          {error === 'unable_to_create_user' && (
            <p className="mt-4 text-sm text-destructive">
              このメールアドレスはサインインを許可されていません。
            </p>
          )}
          {error && error !== 'unable_to_create_user' && (
            <p className="mt-4 text-sm text-destructive">
              サインインに失敗しました（{error}）。
            </p>
          )}
        </div>
      </main>
    </>
  );
}
