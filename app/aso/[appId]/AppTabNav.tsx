"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

const TABS = [
  { href: "",          label: "ダッシュボード" as string | null },
  { href: "/settings", label: null },
];

export function AsoAppTabNav({ appId }: { appId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-[#ebebeb] rounded-xl p-1 w-fit">
      {TABS.map((tab) => {
        const href = `/aso/${appId}${tab.href}`;
        const isActive =
          tab.href === "" ? pathname === `/aso/${appId}` : pathname.startsWith(href);

        return (
          <Link
            key={tab.href}
            href={href}
            className={`flex items-center px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {tab.label === null ? <GearIcon /> : tab.label}
          </Link>
        );
      })}
    </div>
  );
}
