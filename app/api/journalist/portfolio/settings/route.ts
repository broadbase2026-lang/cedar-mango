import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  getJournalistPortalSession,
  journalistSessionHttpStatus,
} from '@/lib/journalist/session';
import { UpdatePortfolioSettingsSchema } from '@/lib/validations/portfolio';
import type { JournalistPortfolioSettings } from '@/types';

export const runtime = 'nodejs';

const SLUG_TAKEN_MESSAGE =
  'That URL is already taken. Please choose a different one.';

export async function PATCH(req: Request) {
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

  const parsed = UpdatePortfolioSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const journalistId = session.user.id;

  const { data: existing } = await supabase
    .from('journalist_portfolio_settings')
    .select('*')
    .eq('journalist_id', journalistId)
    .maybeSingle();

  // If the slug is being changed, reject collisions with another journalist.
  if (parsed.data.slug !== undefined && parsed.data.slug !== existing?.slug) {
    const { data: conflict } = await supabase
      .from('journalist_portfolio_settings')
      .select('journalist_id')
      .eq('slug', parsed.data.slug)
      .neq('journalist_id', journalistId)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { success: false, error: SLUG_TAKEN_MESSAGE },
        { status: 409 }
      );
    }
  }

  const slug = parsed.data.slug ?? existing?.slug;
  if (!slug) {
    // slug is NOT NULL; a settings row should already exist from signup.
    return NextResponse.json(
      { success: false, error: 'A slug is required to initialize portfolio settings.' },
      { status: 400 }
    );
  }

  const pick = <K extends keyof typeof parsed.data>(
    key: K,
    fallback: JournalistPortfolioSettings[Extract<K, keyof JournalistPortfolioSettings>]
  ) => (parsed.data[key] !== undefined ? parsed.data[key] : fallback);

  const record = {
    journalist_id: journalistId,
    slug,
    bio: pick('bio', existing?.bio ?? null),
    public: pick('public', existing?.public ?? true),
    show_email: pick('show_email', existing?.show_email ?? false),
    twitter_url: pick('twitter_url', existing?.twitter_url ?? null),
    linkedin_url: pick('linkedin_url', existing?.linkedin_url ?? null),
    website_url: pick('website_url', existing?.website_url ?? null),
  };

  const { data: settings, error: upsertError } = await supabase
    .from('journalist_portfolio_settings')
    .upsert(record, { onConflict: 'journalist_id' })
    .select()
    .single();

  if (upsertError) {
    if (upsertError.code === '23505') {
      return NextResponse.json(
        { success: false, error: SLUG_TAKEN_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: upsertError.message },
      { status: 400 }
    );
  }

  revalidatePath(`/journalist/${settings.slug as string}`);

  return NextResponse.json({ success: true, data: { settings } });
}
