import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalistPortalSession,
  journalistSessionHttpStatus,
} from '@/lib/journalist/session';
import { verifyUrlReachable } from '@/lib/journalist/verify-url-reachable';
import { CreatePublicationSchema } from '@/lib/validations/portfolio';

export const runtime = 'nodejs';

const URL_UNREACHABLE_MESSAGE =
  'The article URL could not be reached. Please check it and try again.';
const DUPLICATE_URL_MESSAGE =
  'This article URL has already been added to a portfolio.';

export async function POST(req: Request) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: session.reason },
      { status: journalistSessionHttpStatus(session) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json' },
      { status: 400 }
    );
  }

  const parsed = CreatePublicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }

  const reachable = await verifyUrlReachable(parsed.data.article_url);
  if (!reachable) {
    return NextResponse.json(
      { success: false, error: URL_UNREACHABLE_MESSAGE },
      { status: 422 }
    );
  }

  const supabase = await createClient();

  if (parsed.data.press_release_id) {
    const releaseRes = await supabase
      .from('press_releases')
      .select('id')
      .eq('id', parsed.data.press_release_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (releaseRes.error) {
      return NextResponse.json(
        { success: false, error: releaseRes.error.message },
        { status: 500 }
      );
    }
    if (!releaseRes.data) {
      return NextResponse.json(
        { success: false, error: 'not_found' },
        { status: 404 }
      );
    }
  }

  const { data: publication, error: insertError } = await supabase
    .from('journalist_publications')
    .insert({
      journalist_id: session.user.id,
      press_release_id: parsed.data.press_release_id ?? null,
      publication_name: parsed.data.publication_name,
      article_headline: parsed.data.article_headline,
      article_url: parsed.data.article_url,
      published_at: parsed.data.published_at,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { success: false, error: DUPLICATE_URL_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: insertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { publication } });
}
