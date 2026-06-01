"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function StoreSwitcher({
  hasIos,
  hasAndroid,
  current,
}: {
  hasIos: boolean;
  hasAndroid: boolean;
  current: "ios" | "android";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTo(store: "ios" | "android") {
    const p = new URLSearchParams(searchParams.toString());
    p.set("store", store);
    router.replace(`${pathname}?${p.toString()}`);
  }

  // どちらか1つしかない場合はラベルのみ表示（クリック不可）
  if (!hasIos && !hasAndroid) return null;

  return (
    <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1 w-fit">
      {hasIos && (
        <button
          onClick={() => switchTo("ios")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
            current === "ios"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={current === "ios" ? "text-[#1d1d1f]" : "text-[#bfbfbf]"}>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          App Store
        </button>
      )}
      {hasAndroid && (
        <button
          onClick={() => switchTo("android")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
            current === "android"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={current === "android" ? "text-[#079147]" : "text-[#bfbfbf]"}>
            <path d="M17.523 15.341a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m-10.046 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M2.89 9h18.22c.49 0 .89.4.89.89v6.22c0 .49-.4.89-.89.89H2.89c-.49 0-.89-.4-.89-.89V9.89C2 9.4 2.4 9 2.89 9M7.5 6.5l-1.5-2.6M16.5 6.5l1.5-2.6M8.5 3.5h7v3h-7z"/>
          </svg>
          Google Play
        </button>
      )}
    </div>
  );
}
