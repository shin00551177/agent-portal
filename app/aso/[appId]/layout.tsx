export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AsoAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.asoApp.findUnique({ where: { id: appId } });
  if (!app) notFound();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-8 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] mb-5">
          <Link href="/aso" className="hover:text-[#1d1d1f] transition-colors">ASO管理</Link>
          {" "}›{" "}
          <span className="text-[#1d1d1f]">{app.name}</span>
        </p>
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
            <span className="text-[17px] font-semibold text-[#1d1d1f]">{app.name[0]}</span>
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">{app.name}</h1>
            <p className="text-[13px] text-[#6e6e73] mt-0.5">
              {[app.googlePlayId && `Android: ${app.googlePlayId}`, app.iosId && `iOS: ${app.iosId}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <p className="text-[13px] text-[#1d1d1f] flex items-center gap-1.5">
              {app.active
                ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />稼働中</>
                : <span className="text-[#6e6e73]">停止中</span>
              }
            </p>
            <Link
              href={`/aso/${appId}/settings`}
              className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors p-1.5 rounded-lg hover:bg-[#f5f5f7]"
              aria-label="設定"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
