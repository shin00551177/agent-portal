import { NextRequest, NextResponse } from "next/server";

async function sessionToken() {
  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  const password = process.env.PORTAL_PASSWORD ?? "changeme";
  const data = new TextEncoder().encode(secret + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/health") {
    return NextResponse.next();
  }
  // API key auth for server-to-server calls (GitHub Actions etc.)
  const apiKey = process.env.PORTAL_API_KEY;
  if (apiKey && request.headers.get("x-api-key") === apiKey) {
    return NextResponse.next();
  }
  const expected = await sessionToken();
  const session = request.cookies.get("session")?.value;
  if (session !== expected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
