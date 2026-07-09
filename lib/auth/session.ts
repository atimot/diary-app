import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './server';

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  // cookie 残存×セッション無効（secret ローテーション等）でも英語エラー画面に
  // 落とさず、サインインへ戻す（Next.js 公式の DAL パターン。Server Action 内でも動く）
  if (!session) redirect('/sign-in');
  return session;
}

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
}
