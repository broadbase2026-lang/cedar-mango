import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseCookieToSet } from '@/lib/supabase/cookie-types';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseMiddlewareClientResult =
  | { supabase: null; response: NextResponse }
  | { supabase: SupabaseClient; response: NextResponse };

/**
 * Refreshes the Supabase session cookie on matched routes.
 * See https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest
): SupabaseMiddlewareClientResult {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In dev / misconfigured environments, allow the app to boot without auth refresh.
  if (!url || !key) {
    return { supabase: null, response: supabaseResponse };
  }

  const supabase = createServerClient(
    url,
    key!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response: supabaseResponse };
}
