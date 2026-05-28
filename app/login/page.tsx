"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-5">
        <div className="mb-10 text-center">
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Agent Portal</h1>
          <p className="text-[15px] text-[#6e6e73] mt-2">AIアバター 業務自動化管理</p>
        </div>
        <form action={formAction} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
            className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          {error && (
            <p className="text-[13px] text-[#6e6e73] text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white text-[15px] font-medium rounded-xl transition-colors"
          >
            {pending ? "認証中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
