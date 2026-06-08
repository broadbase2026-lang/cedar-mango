import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseCookieToSet } from '@/lib/supabase/cookie-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

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

  const env = getSupabasePublicEnv();
  if (!env) {
    return { supabase: null, response: supabaseResponse };
  }

  try {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
          } catch {
            // Some Edge runtimes reject mutating request cookies — response cookies still apply.
          }
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
    });

    return { supabase, response: supabaseResponse };
  } catch (err) {
    console.error('[supabase/middleware] failed to create client', err);
    return { supabase: null, response: supabaseResponse };
  }
}
