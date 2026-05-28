export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppTabNav } from "./AppTabNav";
import Link from "next/link";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await db.snsApp.findUnique({
    where: { id: appId },
    include: {
      drafts: { where: { status: "pending" } },
      egoHits: { where: { dismissed: false } },
    },
  });
  if (!app) notFound();

  return (
    <div className="space-y-8">
      <div className="pb-8 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] mb-5">
          <Link href="/sns" className="hover:text-[#1d1d1f] transition-colors">SNS管理</Link>
          {" "}›{" "}
          <span className="text-[#1d1d1f]">{app.name}</span>
        </p>
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
            <span className="text-[17px] font-semibold text-[#1d1d1f]">{app.name[0]}</span>
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">{app.name}</h1>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 flex items-center gap-1.5">
              {app.active
                ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />稼働中</>
                : "停止中"
              }
            </p>
          </div>
        </div>
      </div>

      <AppTabNav
        appId={appId}
        pendingDrafts={app.drafts.length}
        activeEgoHits={app.egoHits.length}
      />

      {children}
    </div>
  );
}
