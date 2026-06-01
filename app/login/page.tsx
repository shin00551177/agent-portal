"use client";

import { useActionState, useState } from "react";
import { loginAction } from "./actions";

const ACCOUNTS = [
  { key: null,    flag: "🇯🇵", label: "日本語",          sub: "管理者" },
  { key: "pt-BR", flag: "🇧🇷", label: "Português",       sub: "Brasil" },
  { key: "vi",    flag: "🇻🇳", label: "Tiếng Việt",      sub: "Việt Nam" },
  { key: "id",    flag: "🇮🇩", label: "Bahasa Indonesia", sub: "Indonesia" },
  { key: "bn",    flag: "🇧🇩", label: "বাংলা",           sub: "Bangladesh" },
];

const LOGIN_LABEL: Record<string, string> = {
  ja: "ログイン", "pt-BR": "Entrar", vi: "Đăng nhập", id: "Masuk", bn: "প্রবেশ করুন",
};
const PW_PLACEHOLDER: Record<string, string> = {
  ja: "パスワード", "pt-BR": "Senha", vi: "Mật khẩu", id: "Kata sandi", bn: "পাসওয়ার্ড",
};

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, null);
  const [selected, setSelected] = useState<string | null>(null);
  const locale = selected ?? "ja";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fafafa" }}>
      <div className="w-full max-w-sm px-5">
        {/* ロゴ */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{ color: "#079147", fontWeight: 700, fontSize: 20 }}>●</span>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Agent Portal</h1>
          </div>
        </div>

        {/* アカウント選択 */}
        <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-3 text-center">
          Select account
        </p>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {ACCOUNTS.map((a) => (
            <button
              key={a.key ?? "ja"}
              type="button"
              onClick={() => setSelected(a.key)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                selected === a.key
                  ? "border-[#079147] bg-[#f0faf4]"
                  : "border-[#e8e8ed] bg-white hover:border-[#c7c7cc]"
              }`}
            >
              <span className="text-[22px]">{a.flag}</span>
              <span className="text-[9px] font-medium text-[#86868b] leading-tight text-center">{a.sub}</span>
            </button>
          ))}
        </div>

        {/* パスワードフォーム */}
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="accountKey" value={selected ?? ""} />
          <input
            type="password"
            name="password"
            placeholder={PW_PLACEHOLDER[locale] ?? "Password"}
            required
            className="w-full px-4 py-3 bg-white border border-[#e8e8ed] rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#079147] transition-colors"
          />
          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 bg-[#1d1d1f] hover:bg-black disabled:opacity-50 text-white text-[15px] font-medium rounded-xl transition-colors"
          >
            {pending ? "..." : (LOGIN_LABEL[locale] ?? "Login")}
          </button>
        </form>
      </div>
    </div>
  );
}
