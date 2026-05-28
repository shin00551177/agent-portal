export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

export default async function AsoPage() {
  const [apps, pendingProposals] = await Promise.all([
    db.asoApp.findMany({
      orderBy: { name: "asc" },
      include: {
        keywords: { where: { active: true } },
        reports:  { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.proposal.count({ where: { status: "pending", domain: "aso" } }),
  ]);

  const totalKeywords = apps.reduce((s, a) => s + a.keywords.length, 0);

  return (
    <>
      <div className="pb-10 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-4">ASO</p>
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
          キーワード最適化
        </h1>
        <p className="text-[15px] text-[#6e6e73] mt-2">
          {apps.length} apps · {totalKeywords} キーワード追跡中
        </p>
        {pendingProposals > 0 && (
          <Link
            href="/proposals?domain=aso"
            className="inline-flex items-center gap-2 mt-6 text-[15px] text-[#0071e3] hover:underline"
          >
            <span className="w-2 h-2 bg-[#0071e3] rounded-full animate-pulse" />
            ASO提案 {pendingProposals}件 承認待ち →
          </Link>
        )}
      </div>

      <div className="divide-y divide-[#f0f0f0]">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={`/aso/${app.id}`}
            className="flex items-center justify-between py-5 group"
          >
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                <span className="text-[15px] font-semibold text-[#1d1d1f]">{app.name[0]}</span>
              </div>
              <div>
                <p className="text-[17px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                  {app.name}
                </p>
                <p className="text-[13px] text-[#6e6e73]">
                  {app.keywords.length} キーワード
                  {app.reports[0] ? ` · ${app.reports[0].date}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {app.active
                ? <span className="flex items-center gap-1.5 text-[13px] text-[#1d1d1f]"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />稼働中</span>
                : <span className="text-[13px] text-[#6e6e73]">停止中</span>
              }
              <span className="text-[#6e6e73] text-[20px] font-light group-hover:translate-x-0.5 transition-transform">›</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
