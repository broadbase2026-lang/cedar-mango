import { NextResponse } from 'next/server';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export async function GET(req: Request) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get('slug')?.trim();
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Missing slug.' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('press_releases')
    .select('body')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Release not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    body: typeof data.body === 'string' ? data.body : '',
  });
}
