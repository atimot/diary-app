import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { getSessionOrNull } from '@/lib/auth/session';
import './globals.css';

// ひとひ刷新（2026-07）で Noto Serif JP（明朝見出し）を退役し、Webフォント0本に。
// 本文・見出しとも端末標準ゴシック（globals.css の --font-sans / --font-heading）。

export const metadata: Metadata = {
  title: 'ひとひ',
  description: '1日の終わりに、3分だけ。ひとことから書ける日記',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // cookieCache 有効なので DB 照会なし。クライアントからの
  // /api/auth/get-session fetch を無くし、アバターのポップインも防ぐ。
  // root layout の throw は app/error.tsx に捕まらない（global-error の圏）ため、
  // 取得失敗はページ全体を壊さずヘッダーを未サインイン表示に落とすだけにする
  const session = await getSessionOrNull().catch(() => null);
  const user = session
    ? { name: session.user.name, email: session.user.email }
    : null;

  return (
    <html lang="ja" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* サインインではロゴのみのヘッダをページ側で描くため、
              <header> ごと HeaderNav が持つ（/sign-in では null を返す）。 */}
          <HeaderNav user={user} />
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
