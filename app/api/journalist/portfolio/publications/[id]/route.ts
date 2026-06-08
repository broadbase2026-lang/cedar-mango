import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalistPortalSession,
  journalistSessionHttpStatus,
} from '@/lib/journalist/session';
import { verifyUrlReachable } from '@/lib/journalist/verify-url-reachable';
import { UpdatePublicationSchema } from '@/lib/validations/portfolio';

export const runtime = 'nodejs';

const URL_UNREACHABLE_MESSAGE =
  'The article URL could not be reached. Please check it and try again.';
const DUPLICATE_URL_MESSAGE =
  'This article URL has already been added to a portfolio.';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

  const parsed = UpdatePublicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }

  if (parsed.data.article_url !== undefined) {
    const reachable = await verifyUrlReachable(parsed.data.article_url);
    if (!reachable) {
      return NextResponse.json(
        { success: false, error: URL_UNREACHABLE_MESSAGE },
        { status: 422 }
      );
    }
  }

  const supabase = await createClient();

  const { data: publication, error: updateError } = await supabase
    .from('journalist_publications')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json(
        { success: false, error: DUPLICATE_URL_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 400 }
    );
  }

  if (!publication) {
    return NextResponse.json(
      { success: false, error: 'not_found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { publication } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: session.reason },
      { status: journalistSessionHttpStatus(session) }
    );
  }

  const supabase = await createClient();

  // Soft delete only — never DELETE FROM journalist_publications.
  const { error: deleteError } = await supabase
    .from('journalist_publications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id);

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: deleteError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
