import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_JP } from 'next/font/google';
import { HeaderNav } from '@/components/layout/HeaderNav';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// 日本語用フォント。Geist はラテン文字専用で日本語グリフを持たないため、
// 日本語は Noto Sans JP で全端末統一する（無いと OS 標準フォントにフォールバックして
// Mac=ヒラギノ / Android=Noto と見た目が変わる）。
// - variable フォントなので weight 指定は不要。
// - subsets に 'japanese' は指定不可（next/font の subset 一覧に無い）。これは preload 対象の
//   指定でしかなく、日本語グリフ自体は CSS 内の全 @font-face として self-host される。
// - CJK は巨大なので preload: false。unicode-range で必要分だけ遅延ロードさせる。
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
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <HeaderNav />
        </header>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
