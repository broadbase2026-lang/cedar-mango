import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

const INACTIVE_REASON = 'hard_bounce';
const DELETION_DAYS = 90;

export type ResendBouncePayload = {
  type?: string;
  data?: {
    to?: string[];
    bounce?: {
      type?: string;
    };
  };
};

export function isHardBounceEvent(payload: ResendBouncePayload): boolean {
  if (payload.type !== 'email.bounced') return false;
  const bounceType = payload.data?.bounce?.type?.toLowerCase();
  return bounceType === 'permanent';
}

export function recipientEmailsFromBounce(
  payload: ResendBouncePayload
): string[] {
  const raw = payload.data?.to ?? [];
  return raw
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Mark a journalist inactive, unpublish portfolio, and start 90-day deletion timer.
 */
export async function handleJournalistHardBounce(
  admin: SupabaseClient,
  params: {
    journalistId: string;
    email: string;
    eventPayload: ResendBouncePayload;
  }
): Promise<{ skipped: boolean; slug: string | null }> {
  const { journalistId, email, eventPayload } = params;

  const { data: profile } = await admin
    .from('journalist_profiles')
    .select('is_inactive')
    .eq('id', journalistId)
    .maybeSingle();

  if (profile?.is_inactive) {
    return { skipped: true, slug: null };
  }

  const now = new Date();
  const scheduledDeletion = new Date(now);
  scheduledDeletion.setUTCDate(scheduledDeletion.getUTCDate() + DELETION_DAYS);

  const nowIso = now.toISOString();
  const scheduledIso = scheduledDeletion.toISOString();

  const { error: profileError } = await admin
    .from('journalist_profiles')
    .update({
      is_inactive: true,
      inactive_at: nowIso,
      inactive_reason: INACTIVE_REASON,
      scheduled_deletion_at: scheduledIso,
      digest_subscribed: false,
    })
    .eq('id', journalistId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: portfolio } = await admin
    .from('journalist_portfolio_settings')
    .select('slug')
    .eq('journalist_id', journalistId)
    .maybeSingle();

  await admin
    .from('journalist_portfolio_settings')
    .update({ public: false })
    .eq('journalist_id', journalistId);

  await admin.from('email_delivery_events').insert({
    journalist_id: journalistId,
    email,
    event_type: 'hard_bounce',
    payload: eventPayload as Record<string, unknown>,
  });

  return { skipped: false, slug: portfolio?.slug ?? null };
}
