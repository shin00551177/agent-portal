import { cookies } from "next/headers";

async function sessionToken() {
  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  const password = process.env.PORTAL_PASSWORD ?? "changeme";
  const data = new TextEncoder().encode(secret + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = await sessionToken();
  return store.get("session")?.value === token;
}

export async function createSession() {
  const store = await cookies();
  const token = await sessionToken();
  store.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete("session");
}

export function verifyPassword(input: string): boolean {
  return input === (process.env.PORTAL_PASSWORD ?? "changeme");
}
