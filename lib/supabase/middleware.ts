import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseCookieToSet } from '@/lib/supabase/cookie-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

type SupabaseMiddlewareClientResult =
  | { supabase: null; response: NextResponse }
  | { supabase: SupabaseClient; response: NextResponse };

type NextRequestInit = NonNullable<Parameters<typeof NextResponse.next>[0]>;

function nextResponseInit(
  request: NextRequest,
  forwardHeaders?: Headers
): NextRequestInit {
  if (forwardHeaders) {
    return { request: { headers: forwardHeaders } };
  }
  return { request };
}

/**
 * Refreshes the Supabase session cookie on matched routes.
 * See https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Always pass the original `request` so auth cookies are read/written correctly.
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  forwardHeaders?: Headers
): SupabaseMiddlewareClientResult {
  const init = nextResponseInit(request, forwardHeaders);
  let supabaseResponse = NextResponse.next(init);

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next(init);
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
