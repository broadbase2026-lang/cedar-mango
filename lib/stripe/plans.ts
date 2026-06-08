import 'server-only';

export function pickPriceId(plan: string | null): string | undefined {
  if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID;
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID;
  if (plan === 'agency') return process.env.STRIPE_AGENCY_PRICE_ID;
  return process.env.STRIPE_STARTER_PRICE_ID;
}

export function planFromStripePriceId(
  priceId: string | undefined
): 'starter' | 'pro' | 'agency' | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) return 'agency';
  return null;
}
