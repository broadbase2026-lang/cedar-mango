import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { planFromStripePriceId } from '@/lib/stripe/plans';

type StripeClient = InstanceType<typeof Stripe>;

type SubscriptionRowStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing';

/** Billing period end lives on subscription items in current Stripe API versions. */
function currentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const items = subscription.items?.data ?? [];
  if (items.length === 0) return null;
  const ends = items.map((i) => i.current_period_end);
  const maxEnd = Math.max(...ends);
  return new Date(maxEnd * 1000).toISOString();
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionRowStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    default:
      return 'canceled';
  }
}

export async function upsertSubscriptionFromStripeSubscription(
  admin: SupabaseClient,
  ownerId: string,
  customerId: string,
  subscription: Stripe.Subscription
): Promise<{ error: Error | null }> {
  const priceRef = subscription.items.data[0]?.price;
  const priceId =
    typeof priceRef === 'string' ? priceRef : priceRef?.id;
  const plan = planFromStripePriceId(priceId);
  if (!plan) {
    return {
      error: new Error(
        `Unknown Stripe price id "${priceId ?? ''}" — check STRIPE_*_PRICE_ID env vars.`
      ),
    };
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = currentPeriodEndIso(subscription);

  const payload = {
    owner_id: ownerId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    status,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };

  const { data: bySub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (bySub) {
    const { error } = await admin
      .from('subscriptions')
      .update(payload)
      .eq('id', bySub.id);
    return { error: error ? new Error(error.message) : null };
  }

  const { data: byCustomer } = await admin
    .from('subscriptions')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (byCustomer) {
    const { error } = await admin
      .from('subscriptions')
      .update(payload)
      .eq('id', byCustomer.id);
    return { error: error ? new Error(error.message) : null };
  }

  const { error } = await admin.from('subscriptions').insert(payload);
  return { error: error ? new Error(error.message) : null };
}

export async function syncSubscriptionByStripeId(
  admin: SupabaseClient,
  stripeClient: StripeClient,
  subscription: Stripe.Subscription
): Promise<{ error: Error | null }> {
  let ownerId =
    subscription.metadata?.supabase_user_id?.trim() || null;

  if (!ownerId) {
    const { data: row } = await admin
      .from('subscriptions')
      .select('owner_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    ownerId = row?.owner_id ?? null;
  }

  if (!ownerId) {
    return {
      error: new Error(
        `Cannot resolve owner for subscription ${subscription.id} (missing metadata and DB row).`
      ),
    };
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    return { error: new Error(`Subscription ${subscription.id} has no customer id.`) };
  }

  const full =
    subscription.items?.data?.length > 0
      ? subscription
      : await stripeClient.subscriptions.retrieve(subscription.id);

  return upsertSubscriptionFromStripeSubscription(
    admin,
    ownerId,
    customerId,
    full
  );
}
