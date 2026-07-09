import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '',
});

// useSession はヘッダーのサーバー props 化（layout の getSessionOrNull）で不要になった
export const { signIn, signOut } = authClient;
