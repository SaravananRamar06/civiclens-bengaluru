import { NextResponse, type NextRequest } from "next/server";

// Every authenticated operation validates/refreshes the session in its route handler.
// Enforce private cache semantics on responses that may carry refreshed auth cookies.
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie, Origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export const config = { matcher: ["/api/reports/:path*", "/api/session", "/api/analysis", "/auth/:path*"] };
