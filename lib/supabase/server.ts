import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  sessionOnlyAuthCookieOptions,
  shouldUseSessionOnlyAuthCookies,
} from '@/lib/auth/remember-me';
import type { SupabaseCookieToSet } from '@/lib/supabase/cookie-types';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

type CreateClientOptions = {
  sessionOnly?: boolean;
};

export async function createClient(options?: CreateClientOptions) {
  const cookieStore = await cookies();
  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        try {
          const sessionOnly =
            options?.sessionOnly ??
            shouldUseSessionOnlyAuthCookies((name) => cookieStore.get(name)?.value);
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(
              name,
              value,
              sessionOnly
                ? sessionOnlyAuthCookieOptions(cookieOptions)
                : cookieOptions
            )
          );
        } catch {
          // Called from a Server Component — ignore if middleware refreshed session.
        }
      },
    },
  });
}
