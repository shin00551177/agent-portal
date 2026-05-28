export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { ProposalCard } from "./ProposalCard";
import Link from "next/link";

const DOMAIN_TABS = [
  { value: "",    label: "すべて" },
  { value: "ego", label: "エゴサ" },
  { value: "aso", label: "ASO" },
  { value: "sns", label: "SNS" },
];

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const { domain } = await searchParams;
  const domainFilter = domain || undefined;

  const [pending, recent] = await Promise.all([
    db.proposal.findMany({
      where: { status: "pending", ...(domainFilter ? { domain: domainFilter } : {}) },
      include: { analysisRun: { select: { id: true, domain: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.proposal.findMany({
      where: { status: { not: "pending" }, ...(domainFilter ? { domain: domainFilter } : {}) },
      include: { analysisRun: { select: { id: true, domain: true, createdAt: true } } },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <>
      {/* Header */}
      <div className="pb-10 border-b border-[#f0f0f0]">
        <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
          改善提案
        </h1>
        <p className="text-[15px] text-[#6e6e73] mt-2">
          分析エージェントが生成した提案を承認・却下してください
        </p>

        {/* Domain tabs */}
        <div className="flex gap-1 mt-8">
          {DOMAIN_TABS.map(({ value, label }) => {
            const active = (domain ?? "") === value;
            const href = value ? `/proposals?domain=${value}` : "/proposals";
            return (
              <Link
                key={value}
                href={href}
                className={`px-4 py-1.5 text-[13px] rounded-full transition-colors ${
                  active
                    ? "bg-[#1d1d1f] text-white"
                    : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pending */}
      <section className="py-10 border-b border-[#f0f0f0]">
        <div className="flex items-baseline gap-3 mb-7">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f]">承認待ち</h2>
          {pending.length > 0 && (
            <span className="text-[15px] text-[#0071e3]">{pending.length}件</span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-[15px] text-[#6e6e73]">なし</p>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recent decisions */}
      {recent.length > 0 && (
        <section className="py-10">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-7">決定済み</h2>
          <div className="divide-y divide-[#f0f0f0]">
            {recent.map((p) => (
              <div key={p.id} className="py-4 flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">
                    {DOMAIN_LABEL[p.domain] ?? p.domain}
                    {p.updatedAt
                      ? ` · ${new Date(p.updatedAt).toLocaleDateString("ja-JP")}`
                      : ""}
                  </p>
                </div>
                <DecisionBadge status={p.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

const DOMAIN_LABEL: Record<string, string> = {
  aso: "ASO", sns: "SNS", ego: "エゴサ", general: "全般",
};

function DecisionBadge({ status }: { status: string }) {
  if (status === "done")
    return <span className="text-[13px] text-[#1d1d1f] whitespace-nowrap flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />実行済み</span>;
  if (status === "rejected")
    return <span className="text-[13px] text-[#6e6e73] whitespace-nowrap">却下</span>;
  if (status === "approved")
    return <span className="text-[13px] text-[#0071e3] whitespace-nowrap">承認済み</span>;
  if (status === "failed")
    return <span className="text-[13px] text-red-500 whitespace-nowrap">失敗</span>;
  return null;
}
