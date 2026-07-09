'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/layout/BrandMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth/client';

const links = [
  {
    href: '/',
    label: '今日',
    match: (p: string) => p === '/' || p.startsWith('/diary'),
  },
  {
    href: '/history',
    label: 'これまで',
    match: (p: string) => p.startsWith('/history'),
  },
  {
    href: '/insights',
    label: '気づき',
    match: (p: string) => p.startsWith('/insights'),
  },
];

export function HeaderNav({
  // セッションはサーバー（layout の getSessionOrNull）から渡す。
  // クライアントの useSession() だと毎ページ /api/auth/get-session を fetch してしまう。
  // トレードオフ: サーバーレンダー時点のスナップショットなので、別タブで signOut
  // しても放置中のタブは次のハードナビまで表示が古いまま（単一ユーザー運用で許容）
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/sign-in')) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <header className="border-b">
      <div className="mx-auto w-full max-w-[1120px]">
        {/* SP: 1段目=ロゴ＋アクション / md以上: 1行3分割（ロゴ | 中央ナビ | アクション） */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 md:justify-normal md:px-10 md:py-[15px]">
          <div className="flex items-center md:min-w-0 md:flex-1">
            <Link href="/" aria-label="ひとひ — 今日のページへ">
              <BrandMark />
            </Link>
          </div>
          <nav className="hidden items-center gap-[26px] md:flex">
            {links.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'relative px-0.5 py-2 text-[13px] font-semibold text-primary'
                      : 'px-0.5 py-2 text-[13px] text-muted-foreground transition hover:text-foreground'
                  }
                >
                  {link.label}
                  {active && (
                    // ヘッダー下罫に重なるアクティブ下線（py-[15px] ぶん下げる）
                    <span
                      className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 md:min-w-0 md:flex-1 md:justify-end md:gap-2.5">
            <ThemeToggle />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="アカウントメニュー"
                  render={
                    <button
                      type="button"
                      className="grid size-[27px] shrink-0 place-items-center rounded-full border text-[11.5px] font-semibold text-foreground/70 transition hover:text-foreground"
                    />
                  }
                >
                  {user.name.trim().charAt(0) || 'あ'}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut />
                    サインアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {/* SP: 2段目=3タブ均等ナビ。アクティブ下線はヘッダー下罫に重なる */}
        <nav className="flex md:hidden">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'relative flex-1 pt-2.5 pb-[11px] text-center text-[13px] font-semibold text-primary'
                    : 'flex-1 pt-2.5 pb-[11px] text-center text-[13px] text-muted-foreground transition hover:text-foreground'
                }
              >
                {link.label}
                {active && (
                  <span
                    className="absolute inset-x-[32%] bottom-0 h-0.5 bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
