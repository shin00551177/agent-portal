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

// Mini half-circle gauge
function MiniGauge({ value, max = 10 }: { value: number | null; max?: number }) {
  const v = value ?? 0;
  const pct = Math.min(v / max, 1);
  const r = 18, cx = 22, cy = 22;
  const circ = Math.PI * r;
  const color = v >= 5 ? "#34c759" : v >= 2 ? "#ff9f0a" : "#ff3b30";
  return (
    <svg width="44" height="28" viewBox="0 0 44 28" overflow="visible">
      <path d={`M 4 22 A ${r} ${r} 0 0 1 40 22`} fill="none" stroke="#e8e8ed" strokeWidth="5" strokeLinecap="round"/>
      <path d={`M 4 22 A ${r} ${r} 0 0 1 40 22`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}/>
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fontWeight="700" fill={value == null ? "#c7c7cc" : "#1d1d1f"}>
        {value ?? "—"}
      </text>
    </svg>
  );
}

const DOMAIN_LABEL: Record<string, string> = {
  aso: "ASO", sns: "SNS", ego: "エゴサ",
};

export default async function DashboardPage() {
  const [asoApps, snsApps, pendingProposals] = await Promise.all([
    db.asoApp.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        reports:  { orderBy: { createdAt: "desc" }, take: 1 },
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

  const reviewProposals  = pendingProposals.filter((p) => p.status === "pending");
  const waitingProposals = pendingProposals.filter(
    (p) => p.status === "approved" && (p.result as { waitingForVersion?: boolean } | null)?.waitingForVersion
  );

  const asoActive  = asoApps.filter((a) => a.active).length;
  const snsActive  = snsApps.filter((a) => a.active).length;

  return (
    <NavShell>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-6 pb-10 border-b border-[#f0f0f0]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-[#86868b] uppercase tracking-widest mb-3">Agent Portal</p>
            <h1 className="text-[48px] font-semibold text-[#1d1d1f] tracking-tight leading-none">
              ダッシュボード
            </h1>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 pb-1">
            <div className="text-right">
              <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">{asoActive + snsActive}</p>
              <p className="text-[11px] text-[#86868b] mt-1">稼働中 Agent</p>
            </div>
            {reviewProposals.length > 0 && (
              <Link href="/proposals"
                className="flex items-center gap-2.5 px-4 py-2.5 bg-[#ff9f0a] hover:bg-[#f09000] text-white rounded-2xl transition-colors shadow-sm">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[11px] font-bold">
                  {reviewProposals.length}
                </span>
                <span className="text-[13px] font-medium">承認待ち</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── ASO エージェント ────────────────────────────────────── */}
      <section className="py-10 border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#079147] flex items-center justify-center text-white text-[12px] font-bold">A</span>
            <p className="text-[17px] font-semibold text-[#1d1d1f]">ASO エージェント</p>
            <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              {asoActive}/{asoApps.length} 稼働中
            </span>
          </div>
          <Link href="/aso" className="text-[13px] text-[#079147] hover:underline">すべて →</Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {asoApps.map((app) => {
            const report = app.reports[0];
            const data = (report?.data ?? {}) as {
              appMetrics?: { appPower?: number | null; downloads?: number | null };
              keywords?: { keyword: string; rank: number | null }[];
            };
            const appPower = data.appMetrics?.appPower ?? null;
            const downloads = data.appMetrics?.downloads ?? null;
            const topKw = data.keywords
              ?.filter((k) => k.rank && k.rank < 500)
              .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
            const powerColor = appPower == null ? "text-[#86868b]"
              : appPower >= 5 ? "text-[#1d7a47]"
              : appPower >= 2 ? "text-[#a05c00]"
              : "text-red-500";

            return (
              <Link key={app.id} href={`/aso/${app.id}`}
                className={`relative rounded-2xl p-5 border transition-all group overflow-hidden ${
                  app.active
                    ? "border-[#e8e8ed] bg-white hover:border-[#079147]/30 hover:shadow-md"
                    : "border-[#f0f0f0] bg-[#fafafa] opacity-70 hover:opacity-100"
                }`}>
                {/* Active indicator stripe */}
                {app.active && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#079147] to-[#34c759] rounded-t-2xl" />
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] group-hover:text-[#079147] transition-colors leading-tight">
                      {app.name}
                    </p>
                    <p className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 ${app.active ? "text-[#1d7a47]" : "text-[#86868b]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${app.active ? "bg-emerald-500" : "bg-[#c7c7cc]"}`} />
                      {app.active ? "稼働中" : "停止中"}
                    </p>
                  </div>
                  <MiniGauge value={appPower} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#86868b]">App Power</span>
                    <span className={`text-[12px] font-semibold ${powerColor}`}>
                      {appPower != null ? `${appPower}/10` : "—"}
                    </span>
                  </div>
                  {topKw ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#86868b] truncate max-w-[80px]">{topKw.keyword}</span>
                      <span className="text-[12px] font-semibold text-[#1d1d1f]">{topKw.rank}位</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#86868b]">キーワード</span>
                      <span className="text-[12px] text-[#c7c7cc]">圏外</span>
                    </div>
                  )}
                  {downloads != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#86868b]">DL数</span>
                      <span className="text-[12px] font-semibold text-[#1d1d1f]">{downloads}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#f5f5f7] flex items-center justify-between">
                  <span className="text-[10px] text-[#c7c7cc]">{app.keywords.length} キーワード</span>
                  <span className="text-[10px] text-[#c7c7cc]">
                    {report ? timeAgo(new Date(report.createdAt)) : "未取得"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── SNS エージェント ────────────────────────────────────── */}
      <section className="py-10 border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#5856d6] flex items-center justify-center text-white text-[12px] font-bold">S</span>
            <p className="text-[17px] font-semibold text-[#1d1d1f]">SNS エージェント</p>
            <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              {snsActive}/{snsApps.length} 稼働中
            </span>
          </div>
          <Link href="/sns" className="text-[13px] text-[#079147] hover:underline">すべて →</Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {snsApps.map((app) => {
            const lastHit = app.egoHits[0];
            const pendingDrafts = app.drafts.length;
            return (
              <Link key={app.id} href={`/sns/${app.id}`}
                className={`relative rounded-2xl p-5 border transition-all group overflow-hidden ${
                  app.active
                    ? "border-[#e8e8ed] bg-white hover:border-[#5856d6]/30 hover:shadow-md"
                    : "border-[#f0f0f0] bg-[#fafafa] opacity-70 hover:opacity-100"
                }`}>
                {app.active && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#5856d6] to-[#af52de] rounded-t-2xl" />
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] group-hover:text-[#5856d6] transition-colors">
                      {app.name}
                    </p>
                    <p className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 ${app.active ? "text-[#1d7a47]" : "text-[#86868b]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${app.active ? "bg-emerald-500" : "bg-[#c7c7cc]"}`} />
                      {app.active ? "稼働中" : "停止中"}
                    </p>
                  </div>
                  {pendingDrafts > 0 && (
                    <span className="text-[11px] font-bold text-white bg-[#079147] rounded-full w-6 h-6 flex items-center justify-center">
                      {pendingDrafts}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#86868b]">下書き承認待ち</span>
                    <span className={`text-[12px] font-semibold ${pendingDrafts > 0 ? "text-[#079147]" : "text-[#c7c7cc]"}`}>
                      {pendingDrafts}件
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#86868b]">エゴサ最終収集</span>
                    <span className="text-[12px] text-[#1d1d1f]">
                      {lastHit ? timeAgo(new Date(lastHit.createdAt)) : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f5f5f7]">
                  <span className="text-[10px] text-[#c7c7cc]">
                    {(app.platforms as string[]).join(" · ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 提案 ─────────────────────────────────────────────── */}
      <section className="py-10">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[17px] font-semibold text-[#1d1d1f]">提案</p>
          <Link href="/proposals" className="text-[13px] text-[#079147] hover:underline">提案ページへ →</Link>
        </div>

        {reviewProposals.length === 0 && waitingProposals.length === 0 ? (
          <div className="border border-dashed border-[#d2d2d7] rounded-2xl py-10 text-center">
            <p className="text-[32px] mb-2">✅</p>
            <p className="text-[15px] font-medium text-[#1d1d1f]">承認待ちの提案はありません</p>
            <p className="text-[13px] text-[#86868b] mt-1">すべてのエージェントが正常に動作しています</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewProposals.length > 0 && (
              <div>
                <p className="text-[11px] text-[#86868b] uppercase tracking-wide mb-2">承認待ち — {reviewProposals.length}件</p>
                <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0] rounded-2xl overflow-hidden">
                  {reviewProposals.slice(0, 5).map((p) => (
                    <Link key={p.id} href={`/proposals?domain=${p.domain}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.domain === "aso" ? "bg-[#e8f0fe] text-[#079147]"
                          : p.domain === "sns" ? "bg-[#f0eeff] text-[#5856d6]"
                          : "bg-[#f5f5f7] text-[#6e6e73]"
                        }`}>
                          {DOMAIN_LABEL[p.domain] ?? p.domain}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate group-hover:text-[#079147] transition-colors">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-[#86868b] mt-0.5">
                            {p.targetId} · {p.createdAt ? timeAgo(new Date(p.createdAt)) : ""}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 ml-4 text-[11px] font-medium text-white bg-[#ff9f0a] px-3 py-1 rounded-full">
                        承認する
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {waitingProposals.length > 0 && (
              <div>
                <p className="text-[11px] text-[#86868b] uppercase tracking-wide mb-2">バージョン待ち — {waitingProposals.length}件</p>
                <div className="divide-y divide-[#f0f0f0] border border-[#f0f0f0] rounded-2xl overflow-hidden">
                  {waitingProposals.map((p) => (
                    <Link key={p.id} href={`/aso/${p.targetId ?? ""}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#079147]">
                          {DOMAIN_LABEL[p.domain] ?? p.domain}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                          <p className="text-[11px] text-[#86868b] mt-0.5">{p.targetId}</p>
                        </div>
                      </div>
                      <span className="shrink-0 ml-4 text-[11px] font-medium text-[#a05c00] bg-[#fff7e6] px-3 py-1 rounded-full">
                        ⏳ バージョン待ち
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </NavShell>
  );
}
