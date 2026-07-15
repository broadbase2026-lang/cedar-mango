/** True when the ID is a real Stripe customer (not a trial placeholder). */
export function isBillableStripeCustomerId(
  customerId: string | null | undefined
): boolean {
  return Boolean(customerId && !customerId.startsWith('trial_'));
}
