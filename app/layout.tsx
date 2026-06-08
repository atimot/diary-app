import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "日記アプリ",
  description: "1日1つの日記を記録するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <nav className="container mx-auto flex max-w-3xl items-center gap-6 p-4">
            <Link href="/" className="font-semibold">
              日記
            </Link>
            <Link
              href="/history"
              className="text-muted-foreground hover:text-foreground"
            >
              履歴
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
