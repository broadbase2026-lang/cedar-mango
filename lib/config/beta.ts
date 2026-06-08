export const isBetaTrialOnly = process.env.BETA_TRIAL_ONLY === 'true';

export const betaInviteCode = process.env.BETA_INVITE_CODE?.trim() || null;

/** Returns an error message when the submitted code does not match, or null if valid / not required. */
export function validateBetaInviteCode(
  submitted: string | null | undefined
): string | null {
  if (!betaInviteCode) return null;
  const code = (submitted ?? '').trim();
  if (code !== betaInviteCode) {
    return 'Invalid invite code.';
  }
  return null;
}
