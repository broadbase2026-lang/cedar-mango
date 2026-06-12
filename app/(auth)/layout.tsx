import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { applyDevProfileOverrides } from '@/lib/auth/dev-profile-mock';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import type { UserType } from '@/types';

/** Always read Supabase env at request time (not from a stale static shell). */
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const env = getSupabasePublicEnv();

  if (env) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();

        const profile = applyDevProfileOverrides(user.id, profileRow);

        if (profile?.user_type === 'brand' || profile?.user_type === 'journalist') {
          redirect(dashboardPathForUserType(profile.user_type as UserType));
        }
      }
    } catch (err) {
      console.error('[auth layout] session check failed', err);
    }
  }

  return children;
}
