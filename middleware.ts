import { NextResponse, type NextRequest } from "next/server"

import { getDomain } from "./lib/utils"

export function middleware(request: NextRequest) {
  // Clone the URL so we can safely modify / inspect it
  const url = request.nextUrl.clone()

  /*
   * NEW (fix for self-hosted / Traefik setups)
   *
   * Before:
   * The middleware rewrote *every* request based on hostname.
   * That accidentally included Next.js internal assets like:
   *   /_next/static/...
   *   /_next/chunks/...
   * which resulted in paths like:
   *   /bsky.mk/_next/static/...
   * and caused the CSS/JS 404 errors we saw.
   *
   * Now:
   * We explicitly bypass middleware rewriting for any request that
   * should be served directly by Next.js.
   */
  if (
    url.pathname.startsWith("/_next/") ||  // Next.js internal assets
    url.pathname.startsWith("/api/") ||    // API routes
    url.pathname.startsWith("/js/") ||     // public/js assets
    url.pathname.startsWith("/proxy/") ||  // Plausible analytics proxy
    /^[^/]+\.[^/]+$/.test(url.pathname.slice(1)) // root files like favicon.ico
  ) {
    return NextResponse.next()
  }

  /*
   * NEW (proxy compatibility fix)
   *
   * Before:
   * hostname was taken from url.hostname which becomes "localhost"
   * when running behind a reverse proxy (Traefik, Dokploy, etc).
   *
   * Now:
   * we prefer x-forwarded-host / host headers so we see the real
   * external hostname like:
   *   100.bsky.mk
   *   bsky.mk
   */
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.hostname

  // Parse the domain + subdomain using the psl library
  const { domain, subdomain } = getDomain(host)

  /*
   * Original behavior preserved:
   *
   * The app is structured as:
   *   /[domain]/[handle]
   *
   * Example:
   *   100.bsky.mk/.well-known/atproto-did
   *
   * becomes internally rewritten to:
   *   /bsky.mk/100/.well-known/atproto-did
   *
   * which allows the dynamic Next.js routes:
   *   /[domain]
   *   /[domain]/[handle]
   */
  if (domain) {
    if (subdomain && subdomain !== process.env.LANDING_SUBDOMAIN) {
      return NextResponse.rewrite(
        new URL(`/${domain}/${subdomain}${url.pathname}${url.search}`, url)
      )
    } else {
      return NextResponse.rewrite(
        new URL(`/${domain}${url.pathname}${url.search}`, url)
      )
    }
  }
}
