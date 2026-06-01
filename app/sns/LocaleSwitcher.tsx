"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const LOCALES = [
  { code: "ja",    flag: "🇯🇵", label: "日本語" },
  { code: "pt-BR", flag: "🇧🇷", label: "Português" },
  { code: "vi",    flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "id",    flag: "🇮🇩", label: "Bahasa Indonesia" },
  { code: "bn",    flag: "🇧🇩", label: "বাংলা" },
];

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTo(code: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("locale", code);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="flex gap-1 bg-[#f0f0f0] rounded-lg p-1">
      {LOCALES.map(({ code, flag, label }) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
            current === code
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
