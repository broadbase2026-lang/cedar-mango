import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

/**
 * Best-effort push of brand audit state to Stripe Customer metadata.
 * Does not throw; logs errors only.
 */
export async function syncBrandMetadataToStripe(
  admin: SupabaseClient,
  ownerId: string
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const [{ data: brand }, { data: subscription }] = await Promise.all([
    admin
      .from('brands')
      .select('name, needs_manual_audit, audit_reason')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('owner_id', ownerId)
      .maybeSingle(),
  ]);

  const customerId = subscription?.stripe_customer_id;
  if (!customerId || customerId.startsWith('trial_')) return;

  const metadata: Record<string, string> = {
    brand_name: brand?.name ?? '',
    needs_manual_audit: brand?.needs_manual_audit ? 'true' : 'false',
    audit_reason: brand?.needs_manual_audit
      ? (brand.audit_reason ?? '')
      : '',
  };

  try {
    await stripe.customers.update(customerId, { metadata });
  } catch (err) {
    console.error('[stripe] syncBrandMetadataToStripe failed', err);
  }
}
