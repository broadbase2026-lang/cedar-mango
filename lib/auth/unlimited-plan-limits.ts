import 'server-only';

/**
 * User IDs exempt from plan-tier limits (monthly release publish cap, asset
 * storage cap) in all environments, including production. Distinct from the
 * dev-only mock in `dev-profile-mock.ts` — this exception is intentional and
 * permanent, not a temporary workaround.
 */
const UNLIMITED_PLAN_LIMIT_USER_IDS = new Set([
  '4b3d39fd-c336-4df7-b23d-b7df60cce5e0', // admin@broadbase.app
]);

export function hasUnlimitedPlanLimits(userId: string): boolean {
  return UNLIMITED_PLAN_LIMIT_USER_IDS.has(userId);
}
