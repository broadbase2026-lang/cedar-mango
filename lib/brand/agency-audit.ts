import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calendarQuarterBoundsUTC } from '@/lib/brand/calendar-quarter';

const AUDIT_REASON = 'agency_name_change_limit';

/**
 * Record a brand name change and flag for manual audit when an agency-plan
 * owner changes name more than once in the current calendar quarter.
 */
export async function recordAgencyNameChange(
  admin: SupabaseClient,
  params: {
    brandId: string;
    ownerId: string;
    oldName: string;
    newName: string;
  }
): Promise<void> {
  const { brandId, ownerId, oldName, newName } = params;
  if (oldName === newName) return;

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.plan !== 'agency') return;

  const { error: insertError } = await admin.from('brand_name_changes').insert({
    brand_id: brandId,
    owner_id: ownerId,
    old_name: oldName,
    new_name: newName,
  });

  if (insertError) {
    console.error('[agency-audit] failed to insert name change', insertError);
    return;
  }

  const { start, end } = calendarQuarterBoundsUTC();
  const { count, error: countError } = await admin
    .from('brand_name_changes')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .gte('changed_at', start)
    .lt('changed_at', end);

  if (countError) {
    console.error('[agency-audit] failed to count quarterly changes', countError);
    return;
  }

  if ((count ?? 0) > 1) {
    const now = new Date().toISOString();
    const { error: flagError } = await admin
      .from('brands')
      .update({
        needs_manual_audit: true,
        audit_flagged_at: now,
        audit_reason: AUDIT_REASON,
      })
      .eq('id', brandId);

    if (flagError) {
      console.error('[agency-audit] failed to flag brand for audit', flagError);
    }
  }
}
