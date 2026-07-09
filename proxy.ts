import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATTERNS = [
  /^\/$/,
  /^\/diary(\/|$)/,
  /^\/history(\/|$)/,
  /^\/insights(\/|$)/,
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 素通し: /sign-in, /api/auth/*, 静的アセット
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATTERNS.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
