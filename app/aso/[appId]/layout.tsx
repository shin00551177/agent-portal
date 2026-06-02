export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import Link from "next/link";
import { AsoAppTabNav } from "./AppTabNav";
import { StoreSwitcher } from "./StoreSwitcher";

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
      {/* Sticky header */}
      <div className="sticky top-12 z-40 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0] -mx-5 px-5 py-3">
        <div className="max-w-[980px] mx-auto flex items-center justify-between gap-4">
          {/* Breadcrumb + App name */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/aso" className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors flex-shrink-0">
              ASO
            </Link>
            <span className="text-[#c7c7cc]">›</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#1d1d1f]">{app.name[0]}</span>
              </div>
              <span className="text-[14px] font-semibold text-[#1d1d1f] truncate">{app.name}</span>
              <span className={`text-[11px] flex items-center gap-1 flex-shrink-0 ${app.active ? "text-emerald-600" : "text-[#86868b]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${app.active ? "bg-emerald-500" : "bg-[#c7c7cc]"}`} />
                {app.active ? "稼働中" : "停止中"}
              </span>
            </div>
          </div>

          {/* iOS / Android switcher */}
          {(app.iosId || app.googlePlayId) && (
            <Suspense>
              <StoreSwitcher hasIos={!!app.iosId} hasAndroid={!!app.googlePlayId} />
            </Suspense>
          )}
        </div>

        {/* Tab nav */}
        <div className="max-w-[980px] mx-auto mt-2">
          <AsoAppTabNav appId={appId} />
        </div>
      </div>

      {children}
    </div>
  );
}
