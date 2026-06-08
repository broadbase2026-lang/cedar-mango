import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import type { SupabaseClient } from '@supabase/supabase-js';

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  industry_vertical: string | null;
  needs_manual_audit: boolean;
  audit_flagged_at: string | null;
};

export type SubscriptionRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string;
};

export type BrandSettingsSnapshot = {
  profileFullName: string | null;
  avatarUrl: string | null;
  brand: BrandRow | null;
  subscription: SubscriptionRow | null;
  /** Slug cannot be changed after the brand has a published release. */
  slugLocked: boolean;
  needsManualAudit: boolean;
  auditFlaggedAt: string | null;
};

/**
 * Load everything needed for /brand/settings (RLS-scoped client).
 */
export async function loadBrandSettingsSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<BrandSettingsSnapshot> {
  const [{ data: profile }, { data: brand }, payableRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('brands')
      .select(
        'id, name, slug, description, website, logo_url, industry_vertical, needs_manual_audit, audit_flagged_at'
      )
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, stripe_customer_id')
      .eq('owner_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  let subscription = (payableRes.data?.[0] ?? null) as SubscriptionRow | null;
  if (!subscription) {
    const { data: latest } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, stripe_customer_id')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    subscription = (latest?.[0] ?? null) as SubscriptionRow | null;
  }

  let slugLocked = false;
  if (brand) {
    const { count } = await supabase
      .from('press_releases')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .eq('status', 'published')
      .is('deleted_at', null);
    slugLocked = (count ?? 0) > 0;
  }

  return {
    profileFullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    brand: brand as BrandRow | null,
    subscription: applyDevSubscriptionOverrides(
      userId,
      subscription
    ) as SubscriptionRow | null,
    slugLocked,
    needsManualAudit: Boolean(brand?.needs_manual_audit),
    auditFlaggedAt:
      typeof brand?.audit_flagged_at === 'string' ? brand.audit_flagged_at : null,
  };
}
