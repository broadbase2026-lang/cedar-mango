import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  syncSubscriptionByStripeId,
  upsertSubscriptionFromStripeSubscription,
} from '@/lib/stripe/sync-subscription';
import { getStripe } from '@/lib/stripe/server';

export const runtime = 'nodejs';

function periodEndIsoFromStripeSub(sub: Stripe.Subscription): string | null {
  const items = sub.items?.data ?? [];
  if (items.length === 0) return null;
  const ends = items.map((i) => i.current_period_end);
  const maxEnd = Math.max(...ends);
  return new Date(maxEnd * 1000).toISOString();
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured.' },
      { status: 503 }
    );
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { error: insertEventError } = await admin
    .from('webhook_events')
    .insert({ stripe_event_id: event.id });

  if (insertEventError) {
    const msg = insertEventError.message.toLowerCase();
    const isDup =
      insertEventError.code === '23505' ||
      msg.includes('duplicate') ||
      msg.includes('unique');
    if (isDup) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: insertEventError.message }, { status: 500 });
  }

  try {
    await dispatchStripeEvent(event, admin, stripe);
  } catch (err) {
    await admin.from('webhook_events').delete().eq('stripe_event_id', event.id);
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function dispatchStripeEvent(
  event: Stripe.Event,
  admin: SupabaseClient,
  stripe: NonNullable<ReturnType<typeof getStripe>>
) {
  async function clearTrialMode(stripeCustomerId: string) {
    await admin
      .from('subscriptions')
      .update({ trial_mode: false })
      .eq('stripe_customer_id', stripeCustomerId);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;

      const ownerId = session.client_reference_id?.trim();
      if (!ownerId) {
        console.error('checkout.session.completed: missing client_reference_id');
        return;
      }

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) {
        console.error('checkout.session.completed: missing subscription id');
        return;
      }

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      if (!customerId) {
        console.error('checkout.session.completed: missing customer id');
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const { error } = await upsertSubscriptionFromStripeSubscription(
        admin,
        ownerId,
        customerId,
        subscription
      );
      if (error) throw error;

      if (subscription.status === 'active') {
        await clearTrialMode(customerId);
      }
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const stripeSubId = sub.id;
      const prev = await admin
        .from('subscriptions')
        .select('current_period_end')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();
      const prevEnd =
        typeof prev.data?.current_period_end === 'string'
          ? prev.data.current_period_end
          : null;

      const { error } = await syncSubscriptionByStripeId(admin, stripe, sub);
      if (error) throw error;

      const nextEnd = periodEndIsoFromStripeSub(
        sub.items?.data?.length > 0 ? sub : await stripe.subscriptions.retrieve(stripeSubId)
      );

      if (prevEnd && nextEnd && prevEnd !== nextEnd) {
        await admin
          .from('subscriptions')
          .update({ releases_published_this_period: 0 })
          .eq('stripe_subscription_id', stripeSubId);
      }

      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (customerId && sub.status === 'active') {
        await clearTrialMode(customerId);
      }
      return;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const subId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;
      if (!subId) return;

      const prev = await admin
        .from('subscriptions')
        .select('current_period_end')
        .eq('stripe_subscription_id', subId)
        .maybeSingle();
      const prevEnd =
        typeof prev.data?.current_period_end === 'string'
          ? prev.data.current_period_end
          : null;

      const stripeSub = await stripe.subscriptions.retrieve(subId);
      const { error } = await syncSubscriptionByStripeId(admin, stripe, stripeSub);
      if (error) throw error;

      const nextEnd = periodEndIsoFromStripeSub(stripeSub);
      if (prevEnd && nextEnd && prevEnd !== nextEnd) {
        await admin
          .from('subscriptions')
          .update({ releases_published_this_period: 0 })
          .eq('stripe_subscription_id', subId);
      }

      const customerId =
        typeof stripeSub.customer === 'string'
          ? stripeSub.customer
          : stripeSub.customer?.id;
      if (customerId && stripeSub.status === 'active') {
        await clearTrialMode(customerId);
      }
      return;
    }
    default:
      return;
  }
}
