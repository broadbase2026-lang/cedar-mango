import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  brandPlanFromSubscription,
  fetchBrandOwnerSubscription,
} from '@/lib/auth/dev-profile-mock';
import { getBrandPortalSession } from '@/lib/brand/session';
import { TIER_FEATURES } from '@/constants/copy';

function startDateIso(plan: 'starter' | 'pro' | 'agency'): string {
  const d = new Date();
  if (plan === 'starter') {
    d.setDate(d.getDate() - 30);
  } else {
    d.setMonth(d.getMonth() - 12);
  }
  return d.toISOString();
}

export default async function BrandAnalyticsPage() {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }
  if (!session.brand) {
    redirect('/brand/settings');
  }

  const subscription = await fetchBrandOwnerSubscription(
    session.supabase,
    session.user.id
  );
  const plan = (brandPlanFromSubscription(session.user.id, subscription) ??
    'starter') as 'starter' | 'pro' | 'agency';
  const fromIso = startDateIso(plan);
  const canExport = TIER_FEATURES[plan]?.analyticsExport === true;

  const [viewsRes, downloadsRes] = await Promise.all([
    session.supabase
      .from('release_views')
      .select('viewed_at, press_release_id')
      .eq('brand_id', session.brand.id)
      .gte('viewed_at', fromIso)
      .order('viewed_at', { ascending: false })
      .limit(200),
    session.supabase
      .from('asset_downloads')
      .select('downloaded_at, press_release_id')
      .eq('brand_id', session.brand.id)
      .gte('downloaded_at', fromIso)
      .order('downloaded_at', { ascending: false })
      .limit(200),
  ]);

  const views = viewsRes.data ?? [];
  const downloads = downloadsRes.data ?? [];

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-brand-ink">Analytics</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {plan === 'starter' ? 'Last 30 days' : 'Last 12 months'}
            </p>
          </div>
          {canExport ? (
            <Link
              href="/api/analytics/export"
              className="bb-btn-primary-sm no-underline"
            >
              Export CSV
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">
              Release views
            </div>
            <div className="mt-2 text-3xl font-semibold text-brand-ink">
              {views.length}
            </div>
          </div>
          <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">
              Asset downloads
            </div>
            <div className="mt-2 text-3xl font-semibold text-brand-ink">
              {downloads.length}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">Recent events</h2>
            <div className="text-xs text-brand-muted">
              Showing up to 200 views + 200 downloads
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {views.length === 0 && downloads.length === 0 ? (
              <div className="text-brand-muted">No analytics events yet.</div>
            ) : (
              <>
                {views.slice(0, 12).map((v, i) => (
                  <div key={`v-${i}`} className="flex justify-between gap-4">
                    <span className="text-brand-ink">Release view</span>
                    <span className="text-brand-muted tabular-nums">
                      {new Date(v.viewed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
                {downloads.slice(0, 12).map((d, i) => (
                  <div key={`d-${i}`} className="flex justify-between gap-4">
                    <span className="text-brand-ink">Asset download</span>
                    <span className="text-brand-muted tabular-nums">
                      {new Date(d.downloaded_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
