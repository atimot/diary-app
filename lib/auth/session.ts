import { headers } from 'next/headers';
import { auth } from './server';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
}
