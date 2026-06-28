import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Noto_Serif_JP } from 'next/font/google';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

// 唯一の self-host Webフォント。見出し（明朝）にだけ使う。
// 本文・UI は端末標準ゴシック（システムフォント）に委ねて転送ゼロにする。
// 可変フォントなので weight 不要。CJK は巨大なので preload しない（unicode-range で遅延ロード）。
const notoSerifJP = Noto_Serif_JP({
  variable: '--font-noto-serif-jp',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

export const metadata: Metadata = {
  title: '日記アプリ',
  description: '1日1つの日記を記録するアプリ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${notoSerifJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="border-b">
            <HeaderNav />
          </header>
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
