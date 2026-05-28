import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export function NavShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 h-12 flex items-center backdrop-blur-xl bg-white/90 border-b border-[#d2d2d7]/60">
        <div className="w-full max-w-[980px] mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
              Agent Portal
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              aria-label="設定"
            >
              <GearIcon />
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-[980px] mx-auto px-5 py-20">
        {children}
      </main>
    </div>
  );
}
