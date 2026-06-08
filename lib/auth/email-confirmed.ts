import type { User } from '@supabase/supabase-js';

/** True when Supabase has verified the user's email address. */
export function isEmailConfirmed(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}
