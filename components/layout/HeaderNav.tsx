'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: '日記', match: (p: string) => p === '/' || p.startsWith('/diary') },
  { href: '/history', label: '履歴', match: (p: string) => p.startsWith('/history') },
  { href: '/insights', label: '分析', match: (p: string) => p.startsWith('/insights') },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="container mx-auto flex max-w-3xl items-center gap-6 p-4">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
