"use client";

import { useState, useEffect, useRef } from "react";

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
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // スクロールでスティッキーになったか検知
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function switchTo(s: "ios" | "android") {
    setStore(s);
    const url = new URL(window.location.href);
    url.searchParams.set("store", s);
    window.history.replaceState({}, "", url.toString());
  }

  if (!hasIos && !hasAndroid) return null;

  const Tab = ({ s, icon, label }: { s: "ios" | "android"; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => switchTo(s)}
      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        store === s
          ? "bg-[#1d1d1f] text-white shadow-sm"
          : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#ebebeb]"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const switcher = (
    <div className="flex gap-1 bg-[#f0f0f0] rounded-xl p-1 w-fit">
      {hasIos && (
        <Tab
          s="ios"
          label="App Store"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
              className={store === "ios" ? "text-white" : "text-[#bfbfbf]"}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          }
        />
      )}
      {hasAndroid && (
        <Tab
          s="android"
          label="Google Play"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
              className={store === "android" ? "text-[#34c759]" : "text-[#bfbfbf]"}>
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24A11.37 11.37 0 0012 8a11.37 11.37 0 00-4.47.91L5.65 5.67a.634.634 0 00-.86-.2c-.29.16-.39.54-.22.83L6.4 9.48A10.78 10.78 0 001 19h22a10.78 10.78 0 00-5.4-9.52z" />
            </svg>
          }
        />
      )}
    </div>
  );

  return (
    <>
      {/* スクロール位置検知用の見えない要素 */}
      <div ref={sentinelRef} className="h-px -mt-px" />

      {/* スティッキーヘッダー */}
      <div
        className={`sticky z-30 transition-all duration-200 ${
          isSticky
            ? "top-12 py-3 px-0 bg-white/90 backdrop-blur-md border-b border-[#f0f0f0] shadow-sm -mx-5 px-5"
            : "top-12 py-0"
        }`}
      >
        <div className={isSticky ? "max-w-[980px] mx-auto px-5 flex items-center gap-4" : ""}>
          {switcher}
          {isSticky && (
            <p className="text-[12px] text-[#bfbfbf]">
              {store === "ios" ? "🍎 App Store" : "🤖 Google Play"}
            </p>
          )}
        </div>
      </div>

      {/* コンテンツ — CSS display で即時切り替え */}
      <div style={{ display: store === "ios" ? "block" : "none" }}>
        {iosContent}
      </div>
      <div style={{ display: store === "android" ? "block" : "none" }}>
        {androidContent}
      </div>
    </>
  );
}
