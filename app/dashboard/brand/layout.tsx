import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BrandPortalShell } from '@/components/brand/brand-portal-shell';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import { getBrandPortalSession } from '@/lib/brand/session';
import type { UserType } from '@/types';

export default async function DashboardBrandLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = headers().get('x-broadbase-pathname') ?? '/dashboard/brand';
  const loginHref = pathname.startsWith('/dashboard/brand')
    ? `/login?next=${encodeURIComponent(pathname)}`
    : '/login';

  const session = await getBrandPortalSession();
  if (!session.ok) {
    if (session.reason === 'unauthenticated') {
      redirect(loginHref);
    }
    if (session.reason === 'journalist') {
      redirect(dashboardPathForUserType('journalist' as UserType));
    }
    redirect('/login');
  }

  const brandName =
    session.brand?.name ?? session.displayName ?? 'Your workspace';

  return (
    <div data-side="brand" className="min-h-screen bg-surface-page">
      <BrandPortalShell
        brandName={brandName}
        userEmail={session.email}
        userDisplayName={session.displayName}
        userAvatarUrl={session.avatarUrl}
      >
        {children}
      </BrandPortalShell>
    </div>
  );
}
