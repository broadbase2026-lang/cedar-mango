/**
 * Blocks CLI scripts from mutating the production Supabase project unless
 * explicitly overridden. Set BROADBASE_PROD_SUPABASE_PROJECT_REF in .env.local
 * to the prod project ref (from the Supabase dashboard URL).
 */

export function extractSupabaseProjectRef(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /^https?:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i
  );
  return match?.[1] ?? null;
}

/**
 * Call before any script that writes to Supabase (imports, rollbacks, purges).
 * Dry-run-only scripts do not need this.
 */
export function assertScriptMutationsAllowed(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Load .env.local (e.g. node --env-file=.env.local …).'
    );
  }

  const targetRef = extractSupabaseProjectRef(url);
  if (!targetRef) {
    throw new Error(
      `Unrecognized Supabase URL "${url}". Expected https://<project-ref>.supabase.co`
    );
  }

  const prodRef = process.env.BROADBASE_PROD_SUPABASE_PROJECT_REF?.trim();
  if (!prodRef) {
    throw new Error(
      [
        'BROADBASE_PROD_SUPABASE_PROJECT_REF is not set.',
        'Set it in .env.local to your production Supabase project ref so mutating',
        'scripts can refuse accidental production runs.',
      ].join(' ')
    );
  }

  if (targetRef !== prodRef) {
    return;
  }

  const override = process.env.BROADBASE_SCRIPT_OVERRIDE_PROD?.trim();
  if (override === prodRef) {
    console.warn(
      `[script-env-guard] Production override acknowledged for project ${prodRef}.`
    );
    return;
  }

  throw new Error(
    [
      `Refusing to run a mutating script against production Supabase project "${prodRef}".`,
      'Point .env.local at a dev project, or set BROADBASE_SCRIPT_OVERRIDE_PROD to that',
      'exact project ref only after explicit human approval.',
    ].join(' ')
  );
}
