import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';

function getOrigin(req: Request) {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const url = new URL(req.url);
  return url.origin;
}

function pickPriceId(plan: string | null) {
  if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID;
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID;
  if (plan === 'agency') return process.env.STRIPE_AGENCY_PRICE_ID;
  return process.env.STRIPE_STARTER_PRICE_ID;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const plan = url.searchParams.get('plan');

  const priceId = pickPriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: 'Missing Stripe price id for selected plan.' },
      { status: 500 }
    );
  }

  const origin = getOrigin(req);
  const successUrl = `${origin}/brand/dashboard?checkout=success`;
  const cancelUrl = `${origin}/?checkout=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return NextResponse.redirect(session.url!, 303);
}

