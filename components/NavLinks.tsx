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
          className={`text-[13px] transition-colors duration-150 ${
            active(href) ? "text-[#1d1d1f] font-medium" : "text-[#6e6e73] hover:text-[#1d1d1f]"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
