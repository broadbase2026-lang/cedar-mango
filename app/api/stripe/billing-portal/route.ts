import { NextResponse } from 'next/server';
import { getBrandPortalSession } from '@/lib/brand/session';
import { getStripe } from '@/lib/stripe/server';

function getOrigin(req: Request) {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const url = new URL(req.url);
  return url.origin;
}

export async function GET(req: Request) {
  const portal = await getBrandPortalSession();
  if (!portal.ok) {
    if (portal.reason === 'unauthenticated') {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }
    if (portal.reason === 'journalist') {
      return NextResponse.json({ error: 'Brand accounts only.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing is not configured.' },
      { status: 503 }
    );
  }

  const { data: row } = await portal.supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', portal.user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const customerId = row?.[0]?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      {
        error:
          'No Stripe customer on file yet. Subscribe first from checkout, then you can manage billing here.',
      },
      { status: 400 }
    );
  }

  const origin = getOrigin(req);
  const returnUrl = `${origin}/brand/settings`;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: 'Could not start billing portal.' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, 303);
}
