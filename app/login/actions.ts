"use server";

import { redirect } from "next/navigation";
import { verifyPassword, createSession } from "@/lib/auth";

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = formData.get("password") as string;
  if (!verifyPassword(password)) {
    return "パスワードが違います";
  }
  await createSession();
  redirect("/aso");
}
