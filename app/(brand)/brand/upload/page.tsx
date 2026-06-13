import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrandMediaLibraryView } from '@/components/brand/brand-media-library-view';
import { loadMediaLibraryData } from '@/lib/brand/media-library-data';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { getBrandPortalSession } from '@/lib/brand/session';
import { TRIAL_COPY, TRIAL_LIMIT_COPY } from '@/constants/copy';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export const dynamic = 'force-dynamic';

export default async function BrandUploadPage({ searchParams }: PageProps) {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }

  if (!session.brand) {
    redirect('/brand/settings');
  }

  const trial = first(searchParams?.trial) === 'true';

  const { data: subscriptionRow } = await session.supabase
    .from('subscriptions')
    .select('trial_mode, trial_releases_used, status, plan')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  const subscription = applyDevSubscriptionOverrides(
    session.user.id,
    subscriptionRow
  );

  const trialMode = Boolean(subscription?.trial_mode);
  const trialReleasesUsed =
    typeof subscription?.trial_releases_used === 'number'
      ? subscription.trial_releases_used
      : 0;

  if (trialMode && trialReleasesUsed >= 1) {
    return (
      <main className="bb-dash-main">
        <div className="bb-dash-inner max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{TRIAL_LIMIT_COPY.uploadGate.title}</CardTitle>
              <CardDescription>
                {TRIAL_LIMIT_COPY.uploadGate.body}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="primary">
                  {TRIAL_LIMIT_COPY.uploadGate.primaryCta}
                </Button>
              </Link>
              <Link href="/brand/dashboard" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="ghost">
                  {TRIAL_LIMIT_COPY.uploadGate.secondaryCta}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  const initial = await loadMediaLibraryData(
    session.supabase,
    session.brand.id
  );

  return (
    <div className="bb-dash-main">
      <div className="bb-dash-inner">
        {trial ? (
          <div className="mb-6 rounded-2xl border border-accent/30 bg-accent-subtle px-4 py-3 text-sm text-text-primary">
            {TRIAL_COPY.uploadBanner}
          </div>
        ) : null}
        <BrandMediaLibraryView
          brandId={session.brand.id}
          initial={initial}
          isTrial={Boolean(subscription?.trial_mode)}
        />
      </div>
    </div>
  );
}
