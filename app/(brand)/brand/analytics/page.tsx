import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  brandPlanFromSubscription,
  fetchBrandOwnerSubscription,
} from '@/lib/auth/dev-profile-mock';
import { getBrandPortalSession } from '@/lib/brand/session';
import { TIER_FEATURES, GEO_DISPLAY } from '@/constants/copy';
import {
  calculateGeoReadinessScore,
  geoBandFromScore,
  type GeoScoreBand,
} from '@/lib/utils/geoScore';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import { GeoScoreBadge } from '@/components/brand/geo-score-badge';

type GeoReleasePanel = {
  id: string;
  title: string;
  storedScore: number | null;
  band: GeoScoreBand | null;
  tips: string[];
};

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

  const [viewsRes, downloadsRes, releasesRes, brandRes] = await Promise.all([
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
    session.supabase
      .from('press_releases')
      .select('id, title, summary, body, tags, geo_readiness_score, published_at')
      .eq('brand_id', session.brand.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(20),
    session.supabase
      .from('brands')
      .select('website')
      .eq('id', session.brand.id)
      .maybeSingle(),
  ]);

  const views = viewsRes.data ?? [];
  const downloads = downloadsRes.data ?? [];

  // Per-release GEO readiness. Stored geo_readiness_score is the headline number;
  // tips are recomputed from current release data so suggestions stay actionable.
  const releaseRows = releasesRes.data ?? [];
  const brandWebsite = brandRes.data?.website ?? null;
  const heroCaptionByRelease = new Map<string, string | null>();
  const releaseIds = releaseRows.map((r) => r.id);
  if (releaseIds.length > 0) {
    const heroRes = await session.supabase
      .from('press_assets')
      .select('press_release_id, caption')
      .in('press_release_id', releaseIds)
      .eq('is_hero', true)
      .is('deleted_at', null);
    for (const asset of heroRes.data ?? []) {
      heroCaptionByRelease.set(asset.press_release_id, asset.caption ?? null);
    }
  }

  const geoReleases: GeoReleasePanel[] = releaseRows.map((r) => {
    const tags = Array.isArray(r.tags)
      ? r.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];
    const hasHero = heroCaptionByRelease.has(r.id);
    const { tips } = calculateGeoReadinessScore({
      title: r.title,
      summary: r.summary,
      body: richTextToPlainText(r.body ?? ''),
      tags,
      heroAsset: hasHero
        ? { caption: heroCaptionByRelease.get(r.id) ?? null }
        : null,
      brandWebsite,
    });
    const storedScore =
      typeof r.geo_readiness_score === 'number' ? r.geo_readiness_score : null;
    return {
      id: r.id,
      title: r.title,
      storedScore,
      band: storedScore != null ? geoBandFromScore(storedScore) : null,
      tips,
    };
  });

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

        <div className="mt-8 rounded-xl border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-ink">
            {GEO_DISPLAY.panelTitle} — per release
          </h2>
          <p className="mt-1 text-xs text-brand-muted">
            LLM crawlability and structured-data readiness for published releases
          </p>
          <div className="mt-4 space-y-3">
            {geoReleases.length === 0 ? (
              <div className="text-sm text-brand-muted">
                No published releases yet.
              </div>
            ) : (
              geoReleases.map((g) => (
                <details
                  key={g.id}
                  className="rounded-lg border border-brand-border bg-white p-3"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="text-sm font-medium text-brand-ink">
                      {g.title}
                    </span>
                    <GeoScoreBadge score={g.storedScore} />
                  </summary>
                  <div className="mt-3 border-t border-brand-border pt-3 text-sm">
                    {g.storedScore == null ? (
                      <div>
                        <div className="font-medium text-brand-ink">
                          {GEO_DISPLAY.notScored.title}
                        </div>
                        <p className="mt-1 text-brand-muted">
                          {GEO_DISPLAY.notScored.body}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-semibold tabular-nums text-brand-ink">
                            {g.storedScore}
                          </span>
                          <span className="text-brand-muted">
                            / 100
                            {g.band
                              ? ` · ${GEO_DISPLAY.bandLabels[g.band]}`
                              : ''}
                          </span>
                        </div>
                        {g.tips.length > 0 ? (
                          <>
                            <div className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-muted">
                              {GEO_DISPLAY.tipsTitle}
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-ink">
                              {g.tips.map((tip) => (
                                <li key={tip}>{tip}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
