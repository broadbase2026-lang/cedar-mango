import 'server-only';
import Stripe from 'stripe';

let stripeSingleton: Stripe | null | undefined;

/**
 * Lazy Stripe client so imports succeed without STRIPE_SECRET_KEY (e.g. CI, partial env).
 * Returns null when the secret is missing.
 */
export function getStripe(): Stripe | null {
  if (stripeSingleton !== undefined) {
    return stripeSingleton;
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    stripeSingleton = null;
    return null;
  }
  stripeSingleton = new Stripe(secretKey, {
    apiVersion: '2026-04-22.dahlia',
  });
  return stripeSingleton;
}
