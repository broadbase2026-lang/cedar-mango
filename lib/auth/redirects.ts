import type { UserType } from '@/types';

export function dashboardPathForUserType(userType: UserType): string {
  return userType === 'journalist' ? '/journalist/discover' : '/brand/dashboard';
}

/** Returns a safe post-login path under `/brand` or `/journalist`, or null. */
export function sanitizeInternalNextParam(raw: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('..')) return null;
  if (
    trimmed.startsWith('/brand') ||
    trimmed.startsWith('/journalist') ||
    trimmed.startsWith('/dashboard/brand')
  ) {
    return trimmed;
  }
  return null;
}
