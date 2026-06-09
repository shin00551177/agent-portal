import { NextRequest, NextResponse } from "next/server";

async function sessionToken() {
  const secret = process.env.SESSION_SECRET;
  const password = process.env.PORTAL_PASSWORD;
  if (!secret || !password) throw new Error("SESSION_SECRET and PORTAL_PASSWORD must be set");
  const data = new TextEncoder().encode(secret + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/health" ||
    pathname.startsWith("/api/")   // API routes handle their own auth
  ) {
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
