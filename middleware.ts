import { NextRequest, NextResponse } from 'next/server';
import {
  BETA_ACCESS_COOKIE,
  hasValidBetaAccessCookie,
  isBetaGateEnabled,
  isBetaGateExemptPath,
} from '@/lib/config/beta';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

function applyProductionCsp(response: NextResponse) {
  const scriptSrc = "script-src 'self' 'unsafe-inline'";
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'object-src none',
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
}

export async function middleware(request: NextRequest) {
  try {
    const url = request.nextUrl;
    if (
      url.pathname === '/' &&
      url.searchParams.get('checkout') === 'cancelled'
    ) {
      return NextResponse.redirect(new URL('/', url.origin));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-broadbase-pathname', request.nextUrl.pathname);

    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    try {
      const nonce = btoa(
        Array.from(nonceBytes, (b) => String.fromCharCode(b)).join('')
      );
      requestHeaders.set('x-nonce', nonce);
    } catch {
      // Nonce is optional; skip if encoding fails.
    }

    // Use the original request for Supabase cookies — do NOT clone via new NextRequest().
    const { supabase, response } = createSupabaseMiddlewareClient(
      request,
      requestHeaders
    );

    let isAuthenticated = false;
    if (supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        isAuthenticated = Boolean(user);
      } catch (err) {
        console.error('[middleware] supabase.auth.getUser failed', err);
      }
    }

    if (
      isBetaGateEnabled() &&
      !isBetaGateExemptPath(url.pathname) &&
      !isAuthenticated
    ) {
      const betaCookie = request.cookies.get(BETA_ACCESS_COOKIE)?.value;
      const hasBetaAccess = await hasValidBetaAccessCookie(betaCookie);
      if (!hasBetaAccess) {
        const betaUrl = new URL('/beta-access', url.origin);
        const next = `${url.pathname}${url.search}`;
        betaUrl.searchParams.set('next', next);
        const redirectResponse = NextResponse.redirect(betaUrl);
        if (process.env.NODE_ENV === 'production') {
          applyProductionCsp(redirectResponse);
        }
        return redirectResponse;
      }
    }

    if (process.env.NODE_ENV === 'production') {
      applyProductionCsp(response);
    }

    return response;
  } catch (err) {
    console.error('[middleware] unhandled error', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)',
  ],
};
