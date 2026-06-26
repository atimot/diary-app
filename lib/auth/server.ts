import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client';
import { account, session, user, verification } from '@/lib/db/schema';
import { isAllowedEmail, parseAllowList } from './whitelist';

const allowList = parseAllowList(process.env.ALLOWED_EMAILS);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, account, session, verification },
  }),
  // 署名付き短命 cookie にセッションを載せ、getSession の毎回 DB 照会を省く。
  // requireSession() は全保護ページ/クエリで呼ばれるため効果が大きい（特に /insights は
  // Promise.all 内で複数回 getSession していた）。単一ユーザー運用なので失効の即時性が
  // maxAge ぶん遅れる点は許容。即時失効が要る場合のみ getSession に
  // query:{ disableCookieCache: true } を渡す。
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 秒
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email, allowList)) {
            throw new Error('NOT_ALLOWED');
          }
          return { data: user };
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
