"use client";

import { useState } from "react";

export function StoreTabsClient({
  defaultStore,
  hasIos,
  hasAndroid,
  iosContent,
  androidContent,
}: {
  defaultStore: "ios" | "android";
  hasIos: boolean;
  hasAndroid: boolean;
  iosContent: React.ReactNode;
  androidContent: React.ReactNode;
}) {
  const [store, setStore] = useState<"ios" | "android">(defaultStore);

  function switchTo(s: "ios" | "android") {
    setStore(s);
    // URLを更新するがナビゲーション（再レンダリング）は発生しない
    const url = new URL(window.location.href);
    url.searchParams.set("store", s);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="space-y-8">
      {/* タブ切り替えUI */}
      {hasIos && hasAndroid && (
        <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1 w-fit">
          <button
            onClick={() => switchTo("ios")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
              store === "ios"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
              className={store === "ios" ? "text-[#1d1d1f]" : "text-[#bfbfbf]"}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </button>
          <button
            onClick={() => switchTo("android")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
              store === "android"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
              className={store === "android" ? "text-[#079147]" : "text-[#bfbfbf]"}>
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24A11.37 11.37 0 0012 8a11.37 11.37 0 00-4.47.91L5.65 5.67a.634.634 0 00-.86-.2c-.29.16-.39.54-.22.83L6.4 9.48A10.78 10.78 0 001 19h22a10.78 10.78 0 00-5.4-9.52z" />
            </svg>
            Google Play
          </button>
        </div>
      )}

      {/* コンテンツ — CSS display で切り替え（再レンダリングなし） */}
      <div style={{ display: store === "ios" ? "block" : "none" }}>
        {iosContent}
      </div>
      <div style={{ display: store === "android" ? "block" : "none" }}>
        {androidContent}
      </div>
    </div>
  );
}
