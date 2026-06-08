import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { applyDevProfileOverrides } from '@/lib/auth/dev-profile-mock';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import type { UserType } from '@/types';

export default async function AuthLayout({ children }: { children: ReactNode }) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
