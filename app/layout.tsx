import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import {
  Geist_Mono,
  Noto_Sans_JP,
  Shippori_Mincho_B1,
  Zen_Kaku_Gothic_New,
} from 'next/font/google';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// 本文・UI 基盤のゴシック（シャープで現代的）。Geist Sans を退役させ和文を統一する。
// 静的フォントなので weight 配列の明示が必須。CJK は preload しない。
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-zen-kaku',
  weight: ['400', '500'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

// 見出し用の明朝。静的フォントなので weight 必須。
const shipporiMincho = Shippori_Mincho_B1({
  variable: '--font-shippori',
  weight: ['500', '600'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

// フォールバック用（variable フォントなので weight 不要）。
const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
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
      className={`${zenKaku.variable} ${shipporiMincho.variable} ${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
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
