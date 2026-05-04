import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import type { UserType } from '@/types';
import { logoutAction } from '@/lib/auth/logout';

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const pathname = headers().get('x-broadbase-pathname') ?? '/brand/dashboard';
  const loginHref = pathname.startsWith('/brand')
    ? `/login?next=${encodeURIComponent(pathname)}`
    : '/login';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginHref);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    redirect('/login');
  }

  if (profile.user_type === 'journalist') {
    redirect(dashboardPathForUserType(profile.user_type as UserType));
  }

  if (profile.user_type !== 'brand') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <Link href="/brand/dashboard" className="text-sm font-medium text-teal-800">
          Brand
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-neutral-600 underline hover:text-neutral-900"
          >
            Log out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
