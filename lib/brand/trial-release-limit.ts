/** Detect Postgres / app errors from the trial release insert trigger. */
export function isTrialReleaseLimitError(message: string | undefined | null): boolean {
  const msg = (message ?? '').toLowerCase();
  return (
    msg.includes('free trial limit reached') ||
    msg.includes('upgrade to publish more press releases')
  );
}

export const TRIAL_RELEASE_LIMIT_ERROR_CODE = 'trial_release_limit';
