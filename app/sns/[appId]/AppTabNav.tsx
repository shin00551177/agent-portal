"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "",           label: "コンテンツ生成" },
  { href: "/drafts",    label: "下書き",   countKey: "pendingDrafts" as const },
  { href: "/accounts",  label: "アカウント" },
  { href: "/ego",       label: "エゴサ",   countKey: "activeEgoHits" as const },
  { href: "/settings",  label: "設定" },
];

export function AppTabNav({
  appId,
  pendingDrafts,
  activeEgoHits,
}: {
  appId: string;
  pendingDrafts: number;
  activeEgoHits: number;
}) {
  const pathname = usePathname();
  const counts = { pendingDrafts, activeEgoHits };

  return (
    <div className="flex gap-1 bg-[#ebebeb] rounded-xl p-1 w-fit">
      {TABS.map((tab) => {
        const href = `/sns/${appId}${tab.href}`;
        const isActive = tab.href === ""
          ? pathname === `/sns/${appId}`
          : pathname.startsWith(href);
        const count = tab.countKey ? counts[tab.countKey] : 0;

        return (
          <Link
            key={tab.href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {tab.label}
            {count > 0 && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-[#1d1d1f] text-white" : "bg-[#6e6e73]/20 text-[#6e6e73]"
              }`}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
