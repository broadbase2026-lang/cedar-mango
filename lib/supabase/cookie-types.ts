import type { CookieOptions } from '@supabase/ssr';

/** Shape passed to `setAll` by @supabase/ssr createServerClient. */
export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};
