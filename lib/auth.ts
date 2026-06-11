import { cookies } from "next/headers";

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

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = await sessionToken();
  return store.get("session")?.value === token;
}

// アカウントキーをcookieから取得（null = 日本語管理者）
export async function getAccountKey(): Promise<string | null> {
  const store = await cookies();
  return store.get("account")?.value ?? null;
}

export async function createSession(accountKey: string | null = null) {
  const store = await cookies();
  const token = await sessionToken();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };
  store.set("session", token, opts);
  // アカウントキーを別cookieで保存
  if (accountKey) {
    store.set("account", accountKey, opts);
  } else {
    store.delete("account");
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete("session");
  store.delete("account");
}

export function verifyPassword(input: string): boolean {
  return input === (process.env.PORTAL_PASSWORD ?? "changeme");
}
