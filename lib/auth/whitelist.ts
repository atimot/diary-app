export function isAllowedEmail(email: string, allowList: string[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return allowList.some((entry) => entry.trim().toLowerCase() === normalized);
}

export function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
