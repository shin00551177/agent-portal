"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "",          label: "ダッシュボード" },
  { href: "/settings", label: "設定" },
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
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
