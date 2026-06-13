import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type JournalistPortalSession =
  | {
      ok: true;
      supabase: SupabaseClient;
      user: User;
      displayName: string | null;
      avatarUrl: string | null;
      email: string | undefined;
      journalistProfile: { publication: string | null } | null;
      isInactive: boolean;
      inactiveAt: string | null;
      scheduledDeletionAt: string | null;
    }
  | {
      ok: false;
      reason: 'unauthenticated' | 'brand' | 'forbidden' | 'inactive';
      inactiveAt?: string | null;
      scheduledDeletionAt?: string | null;
    };

/**
 * Server-only: authenticated journalist session + optional journalist profile row.
 * RLS applies to all subsequent queries using the returned client.
 */
export const getJournalistPortalSession = cache(async function getJournalistPortalSession(): Promise<JournalistPortalSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, reason: 'forbidden' };
  }

  if (profile.user_type === 'brand') {
    return { ok: false, reason: 'brand' };
  }

  if (profile.user_type !== 'journalist') {
    return { ok: false, reason: 'forbidden' };
  }

  const { data: journalistProfile } = await supabase
    .from('journalist_profiles')
    .select(
      'publication, is_inactive, inactive_at, scheduled_deletion_at'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (journalistProfile?.is_inactive) {
    return {
      ok: false,
      reason: 'inactive',
      inactiveAt:
        typeof journalistProfile.inactive_at === 'string'
          ? journalistProfile.inactive_at
          : null,
      scheduledDeletionAt:
        typeof journalistProfile.scheduled_deletion_at === 'string'
          ? journalistProfile.scheduled_deletion_at
          : null,
    };
  }

  return {
    ok: true,
    supabase,
    user,
    displayName: profile.full_name,
    avatarUrl: profile.avatar_url ?? null,
    email: user.email,
    journalistProfile: journalistProfile ?? null,
    isInactive: false,
    inactiveAt: null,
    scheduledDeletionAt: null,
  };
});

/** HTTP status for journalist API routes when session is not ok. */
export function journalistSessionHttpStatus(
  session: JournalistPortalSession
): 401 | 403 {
  if (session.ok) return 401;
  return session.reason === 'inactive' ? 403 : 401;
}

