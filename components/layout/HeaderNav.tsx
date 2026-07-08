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
import { signOut, useSession } from '@/lib/auth/client';

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

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  if (pathname.startsWith('/sign-in')) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const user = session?.user;
  const initial = user?.name?.trim().charAt(0) || 'あ';

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-[1120px] items-center px-6 py-[15px] lg:px-10">
        <div className="flex min-w-0 flex-1 items-center">
          <Link href="/" aria-label="ひとひ — 今日のページへ">
            <BrandMark />
          </Link>
        </div>
        <nav className="flex items-center gap-5 sm:gap-[26px]">
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
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
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
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                  <LogOut />
                  サインアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
