import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Atomically reserve a publish slot (trial or plan period limit). */
export async function reservePublishSlot(
  admin: SupabaseClient,
  subscriptionId: string,
  tierLimit: number | null
): Promise<boolean> {
  const { data, error } = await admin.rpc('reserve_publish_slot', {
    p_subscription_id: subscriptionId,
    p_tier_limit: tierLimit,
  });
  if (error) {
    console.error('[reservePublishSlot] rpc failed', error);
    return false;
  }
  return data === true;
}

/** Undo reserve_publish_slot when the publish update fails. */
export async function releasePublishSlot(
  admin: SupabaseClient,
  subscriptionId: string,
  tierLimit: number | null
): Promise<void> {
  const { error } = await admin.rpc('release_publish_slot', {
    p_subscription_id: subscriptionId,
    p_tier_limit: tierLimit,
  });
  if (error) {
    console.error('[releasePublishSlot] rpc failed', error);
  }
}
