import { redirect } from 'next/navigation';
import { BrandDashboardView } from '@/components/brand/brand-dashboard-view';
import { loadBrandDashboardData, RELEASES_PAGE_SIZE } from '@/lib/brand/dashboard-data';
import { getBrandPortalSession } from '@/lib/brand/session';
import type { BrandDashboardData } from '@/lib/brand/dashboard-data';
import { brandPlanFromSubscription, fetchBrandOwnerSubscription } from '@/lib/auth/dev-profile-mock';
import { getBrandAccessState } from '@/lib/utils/trialGuard';

const EMPTY_DATA: BrandDashboardData = {
  metrics: {
    totalViews: 0,
    assetDownloads: 0,
    activeJournalists: 0,
    aiReadinessAvg: null,
  },
  releases: [],
  releasesPagination: {
    page: 1,
    pageSize: RELEASES_PAGE_SIZE,
    total: 0,
  },
  drafts: [],
  loadError: null,
};

function parseReleasesPage(
  raw: string | string[] | undefined
): number {
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export const dynamic = 'force-dynamic';

export default async function BrandDashboardPage({ searchParams }: PageProps) {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }

  const access = await getBrandAccessState(session.user.id);

  const subscription = await fetchBrandOwnerSubscription(
    session.supabase,
    session.user.id
  );
  const plan = brandPlanFromSubscription(session.user.id, subscription);

  const brand = session.brand;

  const sectionRaw = searchParams.section;
  const section =
    typeof sectionRaw === 'string'
      ? sectionRaw
      : Array.isArray(sectionRaw)
        ? sectionRaw[0]
        : undefined;
  const releasesPage = parseReleasesPage(searchParams.page);

  const data = brand
    ? await loadBrandDashboardData(session.supabase, brand.id, { releasesPage })
    : EMPTY_DATA;

  return (
    <BrandDashboardView
      hasBrand={brand != null}
      data={data}
      scrollToReleasesSection={section === 'releases'}
      preserveSectionInLinks={section === 'releases'}
      accessState={{
        isInTrial: access.isInTrial,
        trialExpired: access.trialExpired,
        hasActiveSubscription: access.hasActiveSubscription,
        plan,
      }}
    />
  );
}
