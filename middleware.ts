import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-broadbase-pathname', request.nextUrl.pathname);

  // Per-request CSP nonce (App Router). Avoids `unsafe-inline` for scripts.
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
  await supabase.auth.getUser();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Next injects styles via <style> tags; keep inline styles allowed for now.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
