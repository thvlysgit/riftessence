import { NextRequest, NextResponse } from 'next/server';

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://va.vercel-scripts.com`,
    `script-src-elem 'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://va.vercel-scripts.com`,
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://ddragon.leagueoflegends.com https://riftessence.app https://www.riftessence.app https://api.riftessence.app",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:3333 https://riftessence.app https://www.riftessence.app https://api.riftessence.app https://ddragon.leagueoflegends.com https://challenges.cloudflare.com https://vitals.vercel-insights.com",
    "frame-src https://challenges.cloudflare.com https://www.youtube.com",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|favicon.png).*)',
  ],
};
