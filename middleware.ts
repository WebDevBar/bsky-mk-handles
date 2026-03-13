import { NextResponse, type NextRequest } from "next/server"

import { getDomain } from "./lib/utils"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.hostname

  const { domain, subdomain } = getDomain(host)

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
