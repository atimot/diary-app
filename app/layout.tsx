import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

// ひとひ刷新（2026-07）で Noto Serif JP（明朝見出し）を退役し、Webフォント0本に。
// 本文・見出しとも端末標準ゴシック（globals.css の --font-sans / --font-heading）。

export const metadata: Metadata = {
  title: 'ひとひ',
  description: '1日の終わりに、3分だけ。ひとことから書ける日記',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* サインインではロゴのみのヘッダをページ側で描くため、
              <header> ごと HeaderNav が持つ（/sign-in では null を返す）。 */}
          <HeaderNav />
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
