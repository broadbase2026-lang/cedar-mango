'use server';

import { z } from 'zod';
import Stripe from 'stripe';
import { isBetaTrialOnly } from '@/lib/config/beta';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CHECKOUT_COPY } from '@/constants/copy';
import { redirect } from 'next/navigation';

const PlanSchema = z.enum(['starter', 'pro', 'agency']);
export type PricingPlan = z.infer<typeof PlanSchema>;

type ApiResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string };

type TrialResult =
  | { success: true; data: { redirectTo: string } }
  | { success: false; error: string };

function safeMessageFromStripeError(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    if (err.type === 'StripeConnectionError') {
      return CHECKOUT_COPY.errors.startCheckoutGeneric;
    }
  }
  return CHECKOUT_COPY.errors.startCheckoutGeneric;
}

function getPriceId(plan: PricingPlan): string | null {
  if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID ?? null;
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID ?? null;
  if (plan === 'agency') return process.env.STRIPE_AGENCY_PRICE_ID ?? null;
  return null;
}

export async function createCheckoutSession(plan: string): Promise<ApiResult> {
  if (isBetaTrialOnly) {
    return { success: false, error: 'Paid plans are not available during beta.' };
  }

  const parsed = PlanSchema.safeParse(plan);
  if (!parsed.success) return { success: false, error: 'Invalid plan.' };

  const stripe = getStripe();
  if (!stripe) return { success: false, error: 'Billing is not configured.' };

  const priceId = getPriceId(parsed.data);
  if (!priceId) return { success: false, error: 'Billing is not configured.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: CHECKOUT_COPY.errors.signInRequired };

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'brand') {
    return {
      success: false,
      error: CHECKOUT_COPY.errors.journalistNotSupported,
    };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle();

  let stripeCustomerId =
    typeof subscription?.stripe_customer_id === 'string'
      ? subscription.stripe_customer_id
      : null;

  if (!stripeCustomerId || stripeCustomerId.startsWith('trial_')) {
    if (!user.email) return { success: false, error: CHECKOUT_COPY.errors.missingEmail };
    try {
      const customer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
    } catch (err: unknown) {
      console.error('[pricing] stripe.customers.create failed', err);
      return { success: false, error: safeMessageFromStripeError(err) };
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (!appUrl) return { success: false, error: 'Server misconfigured.' };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/brand/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { owner_id: user.id, plan: parsed.data },
    });

    if (!session.url) {
      return { success: false, error: CHECKOUT_COPY.errors.startCheckoutGeneric };
    }

    return { success: true, data: { url: session.url } };
  } catch (err: unknown) {
    console.error('[pricing] stripe.checkout.sessions.create failed', err);
    return { success: false, error: safeMessageFromStripeError(err) };
  }
}

export async function createCheckoutSessionAndRedirect(plan: PricingPlan) {
  const res = await createCheckoutSession(plan);
  if (res.success) {
    redirect(res.data.url);
  }
  redirect(`/pricing?checkout_error=${encodeURIComponent(res.error)}`);
}

export async function startFreeTrialAndRedirect() {
  const res = await startFreeTrial();
  if (res.success) {
    redirect(res.data.redirectTo);
  }
  redirect(`/pricing?trial_error=${encodeURIComponent(res.error)}`);
}

export async function startFreeTrial(): Promise<TrialResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: true, data: { redirectTo: '/signup?trial=true' } };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'brand') {
    return {
      success: false,
      error: CHECKOUT_COPY.errors.journalistNotSupported,
    };
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('trial_mode, status')
    .eq('owner_id', user.id)
    .maybeSingle();

  // Already on a trial → just continue.
  if (existing?.trial_mode) {
    return { success: true, data: { redirectTo: '/brand/upload?trial=true' } };
  }

  // No active subscription needed to start trial. Create a placeholder subscription row if missing.
  try {
    const admin = createAdminClient();
    const placeholderCustomerId = `trial_${crypto.randomUUID()}`;
    const { error } = await admin.from('subscriptions').insert({
      owner_id: user.id,
      stripe_customer_id: placeholderCustomerId,
      plan: 'starter',
      status: 'trialing',
      trial_mode: true,
      trial_releases_used: 0,
    });
    if (error) {
      // If a row already exists, proceed to upload anyway.
      console.error('[pricing] startFreeTrial insert failed', error);
    }
  } catch (err: unknown) {
    console.error('[pricing] startFreeTrial failed', err);
    return { success: false, error: 'Unable to start free trial right now.' };
  }

  return { success: true, data: { redirectTo: '/brand/upload?trial=true' } };
}

