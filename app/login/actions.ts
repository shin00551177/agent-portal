"use server";

import { redirect } from "next/navigation";
import { verifyPassword, createSession } from "@/lib/auth";

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = formData.get("password") as string;
  const accountKeyRaw = formData.get("accountKey") as string;
  const accountKey = accountKeyRaw || null; // "" → null (管理者)

  if (!verifyPassword(password)) {
    return "パスワードが違います / Wrong password";
  }
  await createSession(accountKey);
  redirect("/sns");
}
