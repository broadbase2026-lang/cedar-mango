import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import type { UserType } from '@/types';
import { JournalistPortalShell } from '@/components/journalist/journalist-portal-shell';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export default async function JournalistLayout({ children }: { children: ReactNode }) {
  const pathname = headers().get('x-broadbase-pathname') ?? '/journalist/discover';
  const loginHref = pathname.startsWith('/journalist')
    ? `/login?next=${encodeURIComponent(pathname)}`
    : '/login';

  const session = await getJournalistPortalSession();
  if (!session.ok) {
    if (session.reason === 'unauthenticated') {
      redirect(loginHref);
    }
    if (session.reason === 'brand') {
      redirect(dashboardPathForUserType('brand' as UserType));
    }
    redirect('/login');
  }

  const title =
    session.journalistProfile?.publication?.trim() ||
    session.displayName?.trim() ||
    'Discover';

  return (
    <div data-side="journalist" className="min-h-screen bg-surface-page">
      <JournalistPortalShell
        title={title}
        userEmail={session.email}
        userDisplayName={session.displayName}
        userAvatarUrl={session.avatarUrl}
      >
        {children}
      </JournalistPortalShell>
    </div>
  );
}
