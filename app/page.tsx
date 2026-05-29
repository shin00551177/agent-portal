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

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${active ? "text-[#1d7a47]" : "text-[#86868b]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-[#c7c7cc]"}`} />
      {active ? "稼働中" : "停止中"}
    </span>
  );
}

export default async function DashboardPage() {
  const [asoApps, snsApps, pendingProposals] = await Promise.all([
    db.asoApp.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        reports: { orderBy: { createdAt: "desc" }, take: 1 },
        keywords: { where: { active: true } },
      },
    }),
    db.snsApp.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        drafts:  { where: { status: "pending" } },
        egoHits: { where: { dismissed: false }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.proposal.findMany({
      where: { status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const waitingProposals = pendingProposals.filter(
    (p) => p.status === "approved" && (p.result as { waitingForVersion?: boolean } | null)?.waitingForVersion
  );
  const reviewProposals = pendingProposals.filter((p) => p.status === "pending");

  return (
    <NavShell>
      {/* Header */}
      <section className="pt-4 pb-12 border-b border-[#f0f0f0]">
        <p className="text-[13px] text-[#6e6e73] uppercase tracking-wide mb-4">Agent Portal</p>
        <h1 className="text-[56px] font-semibold text-[#1d1d1f] tracking-tight leading-[1]">
          ダッシュボード
        </h1>
        {reviewProposals.length > 0 && (
          <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-[#fff7e6] rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" />
            <span className="text-[14px] font-medium text-[#a05c00]">
              承認待ちの提案が {reviewProposals.length} 件あります
            </span>
            <Link href="/proposals" className="text-[13px] text-[#0071e3] hover:underline">確認 →</Link>
          </div>
        )}
      </section>

      {/* ASO エージェント */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-[20px] font-semibold text-[#1d1d1f]">ASO エージェント</p>
          <Link href="/aso" className="text-[13px] text-[#0071e3] hover:underline">すべて見る →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {asoApps.map((app) => {
            const report = app.reports[0];
            const data = (report?.data ?? {}) as {
              appMetrics?: { appPower?: number | null };
              keywords?: { keyword: string; rank: number | null }[];
              syncedAt?: string;
            };
            const appPower = data.appMetrics?.appPower;
            const topKw = data.keywords?.filter((k) => k.rank && k.rank < 500)
              .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];

            return (
              <Link key={app.id} href={`/aso/${app.id}`}
                className="border border-[#f0f0f0] rounded-2xl p-5 hover:border-[#d2d2d7] hover:bg-[#fafafa] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[15px] font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                    {app.name}
                  </p>
                  <StatusDot active={app.active} />
                </div>
                <div className="space-y-1.5 text-[12px] text-[#6e6e73]">
                  {appPower != null ? (
                    <p className="flex items-center gap-1.5">
                      <span className={`font-semibold ${appPower < 2 ? "text-red-500" : appPower < 5 ? "text-[#a05c00]" : "text-[#1d7a47]"}`}>
                        App Power {appPower}
                      </span>
                      <span>/10</span>
                    </p>
                  ) : <p className="text-[#c7c7cc]">データ未取得</p>}
                  {topKw && (
                    <p>
                      <span className="text-[#1d1d1f] font-medium">{topKw.keyword}</span>
                      {" "}{topKw.rank}位
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <span>{app.keywords.length}KW</span>
                    {report && <><span>·</span><span>{timeAgo(new Date(report.createdAt))}取得</span></>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SNS エージェント */}
      <section className="py-12 border-b border-[#f0f0f0]">
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-[20px] font-semibold text-[#1d1d1f]">SNS エージェント</p>
          <Link href="/sns" className="text-[13px] text-[#0071e3] hover:underline">すべて見る →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {snsApps.map((app) => {
            const lastHit = app.egoHits[0];
            return (
              <Link key={app.id} href={`/sns/${app.id}`}
                className="border border-[#f0f0f0] rounded-2xl p-5 hover:border-[#d2d2d7] hover:bg-[#fafafa] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[15px] font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                    {app.name}
                  </p>
                  <StatusDot active={app.active} />
                </div>
                <div className="space-y-1.5 text-[12px] text-[#6e6e73]">
                  <p>
                    下書き <span className={`font-semibold ${app.drafts.length > 0 ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
                      {app.drafts.length}件
                    </span> 承認待ち
                  </p>
                  {lastHit ? (
                    <p>エゴサ {timeAgo(new Date(lastHit.createdAt))}収集</p>
                  ) : (
                    <p className="text-[#c7c7cc]">エゴサ未収集</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 承認待ち提案 */}
      {(reviewProposals.length > 0 || waitingProposals.length > 0) && (
        <section className="py-12">
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[20px] font-semibold text-[#1d1d1f]">提案</p>
            <Link href="/proposals" className="text-[13px] text-[#0071e3] hover:underline">提案ページへ →</Link>
          </div>

          {reviewProposals.length > 0 && (
            <div className="mb-6">
              <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-3">承認待ち — {reviewProposals.length}件</p>
              <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0] rounded-2xl overflow-hidden">
                {reviewProposals.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/proposals?domain=${p.domain}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                      <p className="text-[11px] text-[#86868b] mt-0.5">
                        {DOMAIN_LABEL[p.domain] ?? p.domain}
                        {p.targetId ? ` · ${p.targetId}` : ""}
                        {p.createdAt ? ` · ${timeAgo(new Date(p.createdAt))}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#a05c00] bg-[#fff7e6] px-2.5 py-1 rounded-full font-medium shrink-0 ml-4">
                      承認待ち
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {waitingProposals.length > 0 && (
            <div>
              <p className="text-[12px] text-[#86868b] uppercase tracking-wide mb-3">バージョン待ち — {waitingProposals.length}件</p>
              <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0] rounded-2xl overflow-hidden">
                {waitingProposals.map((p) => (
                  <Link key={p.id} href={`/aso/${p.targetId ?? ""}/settings`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                      <p className="text-[11px] text-[#86868b] mt-0.5">
                        {DOMAIN_LABEL[p.domain] ?? p.domain}
                        {p.targetId ? ` · ${p.targetId}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#a05c00] bg-[#fff7e6] px-2.5 py-1 rounded-full font-medium shrink-0 ml-4">
                      ⏳ バージョン待ち
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {reviewProposals.length === 0 && waitingProposals.length === 0 && (
        <section className="py-12">
          <p className="text-[13px] text-[#86868b]">承認待ちの提案はありません</p>
        </section>
      )}
    </NavShell>
  );
}

const DOMAIN_LABEL: Record<string, string> = {
  aso: "ASO", sns: "SNS", ego: "エゴサ",
};
