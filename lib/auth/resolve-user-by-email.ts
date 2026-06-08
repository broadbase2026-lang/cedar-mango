import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Resolve an auth user by email via the admin listUsers API (paginated).
 */
export async function resolveAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[auth] listUsers failed', error);
      return null;
    }

    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
