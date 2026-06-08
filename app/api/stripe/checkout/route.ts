import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';

type ApiResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string };

function json(result: ApiResult, status = 200) {
  return NextResponse.json(result, { status });
}

function getAppUrl(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && explicit.trim()) return explicit.replace(/\/$/, '');
  return new URL(req.url).origin;
}

function getAllowedPriceIds(): {
  ok: true;
  allowed: [string, string, string];
} | {
  ok: false;
  error: string;
} {
  const starter = process.env.STRIPE_STARTER_PRICE_ID;
  const pro = process.env.STRIPE_PRO_PRICE_ID;
  const agency = process.env.STRIPE_AGENCY_PRICE_ID;

  if (!starter || !pro || !agency) {
    return { ok: false, error: 'Billing is not configured.' };
  }
  return { ok: true, allowed: [starter, pro, agency] };
}

async function createCheckoutUrl(args: {
  req: Request;
  priceId: string;
}): Promise<ApiResult> {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false, error: 'Billing is not configured.' };
  }

  const appUrl = getAppUrl(args.req);
  const successUrl = `${appUrl}/brand/dashboard?upgraded=true`;
  const cancelUrl = `${appUrl}/pricing`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    return { success: false, error: 'Could not start checkout session.' };
  }

  return { success: true, data: { url: session.url } };
}

export async function POST(req: Request) {
  const allowed = getAllowedPriceIds();
  if (!allowed.ok) return json({ success: false, error: allowed.error }, 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const BodySchema = z.object({
    priceId: z
      .string()
      .min(1)
      .refine((value) => allowed.allowed.includes(value), {
        message: 'Invalid priceId.',
      }),
  });

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ success: false, error: 'Invalid request.' }, 400);
  }

  try {
    const result = await createCheckoutUrl({
      req,
      priceId: parsed.data.priceId,
    });
    return json(result, result.success ? 200 : 500);
  } catch (err: unknown) {
    console.error('[stripe/checkout] failed', err);
    const message =
      err instanceof Error && err.name === 'StripeConnectionError'
        ? 'Unable to reach Stripe right now. Check your network/VPN/DNS and try again.'
        : err instanceof Error && err.message
          ? err.message
          : 'Checkout failed.';
    return json({ success: false, error: message }, 500);
  }
}

export async function GET(req: Request) {
  void req;
  return json(
    { success: false, error: 'Method not allowed. Use POST.' },
    405
  );
}
