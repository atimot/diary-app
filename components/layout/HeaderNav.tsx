'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth/client';

const links = [
  {
    href: '/',
    label: '日記',
    match: (p: string) => p === '/' || p.startsWith('/diary'),
  },
  {
    href: '/history',
    label: '履歴',
    match: (p: string) => p.startsWith('/history'),
  },
  {
    href: '/insights',
    label: '分析',
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

  return (
    <nav className="container mx-auto flex max-w-3xl items-center justify-between gap-6 p-4">
      <div className="flex items-center gap-6">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      {session?.user && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{session.user.email}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
          >
            サインアウト
          </Button>
        </div>
      )}
    </nav>
  );
}
