import { applyDevProfileOverrides } from '@/lib/auth/dev-profile-mock';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type BrandPortalSession =
  | {
      ok: true;
      supabase: SupabaseClient;
      user: User;
      displayName: string | null;
      avatarUrl: string | null;
      email: string | undefined;
      brand: { id: string; name: string } | null;
    }
  | {
      ok: false;
      reason: 'unauthenticated' | 'journalist' | 'forbidden';
    };

/**
 * Server-only: authenticated brand owner session + optional brand row.
 * RLS applies to all subsequent queries using the returned client.
 */
export async function getBrandPortalSession(): Promise<BrandPortalSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const profile = applyDevProfileOverrides(user.id, profileRow);

  if (profileError || !profile) {
    return { ok: false, reason: 'forbidden' };
  }

  if (profile.user_type === 'journalist') {
    return { ok: false, reason: 'journalist' };
  }

  if (profile.user_type !== 'brand') {
    return { ok: false, reason: 'forbidden' };
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  return {
    ok: true,
    supabase,
    user,
    displayName: profile.full_name,
    avatarUrl: profile.avatar_url ?? null,
    email: user.email,
    brand: brand ?? null,
  };
}
