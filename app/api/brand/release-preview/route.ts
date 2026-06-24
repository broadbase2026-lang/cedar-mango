import { NextResponse } from 'next/server';
import { getBrandPortalSession } from '@/lib/brand/session';
import { pickHeroAssetUrl } from '@/lib/press-assets/pick-hero-asset';

const VERTICAL_LABEL: Record<string, string> = {
  fnb: 'F&B',
  travel: 'Travel',
  culture: 'Culture',
  fashion: 'Fashion',
  lifestyle: 'Lifestyle',
  other: 'Other',
};

function labelVertical(raw: string | null): string | null {
  if (!raw) return null;
  return VERTICAL_LABEL[raw] ?? raw;
}

export async function GET(req: Request) {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  if (!session.brand) {
    return NextResponse.json({ ok: false, error: 'No brand found.' }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing release id.' }, { status: 400 });
  }

  const { data: pr, error } = await session.supabase
    .from('press_releases')
    .select(
      'id, title, slug, summary, body, published_at, created_at, industry_vertical, status, views_count, embargo_until'
    )
    .eq('id', id)
    .eq('brand_id', session.brand.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!pr) {
    return NextResponse.json({ ok: false, error: 'Release not found.' }, { status: 404 });
  }

  const { data: assetRows } = await session.supabase
    .from('press_assets')
    .select('id, file_name, file_url, file_type, is_hero, created_at')
    .eq('press_release_id', pr.id)
    .is('deleted_at', null)
    .order('is_hero', { ascending: false })
    .order('created_at', { ascending: true });

  const heroImageUrl =
    pickHeroAssetUrl(assetRows ?? []) ??
    `https://picsum.photos/seed/${encodeURIComponent(pr.id)}/1200/1400`;

  const mediaAssets = (assetRows ?? [])
    .filter((a) => a.file_url)
    .map((a) => ({
      label: a.file_name,
      href: a.file_url as string,
    }));

  const displayDate = pr.published_at ?? pr.created_at ?? null;

  return NextResponse.json({
    ok: true,
    release: {
      id: pr.id,
      title: pr.title,
      slug: pr.slug,
      summary: pr.summary ?? null,
      body: typeof pr.body === 'string' ? pr.body : '',
      status: pr.status,
      verticalLabel: labelVertical(pr.industry_vertical),
      displayDate,
      viewsCount: pr.views_count ?? 0,
      heroImageUrl,
      mediaAssets,
      fullReleaseHref: pr.status === 'published' ? `/release/${pr.slug}` : null,
    },
  });
}
