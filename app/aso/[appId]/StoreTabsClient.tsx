"use client";

import { useState, useEffect } from "react";

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

  // URLの?store=パラメータの変化を検知して切り替え
  useEffect(() => {
    function onPopState() {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("store");
      if (s === "ios" || s === "android") setStore(s);
    }
    window.addEventListener("popstate", onPopState);
    // pushState/replaceState も検知
    const orig = window.history.replaceState.bind(window.history);
    window.history.replaceState = function(...args) {
      orig(...args);
      onPopState();
    };
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!hasIos && !hasAndroid) return null;

  return (
    <>
      <div style={{ display: store === "ios" ? "block" : "none" }}>
        {iosContent}
      </div>
      <div style={{ display: store === "android" ? "block" : "none" }}>
        {androidContent}
      </div>
    </>
  );
}
