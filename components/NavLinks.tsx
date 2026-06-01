"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",          label: "HOME" },
  { href: "/proposals", label: "提案" },
  { href: "/aso",       label: "ASO" },
  { href: "/sns",       label: "SNS" },
];

export function NavLinks() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex items-center gap-6">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-[13px] transition-colors duration-150 relative pb-0.5 ${
            active(href)
              ? "text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[#079147]"
              : "text-white/40 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
