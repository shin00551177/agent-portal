export const dynamic = "force-dynamic";

import Link from "next/link";
import { NavShell } from "@/components/NavShell";
import { db } from "@/lib/db";

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (h < 1)  return "1時間以内";
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨日" : `${d}日前`;
}

export default async function DashboardPage() {
  const [
    pendingCount,
    doneCount,
    totalCount,
    latestRun,
    recentDecisions,
    latestEgoHit,
  ] = await Promise.all([
    db.proposal.count({ where: { status: "pending" } }),
    db.proposal.count({ where: { status: "done" } }),
    db.proposal.count(),
    db.analysisRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { proposals: true } } },
    }),
    db.proposal.findMany({
      where: { status: { not: "pending" } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.egoHit.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <NavShell>
      {/* Hero — 提案があれば全面CTA、なければ静かなタイトル */}
      <section className="pt-4 pb-16 border-b border-[#f0f0f0]">
        {pendingCount > 0 ? (
          <>
            <p className="text-[13px] text-[#6e6e73] mb-5 tracking-wide uppercase">
              承認が必要です
            </p>
            <h1 className="text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-[1] mb-10">
              {pendingCount}件の提案
            </h1>
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#0071e3] text-white text-[17px] font-medium rounded-full hover:bg-[#0077ed] transition-colors"
            >
              承認インボックスを開く
              <span className="text-[20px] leading-none">›</span>
            </Link>
          </>
        ) : (
          <>
            <p className="text-[13px] text-[#6e6e73] mb-5 tracking-wide uppercase">
              承認待ちなし
            </p>
            <h1 className="text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-[1]">
              Agent Portal
            </h1>
          </>
        )}
      </section>

      {/* ループ状態 */}
      <section className="py-16 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-8">ループ状態</p>
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0]">
          {/* Ego Search */}
          <div className="pr-12">
            <p className="text-[13px] font-medium text-[#6e6e73] mb-3">Ego Search</p>
            {latestEgoHit ? (
              <>
                <p className="text-[40px] font-semibold text-[#1d1d1f] leading-none">
                  {timeAgo(new Date(latestEgoHit.createdAt))}
                </p>
                <p className="text-[13px] text-[#6e6e73] mt-2">最終収集</p>
              </>
            ) : (
              <p className="text-[24px] font-semibold text-[#6e6e73]">未実行</p>
            )}
          </div>

          {/* Analysis Agent */}
          <div className="pl-12">
            <p className="text-[13px] font-medium text-[#6e6e73] mb-3">Analysis Agent</p>
            {latestRun ? (
              <>
                <p className="text-[40px] font-semibold text-[#1d1d1f] leading-none">
                  {timeAgo(new Date(latestRun.createdAt))}
                </p>
                <p className="text-[13px] text-[#6e6e73] mt-2">
                  {latestRun.status === "done"
                    ? `${latestRun._count.proposals}件生成`
                    : latestRun.status === "failed"
                    ? "失敗"
                    : latestRun.status}
                </p>
                {latestRun.summary && (
                  <p className="text-[12px] text-[#86868b] mt-1 truncate max-w-xs">
                    {latestRun.summary}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[24px] font-semibold text-[#6e6e73]">未実行</p>
            )}
          </div>
        </div>
      </section>

      {/* 提案サマリー */}
      <section className="py-16 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-8">提案サマリー</p>
        <div className="grid grid-cols-3 divide-x divide-[#f0f0f0]">
          {[
            { n: pendingCount, label: "承認待ち",  alert: pendingCount > 0 },
            { n: doneCount,    label: "実行済み",  alert: false },
            { n: totalCount,   label: "累計",      alert: false },
          ].map(({ n, label, alert }) => (
            <div key={label} className="px-8 first:pl-0 last:pr-0">
              <p className={`text-[56px] font-semibold leading-none tracking-tight ${alert ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
                {n}
              </p>
              <p className="text-[13px] text-[#6e6e73] mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 直近の決定履歴 */}
      {recentDecisions.length > 0 && (
        <section className="py-16">
          <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-8">直近の決定</p>
          <div className="divide-y divide-[#f0f0f0]">
            {recentDecisions.map((p) => (
              <div key={p.id} className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">
                    {DOMAIN_LABEL[p.domain] ?? p.domain}
                    {p.updatedAt ? ` · ${timeAgo(new Date(p.updatedAt))}` : ""}
                  </p>
                </div>
                <StatusChip status={p.status} />
              </div>
            ))}
          </div>
          <Link href="/proposals" className="text-[14px] text-[#0071e3] hover:underline mt-6 inline-block">
            すべて見る →
          </Link>
        </section>
      )}
    </NavShell>
  );
}

const DOMAIN_LABEL: Record<string, string> = {
  aso: "ASO", sns: "SNS", ego: "エゴサ", general: "全般",
};

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    done:      { label: "実行済み", cls: "text-[#1d1d1f]" },
    rejected:  { label: "却下",     cls: "text-[#6e6e73]" },
    approved:  { label: "承認済み", cls: "text-[#0071e3]" },
    executing: { label: "実行中",   cls: "text-[#6e6e73]" },
    failed:    { label: "失敗",     cls: "text-red-500" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`text-[13px] whitespace-nowrap flex items-center gap-1.5 ${s.cls}`}>
      {status === "done" && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
      {s.label}
    </span>
  );
}
