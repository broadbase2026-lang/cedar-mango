import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalistPortalSession,
  journalistSessionHttpStatus,
} from '@/lib/journalist/session';

export const runtime = 'nodejs';

const DUPLICATE_URL_MESSAGE =
  'This article URL has already been added to a portfolio.';

export async function POST(
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

  // Restore = clear the soft-delete sentinel. RLS owner-update ensures
  // the journalist can only restore their own rows.
  const { data: publication, error } = await supabase
    .from('journalist_publications')
    .update({ deleted_at: null })
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (error) {
    // The partial unique index only covers live rows, so restoring a row
    // whose URL is now claimed by another live publication conflicts.
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: DUPLICATE_URL_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
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
