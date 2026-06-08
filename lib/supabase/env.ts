function trimEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

/** Supabase anon/publishable keys are JWTs and start with `eyJ`. */
function isSupabasePublicKey(value: string): boolean {
  return value.startsWith('eyJ');
}

/** Trimmed Supabase public credentials for client/middleware (safe to read on server + edge). */
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishable = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anon = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const key =
    (publishable && isSupabasePublicKey(publishable) ? publishable : '') || anon;

  if (!url || !key || !isSupabasePublicKey(key)) return null;
  if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(url)) return null;
  return { url: url.replace(/\/$/, ''), key };
}
