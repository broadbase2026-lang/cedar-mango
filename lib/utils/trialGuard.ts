import 'server-only';

import {
  applyDevProfileOverrides,
  devEnterpriseHasActiveSubscription,
} from '@/lib/auth/dev-profile-mock';
import { createClient } from '@/lib/supabase/server';

type AccessState = {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  trialExpired: boolean;
  publishedReleaseCount: number;
  brandCount: number;
};

function isOlderThan14Days(createdAtIso: string): boolean {
  const createdAtMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdAtMs)) return true;
  const ageMs = Date.now() - createdAtMs;
  return ageMs > 14 * 24 * 60 * 60 * 1000;
}

export async function getBrandAccessState(ownerId: string): Promise<AccessState> {
  const supabase = await createClient();

  const [{ data: profile }, subscriptionRes, brandsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_type, created_at')
      .eq('id', ownerId)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status')
      .eq('owner_id', ownerId)
      .in('status', ['active', 'trialing'])
      .maybeSingle(),
    supabase
      .from('brands')
      .select('id', { count: 'exact' })
      .eq('owner_id', ownerId)
      .is('deleted_at', null),
  ]);

  const patchedProfile = applyDevProfileOverrides(ownerId, profile);
  const isBrandUser = patchedProfile?.user_type === 'brand';
  const createdAt =
    typeof patchedProfile?.created_at === 'string' ? patchedProfile.created_at : null;

  const hasActiveSubscription =
    devEnterpriseHasActiveSubscription(ownerId) ||
    (isBrandUser &&
      (subscriptionRes.data?.status === 'active' ||
        subscriptionRes.data?.status === 'trialing'));

  const brandIds = Array.isArray(brandsRes.data)
    ? brandsRes.data
        .map((b) => (typeof b?.id === 'string' ? b.id : null))
        .filter((id): id is string => Boolean(id))
    : [];

  const brandCount = brandsRes.count ?? brandIds.length;

  let publishedReleaseCount = 0;
  if (brandIds.length > 0) {
    const publishedRes = await supabase
      .from('press_releases')
      .select('id', { count: 'exact', head: true })
      .in('brand_id', brandIds)
      .eq('status', 'published')
      .is('deleted_at', null);
    publishedReleaseCount = publishedRes.count ?? 0;
  }

  const noActiveSub = isBrandUser && !hasActiveSubscription;
  const accountIsOld = createdAt ? isOlderThan14Days(createdAt) : true;

  const isInTrial = noActiveSub && !accountIsOld;
  const trialExpired = noActiveSub && accountIsOld;

  return {
    hasActiveSubscription,
    isInTrial,
    trialExpired,
    publishedReleaseCount,
    brandCount,
  };
}

