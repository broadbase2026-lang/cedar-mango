import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Stripe cancel_url previously pointed here with ?checkout=cancelled — normalize to clean /
  const url = request.nextUrl;
  if (
    url.pathname === '/' &&
    url.searchParams.get('checkout') === 'cancelled'
  ) {
    return NextResponse.redirect(new URL('/', url.origin));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-broadbase-pathname', request.nextUrl.pathname);

  // Optional per-request nonce for future `<Script nonce>` / meta reads — keep out of CSP until
  // Next wires inline bootstrap chunks with the same nonce (CSP3 ignores unsafe-inline when any
  // nonce-* appears in script-src, which blocks Next's inline scripts and blanks hydrated routes).
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(
    Array.from(nonceBytes, (b) => String.fromCharCode(b)).join('')
  );
  requestHeaders.set('x-nonce', nonce);

  const requestWithPath = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  const { supabase, response } = createSupabaseMiddlewareClient(requestWithPath);

  // Refreshes session / JWT if needed — keep before any route logic.
  try {
    if (supabase) {
      await supabase.auth.getUser();
    }
  } catch {
    // If Supabase is unreachable (e.g. DNS/network issues), don't blank the whole app.
    return response;
  }

  // In local dev, CSP frequently breaks Next.js HMR/inline bootstraps and can manifest as
  // "clicks do nothing" (no hydration). Keep CSP for production only.
  if (process.env.NODE_ENV !== 'production') {
    return response;
  }

  // script-src: no nonce/hash in this policy. If you add 'nonce-…' or a hash, CSP3 disables
  // 'unsafe-inline' for scripts, and Next’s many inline bootstraps (no matching nonce) won’t run.
  // `strict-dynamic` also breaks `self` for external scripts—avoid unless nonces are end-to-end.
  const scriptSrc = "script-src 'self' 'unsafe-inline'";
  const csp = [
    "default-src 'self'",
    scriptSrc,
    // Next injects styles via <style> tags; keep inline styles allowed for now.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'object-src none',
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)',
  ],
};
