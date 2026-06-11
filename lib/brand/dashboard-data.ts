import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardReleaseRow = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  verticalLabel: string;
  viewsCount: number;
  sparkline: number[];
  embargoUntil: string | null;
  geoReadinessScore: number | null;
};

export type DraftSummary = {
  id: string;
  title: string;
  aiReadinessScore: number | null;
};

export type BrandDashboardData = {
  metrics: {
    totalViews: number;
    assetDownloads: number;
    activeJournalists: number;
    aiReadinessAvg: number | null;
  };
  releases: DashboardReleaseRow[];
  drafts: DraftSummary[];
};

const VERTICAL_LABEL: Record<string, string> = {
  fnb: 'F&B',
  travel: 'Travel',
  culture: 'Culture',
  fashion: 'Fashion',
  lifestyle: 'Lifestyle',
  other: 'Other',
};

function labelVertical(raw: string | null): string {
  if (!raw) return '—';
  return VERTICAL_LABEL[raw] ?? raw;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function lastNDaysStart(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Build 7 day-buckets (oldest → newest) of view counts per release.
 * Queries `release_views` filtered by `brand_id` so RLS permits only the owner brand.
 */
function bucketSparklines(
  rows: { press_release_id: string; viewed_at: string }[],
  releaseIds: string[]
): Record<string, number[]> {
  const dayStarts: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    x.setHours(0, 0, 0, 0);
    dayStarts.push(x);
  }

  const out: Record<string, number[]> = {};
  for (const id of releaseIds) {
    out[id] = [0, 0, 0, 0, 0, 0, 0];
  }

  for (const row of rows) {
    const rid = row.press_release_id;
    if (!out[rid]) continue;
    const t = new Date(row.viewed_at);
    for (let b = 0; b < 7; b++) {
      const start = dayStarts[b].getTime();
      const end = start + 24 * 60 * 60 * 1000;
      if (t.getTime() >= start && t.getTime() < end) {
        out[rid][b] += 1;
        break;
      }
    }
  }

  return out;
}

/**
 * Loads dashboard aggregates from `release_views`, `asset_downloads`, and `press_releases`.
 * There is no `analytics_events` table in this schema; these tables back measurable engagement.
 */
export async function loadBrandDashboardData(
  supabase: SupabaseClient,
  brandId: string
): Promise<BrandDashboardData> {
  const monthStart = startOfMonthIso();
  const weekStart = lastNDaysStart(7);

  const [
    viewsCountRes,
    downloadsCountRes,
    viewsThisMonth,
    downloadsThisMonth,
    draftScoresRes,
    releasesRes,
    sparkRowsRes,
  ] = await Promise.all([
    supabase
      .from('release_views')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
    supabase
      .from('asset_downloads')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
    supabase
      .from('release_views')
      .select('journalist_id')
      .eq('brand_id', brandId)
      .not('journalist_id', 'is', null)
      .gte('viewed_at', monthStart),
    supabase
      .from('asset_downloads')
      .select('journalist_id')
      .eq('brand_id', brandId)
      .not('journalist_id', 'is', null)
      .gte('downloaded_at', monthStart),
    supabase
      .from('press_releases')
      .select('ai_readiness_score')
      .eq('brand_id', brandId)
      .eq('status', 'draft')
      .is('deleted_at', null)
      .not('ai_readiness_score', 'is', null),
    supabase
      .from('press_releases')
      .select(
        'id, title, status, industry_vertical, views_count, ai_readiness_score, geo_readiness_score, embargo_until'
      )
      .eq('brand_id', brandId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('release_views')
      .select('press_release_id, viewed_at')
      .eq('brand_id', brandId)
      .gte('viewed_at', weekStart),
  ]);

  const activeIds = new Set<string>();
  for (const row of viewsThisMonth.data ?? []) {
    if (row.journalist_id) activeIds.add(row.journalist_id);
  }
  for (const row of downloadsThisMonth.data ?? []) {
    if (row.journalist_id) activeIds.add(row.journalist_id);
  }

  const scores = (draftScoresRes.data ?? [])
    .map((r) => r.ai_readiness_score)
    .filter((n): n is number => typeof n === 'number');
  const aiReadinessAvg =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const rawReleases = releasesRes.data ?? [];
  const ids = rawReleases.map((r) => r.id);
  const sparkMap = bucketSparklines(sparkRowsRes.data ?? [], ids);

  const releases: DashboardReleaseRow[] = rawReleases.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status as DashboardReleaseRow['status'],
    verticalLabel: labelVertical(r.industry_vertical),
    viewsCount: r.views_count ?? 0,
    sparkline: sparkMap[r.id] ?? [0, 0, 0, 0, 0, 0, 0],
    embargoUntil: (r as any).embargo_until ?? null,
    geoReadinessScore:
      typeof r.geo_readiness_score === 'number' ? r.geo_readiness_score : null,
  }));

  const drafts: DraftSummary[] = rawReleases
    .filter((r) => r.status === 'draft')
    .map((r) => ({
      id: r.id,
      title: r.title,
      aiReadinessScore: r.ai_readiness_score,
    }));

  return {
    metrics: {
      totalViews: viewsCountRes.count ?? 0,
      assetDownloads: downloadsCountRes.count ?? 0,
      activeJournalists: activeIds.size,
      aiReadinessAvg,
    },
    releases,
    drafts,
  };
}
