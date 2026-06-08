import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { ERROR_MESSAGES } from '@/constants/copy';

export const runtime = 'nodejs';

function csvEscape(v: string): string {
  if (v.includes('"') || v.includes(',') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const { data: subscriptionRow } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('owner_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  const subscription = applyDevSubscriptionOverrides(user.id, subscriptionRow);

  if (subscription?.plan !== 'agency') {
    return NextResponse.json(
      { error: ERROR_MESSAGES.analyticsExportNotAvailable },
      { status: 403 }
    );
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand?.id) {
    return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });
  }

  const [viewsRes, downloadsRes] = await Promise.all([
    admin
      .from('release_views')
      .select('viewed_at, press_release_id')
      .eq('brand_id', brand.id)
      .order('viewed_at', { ascending: false })
      .limit(5000),
    admin
      .from('asset_downloads')
      .select('downloaded_at, press_release_id')
      .eq('brand_id', brand.id)
      .order('downloaded_at', { ascending: false })
      .limit(5000),
  ]);

  if (viewsRes.error) {
    return NextResponse.json({ error: viewsRes.error.message }, { status: 500 });
  }
  if (downloadsRes.error) {
    return NextResponse.json({ error: downloadsRes.error.message }, { status: 500 });
  }

  const ids = new Set<string>();
  for (const r of viewsRes.data ?? []) ids.add(r.press_release_id);
  for (const r of downloadsRes.data ?? []) ids.add(r.press_release_id);

  const idList = Array.from(ids);
  const titlesMap = new Map<string, string>();
  if (idList.length > 0) {
    const titlesRes = await admin
      .from('press_releases')
      .select('id, title')
      .in('id', idList);
    if (titlesRes.error) {
      return NextResponse.json({ error: titlesRes.error.message }, { status: 500 });
    }
    for (const row of titlesRes.data ?? []) {
      if (row?.id) titlesMap.set(row.id, row.title ?? '');
    }
  }

  const lines: string[] = [];
  lines.push('release_title,viewed_at/downloaded_at,event_type');

  for (const row of viewsRes.data ?? []) {
    const title = titlesMap.get(row.press_release_id) ?? '';
    lines.push(
      [
        csvEscape(title),
        csvEscape(new Date(row.viewed_at).toISOString()),
        'release_view',
      ].join(',')
    );
  }

  for (const row of downloadsRes.data ?? []) {
    const title = titlesMap.get(row.press_release_id) ?? '';
    lines.push(
      [
        csvEscape(title),
        csvEscape(new Date(row.downloaded_at).toISOString()),
        'asset_download',
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition':
        'attachment; filename="broadbase-analytics.csv"',
    },
  });
}

