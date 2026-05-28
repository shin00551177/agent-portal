export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AsoAppTabNav } from "./AppTabNav";
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
          <p className="ml-auto text-[13px] text-[#1d1d1f] flex items-center gap-1.5">
            {app.active
              ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />稼働中</>
              : <span className="text-[#6e6e73]">停止中</span>
            }
          </p>
        </div>
      </div>

      <AsoAppTabNav appId={appId} />

      {children}
    </div>
  );
}
