/** Pure labels — safe to import from client components. */

const PLAN_LABEL: Record<string, string> = {
  starter: 'Solo',
  pro: 'Growth',
  agency: 'Enterprise',
};

export function planDisplayLabel(plan: string): string {
  return PLAN_LABEL[plan] ?? plan;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  canceled: 'Canceled',
};

export function subscriptionStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
